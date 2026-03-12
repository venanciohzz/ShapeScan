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
            const token = authHeader.replace('Bearer ', '');
            const { data: { user: foundUser } } = await adminClient.auth.getUser(token);
            user = foundUser;
        }

        if (!user) {
            return new Response(JSON.stringify({ 
                error: "Usuário não autenticado. Por favor, faça login.",
                isError: true 
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

        // 2. PARSE REQUEST (v38: Log raw check)
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
        // Para planos pagos, usamos o limite diário.
        // Para plano free, verificamos se já houve QUALQUER uso (vitalício).
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
            // Impede que ataques massivos consumam todo o crédito da OpenAI em um dia
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

            // B. Limite de 3 scans por IP (Anti-Bot)
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
        const model = envModel || 'gpt-5-mini'; 
        
        const jsonInstruction = " IMPORTANT: Your response must be a valid JSON object matching the schema. No extra text.";
        const finalSystemPrompt = (systemPrompt || "Você é um assistente de IA.") + jsonInstruction;

        const callOpenAI = async (targetModel: string) => {
            const url = 'https://api.openai.com/v1/chat/completions';
            
            const reqBody = {
                model: targetModel,
                messages: [
                    { role: 'system', content: finalSystemPrompt },
                    { role: 'user', content: [
                        ...(prompt ? [{ type: 'text', text: prompt }] : []),
                        ...(image ? [{ type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }] : [])
                    ]}
                ],
                max_completion_tokens: 250,
                response_format: { type: "json_object" }
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

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
                // Sanitização simples para remover quebras literais que quebram o parse
                const cleanJson = text.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
                // Mas não devemos escapar as aspas de estrutura... o parse nativo é melhor se o JSON vier certo.
                return JSON.parse(text); 
            } catch (e) {
                // Se o parse nativo falhar, tentamos salvar o que dá
                throw new Error(`JSON Error: ${e.message} | Preview: ${text.substring(text.length - 100)}`);
            }
        };

        try {
            console.log(`Starting v38 analysis with: ${model}`);
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

            if (!reply && model.includes('gpt-5')) {
                console.warn("GPT-5 reply empty. Fallback to gpt-4o-mini...");
                data = await callOpenAI('gpt-4o-mini');
                reply = findText(data);
            }

            if (!reply) {
                return new Response(JSON.stringify({ 
                    error: "A IA não gerou conteúdo v38.",
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
                    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip')?.trim() || 'unknown';
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
            console.error(`Erro v38 (OpenAI/Parse): ${msg}`);
            return new Response(JSON.stringify({ 
                error: "Ocorreu um erro ao processar sua análise. Por favor, tente novamente em instantes.", 
                isError: true 
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`Exceção Crítica v38: ${errMsg}`);
        return new Response(JSON.stringify({ 
            error: "Infelizmente não conseguimos completar sua solicitação agora. Se o problema persistir, contate o suporte.", 
            isError: true 
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
});
