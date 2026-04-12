// Meta Pixel helper — wraps fbq() safely for use across the app.
// All monetary values must be in BRL (currency: 'BRL').
// Cada evento dispara no navegador (fbq) E no servidor (CAPI) em paralelo.

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getFbp(): string | null {
  try {
    const match = document.cookie.match(/_fbp=([^;]+)/);
    return match ? match[1] : null;
  } catch { return null; }
}

function getFbc(): string | null {
  try {
    const match = document.cookie.match(/_fbc=([^;]+)/);
    return match ? match[1] : null;
  } catch { return null; }
}

function fbqTrack(event: string, params?: Record<string, any>, eventId?: string) {
  if (typeof (window as any).fbq === 'function') {
    if (eventId) {
      (window as any).fbq('track', event, params || {}, { eventID: eventId });
    } else {
      (window as any).fbq('track', event, params || {});
    }
  }
}

function sendCapi(eventName: string, eventId: string, options: {
  email?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  externalId?: string;
} = {}): void {
  try {
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
    const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const fbp = getFbp();
    const fbc = getFbc();

    // Não envia CAPI se user_data seria completamente vazio — Meta retorna 400
    if (!options.email && !fbp && !fbc && !options.externalId) return;

    fetch(`${supabaseUrl}/functions/v1/meta-capi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        eventName,
        eventId,
        sourceUrl: window.location.href,
        fbp,
        fbc,
        email: options.email,
        externalId: options.externalId,
        value: options.value,
        currency: options.currency,
        contentName: options.contentName,
        clientUserAgent: navigator.userAgent,
      }),
    }).catch(() => {}); // fire-and-forget: nunca bloqueia o fluxo
  } catch { /* nunca lançar erro de tracking */ }
}

export const pixel = {
  /** Usuário completou o cadastro */
  completeRegistration: (email?: string, externalId?: string) => {
    const id = generateEventId();
    fbqTrack('CompleteRegistration', { content_name: 'shapescan_signup', status: true }, id);
    sendCapi('CompleteRegistration', id, { email, externalId, contentName: 'shapescan_signup' });
  },

  /** Usuário fez login */
  lead: (email?: string, externalId?: string) => {
    const id = generateEventId();
    fbqTrack('Lead', {}, id);
    sendCapi('Lead', id, { email, externalId });
  },

  /** Usuário visualizou a página de planos */
  viewContent: (contentName: string, externalId?: string) => {
    const id = generateEventId();
    fbqTrack('ViewContent', { content_name: contentName, content_category: 'subscription' }, id);
    sendCapi('ViewContent', id, { contentName, externalId });
  },

  /** Usuário clicou em um plano e iniciou o checkout */
  initiateCheckout: (planName: string, value: number, externalId?: string, email?: string) => {
    const id = generateEventId();
    fbqTrack('InitiateCheckout', { content_name: planName, value, currency: 'BRL', num_items: 1 }, id);
    sendCapi('InitiateCheckout', id, { contentName: planName, value, currency: 'BRL', externalId, email });
  },

  /** Usuário submeteu dados de pagamento */
  addPaymentInfo: (planName: string, value: number, email?: string, externalId?: string) => {
    const id = generateEventId();
    fbqTrack('AddPaymentInfo', { content_name: planName, value, currency: 'BRL' }, id);
    sendCapi('AddPaymentInfo', id, { contentName: planName, value, currency: 'BRL', email, externalId });
  },

  /** Compra confirmada (webhook processado) */
  purchase: (planName: string, value: number, email?: string, externalId?: string) => {
    const id = generateEventId();
    fbqTrack('Purchase', { content_name: planName, value, currency: 'BRL' }, id);
    sendCapi('Purchase', id, { contentName: planName, value, currency: 'BRL', email, externalId });
  },

  /** PageView — disparado em cada mudança de rota */
  pageView: (externalId?: string) => {
    const id = generateEventId();
    fbqTrack('PageView', {}, id);
    sendCapi('PageView', id, { externalId });
  },
};
