// Trigger deployment v4 - Produção: +log estruturado, +pending_payment handler
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const priceToPlan: Record<string, string> = {
  'price_1TCCjDB2Kj43d7TH3yWQ41ZT': 'monthly',
  'price_1TCCjEB2Kj43d7THrK5ru4sJ': 'annual',
  'price_1TCCjEB2Kj43d7THaAJXfiiR': 'pro_monthly',
  'price_1TCCjEB2Kj43d7TH1MzK5ixE': 'pro_annual',
};

const planNames: Record<string, string> = {
  'monthly': 'Standard Mensal',
  'annual': 'Standard Anual',
  'pro_monthly': 'Pro Mensal',
  'pro_annual': 'Pro Anual',
  'free': 'Gratuito',
};

// ============================================================
// LOG ESTRUTURADO — Rastreabilidade total de cada evento
// Formato JSON padronizado: event, userId, status, timestamp
// ============================================================
// ============================================================
// LOG ESTRUTURADO — Rastreabilidade total de cada evento
// Formato JSON padronizado: event, userId, status, timestamp
// ============================================================
function createLogger(traceId: string) {
  return function log(
    level: 'info' | 'warn' | 'error',
    event: string,
    status: 'received' | 'processed' | 'skipped' | 'error',
    details: Record<string, any> = {}
  ) {
    const entry = {
      service: 'stripe-webhook',
      traceId,
      level,
      event,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    };
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  };
}

async function sendEmail(log: any, to: string, subject: string, html: string, resendApiKey: string) {
  if (!resendApiKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({ from: 'ShapeScan <no-reply@shapescan.com.br>', to, subject, html }),
    });
  } catch (e) {
    log('error', 'email', 'error', { reason: String(e), to });
  }
}

function purchaseConfirmationEmail(customerName: string, planName: string, amount: number) {
  const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount / 100);
  return `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f4f4f4; padding: 40px 30px; border-radius: 16px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; font-weight: 900; color: #10b981; margin: 0;">✅ Pagamento Confirmado!</h1>
    </div>
    <p style="font-size: 16px; color: #d1d5db;">Olá, <strong style="color: #fff;">${customerName || 'Atleta'}</strong>!</p>
    <p style="font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Seu acesso ao <strong style="color: #10b981;">ShapeScan</strong> está liberado. Bem-vindo(a)! 💪
    </p>
    <div style="background: #1a1a1a; border: 1px solid #2d2d2d; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <p style="color: #9ca3af; font-size: 14px; margin: 0;">Plano: <strong style="color: #fff;">${planName}</strong></p>
      <p style="color: #9ca3af; font-size: 14px; margin: 8px 0 0;">Valor: <strong style="color: #10b981;">${amountFormatted}</strong></p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://shapescan.com.br/dashboard" style="background: #10b981; color: #0a0a0a; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 900;">Acessar ShapeScan →</a>
    </div>
  </div>`;
}

function paymentFailedEmail(customerName: string) {
  return `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f4f4f4; padding: 40px 30px; border-radius: 16px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; font-weight: 900; color: #ef4444; margin: 0;">⚠️ Problema no Pagamento</h1>
    </div>
    <p style="font-size: 16px; color: #d1d5db;">Olá, <strong style="color: #fff;">${customerName || 'Atleta'}</strong>!</p>
    <p style="font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Identificamos um problema ao processar seu pagamento no <strong style="color: #10b981;">ShapeScan</strong>.
      Por favor, atualize seus dados de pagamento para continuar com acesso completo.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://shapescan.com.br/planos" style="background: #ef4444; color: #fff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 900;">Atualizar Pagamento →</a>
    </div>
  </div>`;
}

