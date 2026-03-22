// stripe-reconcile — Job de reconciliação diário
// Puxa subscriptions ativas do Stripe e compara com o banco,
// corrigindo divergências automaticamente.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14.21.0';

const priceToPlan: Record<string, string> = {
  'price_1TCCjDB2Kj43d7TH3yWQ41ZT': 'monthly',
  'price_1TCCjEB2Kj43d7THrK5ru4sJ': 'annual',
  'price_1TCCjEB2Kj43d7THaAJXfiiR': 'pro_monthly',
  'price_1TCCjEB2Kj43d7TH1MzK5ixE': 'pro_annual',
};

function createLogger(traceId: string) {
  return function log(level: 'info' | 'warn' | 'error', message: string, details: Record<string, any> = {}) {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      JSON.stringify({ service: 'stripe-reconcile', traceId, level, message, timestamp: new Date().toISOString(), ...details })
    );
  };
}

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID();
  const log = createLogger(traceId);

  // Proteger endpoint (apenas chamadas internas via cron ou Authorization header)
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    log('warn', 'Acesso não autorizado tentado');
    return new Response('Unauthorized', { status: 401 });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    log('error', 'STRIPE_SECRET_KEY não configurada');
    return new Response('Config error', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia', httpClient: Stripe.createFetchHttpClient() });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  log('info', 'Iniciando reconciliação Stripe ↔ Banco');

  const stats = {
    stripeSubscriptions: 0,
    activated: 0,
    deactivated: 0,
    alreadyCorrect: 0,
    errors: 0,
  };

  try {
    // ============================================================
    // 1. BUSCAR TODAS AS SUBSCRIPTIONS ATIVAS NO STRIPE
    // ============================================================
    const activeSubscriptions = new Map<string, string>(); // userId → planId

    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: Stripe.SubscriptionListParams = {
        status: 'active',
        limit: 100,
        expand: ['data.items.data.price'],
      };
      if (startingAfter) params.starting_after = startingAfter;

      const subscriptions = await stripe.subscriptions.list(params);

      for (const sub of subscriptions.data) {
        const userId = sub.metadata?.userId || sub.metadata?.supabase_user_id;
        if (!userId) {
          log('warn', 'Subscription sem userId nos metadados', { subscriptionId: sub.id });
          continue;
        }

        const priceId = sub.items.data[0]?.price?.id;
        const planId = priceId ? priceToPlan[priceId] : null;

        if (!planId) {
          log('warn', 'Subscription com priceId desconhecido', { subscriptionId: sub.id, priceId });
          continue;
        }

        activeSubscriptions.set(userId, planId);
        stats.stripeSubscriptions++;
      }

      hasMore = subscriptions.has_more;
      if (hasMore && subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    log('info', `Subscriptions ativas no Stripe: ${stats.stripeSubscriptions}`);

    // ============================================================
    // 2. BUSCAR PLANOS ATIVOS NO BANCO (apenas pagos — exclui free)
    // ============================================================
    const { data: dbPlans, error: dbError } = await supabase
      .from('user_plans')
      .select('user_id, plan_id, active, plan_origin')
      .eq('active', true)
      .eq('plan_origin', 'stripe');

    if (dbError) {
      log('error', 'Erro ao buscar planos do banco', { reason: dbError.message });
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
    }

    const dbPlanMap = new Map<string, string>(); // userId → planId
    for (const row of (dbPlans || [])) {
      dbPlanMap.set(row.user_id, row.plan_id);
    }

    log('info', `Planos pagos ativos no banco: ${dbPlanMap.size}`);

    // ============================================================
    // 3. CORRIGIR DIVERGÊNCIAS
    // ============================================================

    // 3a. Usuários com subscription ativa no Stripe mas sem plano correto no banco → ATIVAR
    for (const [userId, planId] of activeSubscriptions.entries()) {
      const dbPlan = dbPlanMap.get(userId);

      if (dbPlan === planId) {
        stats.alreadyCorrect++;
        continue; // Tudo certo
      }

      log('warn', 'Divergência detectada — ativando plano', { userId, stripeplan: planId, dbPlan: dbPlan || 'none' });

      const nowTs = Math.floor(Date.now() / 1000);
      const { error } = await supabase.from('user_plans').upsert(
        { user_id: userId, plan_id: planId, active: true, last_stripe_event_ts: nowTs },
        { onConflict: 'user_id' }
      );

      if (error) {
        log('error', 'Erro ao ativar plano na reconciliação', { userId, planId, reason: error.message });
        stats.errors++;
      } else {
        log('info', 'Plano ativado pela reconciliação', { userId, planId });
        stats.activated++;
      }
    }

    // 3b. Usuários com plano pago no banco mas SEM subscription ativa no Stripe → REBAIXAR
    for (const [userId, dbPlan] of dbPlanMap.entries()) {
      if (!activeSubscriptions.has(userId)) {
        log('warn', 'Plano pago sem subscription ativa — rebaixando para free', { userId, dbPlan });

        const nowTs = Math.floor(Date.now() / 1000);
        const { error } = await supabase.from('user_plans').upsert(
          { user_id: userId, plan_id: 'free', active: false, last_stripe_event_ts: nowTs },
          { onConflict: 'user_id' }
        );

        if (error) {
          log('error', 'Erro ao rebaixar plano na reconciliação', { userId, reason: error.message });
          stats.errors++;
        } else {
          log('info', 'Plano rebaixado pela reconciliação', { userId, wasplan: dbPlan });
          stats.deactivated++;
        }
      }
    }

    log('info', 'Reconciliação concluída', stats);

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    log('error', 'Erro crítico na reconciliação', { reason: err.message });
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
