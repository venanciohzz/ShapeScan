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

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Parse Request
        const { email } = await req.json();
        const t0 = Date.now();

        if (!email) {
            throw new Error("E-mail é obrigatório");
        }

        const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c);
        console.log(`Solicitação de recuperação de senha para: ${maskedEmail}`);

        // 2. Gerar link de recuperação via Admin API
        const t1 = Date.now();
        const { data, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: {
                redirectTo: "https://shapescan.com.br/nova-senha"
            }
        });
        const t2 = Date.now();
        console.log(`Link gerado em ${t2 - t1}ms`);

        if (linkError) {
          console.error("Erro ao gerar link de recuperação (detalhes omitidos por segurança)");
          // Retorna sempre a mesma mensagem genérica — não revela se o email existe ou não
          return new Response(JSON.stringify({
            success: true,
            message: "Se este e-mail estiver cadastrado, você receberá o link em breve."
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }

        const recoveryLink = data.properties.action_link;

        // 3. Enviar Email via Resend
        console.log(`Enviando e-mail de recuperação para ${maskedEmail}...`);
        const t3 = Date.now();
        
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
            </head>
            <body style="font-family: sans-serif; background-color: #09090b; margin: 0; padding: 0;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                        <div style="margin-bottom: 30px;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.025em;">ShapeScan</h1>
                            <p style="color: #10b981; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 5px;">Evolução Inteligente</p>
                        </div>
                        
                        <h2 style="color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 15px;">Recuperar Acesso</h2>
                        
                        <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                            Você solicitou a redefinição de sua senha. Clique no botão abaixo para definir uma nova senha e voltar à sua jornada.
                        </p>
                        
                        <div style="margin: 40px 0;">
                            <a href="${recoveryLink}" 
                               style="background-color: #ffffff; color: #09090b; padding: 18px 36px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 14px; display: inline-block; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.2s ease;">
                                Redefinir Minha Senha
                            </a>
                        </div>
                        
                        <p style="color: #71717a; font-size: 14px; margin-top: 40px;">
                            Se você não solicitou isso, pode ignorar este e-mail com segurança. <br>
                            O link expira em 24 horas.
                        </p>
                        
                        <hr style="border: 0; border-top: 1px solid #27272a; margin: 40px 0;" />
                        
                        <p style="color: #52525b; font-size: 12px;">
                            &copy; ${new Date().getFullYear()} ShapeScan - Inteligência Artificial para sua Performance.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // 4. RETRY LEVE: Resiliência contra timeout isolados ou instabilidade da rede no edge
        const fetchRetry = async (url: string, options: any, retries = 1) => {
            try { return await fetch(url, options); }
            catch (err) {
                if (retries > 0) {
                    console.warn('[Retry] Falha na request externa. Tentando novamente...', err);
                    return await fetch(url, options); 
                }
                throw err;
            }
        };

        const resendResponse = await fetchRetry('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'ShapeScan <no-reply@shapescan.com.br>',
                to: email,
                subject: 'Link para redefinir sua senha — ShapeScan',
                html: emailHtml,
            }),
        }, 1);

        const t4 = Date.now();
        console.log(`Email enviado via Resend em ${t4 - t3}ms`);
        console.log(`Tempo total da função: ${t4 - t0}ms`);

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
            console.error("Resend API Error:", resendData);
            throw new Error(`Resend Error: ${JSON.stringify(resendData)}`);
        }

        console.log(`E-mail de recuperação enviado com sucesso para ${maskedEmail}`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: "E-mail de recuperação enviado com sucesso." 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error: any) {
        console.error(`Edge Function Exception: ${error.message}`);
        
        // IMPORTANTE: Retornar status 500 para que o frontend detecte o erro via response.ok
        return new Response(JSON.stringify({ 
          error: error.message,
          message: "Ocorreu um erro ao processar sua solicitação." 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 // Correto: status de erro real para que o cliente detecte
        });
    }
});
