// Trigger deployment
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log(`[Stripe Checkout] Received ${req.method} request to ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('[Stripe Checkout] STRIPE_SECRET_KEY is not set');
      throw new Error('Configuração do servidor incompleta (Stripe Key)');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 1. Get request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[Stripe Checkout] Error parsing request body:', e);
      throw new Error('Corpo da requisição inválido');
    }

    const { priceId, userId, email } = body;

    if (!priceId || !userId || !email) {
      console.error('[Stripe Checkout] Missing parameters:', { priceId, userId, email });
      throw new Error('Parâmetros obrigatórios ausentes: priceId, userId, email');
    }

    console.log(`[Stripe Checkout] Processing for user ${userId} (${email})`);

    // 2. Find or Create Customer
    const customers = await stripe.customers.list({ email: email, limit: 1 });
    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: { supabase_user_id: userId },
      });
    }

    // 3. Create Subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card', 'pix'], // Explicitly allow cards and PIX
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: userId },
    });

    const paymentIntent = (subscription.latest_invoice as any).payment_intent;

    if (!paymentIntent) {
      throw new Error('Falha ao gerar intenção de pagamento para a assinatura.');
    }

    console.log(`[Stripe Checkout] Subscription created: ${subscription.id}`);

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription.id 
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
        status: 200,
      }
    );
  }
});
