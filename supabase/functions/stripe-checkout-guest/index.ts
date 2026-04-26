// stripe-checkout-guest v1 - Checkout sem autenticação (novo funil)
// Recebe: email, priceId, plan, quizData, utmParams
// Cria Stripe customer + subscription (guest), retorna clientSecret
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const VALID_PRICE_IDS = new Set([
  'price_1TCCjDB2Kj43d7TH3yWQ41ZT', // monthly
  'price_1TCCjEB2Kj43d7THrK5ru4sJ', // annual
  'price_1TCCjEB2Kj43d7THaAJXfiiR', // pro_monthly
  'price_1TCCjEB2Kj43d7TH1MzK5ixE', // pro_annual
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return new Response(JSON.stringify({ error: 'Config error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { email, priceId, plan, quizData, utmParams, couponCode } = body;

  // Validações básicas
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'E-mail inválido.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (!priceId || !VALID_PRICE_IDS.has(priceId)) {
    return new Response(JSON.stringify({ error: 'Plano inválido.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    // ── Customer ─────────────────────────────────────────────────────────────
    const customers = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 1 });
    let customer: Stripe.Customer;

    if (customers.data.length > 0) {
      customer = customers.data[0];
      console.log('[GUEST] Customer existente:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email: email.toLowerCase().trim(),
        metadata: { guest_checkout: 'true', guest_email: email.toLowerCase().trim() },
      });
      console.log('[GUEST] Novo customer:', customer.id);
    }

    // ── Cancelar subscriptions incompletas ou ativas existentes ───────────────
    let cancelledCount = 0;
    for (const status of ['incomplete', 'active', 'trialing'] as const) {
      const existing = await stripe.subscriptions.list({ customer: customer.id, status, limit: 10 });
      for (const sub of existing.data) {
        try {
          await stripe.subscriptions.cancel(sub.id);
          cancelledCount++;
        } catch (e: any) {
          console.warn('[GUEST] Falha ao cancelar sub', sub.id, e.message);
        }
      }
    }
    if (cancelledCount > 0) await sleep(500);

    // ── Serializar quiz data (Stripe metadata: max 500 chars por valor) ───────
    const quizMeta: Record<string, string> = {};
    if (quizData && typeof quizData === 'object') {
      const serialized = JSON.stringify({
        goal: quizData.goal,
        gender: quizData.gender,
        height: quizData.height,
        weight: quizData.weight,
        age: quizData.age,
        activityLevel: quizData.activityLevel,
        frequency: quizData.frequency,
      });
      quizMeta.quiz_data = serialized.slice(0, 490); // Stripe limit
    }

    // ── Criar subscription ────────────────────────────────────────────────────
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        guest_checkout: 'true',
        guest_email: email.toLowerCase().trim(),
        plan: plan || '',
        utm_source: utmParams?.utm_source || '',
        utm_campaign: utmParams?.utm_campaign || '',
        utm_medium: utmParams?.utm_medium || '',
        utm_content: utmParams?.utm_content || '',
        utm_term: utmParams?.utm_term || '',
        ...quizMeta,
      },
    };

    if (couponCode && typeof couponCode === 'string') {
      subscriptionParams.coupon = couponCode.trim();
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);
    console.log('[GUEST] Subscription criada:', subscription.id, '| Status:', subscription.status);

    const invoice = subscription.latest_invoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent };
    if (!invoice) throw new Error('Invoice não retornada');

    const amountDue = invoice.amount_due ?? invoice.total ?? 0;
    const subtotal = invoice.subtotal ?? 0;
    const pricing = {
      originalPrice: subtotal / 100,
      finalPrice: amountDue / 100,
      discount: (subtotal - amountDue) / 100,
    };

    // Cupom 100% / assinatura gratuita
    if (amountDue === 0 || invoice.status === 'paid') {
      return new Response(JSON.stringify({ isFree: true, subscriptionId: subscription.id, pricing }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const paymentIntent = invoice.payment_intent;
    if (!paymentIntent || typeof paymentIntent === 'string') throw new Error('PaymentIntent não expandido');

    // Propagar guest_email ao PaymentIntent para o webhook
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        guest_checkout: 'true',
        guest_email: email.toLowerCase().trim(),
        subscription_id: subscription.id,
        plan: plan || '',
        ...quizMeta,
      },
    });

    console.log('[GUEST] clientSecret OK:', paymentIntent.id.slice(0, 20));
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret, subscriptionId: subscription.id, pricing }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error('[GUEST ERROR]', err.message, err.code);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno', code: err.code || null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
