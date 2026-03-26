// stripe-reactivate-by-token — Reativação com 1 clique via link no email
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.21.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const APP_URL = 'https://shapescan.com.br';

function htmlPage(title: string, message: string, isError = false) {
  const color = isError ? '#ef4444' : '#10b981';
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} · ShapeScan</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0a0a0a;color:#f4f4f4;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:400px;width:100%;background:#141414;border:1px solid #27272a;border-radius:24px;padding:40px;text-align:center}
  .icon{font-size:48px;margin-bottom:16px}.title{font-size:20px;font-weight:900;color:${color};margin-bottom:12px}
  .msg{color:#a1a1aa;font-size:14px;line-height:1.6;margin-bottom:24px}
  .btn{display:inline-block;background:${color};color:#0a0a0a;padding:14px 28px;border-radius:50px;font-weight:900;text-decoration:none;font-size:13px}</style>
  <meta http-equiv="refresh" content="4;url=${APP_URL}/settings">
  </head><body><div class="card">
  <div class="icon">${isError ? '⚠️' : '✅'}</div>
  <div class="title">${title}</div>
  <div class="msg">${message}</div>
  <a href="${APP_URL}/settings" class="btn">Ir para configurações →</a>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(htmlPage('Link inválido', 'Este link de reativação é inválido ou está incompleto.', true),
      { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const now = Math.floor(Date.now() / 1000);

  // Buscar plano pelo token
  const { data: plan, error } = await supabase
    .from('user_plans')
    .select('user_id, subscription_id, cancel_at_period_end, reactivation_token_expires_at, active')
    .eq('reactivation_token', token)
    .maybeSingle();

  if (error || !plan) {
    return new Response(htmlPage('Link não encontrado', 'Este link de reativação já foi usado ou não existe. Acesse as configurações para reativar manualmente.', true),
      { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  if (plan.reactivation_token_expires_at && plan.reactivation_token_expires_at < now) {
    return new Response(htmlPage('Link expirado', 'Este link expirou. Acesse as configurações do ShapeScan para reativar sua assinatura.', true),
      { status: 410, headers: { 'Content-Type': 'text/html' } });
  }

  if (!plan.cancel_at_period_end) {
    // Já está ativo — limpar token e redirecionar
    await supabase.from('user_plans')
      .update({ reactivation_token: null, reactivation_token_expires_at: null })
      .eq('user_id', plan.user_id);
    return new Response(htmlPage('Assinatura já ativa!', 'Sua assinatura já está ativa. Você será redirecionado em instantes.'),
      { status: 200, headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY não configurada');
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });

    if (!plan.subscription_id) throw new Error('Subscription ID não encontrado');

    // Reativar no Stripe
    await stripe.subscriptions.update(plan.subscription_id, { cancel_at_period_end: false });

    // Limpar flag de cancelamento e token (consumido)
    await supabase.from('user_plans').update({
      cancel_at_period_end: false,
      reactivation_token: null,
      reactivation_token_expires_at: null,
      expiry_reminder_sent_at: null,
    }).eq('user_id', plan.user_id);

    console.log('[REACTIVATE-TOKEN] Assinatura reativada para userId:', plan.user_id);

    return new Response(
      htmlPage('Assinatura reativada!', 'Tudo certo! Sua assinatura foi reativada com sucesso. Você continuará sendo cobrado normalmente. Redirecionando...'),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (err: any) {
    console.error('[REACTIVATE-TOKEN] Erro:', err.message);
    return new Response(
      htmlPage('Erro ao reativar', `Não foi possível reativar sua assinatura: ${err.message}. Tente pelas configurações do app.`, true),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
});
