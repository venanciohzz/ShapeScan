// activate-after-payment — Ativação imediata do plano pós-pagamento
// Chamado pelo frontend logo após o redirect do Stripe, sem esperar o webhook.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const priceToPlan: Record<string, string> = {
  'price_1TCCjDB2Kj43d7TH3yWQ41ZT': 'monthly',
  'price_1TCCjEB2Kj43d7THrK5ru4sJ': 'annual',
  'price_1TCCjEB2Kj43d7THaAJXfiiR': 'pro_monthly',
  'price_1TCCjEB2Kj43d7TH1MzK5ixE': 'pro_annual',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Config error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Validar JWT do usuário
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });

    // Buscar stripe_customer_id do perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      // Tentar encontrar pelo email
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (!customers.data.length) {
        return new Response(JSON.stringify({ activated: false, reason: 'no_customer' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      customerId = customers.data[0].id;
      // Sincronizar customer_id (apenas se o profile existir)
      if (profile) {
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
      }
    }

    // Buscar subscription ativa (ou trialing) criada nos últimos 10 minutos
    // Isso evita reativar planos de períodos anteriores em caso de falha de pagamento.
    const TEN_MINUTES_AGO = Math.floor(Date.now() / 1000) - 600;

    let sub: Stripe.Subscription | null = null;
    for (const status of ['active', 'trialing'] as const) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status, limit: 5 });
      const recent = subs.data.find(s => s.created >= TEN_MINUTES_AGO);
      if (recent) { sub = recent; break; }
    }

    if (!sub) {
      // Nenhuma subscription recente ativa — pagamento pode ter falhado ou webhook já processou
      return new Response(JSON.stringify({ activated: false, reason: 'no_recent_active_subscription' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const planId = sub.metadata?.plan || priceToPlan[sub.items.data[0]?.price?.id || ''];
    if (!planId) {
      return new Response(JSON.stringify({ activated: false, reason: 'unknown_plan' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Ativar plano imediatamente no banco
    const { error: upsertError } = await supabase.from('user_plans').upsert({
      user_id: user.id,
      plan_id: planId,
      active: true,
      subscription_id: sub.id,
      cancel_at_period_end: sub.cancel_at_period_end,
      current_period_end: sub.current_period_end,
      subscription_start: sub.start_date,
    }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('[activate-after-payment] Upsert error:', upsertError.message);
      // Fallback sem colunas extras
      await supabase.from('user_plans').upsert({
        user_id: user.id,
        plan_id: planId,
        active: true,
        subscription_id: sub.id,
      }, { onConflict: 'user_id' });
    }

    console.log(`[activate-after-payment] Plano ${planId} ativado para ${user.id}`);

    return new Response(JSON.stringify({ activated: true, planId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[activate-after-payment] Error:', err.message);
    return new Response(JSON.stringify({ activated: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
