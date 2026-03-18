import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map Price IDs to Plan IDs
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
// HELPER: Envio de email via Resend
// ============================================================
async function sendEmail(to: string, subject: string, html: string, resendApiKey: string) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
            from: 'ShapeScan <no-reply@shapescan.com.br>',
            to,
            subject,
            html,
        }),
    });
    return await response.json();
}

// ============================================================
// HELPER: Email de confirmação de compra (Stripe Template)
// ============================================================
function purchaseConfirmationEmail(customerName: string, planName: string, amount: number) {
    const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount / 100);

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f4f4f4; padding: 40px 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 28px; font-weight: 900; color: #10b981; margin: 0;">✅ Pagamento Confirmado!</h1>
      </div>
      <p style="font-size: 16px; color: #d1d5db;">Olá, <strong style="color: #fff;">${customerName || 'Atleta'}</strong>!</p>
      <p style="font-size: 16px; color: #d1d5db; line-height: 1.6;">
        Seu pagamento via Stripe foi aprovado e seu acesso ao <strong style="color: #10b981;">ShapeScan</strong> está liberado. Bem-vindo(a) à família! 💪
      </p>

      <div style="background: #1a1a1a; border: 1px solid #2d2d2d; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px;">Resumo do Pedido</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #9ca3af; padding: 8px 0; font-size: 14px;">Plano</td>
            <td style="color: #fff; text-align: right; font-weight: 700; font-size: 14px;">${planName}</td>
          </tr>
          <tr>
            <td style="color: #9ca3af; padding: 8px 0; font-size: 14px;">Valor</td>
            <td style="color: #10b981; text-align: right; font-weight: 700; font-size: 18px;">${amountFormatted}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://shapescan.com.br/dashboard"
           style="background: #10b981; color: #0a0a0a; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 900; font-size: 16px; display: inline-block; letter-spacing: 1px;">
          Acessar meu Dashboard →
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #2d2d2d; margin: 32px 0;" />
      <p style="font-size: 13px; color: #6b7280; text-align: center;">Dúvidas? Entre em contato: <a href="mailto:suporte@shapescan.com.br" style="color: #10b981;">suporte@shapescan.com.br</a></p>
      <p style="font-size: 12px; color: #4b5563; text-align: center; font-weight: 700; letter-spacing: 2px; margin-top: 8px;">EQUIPE SHAPESCAN</p>
    </div>`;
}

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

  if (!stripeKey || !endpointSecret) {
    return new Response('Stripe secrets not configured', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerEmail = session.customer_email || session.customer_details?.email;
      
      // Get line items to identify the price
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      });
      const priceId = expandedSession.line_items?.data[0]?.price?.id;
      const planId = priceId ? priceToPlan[priceId] : 'monthly';
      const planDisplayName = planNames[planId] || 'Plano';

      if (!userId) {
        throw new Error('No client_reference_id in session');
      }

      console.log(`[Stripe Webhook] Processing successful checkout for user ${userId} | Plan: ${planId}`);

      // 1. Record payment
      await supabase.from('payments').insert({
        user_id: userId,
        plan_id: planId,
        amount: session.amount_total,
        status: 'approved',
        provider: 'stripe',
        metadata: {
          stripe_session_id: session.id,
          stripe_customer_id: session.customer,
          customer_email: customerEmail,
          payment_intent: session.payment_intent,
        }
      });

      // 2. Activate user plan
      await supabase.from('user_plans').upsert({
        user_id: userId,
        plan_id: planId,
        active: true,
      }, {
        onConflict: 'user_id'
      });

      // 3. Send Confirmation Email
      if (customerEmail && resendApiKey) {
        const customerName = session.customer_details?.name || 'Atleta';
        await sendEmail(
          customerEmail,
          `✅ Pagamento confirmado — ${planDisplayName}`,
          purchaseConfirmationEmail(customerName, planDisplayName, session.amount_total || 0),
          resendApiKey
        );
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error(`[Stripe Webhook] Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
