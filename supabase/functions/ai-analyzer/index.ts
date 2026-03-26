import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        // ── 1. AUTENTICAÇÃO ────────────────────────────────────────────────
        console.log('[AUTH] Header present:', !!authHeader, '| Prefix:', authHeader?.substring(0, 15));
        let user = null;
        if (authHeader) {
            const token = authHeader.split(' ').pop();
            if (token) {
                console.log('[AUTH] Token prefix:', token.substring(0, 20));
                const { data: { user: foundUser }, error: authError } = await adminClient.auth.getUser(token);
                console.log('[AUTH] getUser result:', { hasUser: !!foundUser, userId: foundUser?.id?.substring(0, 8), error: authError?.message });
                if (authError) {
                    console.error('Auth error:', authError.message);
                }
                user = foundUser;
            } else {
                console.error('Malformed Authorization header:', authHeader);
            }
        }

        if (!user) {
            console.warn('[AUTH] No user — returning 401. authHeader present:', !!authHeader);
            return new Response(JSON.stringify({
                error: "Sessão inválida ou expirada. Por favor, saia e entre novamente no ShapeScan.",
                isError: true,
                code: 'AUTH_REQUIRED'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
        }

        // ── 1.1 Bloqueio de Emails Temporários ─────────────────────────────
        const forbiddenDomains = ['temp-mail.org', 'guerrillamail.com', '10minutemail.com', 'mailinator.com', 'yopmail.com', 'throwam.com'];
        const userEmailDomain = user.email?.split('@')[1]?.toLowerCase();
        if (userEmailDomain && forbiddenDomains.includes(userEmailDomain)) {
            return new Response(JSON.stringify({
                error: "O uso de e-mails temporários não é permitido. Por favor, use um e-mail válido.",
                isError: true
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
        }

        // ── 2. PARSE DO BODY ────────────────────────────────────────────────
        const rawBody = await req.text();
        console.log(`REQ BODY SIZE: ${rawBody.length} bytes`);

        let bodyJson;
        try {
            bodyJson = JSON.parse(rawBody);
        } catch (e) {
            return new Response(JSON.stringify({
                error: `JSON do Frontend inválido: ${e.message}`,
                isError: true
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        const { image, prompt, systemPrompt, type } = bodyJson;
        const requestType = type || 'chat';

        // ── 3. VERIFICAR PLANO ──────────────────────────────────────────────
        const { data: planData } = await adminClient
            .from('user_plans')
            .select('plan_id')
            .eq('user_id', user.id)
            .eq('active', true)
            .single();
        const userPlan = planData?.plan_id || 'free';

        // ── 4. VERIFICAR STATUS DE ADMIN (via tabela admin_users — sem hardcode) ─
        const { data: adminRow } = await adminClient
            .from('admin_users')
            .select('email')
            .eq('email', user.email)
            .maybeSingle();
        const isAdmin = !!adminRow;

        // ── 5. CALCULAR DATA COM OFFSET UTC-1H ──────────────────────────────
        // Alinha com o getTrackingDateString() do frontend: dia vira à 1h da manhã.
        // Exemplo: 00:30 UTC → ainda considera "ontem"; 01:00 UTC → "hoje"
        const adjusted = new Date(Date.now() - 60 * 60 * 1000);
        const today = adjusted.toISOString().split('T')[0];

        // ── 6. LIMITES POR TIPO E PLANO ─────────────────────────────────────
        // Shape scanner tem limites menores que o food scanner (análise mais pesada)
        const getLimit = (plan: string, scanType: string): number => {
            if (scanType === 'shape') {
                switch (plan) {
                    case 'pro_monthly':
                    case 'pro_annual': return 4;
                    case 'monthly':
                    case 'annual':
                    case 'lifetime': return 2;
                    default: return 0; // free: bloqueado no shape
                }
            }
            // food
            switch (plan) {
                case 'pro_monthly':
                case 'pro_annual': return 12;
                case 'monthly':
                case 'annual':
                case 'lifetime': return 6;
                default: return 1; // 1 scan gratuito vitalício
            }
        };

        // ── 7. VERIFICAR E RESERVAR SLOT ATOMICAMENTE ───────────────────────
        // Chat não consome quota (personal trainer 24h é ilimitado).
        // Admin tem acesso ilimitado.
        // A reserva acontece ANTES da chamada à OpenAI para eliminar race conditions.
        if (requestType !== 'chat' && !isAdmin) {
            const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
                        || req.headers.get('x-real-ip')?.trim()
                        || 'unknown';

            if (userPlan === 'free') {
                // A. Disjuntor global: máximo de 200 scans gratuitos por dia
                const { count: globalDailyCount } = await adminClient
                    .from('free_scan_usage')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', today);

                if (globalDailyCount !== null && globalDailyCount >= 200) {
                    console.error("GLOBAL FREE LIMIT REACHED");
                    return new Response(JSON.stringify({
                        error: "O limite global de análises gratuitas para hoje foi atingido. Tente novamente amanhã ou adquira um plano.",
                        isError: true,
                        isLimitReached: true
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
                }

                // B. Limite de IP: máximo de 3 scans por IP POR DIA (CORRIGIDO: era vitalício)
                const { count: ipScanCount } = await adminClient
                    .from('free_scan_usage')
                    .select('*', { count: 'exact', head: true })
                    .eq('ip_address', userIp)
                    .gte('created_at', today);

                if (ipScanCount !== null && ipScanCount >= 3) {
                    console.warn(`IP Daily Limit Reached: ${userIp}`);
                    return new Response(JSON.stringify({
                        error: "Limite de análises gratuitas atingido para este dispositivo hoje. Tente novamente amanhã ou adquira um plano.",
                        isError: true,
                        isLimitReached: true
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
                }

                // C. Reserva atômica do scan gratuito vitalício via RPC
                // claim_free_slot faz UPDATE profiles SET free_scans_used = free_scans_used + 1
                // WHERE id = ? AND free_scans_used < 1 — operação atômica no PostgreSQL.
                const { data: slotClaimed, error: claimError } = await adminClient
                    .rpc('claim_free_slot', { p_user_id: user.id, p_type: requestType });

                if (claimError) {
                    console.error('claim_free_slot error:', claimError.message);
                    return new Response(JSON.stringify({
                        error: "Erro interno ao verificar seu limite. Tente novamente.",
                        isError: true
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
                }

                if (!slotClaimed) {
                    return new Response(JSON.stringify({
                        error: "Você já utilizou sua análise gratuita vitalícia. Adquira um plano para continuar tendo acesso.",
                        isError: true,
                        isLimitReached: true,
                        showPaywall: true
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
                }

                // D. Registrar uso por IP (após confirmação da reserva)
                await adminClient.from('free_scan_usage').insert({ ip_address: userIp });

            } else {
                // Usuário pago: reserva atômica do slot diário via RPC
                // claim_daily_slot faz INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit
                // — operação atômica que impede race conditions entre requests simultâneos.
                const limit = getLimit(userPlan, requestType);

                const { data: slotClaimed, error: claimError } = await adminClient
                    .rpc('claim_daily_slot', {
                        p_user_id: user.id,
                        p_type:    requestType,
                        p_date:    today,
                        p_limit:   limit
                    });

                if (claimError) {
                    console.error('claim_daily_slot error:', claimError.message);
                    return new Response(JSON.stringify({
                        error: "Erro interno ao verificar seu limite. Tente novamente.",
                        isError: true
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
                }

                if (!slotClaimed) {
                    return new Response(JSON.stringify({
                        error: "Você atingiu seu limite diário para este recurso.",
                        limit: limit,
                        isError: true,
                        isLimitReached: true
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
                }
            }
        }

        // ── 8. EXECUTAR IA (OpenAI) ─────────────────────────────────────────
        // O slot já foi reservado atomicamente acima. Se a OpenAI falhar,
        // o slot é consumido (comportamento padrão de rate limiting).
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error('OPENAI_API_KEY missing');

        const envModel = Deno.env.get('OPENAI_MODEL');
        const model = envModel || 'gpt-4o-mini';

        const isChat = requestType === 'chat';
        const jsonInstruction = isChat ? "" : " IMPORTANT: Your response must be a valid JSON object matching the schema. No extra text.";
        const finalSystemPrompt = (systemPrompt || "Você é um assistente de IA.") + jsonInstruction;

        const callOpenAI = async (targetModel: string) => {
            const url = 'https://api.openai.com/v1/chat/completions';

            const reqBody: any = {
                model: targetModel,
                messages: [
                    { role: 'system', content: finalSystemPrompt },
                    { role: 'user', content: [
                        ...(prompt ? [{ type: 'text', text: prompt }] : []),
                        ...(image ? [{ type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }] : [])
                    ]}
                ],
                max_completion_tokens: isChat ? 300 : 1200,
            };

            if (!isChat) {
                reqBody.response_format = { type: "json_object" };
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);

            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify(reqBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const text = await resp.text();
            console.log(`OPENAI RAW (${targetModel}): ${text.length} chars`);

            if (!resp.ok) throw new Error(`OpenAI Error (${resp.status}): ${text}`);

            try {
                return JSON.parse(text);
            } catch (e) {
                throw new Error(`JSON Error: ${e.message} | Preview: ${text.substring(text.length - 100)}`);
            }
        };

        try {
            console.log(`Starting analysis with: ${model}`);
            const data = await callOpenAI(model);

            const findText = (obj: any, depth = 0): string => {
                if (depth > 12) return "";
                if (!obj || typeof obj !== 'object') return "";
                if (obj.output?.[0]?.content?.[0]?.text) return obj.output[0].content[0].text;
                if (obj.choices?.[0]?.message?.content) return obj.choices[0].message.content;

                const blacklist = ['id', 'model', 'object', 'usage'];
                for (const key in obj) {
                    if (blacklist.includes(key)) continue;
                    const val = obj[key];
                    if (typeof val === 'string' && (val.length > 50 || val.includes('{'))) return val;
                    const found = findText(val, depth + 1);
                    if (found) return found;
                }
                return "";
            };

            const reply = findText(data);

            if (!reply) {
                return new Response(JSON.stringify({
                    error: "A IA não gerou conteúdo.",
                    debug: JSON.stringify(data).substring(0, 300),
                    isError: true
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }

            return new Response(JSON.stringify({
                text: reply,
                usage: data.usage,
                model_used: model,
                status: 'success'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`Erro OpenAI/Parse: ${msg}`);
            return new Response(JSON.stringify({
                error: "Ocorreu um erro ao processar sua análise. Por favor, tente novamente em instantes.",
                isError: true
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`Exceção Crítica: ${errMsg}`);
        return new Response(JSON.stringify({
            error: "Infelizmente não conseguimos completar sua solicitação agora. Se o problema persistir, contate o suporte.",
            isError: true
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
});
