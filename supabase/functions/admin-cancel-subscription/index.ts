import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.21.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = authHeader.replace('Bearer ', '');

  // Verificar que o chamador é admin
  let callerUserId: string;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw new Error('Unauthorized');
    callerUserId = data.user.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', callerUserId)
    .maybeSingle();

  if (!callerProfile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Acesso negado — permissão de admin necessária' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { targetUserId } = await req.json();
    if (!targetUserId) throw new Error('targetUserId é obrigatório');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY não configurada');
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });

    // Buscar assinatura do usuário alvo
    const { data: userPlan, error: planError } = await supabaseAdmin
      .from('user_plans')
      .select('subscription_id, plan_id, active, cancel_at_period_end')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (planError) throw new Error('Erro ao buscar dados da assinatura');
    if (!userPlan?.subscription_id) throw new Error('Nenhuma assinatura Stripe encontrada para este usuário');
    if (!userPlan.active) throw new Error('Assinatura já está inativa');

    // Idempotência: verificar estado real no Stripe
    const currentSub = await stripe.subscriptions.retrieve(userPlan.subscription_id);
    if (currentSub.cancel_at_period_end) {
      await supabaseAdmin.from('user_plans')
        .update({ cancel_at_period_end: true, current_period_end: currentSub.current_period_end })
        .eq('user_id', targetUserId);
      return new Response(
        JSON.stringify({ success: true, already_cancelled: true, current_period_end: currentSub.current_period_end }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Cancelar no Stripe (no fim do período — sem estorno)
    const updated = await stripe.subscriptions.update(userPlan.subscription_id, { cancel_at_period_end: true });

    const nowTs = Math.floor(Date.now() / 1000);
    await supabaseAdmin.from('user_plans').update({
      cancel_at_period_end: true,
      current_period_end: updated.current_period_end,
      cancellation_reason: 'admin',
      cancelled_at: nowTs,
    }).eq('user_id', targetUserId);

    const expiryDate = new Date(updated.current_period_end * 1000)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    console.log('[ADMIN-CANCEL] OK:', { targetUserId, adminId: callerUserId, current_period_end: updated.current_period_end });

    return new Response(
      JSON.stringify({ success: true, cancel_at_period_end: true, current_period_end: updated.current_period_end, expiry_date: expiryDate }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[ERROR]', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
