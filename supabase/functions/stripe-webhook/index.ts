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
function log(
  level: 'info' | 'warn' | 'error',
  event: string,
  status: 'received' | 'processed' | 'skipped' | 'error',
  details: Record<string, any> = {}
) {
  const entry = {
    service: 'stripe-webhook',
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
}

async function sendEmail(to: string, subject: string, html: string, resendApiKey: string) {
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

Deno.serve(async (req) => {
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

      if (!userId) {
        log('error', event.type, 'error', { reason: 'userId not found', invoiceId: invoice.id, subscriptionId });
        return new Response('Missing userId', { status: 200 });
      }

      const priceId = invoice.lines.data[0]?.price?.id;
      const planId = priceId ? priceToPlan[priceId] : null;

      if (!planId) {
        log('error', event.type, 'error', { reason: 'Unknown priceId — no action taken', priceId, userId });
        return new Response('OK - Unknown price', { status: 200 });
      }

      const amount = invoice.amount_paid;
      const stripeInvoiceId = invoice.id;

      // Deduplicação
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', userId)
        .filter('metadata->stripe_invoice_id', 'eq', stripeInvoiceId)
        .limit(1);

      if (!existingPayment || existingPayment.length === 0) {
        await supabase.from('payments').insert({
          user_id: userId,
          plan_id: planId,
          amount,
          status: 'approved',
          provider: 'stripe',
          metadata: { stripe_invoice_id: stripeInvoiceId, stripe_subscription_id: subscriptionId, stripe_customer_id: invoice.customer }
        });
      } else {
        log('warn', event.type, 'skipped', { reason: 'Duplicate invoice', invoiceId: stripeInvoiceId, userId });
      }

      // Tenta ativar o plano. Se a coluna pending_payment estiver faltando, tenta sem ela.
      const planUpdateData: any = {
        user_id: userId,
        plan_id: planId,
        active: true,
      };

      // Tentar atualizar com pending_payment para limpar o estado se a coluna existir
      try {
        const { error: pError } = await supabase.from('user_plans').upsert({
          ...planUpdateData,
          pending_payment: false
        }, { onConflict: 'user_id' });
        
        if (pError && pError.message.includes('pending_payment')) {
          // Fallback se a coluna não existir
          await supabase.from('user_plans').upsert(planUpdateData, { onConflict: 'user_id' });
        } else if (pError) {
          throw pError;
        }
      } catch (err) {
        log('error', event.type, 'error', { reason: 'Plan activation failed', detail: String(err), userId });
      }

      log('info', event.type, 'processed', { userId, planId, amount, invoiceId: stripeInvoiceId });

      // Email de confirmação
      if (amount > 0) {
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        if (customer.email) {
          await sendEmail(customer.email, `✅ ShapeScan — Pagamento Confirmado`, purchaseConfirmationEmail(customer.name || 'Atleta', planNames[planId], amount), resendApiKey);
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
        log('error', event.type, 'error', { reason: 'userId not found', invoiceId: invoice.id });
        return new Response('OK - Missing userId', { status: 200 });
      }

      log('warn', event.type, 'processed', { userId, invoiceId: invoice.id, reason: 'Payment failed - Stripe will retry' });

      // Registrar falha
      await supabase.from('payments').insert({
        user_id: userId,
        plan_id: 'free',
        amount: 0,
        status: 'failed',
        provider: 'stripe',
        metadata: {
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: invoice.customer,
          failure_message: (invoice as any).last_payment_error?.message || 'Cobrança recusada'
        }
      }).then(({ error }) => {
        if (error) log('error', event.type, 'error', { reason: error.message, userId });
      });

      // Email de falha
      try {
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        if (customer.email) {
          await sendEmail(customer.email, `⚠️ ShapeScan — Problema no Pagamento`, paymentFailedEmail(customer.name || 'Atleta'), resendApiKey);
        }
      } catch (emailErr) {
        log('error', event.type, 'error', { reason: 'Failed to send email', detail: String(emailErr), userId });
      }
    }

    // ============================================================
    // EVENTO: customer.subscription.deleted (CANCELAMENTO DEFINITIVO)
    // ============================================================
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;

      if (userId) {
        const cleanPlanData: any = {
          user_id: userId,
          plan_id: 'free',
          active: true,
        };

        try {
          const { error: cError } = await supabase.from('user_plans').upsert({
            ...cleanPlanData,
            pending_payment: false
          }, { onConflict: 'user_id' });
          
          if (cError && cError.message.includes('pending_payment')) {
            await supabase.from('user_plans').upsert(cleanPlanData, { onConflict: 'user_id' });
          }
        } catch (err) {
          log('error', event.type, 'error', { reason: 'Subscription deletion sync failed', detail: String(err), userId });
        }
        
        log('info', event.type, 'processed', { userId, newPlan: 'free' });
      } else {
        log('warn', event.type, 'skipped', { reason: 'userId not found in subscription metadata', subscriptionId: sub.id });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    log('error', 'unknown', 'error', { reason: err.message });
    return new Response(`Error: ${err.message}`, { status: 400 });
  }
});
