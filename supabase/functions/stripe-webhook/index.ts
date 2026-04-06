// Trigger deployment v9 - Produção: Blindagem Final (Ordering Protection + Context Isolation)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14.21.0';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const priceToPlan: Record<string, string> = {
  'price_1TCCjDB2Kj43d7TH3yWQ41ZT': 'monthly',
  'price_1TCCjEB2Kj43d7THrK5ru4sJ': 'annual',
  'price_1TCCjEB2Kj43d7THaAJXfiiR': 'pro_monthly',
  'price_1TCCjEB2Kj43d7TH1MzK5ixE': 'pro_annual',
};

const planNames: Record<string, string> = {
  'monthly': 'Standard Mensal', 'annual': 'Standard Anual', 'pro_monthly': 'Pro Mensal', 'pro_annual': 'Pro Anual', 'free': 'Gratuito',
};

function createLogger(traceId: string) {
  return (level: 'info' | 'warn' | 'error', event: string, status: string, details: Record<string, any> = {}) => {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      JSON.stringify({ service: 'stripe-webhook', traceId, level, event, status, timestamp: new Date().toISOString(), ...details })
    );
  };
}

async function sendEmail(log: any, to: string, subject: string, html: string, resendApiKey: string) {
  if (!resendApiKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: 'ShapeScan <no-reply@shapescan.com.br>', to, subject, html }),
    });
  } catch (e) { log('error', 'email', 'error', { reason: String(e), to }); }
}

function purchaseConfirmationEmail(customerName: string, planName: string, amount: number) {
  const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount / 100);
  return `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f4f4f4; padding: 40px 30px; border-radius: 16px;">
    <div style="text-align: center; margin-bottom: 32px;"><h1 style="font-size: 28px; font-weight: 900; color: #10b981; margin: 0;">✅ Pagamento Confirmado!</h1></div>
    <p>Olá, <strong>${customerName || 'Atleta'}</strong>!</p>
    <p>Seu acesso ao <strong>ShapeScan</strong> está liberado. 💪</p>
    <div style="background: #1a1a1a; border-radius: 12px; padding: 24px;">
      <p>Plano: <strong>${planName}</strong><br>Valor: <strong>${amountFormatted}</strong></p>
    </div>
    <div style="text-align: center; margin-top: 32px;"><a href="https://shapescan.com.br/dashboard" style="background: #10b981; color: #0a0a0a; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 900;">Acessar ShapeScan →</a></div>
  </div>`;
}

async function resolveUserId(event: Stripe.Event, stripe: Stripe, supabase: any): Promise<string | null> {
  const obj = event.data.object as any;
  let userId = obj.metadata?.userId || obj.metadata?.supabase_user_id || obj.subscription_details?.metadata?.userId;
  if (userId) return userId;
  const customerId = obj.customer as string;
  if (customerId) {
    const { data } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle();
    if (data?.id) return data.id;
  }
  const piId = obj.payment_intent as string || (obj.object === 'invoice' ? obj.payment_intent : null);
  if (piId && typeof piId === 'string') {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      userId = pi.metadata?.userId || pi.metadata?.supabase_user_id;
      if (userId) return userId;
    } catch { /* ignore */ }
  }
  return null;
}

// ── PROTEÇÃO CONTRA EVENTOS FORA DE ORDEM (ORDERING PROTECTION) ─────────────────
async function isEventNewer(event: Stripe.Event, userId: string, supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from('billing_audit')
    .select('event_created')
    .eq('user_id', userId)
    .order('event_created', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return true;
  return event.created > (data.event_created || 0);
}

// ── BLINDAGEM POR CONTEXTO REAL (CONTEXT ISOLATION) ──────────────────────────
async function canUpgradeUser(userId: string, supabase: any, log: any, context: { pi?: string; sub?: string }): Promise<boolean> {
  const { data } = await supabase
    .from('billing_audit')
    .select('event_type, payment_intent_id, subscription_id')
    .eq('user_id', userId)
    .in('event_type', ['charge.refunded', 'dispute_lost'])
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data?.length) return true;

  const relatedEvent = data.find(e => 
    (context.pi && e.payment_intent_id === context.pi) || 
    (context.sub && e.subscription_id === context.sub)
  );

  if (relatedEvent) {
    log('warn', 'upgrade_guard', 'blocked', { userId, reason: `Related ${relatedEvent.event_type} found for this transaction context`, context });
    return false;
  }
  return true;
}

