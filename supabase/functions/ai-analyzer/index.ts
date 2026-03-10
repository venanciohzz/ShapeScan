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
        // 1. BYPASS AUTH PARA TESTE
        const authHeader = req.headers.get('Authorization');
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        let user = null;
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            try {
                const { data: { user: foundUser } } = await adminClient.auth.getUser(token);
                user = foundUser;
            } catch (e) {
                console.log('User decode failed, but continuing bypass...');
            }
        }

        const effectiveUser = user || { id: '00000000-0000-0000-0000-000000000000', email: 'contatobielaz@gmail.com' };

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

        const { data: usageData } = await adminClient
            .from('daily_usage')
            .select('count')
            .eq('user_id', effectiveUser.id)
            .eq('date', today)
            .eq('type', requestType)
            .single();

        const currentCount = usageData?.count || 0;

        // 4. EXECUTAR IA (OpenAI)
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error('OPENAI_API_KEY missing');

        const envModel = Deno.env.get('OPENAI_MODEL');
        const model = envModel || 'gpt-5-mini'; 
        
        const jsonInstruction = " IMPORTANT: Your response must be a valid JSON object matching the schema. No extra text.";
        const finalSystemPrompt = (systemPrompt || "Você é um assistente de IA.") + jsonInstruction;

        const callOpenAI = async (targetModel: string) => {
            const isGpt5 = targetModel.includes('gpt-5');
            const url = isGpt5 
                ? 'https://api.openai.com/v1/responses' 
                : 'https://api.openai.com/v1/chat/completions';
            
            const reqBody = isGpt5 ? {
                model: targetModel,
                input: [
                    { role: "system", content: [{ type: "input_text", text: finalSystemPrompt }] },
                    { role: "user", content: [
                        ...(prompt ? [{ type: "input_text", text: prompt }] : []),
                        ...(image ? [{ type: "input_image", image_url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` }] : [])
                    ]}
                ],
                max_output_tokens: 4000,
                text: { format: { type: "json_object" } }
            } : {
                model: targetModel,
                messages: [
                    { role: 'system', content: finalSystemPrompt },
                    { role: 'user', content: [
                        ...(prompt ? [{ type: 'text', text: prompt }] : []),
                        ...(image ? [{ type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }] : [])
                    ]}
                ],
                max_completion_tokens: 2000,
                response_format: { type: "json_object" }
            };

            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify(reqBody)
            });

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
                await adminClient.from('daily_usage').upsert({
                    user_id: effectiveUser.id,
                    date: today,
                    type: requestType,
                    count: currentCount + 1
                }, { onConflict: 'user_id,date,type' });
            }

            return new Response(JSON.stringify({ 
                text: reply,
                model_used: model,
                status: 'success'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return new Response(JSON.stringify({ error: `Erro v38: ${msg}`, isError: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: errMsg, isError: true, hint: 'Exceção Crítica v38.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
});
