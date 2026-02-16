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
        // 1. VALIDAR AUTH
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // Cliente para validar usuário
        const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User not found' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. PARSE REQUEST
        const { image, prompt, systemPrompt, type } = await req.json();

        // Default type to 'chat' if missing for backward compatibility, but backend enforces limits
        const requestType = type || 'chat';

        // 3. VERIFICAR PLANO E LIMITES (Usando Service Role para acessar tabelas protegidas se necessário)
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        // Buscar plano do usuário
        const { data: planData } = await adminClient
            .from('user_plans')
            .select('plan_id')
            .eq('user_id', user.id)
            .eq('active', true)
            .single();

        // Fallback para 'free' se não tiver plano ativo ou erro
        const userPlan = planData?.plan_id || 'free';

        // DEFINIR LIMITES
        const LIMITS = {
            free: { food: 6, shape: 2, chat: 20 },      // Free/Padrão
            monthly: { food: 6, shape: 2, chat: 20 },   // Standard
            annual: { food: 6, shape: 2, chat: 20 },    // Standard
            pro_monthly: { food: 12, shape: 4, chat: 50 }, // Pro
            pro_annual: { food: 12, shape: 4, chat: 50 },  // Pro
            lifetime: { food: 999999, shape: 999999, chat: 999999 } // Legacy/Internal
        };

        let planLimits = LIMITS[userPlan as keyof typeof LIMITS] || LIMITS.free;

        // ADMIN OVERRIDE: contatobielaz@gmail.com tem acesso ilimitado independente do plano
        if (user.email === 'contatobielaz@gmail.com') {
            planLimits = { food: 999999, shape: 999999, chat: 999999 };
        }

        const limit = planLimits[requestType as keyof typeof planLimits] || 0;

        // Verificar uso hoje
        const today = new Date().toISOString().split('T')[0];

        // Upsert inicial para garantir que a linha existe e pegar o valor atual (Atomic Increment simulado)
        // OBS: Postgres tem UPSERT. Vamos fazer um select primeiro para checar o limite.
        const { data: usageData, error: usageError } = await adminClient
            .from('daily_usage')
            .select('count')
            .eq('user_id', user.id)
            .eq('date', today)
            .eq('type', requestType)
            .single();

        const currentCount = usageData?.count || 0;

        // BLOQUEAR SE EXCEDEU (Exceto Admin se quiser implementar check de admin)
        if (currentCount >= limit) {
            return new Response(JSON.stringify({
                error: `Limite diário atingido para ${requestType}.`,
                limit_reached: true,
                plan: userPlan
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. EXECUTAR IA (OpenAI)
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error('OPENAI_API_KEY missing');

        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

        const userContent = [];
        if (prompt) userContent.push({ type: 'text', text: prompt });
        if (image) {
            const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
            userContent.push({ type: 'image_url', image_url: { url: imageUrl, detail: 'low' } });
        }
        messages.push({ role: 'user', content: userContent });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Erro na OpenAI');
        }

        const data = await response.json();
        const reply = data.choices[0]?.message?.content || '';

        // 5. INCREMENTAR USO (Somente após sucesso)
        // Usando RPC ou Upsert simples. Upsert é mais seguro aqui.
        await adminClient.from('daily_usage').upsert({
            user_id: user.id,
            date: today,
            type: requestType,
            count: currentCount + 1
        }, { onConflict: 'user_id,date,type' });

        return new Response(JSON.stringify({ text: reply }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
