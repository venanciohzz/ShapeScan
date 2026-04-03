import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verificar que o chamador é admin
  const token = authHeader.replace('Bearer ', '');
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (!callerProfile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { userEmail, userName, subject, message } = await req.json();
  if (!userEmail || !subject || !message) {
    return new Response(JSON.stringify({ error: 'Campos obrigatórios: userEmail, subject, message' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #10b981; font-size: 24px; margin: 0;">ShapeScan</h1>
        <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Evolução Física Inteligente</p>
      </div>
      <p style="color: #d1d5db; font-size: 16px;">Olá, <strong style="color: #ffffff;">${userName || 'atleta'}</strong>!</p>
      <div style="background: #111111; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; margin: 24px 0; white-space: pre-wrap; color: #d1d5db; font-size: 15px; line-height: 1.6;">
${message}
      </div>
      <hr style="border: none; border-top: 1px solid #1f2937; margin: 32px 0;" />
      <p style="color: #4b5563; font-size: 12px; text-align: center;">Equipe ShapeScan • <a href="https://shapescan.com.br" style="color: #10b981;">shapescan.com.br</a></p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ShapeScan <noreply@shapescan.com.br>',
      to: [userEmail],
      subject,
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ error: err?.message || `Resend error ${res.status}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
