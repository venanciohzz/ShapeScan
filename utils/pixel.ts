// Meta Pixel helper — wraps fbq() safely for use across the app.
// All monetary values must be in BRL (currency: 'BRL').

const fbq = (method: string, event: string, params?: Record<string, any>) => {
  if (typeof (window as any).fbq === 'function') {
    (window as any).fbq(method, event, params);
  }
};

export const pixel = {
  /** Usuário completou o cadastro */
  completeRegistration: () => fbq('track', 'CompleteRegistration'),

  /** Usuário fez login */
  lead: () => fbq('track', 'Lead'),

  /** Usuário visualizou a página de planos */
  viewContent: (contentName: string) =>
    fbq('track', 'ViewContent', { content_name: contentName, content_category: 'subscription' }),

  /** Usuário clicou em um plano e iniciou o checkout */
  initiateCheckout: (planName: string, value: number) =>
    fbq('track', 'InitiateCheckout', {
      content_name: planName,
      value,
      currency: 'BRL',
      num_items: 1,
    }),

  /** Usuário submeteu dados de pagamento */
  addPaymentInfo: (planName: string, value: number) =>
    fbq('track', 'AddPaymentInfo', {
      content_name: planName,
      value,
      currency: 'BRL',
    }),

  /** Compra confirmada (webhook processado) */
  purchase: (planName: string, value: number) =>
    fbq('track', 'Purchase', {
      content_name: planName,
      value,
      currency: 'BRL',
    }),
};
