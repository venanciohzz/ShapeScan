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

        let user = null;
        if (authHeader) {
            // Robust token extraction (case-insensitive "Bearer ")
            const token = authHeader.split(' ').pop();
            
            if (token) {
                const { data: { user: foundUser }, error: authError } = await adminClient.auth.getUser(token);
                if (authError) {
                    console.error('Supabase Auth verification error:', authError.message);
                }
                user = foundUser;
            } else {
                console.error('Malformed Authorization header:', authHeader);
            }
        }

        if (!user) {
            console.error('Unauthorized request: No valid user found for token');
            return new Response(JSON.stringify({ 
                error: "Sessão inválida ou expirada. Por favor, saia e entre novamente no ShapeScan.",
                isError: true,
                code: 'AUTH_REQUIRED'
            }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                status: 401 
            });
        }

        // 1.1 Bloqueio de Emails Temporários (Anti-Abuso)
        const forbiddenDomains = ['temp-mail.org', 'guerrillamail.com', '10minutemail.com', 'mailinator.com'];
        const userEmailDomain = user.email?.split('@')[1];
        if (userEmailDomain && forbiddenDomains.includes(userEmailDomain)) {
            return new Response(JSON.stringify({ 
                error: "O uso de e-mails temporários não é permitido. Por favor, use um e-mail válido.",
                isError: true 
            }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                status: 403 
            });
        }

        const effectiveUser = user;

        // 2. PARSE REQUEST
        const rawBody = await req.text();
        console.log(`REQ BODY SIZE: ${rawBody.length} bytes`);
        
        let bodyJson;
        try {
            bodyJson = JSON.parse(rawBody);
        } catch (e) {
            return new Response(JSON.stringify({ 
                error: `JSON do Frontend inválido: ${e.message}`,
                sample: rawBody.substring(0, 100),
                isError: true 
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        const { image, prompt, systemPrompt, type } = bodyJson;
        const requestType = type || 'chat';

        // 3. VERIFICAR PLANO E LIMITES
        const { data: planData } = await adminClient
            .from('user_plans')
            .select('plan_id')
            .eq('user_id', effectiveUser.id)
            .eq('active', true)
            .single();

        const userPlan = planData?.plan_id || 'free';
        const today = new Date().toISOString().split('T')[0];

        // 3.1. Consulta de Uso
        const usageQuery = adminClient
            .from('daily_usage')
            .select('count')
            .eq('user_id', effectiveUser.id)
            .eq('type', requestType);

        if (userPlan !== 'free') {
            usageQuery.eq('date', today);
        }

        const { data: usageData } = await usageQuery;
        const currentCount = usageData?.reduce((acc, curr) => acc + curr.count, 0) || 0;

        const getLimit = (plan: string) => {
            if (effectiveUser.email === 'contatobielaz@gmail.com') return 999;
            switch (plan) {
                case 'pro_monthly':
                case 'pro_annual': return 12;
                case 'monthly':
                case 'annual':
                case 'lifetime': return 6;
                default: return 1; // 1 scan gratuito vitalício
            }
        };

        const limit = getLimit(userPlan);
        
        // 3.2. Proteção Anti-Abuso para Plano Free
        const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip')?.trim() || 'unknown';

        if (userPlan === 'free') {
            // A. Limite Global de Segurança (Disjuntor)
            const { count: globalDailyCount } = await adminClient
                .from('free_scan_usage')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today);

            if (globalDailyCount && globalDailyCount >= 200) {
                console.error("GLOBAL FREE LIMIT REACHED");
                return new Response(JSON.stringify({ 
                    error: "O limite global de análises gratuitas para hoje foi atingido. Tente novamente amanhã ou adquira um plano.",
                    isError: true,
                    isLimitReached: true
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }

            // B. Limite de 1 scan VITALÍCIO por conta gratuita
            if (currentCount >= 1) {
                 return new Response(JSON.stringify({ 
                    error: "Você já utilizou sua análise gratuita vitalícia. Adquira um plano para continuar tendo acesso ilimitado.",
                    isError: true,
                    isLimitReached: true,
                    showPaywall: true
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }

            // C. Limite de 3 scans por IP (Anti-Bot)
            const { count: ipScanCount } = await adminClient
                .from('free_scan_usage')
                .select('*', { count: 'exact', head: true })
                .eq('ip_address', userIp);

            if (ipScanCount && ipScanCount >= 3) {
                console.warn(`IP Limit Reached: ${userIp}`);
                return new Response(JSON.stringify({ 
                    error: "Limite de análises gratuitas atingido para este dispositivo. Crie uma conta ou adquira um plano.",
                    isError: true,
                    isLimitReached: true
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }
        } else if (currentCount >= limit) {
            // Bloqueio padrão para planos pagos
            return new Response(JSON.stringify({ 
                error: "Você atingiu seu limite diário para este recurso.",
                current: currentCount,
                limit: limit,
                isError: true,
                isLimitReached: true
            }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                status: 429 
            });
        }

        // 4. EXECUTAR IA (OpenAI)
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error('OPENAI_API_KEY missing');

        const envModel = Deno.env.get('OPENAI_MODEL');
        const model = envModel || 'gpt-4o-mini'; 
        
        // Chat retorna texto livre — não forçar JSON
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
                // Chat usa tokens menores (respostas curtas). Análises precisam de mais.
                max_completion_tokens: isChat ? 300 : 1200,
            };

            // Forçar JSON apenas para análises de food/shape, nunca para chat
            if (!isChat) {
                reqBody.response_format = { type: "json_object" };
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

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
            console.log(`Starting v42 analysis with: ${model}`);
            let data = await callOpenAI(model);
            
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

            let reply = findText(data);

            if (!reply) {
                return new Response(JSON.stringify({ 
                    error: "A IA não gerou conteúdo.",
                    debug: JSON.stringify(data).substring(0, 300),
                    isError: true 
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }

            if (effectiveUser.id && reply.length > 5) {
                // Registrar uso diário normal
                await adminClient.from('daily_usage').upsert({
                    user_id: effectiveUser.id,
                    date: today,
                    type: requestType,
                    count: currentCount + 1
                }, { onConflict: 'user_id,date,type' });

                // Registrar uso por IP se for plano gratuito
                if (userPlan === 'free') {
                    await adminClient.from('free_scan_usage').insert({
                        ip_address: userIp
                    });
                }
            }

            return new Response(JSON.stringify({ 
                text: reply,
                usage: data.usage,
                model_used: model,
                status: 'success'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`Erro v42 (OpenAI/Parse): ${msg}`);
            return new Response(JSON.stringify({ 
                error: "Ocorreu um erro ao processar sua análise. Por favor, tente novamente em instantes.", 
                isError: true 
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`Exceção Crítica v42: ${errMsg}`);
        return new Response(JSON.stringify({ 
            error: "Infelizmente não conseguimos completar sua solicitação agora. Se o problema persistir, contate o suporte.", 
            isError: true 
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
});
