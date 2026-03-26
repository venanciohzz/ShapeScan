// stripe-expiry-reminder — Envia email 3 dias antes do cancelamento expirar
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const planNames: Record<string, string> = {
  'monthly': 'Standard Mensal',
  'annual': 'Standard Anual',
  'pro_monthly': 'Pro Mensal',
  'pro_annual': 'Pro Anual',
};

async function sendEmail(to: string, subject: string, html: string, resendApiKey: string) {
  if (!resendApiKey) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: 'ShapeScan <no-reply@shapescan.com.br>', to, subject, html }),
    });
    if (!res.ok) console.error('[EMAIL] Resend retornou:', res.status);
  } catch (e) { console.error('[EMAIL] Erro:', String(e)); }
}

function expiryReminderEmail(name: string, planName: string, expiryDate: string) {
  return `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f4f4f4; padding: 40px 30px; border-radius: 16px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 24px; font-weight: 900; color: #f59e0b; margin: 0;">⏰ Seu acesso expira em 3 dias</h1>
    </div>
    <p>Olá, <strong>${name}</strong>!</p>
    <p>Seu plano <strong>${planName}</strong> será encerrado em <strong>${expiryDate}</strong>.</p>
    <div style="background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px; font-weight: 700;">Após essa data você perderá:</p>
      <ul style="color: #a1a1aa; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>Análises ilimitadas de shape e alimentação</li>
        <li>Personal 24h — seu coach de IA sempre disponível</li>
        <li>Histórico e evolução de resultados</li>
        <li>Planos nutricionais personalizados</li>
      </ul>
    </div>
    <p>Se quiser continuar, é só reativar com um clique:</p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://shapescan.com.br/settings" style="background: #10b981; color: #0a0a0a; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 900; font-size: 15px;">Reativar minha assinatura →</a>
    </div>
    <p style="color: #52525b; font-size: 12px; margin-top: 40px; text-align: center;">ShapeScan · Esperamos te ver de volta em breve! 💪</p>
  </div>`;
}

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

  const now = Math.floor(Date.now() / 1000);
  const in3Days = now + (3 * 24 * 60 * 60);
  const in4Days = now + (4 * 24 * 60 * 60);

  console.log('[EXPIRY-REMINDER] Buscando assinaturas expirando entre', new Date(in3Days * 1000).toISOString(), 'e', new Date(in4Days * 1000).toISOString());

  // Buscar usuários com cancelamento programado expirando em 3 dias
  const { data: plans, error } = await supabase
    .from('user_plans')
    .select('user_id, plan_id, current_period_end')
    .eq('cancel_at_period_end', true)
    .eq('active', true)
    .gte('current_period_end', in3Days)
    .lt('current_period_end', in4Days);

  if (error) {
    console.error('[EXPIRY-REMINDER] Erro ao buscar planos:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!plans || plans.length === 0) {
    console.log('[EXPIRY-REMINDER] Nenhum usuário expirando hoje.');
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  let sent = 0;
  for (const plan of plans) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', plan.user_id)
        .maybeSingle();

      if (!profile?.email) continue;

      const name = profile.name || 'Atleta';
      const planName = planNames[plan.plan_id] || plan.plan_id;
      const expiryDate = new Date(plan.current_period_end * 1000)
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      await sendEmail(
        profile.email,
        '⏰ ShapeScan — Seu acesso expira em 3 dias',
        expiryReminderEmail(name, planName, expiryDate),
        resendApiKey
      );

      sent++;
      console.log('[EXPIRY-REMINDER] Email enviado para:', profile.email);
    } catch (err: any) {
      console.error('[EXPIRY-REMINDER] Erro ao processar userId:', plan.user_id, err.message);
    }
  }

  console.log('[EXPIRY-REMINDER] Concluído. Emails enviados:', sent);
  return new Response(JSON.stringify({ success: true, sent }), { status: 200 });
});