// ============================================================
// ADVANCED SAFEGUARDS HELPERS
// ============================================================
async function validatePlan(supabase: any, userId: string, targetPlan: string) {
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase
      .from('user_plans')
      .select('active, plan_id')
      .eq('user_id', userId)
      .single();

    if (data?.active && data?.plan_id === targetPlan) return true;

    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

// Remoção isEventOutOfOrder - Lógica movida para Update Atômico (.lt) no DB

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID();
  const log = createLogger(traceId);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

  if (!stripeKey || !endpointSecret) {
    log('error', 'startup', 'error', { reason: 'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET' });
    return new Response('Config error', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia', httpClient: Stripe.createFetchHttpClient() });
  const signature = req.headers.get('stripe-signature')!;

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);

    log('info', event.type, 'received', { eventId: event.id });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // ============================================================
    // IDEMPOTÊNCIA — INSERT ATÔMICO (sem SELECT prévio)
    // ============================================================
    // Padrão correto para race condition real:
    //   1. Dois requests chegam simultaneamente com o mesmo event.id
    //   2. Ambos tentam INSERT
    //   3. O banco garante atomicidade via PRIMARY KEY constraint
    //   4. O primeiro vence → processa; o segundo recebe 23505 → retorna 200 imediatamente
    //
    // O SELECT prévio NÃO protege: dois requests podem passar pelo SELECT
    // antes de qualquer INSERT ocorrer (TOCTOU race). O INSERT direto é atômico.
    //
    // REGRA: nenhuma lógica de negócio executa ANTES deste bloco.
    // ============================================================
    const { error: idempotencyError } = await supabase
      .from('stripe_events')
      .insert({ id: event.id, type: event.type });

    if (idempotencyError) {
      if (idempotencyError.code === '23505') {
        // unique_violation → event.id já existe → evento duplicado ou race condition
        log('info', event.type, 'skipped', {
          eventId: event.id,
          reason: 'Duplicate event — idempotency lock (23505). Already processed or concurrent request won the race.',
        });
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
      }
      // Erro inesperado no INSERT (ex: tabela não existe, permissão) → logar e continuar
      // para não bloquear pagamentos por problema de infra de monitoramento
      log('error', event.type, 'error', {
        eventId: event.id,
        reason: 'Idempotency INSERT failed (unexpected error) — continuing to process to avoid blocking payment',
        detail: idempotencyError.message,
        code: idempotencyError.code,
      });
    }

    // ============================================================
    // EVENTO: invoice.payment_succeeded
    // ============================================================
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (!subscriptionId) {
        log('warn', event.type, 'skipped', { reason: 'No subscriptionId', invoiceId: invoice.id });
        return new Response('OK', { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId || invoice.metadata?.userId || (invoice.subscription_details?.metadata?.userId);

      const validPlans = ['monthly', 'annual', 'pro_monthly', 'pro_annual', 'lifetime', 'free'];

      if (!userId) {
        log('error', event.type, 'error', { reason: 'CRITICAL: userId not found', invoiceId: invoice.id, subscriptionId });
        return new Response('Missing userId', { status: 200 }); // Erro definitivo
      }

      // CORREÇÃO: Tentar recuperar o plano do Metadata injetado no Checkout
      let planId = subscription.metadata?.plan;
      const priceId = invoice.lines.data[0]?.price?.id;
      
      if (!planId) {
         // Fallback para assinaturas antigas ou hardcoded (legado)
         planId = priceId ? priceToPlan[priceId] : null;
      }

      if (!planId || !validPlans.includes(planId)) {
        log('error', event.type, 'error', { reason: 'CRITICAL: Invalid or unknown planId', priceId, planId, userId });
        return new Response('Invalid planId', { status: 200 }); // Erro definitivo
      }

      const amount = invoice.amount_paid;
      const stripeInvoiceId = invoice.id;

      // PROTEÇÃO DE CONCORRÊNCIA: Verifica timestamp antes do Upsert
      const { data: existingPlan } = await supabase
        .from('user_plans')
        .select('last_stripe_event_ts')
        .eq('user_id', userId)
        .single();
        
      if (existingPlan && existingPlan.last_stripe_event_ts >= event.created) {
        log('warn', event.type, 'skipped', { reason: 'Outdated or duplicate event', eventTs: event.created, dbTs: existingPlan.last_stripe_event_ts });
        return new Response('Ignored outdated event', { status: 200 });
      }

      // UPSERT SEGURO: Cria a linha se ela não existir e evita falha silenciosa de timestamp .lt
      try {
        const { error: pError } = await supabase.from('user_plans').upsert({
            user_id: userId,
            plan_id: planId,
            active: true,
            plan_origin: 'stripe',
            last_stripe_event_ts: event.created,
          }, { onConflict: 'user_id' });

        if (pError) throw pError;

        // Post-webhook validation with retry
        const isValid = await validatePlan(supabase, userId, planId);

        if (!isValid) {
          log('error', 'post_webhook_validation_failed', 'error', { attempts: 3, userId, targetPlan: planId });
        } else {
          log('info', 'post_webhook_validation', 'processed', { status: 'ok', userId, planId });
          
          // Auditoria de negócios
          await supabase.from('billing_audit').insert({
            user_id: userId,
            event_type: event.type,
            status: 'success',
            plan_id: planId,
            amount: amount
          });
        }
      } catch (err) {
        log('error', event.type, 'error', { reason: 'Plan activation failed', detail: String(err), userId });
      }

      log('info', event.type, 'processed', { userId, planId, amount, invoiceId: stripeInvoiceId });

      // Email de confirmação
      if (amount > 0) {
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        if (customer.email) {
          await sendEmail(log, customer.email, `✅ ShapeScan — Pagamento Confirmado`, purchaseConfirmationEmail(customer.name || 'Atleta', planNames[planId], amount), resendApiKey);
        }
      }
    }

    // ============================================================
    // EVENTO: invoice.payment_failed
    // ============================================================
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (!subscriptionId) {
        log('warn', event.type, 'skipped', { reason: 'No subscriptionId', invoiceId: invoice.id });
        return new Response('OK', { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId || invoice.metadata?.userId;

      if (!userId) {
        log('error', event.type, 'error', { reason: 'CRITICAL: userId not found', invoiceId: invoice.id });
        return new Response('Missing userId', { status: 200 }); // Erro definitivo
      }

      // PROTEÇÃO DE CONCORRÊNCIA
      const { data: existingPlan } = await supabase
        .from('user_plans')
        .select('last_stripe_event_ts')
        .eq('user_id', userId)
        .single();
        
      if (existingPlan && existingPlan.last_stripe_event_ts >= event.created) {
        log('warn', event.type, 'skipped', { reason: 'Outdated event' });
        return new Response('Ignored outdated event', { status: 200 });
      }

      // ============================================================
      // DOWNGRADE: Se o pagamento falhar, rebaixar o usuário para free.
      // O Stripe tentará automaticamente cobrar novamente (retry policy).
      // ============================================================
      try {
        const { error: downgradeError } = await supabase.from('user_plans').upsert({
            user_id: userId,
            plan_id: 'free',
            active: false,
            plan_origin: 'stripe',
            last_stripe_event_ts: event.created,
          }, { onConflict: 'user_id' });

        if (downgradeError) throw downgradeError;
        
        // Post-webhook validation with retry
        const isValid = await validatePlan(supabase, userId, 'free');

        if (!isValid) {
          log('error', 'post_webhook_validation_failed', 'error', { attempts: 3, userId, targetPlan: 'free' });
        } else {
          log('info', 'post_webhook_validation', 'processed', { status: 'ok', userId, action: 'downgrade' });
          
          // Auditoria de negócios
          await supabase.from('billing_audit').insert({
            user_id: userId,
            event_type: event.type,
            status: 'success',
            plan_id: 'free',
            amount: 0
          });
        }
      } catch (downgradeErr) {
        log('error', event.type, 'error', { reason: 'Downgrade failed', detail: String(downgradeErr), userId });
      }

      // Email de falha
      try {
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        if (customer.email) {
          await sendEmail(log, customer.email, `⚠️ ShapeScan — Problema no Pagamento`, paymentFailedEmail(customer.name || 'Atleta'), resendApiKey);
        }
      } catch (emailErr) {
        log('error', event.type, 'error', { reason: 'Failed to send email', detail: String(emailErr), userId });
      }
    }

    // ============================================================
    // EVENTO: customer.subscription.updated (UPGRADE/DOWNGRADE VIA PORTAL)
    // Disparado quando usuário muda de plano pelo portal do Stripe.
    // ============================================================
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId || sub.metadata?.supabase_user_id;

      if (!userId) {
        log('warn', event.type, 'skipped', { reason: 'userId not found in subscription metadata', subscriptionId: sub.id });
        return new Response('Missing userId', { status: 200 }); // Erro definitivo
      }

      if (sub.status !== 'active') {
        log('info', event.type, 'skipped', { reason: `Subscription status is '${sub.status}', ignored`, userId });
        return new Response('Ignored - Not active', { status: 200 });
      }

      let planId = sub.metadata?.plan;
      
      if (!planId) {
        const priceId = sub.items.data[0]?.price?.id;
         planId = priceId ? priceToPlan[priceId] : null;
      }

      const validPlans = ['monthly', 'annual', 'pro_monthly', 'pro_annual', 'lifetime', 'free'];
      if (!planId || !validPlans.includes(planId)) {
        log('error', event.type, 'error', { reason: 'Invalid or unknown planId in subscription.updated', planId, userId });
        return new Response('Invalid plan', { status: 200 }); // Erro definitivo
      }

      // PROTEÇÃO DE CONCORRÊNCIA E OTIMIZAÇÃO DE UPDATE DUPLO (Race Condition com o Invoice)
      const { data: existingPlan } = await supabase
        .from('user_plans')
        .select('active, plan_id, last_stripe_event_ts')
        .eq('user_id', userId)
        .single();

      if (existingPlan && existingPlan.active && existingPlan.plan_id === planId && existingPlan.last_stripe_event_ts >= event.created) {
        log('info', event.type, 'skipped', { reason: 'No plan change or outdated event', userId });
        return new Response('Ignored - Up to date', { status: 200 });
      }

      try {
            const { error: syncError } = await supabase.from('user_plans').upsert({
                user_id: userId,
                plan_id: planId,
                active: true,
                plan_origin: 'stripe',
                last_stripe_event_ts: event.created,
              }, { onConflict: 'user_id' });

            if (syncError) throw syncError;

          // Post-webhook validation with retry
          const isValid = await validatePlan(supabase, userId, planId);

          if (!isValid) {
            log('error', 'post_webhook_validation_failed', 'error', { attempts: 3, userId, targetPlan: planId });
          } else {
            log('info', 'post_webhook_validation', 'processed', { status: 'ok', userId, action: 'update_plan' });
            
            // Auditoria de negócios
            await supabase.from('billing_audit').insert({
              user_id: userId,
              event_type: event.type,
              status: 'success',
              plan_id: planId,
              amount: 0
            });
          }

          log('info', event.type, 'processed', { userId, planId, subscriptionStatus: sub.status });
        } catch (err) {
          log('error', event.type, 'error', { reason: 'Subscription update sync failed', detail: String(err), userId });
        }
    }

    // ============================================================
    // EVENTO: customer.subscription.deleted (CANCELAMENTO DEFINITIVO)
    // ============================================================
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;

      if (!userId) {
        log('warn', event.type, 'skipped', { reason: 'userId not found in subscription metadata', subscriptionId: sub.id });
        return new Response('Missing userId', { status: 200 }); // Erro definitivo
      }

      // PROTEÇÃO DE CONCORRÊNCIA
      const { data: existingPlan } = await supabase
        .from('user_plans')
        .select('last_stripe_event_ts')
        .eq('user_id', userId)
        .single();
        
      if (existingPlan && existingPlan.last_stripe_event_ts >= event.created) {
        log('warn', event.type, 'skipped', { reason: 'Outdated event' });
        return new Response('Ignored outdated event', { status: 200 });
      }

      try {
          const { error: cError } = await supabase.from('user_plans').upsert({
              user_id: userId,
              plan_id: 'free',
              active: false,
              plan_origin: 'stripe',
              last_stripe_event_ts: event.created,
            }, { onConflict: 'user_id' });

          if (cError) throw cError;

          // Post-webhook validation with retry
          const isValid = await validatePlan(supabase, userId, 'free');

          if (!isValid) {
            log('error', 'post_webhook_validation_failed', 'error', { attempts: 3, userId, targetPlan: 'free' });
          } else {
            log('info', 'post_webhook_validation', 'processed', { status: 'ok', userId, action: 'deleted' });
            
            // Auditoria de negócios
            await supabase.from('billing_audit').insert({
              user_id: userId,
              event_type: event.type,
              status: 'success',
              plan_id: 'free',
              amount: 0
            });
          }

        } catch (err) {
          log('error', event.type, 'error', { reason: 'Subscription deletion sync failed', detail: String(err), userId });
        }
        
        log('info', event.type, 'processed', { userId, newPlan: 'free' });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    log('error', 'unknown', 'error', { reason: err.message });
    return new Response(`Error: ${err.message}`, { status: 400 });
  }
});
