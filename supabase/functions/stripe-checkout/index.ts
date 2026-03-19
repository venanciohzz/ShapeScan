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

    // 1. Get request body with validation
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[Stripe Checkout] Error parsing request body:', e);
      throw new Error('Corpo da requisição inválido');
    }

    const { priceId, userId, email, returnUrl } = body;

    if (!priceId || !userId || !email) {
      console.error('[Stripe Checkout] Missing parameters:', { priceId, userId, email });
      throw new Error('Parâmetros obrigatórios ausentes: priceId, userId, email');
    }

    console.log(`[Stripe Checkout] Creating session for user ${userId} (${email}) with price ${priceId}`);

    // 2. Create Checkout Session in embedded mode
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: email,
      client_reference_id: userId,
      return_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    });

    console.log(`[Stripe Checkout] Session created: ${session.id}`);

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[Stripe Checkout] Error message:', error.message);
    console.error('[Stripe Checkout] Full error:', error);
    
    // Fallback: return 200 with error so frontend can see the message
    // (helps debug without dashboard access)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        isError: true,
        code: error.code // Stripe error code if available
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 to see the JSON
      }
    );
  }
});