async function waitForProfileSync(supabase: any, userId: string, expectedPlan: string): Promise<boolean> {
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase.from('profiles').select('plan').eq('id', userId).maybeSingle();
    if (data?.plan === expectedPlan) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

async function handleDowngrade(supabase: any, log: any, event: Stripe.Event, userId: string, reason: string) {
  const obj = event.data.object as any;
  log('info', event.type, 'before_downgrade', { userId, reason });
  try {
    const { error: downgradeError } = await supabase
      .from('user_plans')
      .update({ plan_id: 'free', active: false, last_stripe_event_ts: event.created })
      .eq('user_id', userId).neq('plan_id', 'free');

    if (downgradeError) throw downgradeError;
    if (!(await waitForProfileSync(supabase, userId, 'free'))) log('error', event.type, 'integrity_failure', { userId });

    log('info', event.type, 'processed', { status: 'downgraded', userId });
    await supabase.from('billing_audit').insert({
      user_id: userId, event_type: reason === 'dispute_lost' ? 'dispute_lost' : event.type, status: 'success', plan_id: 'free',
      stripe_event_id: event.id, event_created: event.created, 
      payment_intent_id: obj.payment_intent || (obj.object === 'charge' ? obj.payment_intent : null),
      invoice_id: obj.invoice || null, subscription_id: obj.subscription || null
    });
  } catch (err) { log('error', event.type, 'error', { reason: 'Downgrade failed', detail: String(err), userId }); }
}

declare const EdgeRuntime: any;

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID();
  const log = createLogger(traceId);
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

  if (!stripeKey || !endpointSecret) return new Response('Config error', { status: 500 });
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia', httpClient: Stripe.createFetchHttpClient() });
  const signature = req.headers.get('stripe-signature')!;

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    log('info', event.type, 'received', { eventId: event.id });
    
    // Idempotência: Verificar se o evento já foi processado
    const { error: idxErr } = await supabase.from('stripe_events').insert({ id: event.id, type: event.type });
    if (idxErr?.code === '23505') {
      log('info', event.type, 'duplicate_ignored', { eventId: event.id });
      return new Response(JSON.stringify({ duplicate: true }), { status: 200 });
    }

    // ── RETORNO IMEDIATO 200 PARA O STRIPE ──────────────────────────────────────
    // A lógica de processamento é disparada em "background" (Fire-and-forget seguro)
    // No Supabase Edge Runtime, usamos EdgeRuntime.waitUntil para garantir que a 
    // instância não morra antes de terminar o processamento.
    const processPromise = (async () => {
      try {
        const userId = await resolveUserId(event, stripe, supabase);
        if (userId && !(await isEventNewer(event, userId, supabase))) {
          log('warn', event.type, 'ignored_out_of_order', { userId, eventCreated: event.created });
          return;
        }

        const obj = event.data.object as any;

        switch (event.type) {
          case 'invoice.payment_succeeded': {
            if (!userId) break;
            const invoice = event.data.object as Stripe.Invoice;
            if (!(await canUpgradeUser(userId, supabase, log, { pi: invoice.payment_intent as string, sub: invoice.subscription as string }))) break;

            let planId: string | null = null;
            let retrievedSub: any = null;
            if (invoice.subscription) {
              retrievedSub = await stripe.subscriptions.retrieve(invoice.subscription as string);
              planId = retrievedSub.metadata?.plan || null;
            }
            if (!planId) planId = priceToPlan[invoice.lines.data[0]?.price?.id || ''];

            if (planId) {
              // Primary upsert: include subscription_id and period data
              let { error: upsertError } = await supabase.from('user_plans').upsert({
                user_id: userId,
                plan_id: planId,
                active: true,
                last_stripe_event_ts: event.created,
                subscription_id: invoice.subscription as string,
                cancel_at_period_end: false,
                current_period_end: retrievedSub?.current_period_end ?? null,
                subscription_start: retrievedSub?.start_date ?? null,
              }, { onConflict: 'user_id' });

              // Fallback: column(s) missing (error 42703) — strip extended fields and retry with bare minimum
              if (upsertError?.code === '42703') {
                log('warn', event.type, 'upsert_fallback', { userId, reason: 'extended column missing, retrying with bare minimum' });
                const { error: retryError } = await supabase.from('user_plans').upsert({
                  user_id: userId,
                  plan_id: planId,
                  active: true,
                  subscription_id: invoice.subscription as string,
                }, { onConflict: 'user_id' });
                if (retryError) {
                  log('error', event.type, 'upsert_failed', { userId, planId, error: retryError.message, code: retryError.code });
                  break;
                }
                upsertError = null;
              } else if (upsertError) {
                log('error', event.type, 'upsert_failed', { userId, planId, error: upsertError.message, code: upsertError.code });
                break;
              }

              log('info', event.type, 'plan_activated', { userId, planId });

              // Non-critical: audit log — failures are logged but do not block plan activation
              const { error: auditError } = await supabase.from('billing_audit').insert({
                user_id: userId, event_type: event.type, status: 'success', plan_id: planId, amount: invoice.amount_paid,
                stripe_event_id: event.id, event_created: event.created, payment_intent_id: invoice.payment_intent as string, invoice_id: invoice.id, subscription_id: invoice.subscription as string
              });
              if (auditError) log('warn', event.type, 'audit_insert_failed', { userId, error: auditError.message, code: auditError.code });

              if (invoice.amount_paid > 0) {
                const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
                if (customer.email) await sendEmail(log, customer.email, `✅ ShapeScan — Pagamento Confirmado`, purchaseConfirmationEmail(customer.name || 'Atleta', planNames[planId], invoice.amount_paid), resendApiKey);

                // ── UTMIFY: Reportar venda ──────────────────────────────────
                const utmifyToken = Deno.env.get('UTMIFY_API_TOKEN');
                if (utmifyToken) {
                  try {
                    const meta = retrievedSub?.metadata || {};
                    const eventDate = new Date(event.created * 1000).toISOString();
                    await fetch('https://api.utmify.com.br/api-credentials/orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-api-token': utmifyToken },
                      body: JSON.stringify({
                        orderId: invoice.id,
                        platform: 'shapescan',
                        paymentMethod: 'credit_card',
                        status: 'paid',
                        createdAt: eventDate,
                        approvedDate: eventDate,
                        refundedAt: null,
                        customer: {
                          name: customer.name || '',
                          email: customer.email || '',
                          phone: null,
                          document: null,
                        },
                        commission: {
                          totalPriceInCents: invoice.amount_paid,
                          gatewayFeeInCents: 0,
                          userCommissionInCents: invoice.amount_paid,
                        },
                        trackingParameters: {
                          utm_source: meta.utm_source || null,
                          utm_campaign: meta.utm_campaign || null,
                          utm_medium: meta.utm_medium || null,
                          utm_content: meta.utm_content || null,
                          utm_term: meta.utm_term || null,
                        },
                      }),
                    });
                    log('info', event.type, 'utmify_reported', { userId, orderId: invoice.id });
                  } catch (utmErr) {
                    log('warn', event.type, 'utmify_error', { reason: String(utmErr) });
                  }
                }
              }
            }
            break;
          }
          case 'invoice.payment_failed': {
            if (!userId) break;
            const invoice = event.data.object as Stripe.Invoice;
            if (invoice.subscription) {
              const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
              if (sub.status === 'canceled' || sub.status === 'unpaid') await handleDowngrade(supabase, log, event, userId, 'payment_failed_final');
              else await supabase.from('billing_audit').insert({
                user_id: userId, event_type: 'payment_failed_retrying', status: 'pending', stripe_event_id: event.id, event_created: event.created,
                payment_intent_id: invoice.payment_intent as string, invoice_id: invoice.id, subscription_id: invoice.subscription as string
              });
            }
            break;
          }
          case 'charge.refunded':
          case 'refund.created':
          case 'invoice.payment_refunded':
          case 'customer.subscription.deleted': if (userId) await handleDowngrade(supabase, log, event, userId, 'automatic_revocation'); break;

          case 'charge.dispute.created':
            if (userId) await supabase.from('billing_audit').insert({
              user_id: userId, event_type: 'dispute_opened', status: 'pending', stripe_event_id: event.id, event_created: event.created,
              payment_intent_id: obj.payment_intent, invoice_id: obj.invoice || null, subscription_id: obj.subscription || null
            });
            break;
          case 'charge.dispute.closed': {
            if (!userId) break;
            const dispute = event.data.object as Stripe.Dispute;
            if (dispute.status === 'lost') await handleDowngrade(supabase, log, event, userId, 'dispute_lost');
            else await supabase.from('billing_audit').insert({
              user_id: userId, event_type: 'dispute_won', status: 'success', stripe_event_id: event.id, event_created: event.created,
              payment_intent_id: obj.payment_intent, invoice_id: obj.invoice || null, subscription_id: obj.subscription || null
            });
            break;
          }
          case 'customer.subscription.updated': {
            if (!userId) break;
            const sub = event.data.object as Stripe.Subscription;
            if (sub.status === 'canceled' || sub.status === 'unpaid') await handleDowngrade(supabase, log, event, userId, 'subscription_update_revocation');
            else if (sub.status === 'active') {
              if (!(await canUpgradeUser(userId, supabase, log, { sub: sub.id }))) break;
              const planId = sub.metadata?.plan || priceToPlan[sub.items.data[0]?.price?.id || ''];
              if (planId) {
                let { error: subUpsertError } = await supabase.from('user_plans').upsert({
                  user_id: userId,
                  plan_id: planId,
                  active: true,
                  last_stripe_event_ts: event.created,
                  subscription_id: sub.id,
                  cancel_at_period_end: sub.cancel_at_period_end,
                  current_period_end: sub.current_period_end,
                }, { onConflict: 'user_id' });

                if (subUpsertError?.code === '42703') {
                  log('warn', event.type, 'upsert_fallback', { userId, reason: 'extended column missing' });
                  const { error: retryError } = await supabase.from('user_plans').upsert({
                    user_id: userId, plan_id: planId, active: true, last_stripe_event_ts: event.created,
                    subscription_id: sub.id, cancel_at_period_end: sub.cancel_at_period_end,
                  }, { onConflict: 'user_id' });
                  if (retryError) { log('error', event.type, 'upsert_failed', { userId, planId, error: retryError.message }); break; }
                  subUpsertError = null;
                } else if (subUpsertError) {
                  log('error', event.type, 'upsert_failed', { userId, planId, error: subUpsertError.message }); break;
                }

                const { error: auditErr } = await supabase.from('billing_audit').insert({ user_id: userId, event_type: event.type, status: 'success', plan_id: planId, stripe_event_id: event.id, event_created: event.created, subscription_id: sub.id });
                if (auditErr) log('warn', event.type, 'audit_insert_failed', { userId, error: auditErr.message });
              }
            }
            break;
          }
        }
      } catch (err: any) {
        log('error', 'async_process', 'failed', { message: err.message });
      }
    })();

    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(processPromise);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err: any) { 
    log('error', 'critical', 'panic', { reason: err.message }); 
    return new Response(`Error: ${err.message}`, { status: 400 }); 
  }
});
