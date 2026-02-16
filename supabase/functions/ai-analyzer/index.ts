import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // 1. Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Load API Key
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set in Supabase secrets.');
        }

        // 3. Parse Request Body
        const { image, prompt, systemPrompt } = await req.json();

        // 4. Construct Messages for OpenAI
        const messages = [];

        // System Prompt
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        // User Message
        const userContent = [];

        // Add text prompt
        if (prompt) {
            userContent.push({ type: 'text', text: prompt });
        }

        // Add image if provided (VISION SUPPORT for GPT-4o-mini)
        if (image) {
            // Ensure proper data URI format
            const imageUrl = image.startsWith('data:')
                ? image
                : `data:image/jpeg;base64,${image}`;

            userContent.push({
                type: 'image_url',
                image_url: {
                    url: imageUrl,
                    detail: 'low' // 'low' is cheaper (85 tokens) and usually sufficient for food/body shape. 'high' or 'auto' for more detail.
                }
            });
        }

        messages.push({ role: 'user', content: userContent });

        // 5. Call OpenAI API via Fetch (no external dependencies needed)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Cost-effective model
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API Error:', error);
            throw new Error(`OpenAI API Error: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const reply = data.choices[0]?.message?.content || '';

        // 6. Return Response
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
