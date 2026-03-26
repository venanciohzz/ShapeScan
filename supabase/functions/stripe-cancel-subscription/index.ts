import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.21.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  let user: { id: string; email: string };
  const token = authHeader.replace('Bearer ', '');

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) throw error;
    if (!data.user) throw new Error('No user returned');
    user = { id: data.user.id, email: data.user.email || '' };
  } catch (err: any) {
    console.error('[AUTH] Falha na validação do token:', err?.message);
    return new Response(JSON.stringify({ error: 'Unauthorized — token inválido ou expirado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY não configurada');

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Buscar subscriptionId do banco — nunca confiar no frontend
    const { data: userPlan, error: planError } = await supabaseAdmin
      .from('user_plans')
      .select('subscription_id, plan_id, active, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (planError) throw new Error('Erro ao buscar dados da assinatura');
    if (!userPlan?.subscription_id) throw new Error('Nenhuma assinatura Stripe encontrada para este usuário');
    if (!userPlan.active) throw new Error('Assinatura já está inativa');
    if (userPlan.cancel_at_period_end) {
      return new Response(
        JSON.stringify({ error: 'Assinatura já está programada para cancelamento ao fim do período' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CANCEL] Agendando cancelamento para:', { userId: user.id, subscriptionId: userPlan.subscription_id });

    // Cancelar ao fim do período — nunca cancelamento imediato
    const subscription = await stripe.subscriptions.update(userPlan.subscription_id, {
      cancel_at_period_end: true,
    });

    console.log('[CANCEL] Stripe atualizado. cancel_at_period_end:', subscription.cancel_at_period_end, '| current_period_end:', subscription.current_period_end);

    // Sincronizar estado local
    const { error: updateError } = await supabaseAdmin
      .from('user_plans')
      .update({
        cancel_at_period_end: true,
        current_period_end: subscription.current_period_end,
      })
      .eq('user_id', user.id);

    if (updateError) {
      // Não bloqueia o retorno — o Stripe já foi atualizado e o webhook vai sincronizar
      console.warn('[CANCEL] Erro ao atualizar user_plans localmente:', updateError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[ERROR]', { message: error.message, type: error.type, code: error.code });
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno no servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
