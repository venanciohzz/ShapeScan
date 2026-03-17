import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Parse Request (Expected from pg_cron/pg_net)
        const { user_id, email, queue_id } = await req.json();

        if (!user_id || !queue_id) {
            throw new Error("Missing user_id or queue_id");
        }

        console.log(`Checking recovery for user: ${user_id} (${email})`);

        // 2. Verificar Condição 1: Usuário não concluiu o quiz
        // O quiz é considerado concluído se 'weight' e 'height' estiverem preenchidos no perfil
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('name, weight, height')
            .eq('id', user_id)
            .single();

        if (profileError || !profile) {
            console.error(`Profile error for ${user_id}:`, profileError);
            await supabaseAdmin.from('email_recovery_queue').update({ status: 'failed', error_message: 'Profile not found' }).eq('id', queue_id);
            return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 });
        }

        const isQuizComplete = profile.weight !== null && profile.height !== null;

        // 3. Verificar Condição 2: Usuário não chegou à dashboard (não tem logs de uso)
        const { count: usageCount, error: usageError } = await supabaseAdmin
            .from('daily_usage')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id);

        const hasAccessedDashboard = (usageCount || 0) > 0;

        console.log(`User ${user_id} - Quiz Complete: ${isQuizComplete}, Has Usage: ${hasAccessedDashboard}`);

        // 4. Lógica de Decisão
        if (isQuizComplete || hasAccessedDashboard) {
            console.log(`Recovery cancelled for ${user_id}: Conditions not met (User already progressed)`);
            await supabaseAdmin.from('email_recovery_queue').update({ status: 'cancelled' }).eq('id', queue_id);
            return new Response(JSON.stringify({ status: "cancelled", message: "User already progressed" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        // 5. Enviar Email via Resend
        console.log(`Sending recovery email to ${email}...`);
        
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
                <h1 style="color: #10b981; font-size: 24px; font-weight: bold;">Olá,</h1>
                
                <p style="font-size: 16px; line-height: 1.6;">
                    Vi que você já confirmou seu email no <strong>ShapeScan</strong>. Agora falta só um passo rápido para descobrir seu resultado.
                </p>
                
                <p style="font-size: 16px; line-height: 1.6;">
                    Nosso quiz leva menos de um minuto e vai identificar o formato ideal do seu rosto.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://shapescan.com.br" 
                       style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
                        Começar meu ShapeScan
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280;">
                    Depois de responder o quiz você já recebe seu resultado imediatamente.
                </p>
                
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                
                <p style="font-size: 14px; font-weight: bold; color: #374151;">Equipe ShapeScan</p>
            </div>
        `;

        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'ShapeScan <no-reply@shapescan.com.br>',
                to: email,
                subject: 'Você já confirmou seu email. Agora falta só seu ShapeScan.',
                html: emailHtml,
            }),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
            console.error("Resend API Error:", resendData);
            throw new Error(`Resend Error: ${JSON.stringify(resendData)}`);
        }

        // 6. Atualizar Fila como Sucesso
        await supabaseAdmin.from('email_recovery_queue').update({ 
            status: 'sent', 
            updated_at: new Date().toISOString() 
        }).eq('id', queue_id);

        console.log(`Recovery email sent successfully to ${email}`);

        return new Response(JSON.stringify({ status: "success", resend_id: resendData.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error(`Edge Function Exception: ${error.message}`);
        
        // Tentativa de logar o erro no banco se possível
        try {
            const body = await req.json().catch(() => ({}));
            if (body.queue_id) {
                // Aqui não temos o client inicializado se deu erro no try exterior, mas tentamos isolar
                 const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                 const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                 const admin = createClient(supabaseUrl, supabaseServiceKey);
                 await admin.from('email_recovery_queue').update({ 
                     status: 'failed', 
                     error_message: error.message 
                 }).eq('id', body.queue_id);
            }
        } catch (e) {
            console.error("Critical: Could not update queue status on failure", e);
        }

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
