// stripe-expiry-reminder — Envia email 3 dias antes do cancelamento expirar (com dedup + token 1-clique)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_PROJECT = 'eqhedmkgwyczxmmztpkj';

const planNames: Record<string, string> = {
  'monthly': 'Standard Mensal', 'annual': 'Standard Anual',
  'pro_monthly': 'Pro Mensal', 'pro_annual': 'Pro Anual',
};

async function sendEmail(to: string, subject: string, html: string, resendApiKey: string) {
  if (!resendApiKey) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: 'ShapeScan <no-reply@shapescan.com.br>', to, subject, html }),
    });
    if (!res.ok) console.error('[EMAIL] Resend status:', res.status);
  } catch (e) { console.error('[EMAIL]', String(e)); }
}

function expiryReminderEmail(name: string, planName: string, expiryDate: string, reactivateUrl: string) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f4f4f4;padding:40px 30px;border-radius:16px;">
    <h1 style="font-size:22px;font-weight:900;color:#f59e0b;margin:0 0 24px;">⏰ Seu acesso expira em 3 dias</h1>
    <p>Olá, <strong>${name}</strong>!</p>
    <p>Seu plano <strong>${planName}</strong> será encerrado em <strong>${expiryDate}</strong>.</p>
    <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 8px;font-weight:700;">Após essa data você perderá:</p>
      <ul style="color:#a1a1aa;margin:0;padding-left:20px;line-height:1.8;">
        <li>Análises ilimitadas de shape e alimentação</li>
        <li>Personal 24h — seu coach de IA sempre disponível</li>
        <li>Histórico e evolução de resultados</li>
        <li>Planos nutricionais personalizados</li>
      </ul>
    </div>
    <p>Reative com um único clique — sem precisar logar:</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${reactivateUrl}" style="background:#10b981;color:#0a0a0a;padding:16px 32px;text-decoration:none;border-radius:50px;font-weight:900;font-size:15px;">✅ Continuar com o plano →</a>
    </div>
    <p style="color:#52525b;font-size:12px;margin-top:40px;text-align:center;">Este link expira em 7 dias · ShapeScan</p>
  </div>`;
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

  const now = Math.floor(Date.now() / 1000);
  const in3Days = now + (3 * 24 * 60 * 60);
  const in4Days = now + (4 * 24 * 60 * 60);

  console.log('[EXPIRY-REMINDER] Iniciando busca de assinaturas expirando em 3 dias...');

  // Buscar usuários com cancelamento programado expirando em 3 dias
  // que ainda não receberam o email (dedup via expiry_reminder_sent_at)
  const { data: plans, error } = await supabase
    .from('user_plans')
    .select('user_id, plan_id, current_period_end, subscription_id, expiry_reminder_sent_at')
    .eq('cancel_at_period_end', true)
    .eq('active', true)
    .gte('current_period_end', in3Days)
    .lt('current_period_end', in4Days);

  if (error) {
    console.error('[EXPIRY-REMINDER] Erro ao buscar planos:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!plans?.length) {
    console.log('[EXPIRY-REMINDER] Nenhum usuário expirando hoje.');
    return new Response(JSON.stringify({ sent: 0, skipped: 0 }), { status: 200 });
  }

  let sent = 0, skipped = 0;

  for (const plan of plans) {
    // ── Dedup: já enviou email para este ciclo? ──────────────────────────────
    if (plan.expiry_reminder_sent_at && plan.expiry_reminder_sent_at > (now - 7 * 24 * 60 * 60)) {
      console.log('[EXPIRY-REMINDER] Pulando (já enviado):', plan.user_id);
      skipped++;
      continue;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', plan.user_id)
        .maybeSingle();

      if (!profile?.email) { skipped++; continue; }

      // ── Gerar token de reativação 1-clique (expira em 7 dias) ────────────
      const reactivationToken = crypto.randomUUID();
      const tokenExpiresAt = now + (7 * 24 * 60 * 60);

      await supabase.from('user_plans').update({
        expiry_reminder_sent_at: now,
        reactivation_token: reactivationToken,
        reactivation_token_expires_at: tokenExpiresAt,
      }).eq('user_id', plan.user_id);

      const reactivateUrl = `https://${SUPABASE_PROJECT}.supabase.co/functions/v1/stripe-reactivate-by-token?token=${reactivationToken}`;
      const expiryDate = new Date(plan.current_period_end * 1000)
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const planName = planNames[plan.plan_id] || plan.plan_id;

      await sendEmail(
        profile.email,
        '⏰ ShapeScan — Seu acesso expira em 3 dias',
        expiryReminderEmail(profile.name || 'Atleta', planName, expiryDate, reactivateUrl),
        resendApiKey
      );

      sent++;
      console.log('[EXPIRY-REMINDER] Email enviado:', profile.email);
    } catch (err: any) {
      console.error('[EXPIRY-REMINDER] Erro para userId:', plan.user_id, err.message);
    }
  }

  console.log('[EXPIRY-REMINDER] Concluído. sent:', sent, '| skipped:', skipped);
  return new Response(JSON.stringify({ success: true, sent, skipped }), { status: 200 });
});
