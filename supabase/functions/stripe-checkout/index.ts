// Trigger deployment v4 - Fixed: logs detalhados + cancelamento robusto + prevenção de 500 intermitente
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.21.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Pequena pausa para garantir que o Stripe finalize operações assíncronas
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  console.log(`[Stripe Checkout v4] Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  console.log('[AUTH]', { hasAuthHeader: !!authHeader, prefix: authHeader?.slice(0, 25) });

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let user: { id: string; email: string };
  const token = authHeader.replace('Bearer ', '');

  try {
    const { data, error } = await supabaseClient.auth.getUser(token);
    if (error) throw error;
    if (!data.user) throw new Error('No user returned');
    user = { id: data.user.id, email: data.user.email || '' };
    console.log('[AUTH] Usuário autenticado:', user.id, user.email);
  } catch (err: any) {
    console.error('[AUTH] Falha na validação do token:', err?.message);
    return new Response(JSON.stringify({ error: 'Unauthorized — token inválido ou expirado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── Body ────────────────────────────────────────────────────────────────
    const rawBody = await req.text();
    console.log('[BODY] Raw:', rawBody);

    let body: any;
    try { body = JSON.parse(rawBody); }
    catch { throw new Error('Body não é JSON válido'); }

    const { priceId, couponCode, plan } = body;

    // ── Prevenção de Múltiplas Assinaturas (Recompra Indesejada) ─────────────
    const { data: userPlan } = await supabaseClient
      .from('user_plans')
      .select('active, plan_id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Permite fluxo de upgrade/downgrade (plano atual diferente do solicitado)
    if (userPlan?.active && userPlan?.plan_id === plan) {
      console.warn('[CHECKOUT] Blocked: User already has this plan active', { userId: user.id, planId: userPlan.plan_id });
      return new Response(JSON.stringify({ error: 'Você já possui essa assinatura ativa.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Stripe ─────────────────────────────────────────────────────────────
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY não configurada');

    const stripeMode = stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST';
    console.log('[STRIPE] Mode:', stripeMode, '| Key prefix:', stripeKey.slice(0, 12));

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // ── Validação Inicial ──────────────────────────────────────────────────
    if (!priceId || typeof priceId !== 'string') {
      throw new Error('priceId inválido ou ausente');
    }

    const { id: userId, email } = user;

    if (!email) {
      throw new Error('E-mail do usuário não encontrado. Verifique sua conta.');
    }

    if (email === 'debug@test.com') {
      console.warn('[WARN] Usuário debug ativo. userId:', userId);
    }

    // ── Customer ────────────────────────────────────────────────────────────
    console.log('[CUSTOMER] Buscando customer para email:', email);
    const customers = await stripe.customers.list({ email, limit: 1 });

    let customer: Stripe.Customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
      console.log('[CUSTOMER] Customer existente:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      console.log('[CUSTOMER] Novo customer criado:', customer.id);
    }

    // [BILLING ROBUSTNES] Vincular o customer_id ao perfil para fallbacks do webhook
    const { error: customerSyncError } = await supabaseClient
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);
      
    if (customerSyncError) {
      console.warn('[CUSTOMER] Erro ao sincronizar stripe_customer_id:', customerSyncError.message);
    }

    // ── Cancelar subscriptions incompletas ──────────────────────────────────
    console.log('[SUBSCRIPTIONS] Listando subscriptions incomplete para customer:', customer.id);
    const existingIncomplete = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'incomplete',
      limit: 10,
    });
    console.log('[SUBSCRIPTIONS] Total incomplete encontradas:', existingIncomplete.data.length);

    let cancelledCount = 0;
    for (const sub of existingIncomplete.data) {
      const hasSamePrice = sub.items.data.some(item => item.price.id === priceId);
      if (hasSamePrice) {
        try {
          await stripe.subscriptions.cancel(sub.id);
          cancelledCount++;
          console.log('[SUBSCRIPTIONS] Cancelada:', sub.id);
        } catch (cancelErr: any) {
          // Não impede a criação de nova subscription
          console.warn('[SUBSCRIPTIONS] Falha ao cancelar', sub.id, ':', cancelErr.message);
        }
      }
    }

    if (cancelledCount > 0) {
      // Aguarda o Stripe processar os cancelamentos antes de criar nova subscription
      console.log('[SUBSCRIPTIONS] Aguardando processamento dos cancelamentos...');
      await sleep(500);
    }

    // ── Criar nova subscription ─────────────────────────────────────────────
    console.log('[CREATE] Criando subscription:', { customerId: customer.id, priceId });

    let subscription: Stripe.Subscription;
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'],
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId, supabase_user_id: userId, plan }, // CRÍTICO: Passar o plano no metadata!
      };

      if (couponCode && typeof couponCode === 'string') {
        subscriptionParams.coupon = couponCode.trim();
      }

      subscription = await stripe.subscriptions.create(subscriptionParams);
    } catch (stripeCreateErr: any) {
      console.error('[CREATE] Erro ao criar subscription:', {
        message: stripeCreateErr.message,
        type: stripeCreateErr.type,
        code: stripeCreateErr.code,
        raw: JSON.stringify(stripeCreateErr),
      });
      throw stripeCreateErr;
    }

    console.log('[CREATE] Subscription criada:', subscription.id, '| Status:', subscription.status);

    const invoice = subscription.latest_invoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent };
    console.log('[INVOICE] ID:', invoice?.id, '| Status:', invoice?.status);

    if (!invoice) throw new Error('Invoice não retornada pela Stripe');

    const subtotal = invoice.subtotal || 0;
    const amountDue = invoice.amount_due !== undefined ? invoice.amount_due : invoice.total || 0;
    const pricing = {
      originalPrice: subtotal / 100,
      finalPrice: amountDue / 100,
      discount: (subtotal - amountDue) / 100
    };

    // Tratamento para cupons de 100% de desconto ou faturas com amount_due === 0
    if (amountDue === 0 || invoice.status === 'paid') {
      console.log('[SUCCESS] Assinatura gratuita/zerada ativa, pulando Stripe Elements:', subscription.id);
      return new Response(
        JSON.stringify({
          isFree: true,
          subscriptionId: subscription.id,
          pricing
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const paymentIntent = invoice.payment_intent;
    console.log('[PI] ID:', paymentIntent?.id, '| Status:', (paymentIntent as any)?.status);

    if (!paymentIntent || typeof paymentIntent === 'string') {
      throw new Error('PaymentIntent não foi expandido corretamente. Verifique o expand.');
    }

    // ── Propagar userId para o PaymentIntent ────────────────────────────────
    console.log('[PI] Atualizando metadata com userId:', userId);
    const updatedPI = await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        userId,
        supabase_user_id: userId,
        subscription_id: subscription.id,
      },
    });

    console.log('[SUCCESS] subscriptionId:', subscription.id, '| clientSecret prefix:', updatedPI.client_secret?.slice(0, 25));

    return new Response(
      JSON.stringify({
        clientSecret: updatedPI.client_secret,
        subscriptionId: subscription.id,
        pricing
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    // Captura o erro real do Stripe (type, code, message)
    console.error('[ERROR FULL]', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      raw: JSON.stringify(error),
    });

    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno no servidor',
        type: error.type || 'unknown',
        code: error.code || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
