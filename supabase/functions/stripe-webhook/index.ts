// Trigger deployment v3 - Audit: +invoice.payment_failed, +fallback seguro no priceToPlan, +deduplicação de pagamentos
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

async function sendEmail(to: string, subject: string, html: string, resendApiKey: string) {
    if (!resendApiKey) return;
    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'ShapeScan <no-reply@shapescan.com.br>',
                to, subject, html,
            }),
        });
    } catch (e) {
        console.error('[Stripe Webhook] Erro ao enviar email:', e);
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

  if (!stripeKey || !endpointSecret) return new Response('Config error', { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia', httpClient: Stripe.createFetchHttpClient() });
  const signature = req.headers.get('stripe-signature')!;

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
    console.log(`[Stripe Webhook] Event: ${event.type}`);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // ============================================================
    // EVENTO: invoice.payment_succeeded (O MAIS ROBUSTO PARA ASSINATURAS)
    // Dispara tanto na primeira compra quanto em todas as renovações.
    // ============================================================
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      
      if (!subscriptionId) return new Response('OK', { status: 200 });

      // Buscar a assinatura para garantir que temos o userId (recuperamos dos metadados dela)
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId || invoice.metadata?.userId || (invoice.subscription_details?.metadata?.userId);

      if (!userId) {
        console.error(`[Stripe Webhook] Falha: userId não encontrado para invoice ${invoice.id}`);
        return new Response('Missing userId', { status: 200 });
      }

      const priceId = invoice.lines.data[0]?.price?.id;
      
      // CORRIGIDO: Fallback seguro — se price desconhecido, não ativa plano errado, loga erro
      const planId = priceId ? priceToPlan[priceId] : null;
      if (!planId) {
        console.error(`[Stripe Webhook] ERRO: priceId não mapeado: ${priceId}. Nenhuma ação tomada.`);
        return new Response('OK - Unknown price', { status: 200 });
      }
      
      const amount = invoice.amount_paid;
      const stripeInvoiceId = invoice.id;

      console.log(`[Stripe Webhook] Sucesso! User: ${userId} | Plano: ${planId} | Invoice: ${stripeInvoiceId}`);

      // 1. Registrar pagamento com deduplicação via stripe_invoice_id
      // Verificar se já existe para evitar duplicatas por retry do Stripe
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
          amount: amount,
          status: 'approved',
          provider: 'stripe',
          metadata: { stripe_invoice_id: stripeInvoiceId, stripe_subscription_id: subscriptionId, stripe_customer_id: invoice.customer }
        });
        console.log(`[Stripe Webhook] Pagamento registrado para invoice ${stripeInvoiceId}`);
      } else {
        console.log(`[Stripe Webhook] Pagamento duplicado ignorado para invoice ${stripeInvoiceId}`);
      }

      // 2. Ativar/Renovar plano
      const { error: planError } = await supabase.from('user_plans').upsert({
        user_id: userId, plan_id: planId, active: true,
      }, { onConflict: 'user_id' });

      if (planError) console.error('[Stripe Webhook] Erro ao ativar plano:', planError.message);

      // 3. Email de confirmação (apenas em cobranças reais, não em trial/zero valor)
      if (amount > 0) {
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        if (customer.email) {
          await sendEmail(customer.email, `✅ ShapeScan — Pagamento Confirmado`, purchaseConfirmationEmail(customer.name || 'Atleta', planNames[planId], amount), resendApiKey);
        }
      }
    }

    // ============================================================
    // EVENTO: invoice.payment_failed (NOVO — CRÍTICO)
    // Dispara quando uma cobrança falha (cartão recusado, etc.)
    // Rebaixa o plano do usuário para free para manter integridade.
    // ============================================================
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (!subscriptionId) return new Response('OK', { status: 200 });

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId || invoice.metadata?.userId;

      if (!userId) {
        console.error(`[Stripe Webhook] payment_failed: userId não encontrado para invoice ${invoice.id}`);
        return new Response('OK - Missing userId', { status: 200 });
      }

      console.log(`[Stripe Webhook] Pagamento falhou! User: ${userId} | Invoice: ${invoice.id}`);

      // Registrar falha de pagamento (não rebaixa plano imediatamente — Stripe tentará novamente)
      // O cancelamento real ocorre em customer.subscription.deleted quando todas as tentativas falharem
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
        if (error) console.error('[Stripe Webhook] Erro ao registrar falha de pagamento:', error.message);
      });

      // Notificar usuário por email
      try {
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        if (customer.email) {
          await sendEmail(customer.email, `⚠️ ShapeScan — Problema no Pagamento`, paymentFailedEmail(customer.name || 'Atleta'), resendApiKey);
        }
      } catch (emailErr) {
        console.error('[Stripe Webhook] Erro ao buscar customer para email:', emailErr);
      }
    }

    // ============================================================
    // EVENTO: customer.subscription.deleted (CANCELAMENTO)
    // Dispara quando a assinatura é cancelada definitivamente
    // (após todas as tentativas de cobrança falharem, ou cancelamento manual)
    // ============================================================
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        console.log(`[Stripe Webhook] Assinatura cancelada para user ${userId}. Rebaixando para free.`);
        const { error } = await supabase.from('user_plans').upsert({ user_id: userId, plan_id: 'free', active: true }, { onConflict: 'user_id' });
        if (error) console.error('[Stripe Webhook] Erro ao rebaixar plano:', error.message);
      } else {
        console.warn(`[Stripe Webhook] customer.subscription.deleted: userId não encontrado na subscription ${sub.id}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error: ${err.message}`);
    return new Response(`Error: ${err.message}`, { status: 400 });
  }
});
