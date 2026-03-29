import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.21.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const planNames: Record<string, string> = {
  'monthly': 'Standard Mensal', 'annual': 'Standard Anual',
  'pro_monthly': 'Pro Mensal', 'pro_annual': 'Pro Anual',
};

async function sendEmail(to: string, subject: string, html: string, resendApiKey: string) {
  if (!resendApiKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: 'ShapeScan <no-reply@shapescan.com.br>', to, subject, html }),
    });
  } catch (e) { console.error('[EMAIL]', String(e)); }
}

function cancellationEmail(name: string, planName: string, expiryDate: string) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f4f4f4;padding:40px 30px;border-radius:16px;">
    <h1 style="font-size:22px;font-weight:900;color:#f4f4f4;margin:0 0 24px;">Cancelamento confirmado</h1>
    <p>Olá, <strong>${name}</strong>!</p>
    <p>Seu plano <strong>${planName}</strong> foi agendado para cancelamento.</p>
    <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin:24px 0;border-left:3px solid #10b981;">
      <p style="margin:0;color:#10b981;font-weight:700;">✅ Acesso garantido até: ${expiryDate}</p>
      <p style="margin:8px 0 0;color:#a1a1aa;font-size:14px;">Você não será cobrado novamente.</p>
    </div>
    <p style="color:#a1a1aa;">Se mudar de ideia, acesse <strong>Configurações → Assinatura</strong> e clique em <em>"Continuar com o plano"</em>.</p>
    <div style="text-align:center;margin-top:32px;">
      <a href="https://shapescan.com.br/settings" style="background:#10b981;color:#0a0a0a;padding:14px 28px;text-decoration:none;border-radius:50px;font-weight:900;">Reativar minha assinatura →</a>
    </div>
  </div>`;
}

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
  let user: { id: string; email: string };

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw new Error('Unauthorized');
    user = { id: data.user.id, email: data.user.email || '' };
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized — token inválido ou expirado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY não configurada');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia', httpClient: Stripe.createFetchHttpClient() });

    let reason = '', feedback = '';
    try { const body = await req.json(); reason = body?.reason || ''; feedback = body?.feedback || ''; } catch { /* opcional */ }

    // Buscar subscriptionId do banco — nunca confiar no frontend
    const { data: userPlan, error: planError } = await supabaseAdmin
      .from('user_plans')
      .select('subscription_id, plan_id, active, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (planError) throw new Error('Erro ao buscar dados da assinatura');
    if (!userPlan?.subscription_id) throw new Error('Nenhuma assinatura Stripe encontrada');
    if (!userPlan.active) throw new Error('Assinatura já está inativa');

    // ── Idempotência: verificar estado real no Stripe (fonte da verdade) ──────
    const currentSub = await stripe.subscriptions.retrieve(userPlan.subscription_id);
    if (currentSub.cancel_at_period_end) {
      // Já está cancelado no Stripe — sincronizar banco e retornar sucesso
      await supabaseAdmin.from('user_plans')
        .update({ cancel_at_period_end: true, current_period_end: currentSub.current_period_end })
        .eq('user_id', user.id);
      return new Response(
        JSON.stringify({ success: true, cancel_at_period_end: true, current_period_end: currentSub.current_period_end }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ── Chamar Stripe ANTES de qualquer persistência ──────────────────────────
    const updated = await stripe.subscriptions.update(userPlan.subscription_id, { cancel_at_period_end: true });

    // ── Só persiste após confirmação do Stripe ────────────────────────────────
    const nowTs = Math.floor(Date.now() / 1000);
    await supabaseAdmin.from('user_plans').update({
      cancel_at_period_end: true,
      current_period_end: updated.current_period_end,
      cancellation_reason: reason || null,
      cancellation_feedback: feedback || null,
      cancelled_at: nowTs,
    }).eq('user_id', user.id);

    // ── Email de confirmação ──────────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin.from('profiles').select('name').eq('id', user.id).maybeSingle();
    const userName = profile?.name || 'Atleta';
    const planName = planNames[userPlan.plan_id] || userPlan.plan_id;
    const expiryDate = new Date(updated.current_period_end * 1000)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    await sendEmail(user.email, '🔔 ShapeScan — Cancelamento confirmado',
      cancellationEmail(userName, planName, expiryDate),
      Deno.env.get('RESEND_API_KEY') || '');

    console.log('[CANCEL] OK:', { userId: user.id, reason, current_period_end: updated.current_period_end });

    return new Response(
      JSON.stringify({ success: true, cancel_at_period_end: true, current_period_end: updated.current_period_end }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[ERROR]', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
