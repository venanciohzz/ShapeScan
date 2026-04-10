// Meta Conversions API (CAPI) — proxy server-side para eventos do pixel
// Envia eventos ao Meta Graph API contornando ad blockers e iOS restrictions
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PIXEL_ID = '512947444394258';
const API_VERSION = 'v21.0';

async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const capiToken = Deno.env.get('META_CAPI_TOKEN');
  if (!capiToken) {
    console.error('[meta-capi] META_CAPI_TOKEN não configurado');
    return new Response(JSON.stringify({ error: 'CAPI token not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { eventName, eventId, sourceUrl, email, fbp, fbc, value, currency, contentName, clientUserAgent } = body;

    if (!eventName) {
      return new Response(JSON.stringify({ error: 'eventName required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Montar user_data com PII hasheado
    const userData: Record<string, string> = {};
    if (email && typeof email === 'string' && email.includes('@')) {
      userData['em'] = await sha256(email);
    }
    if (fbp && typeof fbp === 'string') userData['fbp'] = fbp;
    if (fbc && typeof fbc === 'string') userData['fbc'] = fbc;
    if (clientUserAgent && typeof clientUserAgent === 'string') userData['client_user_agent'] = clientUserAgent;

    // Montar evento
    const eventData: Record<string, any> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: sourceUrl || 'https://www.shapescan.com.br',
      user_data: userData,
    };

    if (eventId) eventData['event_id'] = String(eventId);

    const customData: Record<string, any> = {};
    if (value !== undefined && value !== null) customData['value'] = Number(value);
    if (currency) customData['currency'] = String(currency);
    if (contentName) customData['content_name'] = String(contentName);
    if (Object.keys(customData).length > 0) eventData['custom_data'] = customData;

    const payload = { data: [eventData] };

    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${capiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('[meta-capi] Erro da API Meta:', JSON.stringify(result));
    } else {
      console.log('[meta-capi] Evento enviado:', eventName, eventId || '', JSON.stringify(result));
    }

    return new Response(JSON.stringify({ ok: response.ok, result }), {
      status: response.ok ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[meta-capi] Erro inesperado:', String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
