// Trigger deployment v2 - Fixed: anti-duplicate + userId propagation to PaymentIntent
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.21.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log(`[Stripe Checkout] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ============================================================
  // VALIDAÇÃO JWT: Bloquear acesso não autenticado
  // Previne geração de checkouts spoofados por injeção no body
  // ============================================================
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    console.error('[Stripe Checkout] Missing Authorization header');
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error('[Stripe Checkout] Invalid JWT:', authError?.message);
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('[Stripe Checkout] STRIPE_SECRET_KEY is not set');
      throw new Error('Configuração do servidor incompleta (Stripe Key)');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error('Corpo da requisição inválido');
    }

    const { priceId } = body;
    // Forçar uso do ID e Email atestados pelo JWT, não pelo body (segurança)
    const userId = user.id;
    const email = user.email || body.email;

    if (!priceId || !userId || !email) {
      console.error('[Stripe Checkout] Missing parameters:', { priceId, userId, email });
      throw new Error('Parâmetros obrigatórios ausentes: priceId, userId, email');
    }

    console.log(`[Stripe Checkout] Processing for verified user ${userId} (${email})`);

    // ============================================================
    // 1. FIND OR CREATE STRIPE CUSTOMER
    // Busca primeiro por metadata.supabase_user_id para evitar duplicatas
    // mesmo que o email mude.
    // ============================================================
    let customer: Stripe.Customer | null = null;

    // Buscar por supabase_user_id nos metadados (mais confiável)
    const customersByMetadata = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${userId}'`,
      limit: 1,
    });

    if (customersByMetadata.data.length > 0) {
      customer = customersByMetadata.data[0];
      console.log(`[Stripe Checkout] Customer found by userId metadata: ${customer.id}`);
    } else {
      // Fallback: buscar por email
      const customersByEmail = await stripe.customers.list({ email, limit: 1 });
      if (customersByEmail.data.length > 0) {
        customer = customersByEmail.data[0];
        // Garantir que o metadata está atualizado
        if (!customer.metadata?.supabase_user_id) {
          customer = await stripe.customers.update(customer.id, {
            metadata: { supabase_user_id: userId }
          }) as Stripe.Customer;
        }
        console.log(`[Stripe Checkout] Customer found by email: ${customer.id}`);
      } else {
        // Criar novo customer
        customer = await stripe.customers.create({
          email,
          name: email.split('@')[0],
          preferred_locales: ['pt-BR'],
          metadata: { supabase_user_id: userId },
        }) as Stripe.Customer;
        console.log(`[Stripe Checkout] New customer created: ${customer.id}`);
      }
    }

    // ============================================================
    // 2. CANCELAR ASSINATURAS INCOMPLETAS ANTERIORES
    // Evita cobrança duplicada por tentativas repetidas no mesmo plano.
    // Somente cancela assinaturas "incomplete" (nunca foram pagas).
    // ============================================================
    const existingIncomplete = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'incomplete',
      limit: 10,
    });

    for (const sub of existingIncomplete.data) {
      // Verificar se é o mesmo priceId para evitar cancelar assinaturas de outros planos
      const hasSamePrice = sub.items.data.some(item => item.price.id === priceId);
      if (hasSamePrice) {
        await stripe.subscriptions.cancel(sub.id);
        console.log(`[Stripe Checkout] Cancelled incomplete subscription: ${sub.id}`);
      }
    }

    // ============================================================
    // 3. CRIAR ASSINATURA COM METADATA COMPLETO
    // ============================================================
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      // CRÍTICO: userId nos metadados da subscription
      metadata: { userId, supabase_user_id: userId },
    });

    const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;

    if (!paymentIntent) {
      throw new Error('Falha ao gerar intenção de pagamento para a assinatura.');
    }

    // ============================================================
    // 4. PROPAGAR userId PARA OS METADADOS DO PAYMENT INTENT
    // CRÍTICO: O webhook escuta payment_intent.succeeded e precisa
    // do userId nos metadados do PaymentIntent, não da Subscription.
    // O Stripe NÃO herda automaticamente os metadados da Subscription.
    // ============================================================
    const updatedPI = await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        userId,
        supabase_user_id: userId,
        subscription_id: subscription.id,
      },
    });

    console.log(`[Stripe Checkout] Subscription created: ${subscription.id} | PI: ${paymentIntent.id} | userId set: ${userId}`);

    return new Response(
      JSON.stringify({
        clientSecret: updatedPI.client_secret,
        subscriptionId: subscription.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[Stripe Checkout] Error:', error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
        isError: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
