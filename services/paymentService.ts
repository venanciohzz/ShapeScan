
import { User } from '../types';

export type PlanType = 'monthly' | 'annual' | 'lifetime' | 'pro_monthly' | 'pro_annual';

interface CheckoutSessionRequest {
  email: string;
  userId: string;
  plan: PlanType;
}

interface CheckoutSessionResponse {
  checkoutUrl: string;
}

// Configuração dos Planos (Preços e IDs)
const PLANS = {
  monthly: {
    id: 'plan_standard_monthly_br',
    name: 'Standard Mensal',
    price: 29.90,
    gatewayUrl: 'https://pay.kiwify.com.br/placeholder-std-monthly' 
  },
  annual: {
    id: 'plan_standard_annual_br',
    name: 'Standard Anual',
    price: 247.00, 
    gatewayUrl: 'https://pay.kiwify.com.br/placeholder-std-annual' 
  },
  pro_monthly: {
    id: 'plan_pro_monthly_br',
    name: 'Pro Mensal',
    price: 44.90,
    gatewayUrl: 'https://pay.kiwify.com.br/placeholder-pro-monthly'
  },
  pro_annual: {
    id: 'plan_pro_annual_br',
    name: 'Pro Anual',
    price: 347.00,
    gatewayUrl: 'https://pay.kiwify.com.br/placeholder-pro-annual'
  },
  // Legacy/Admin support
  lifetime: {
    id: 'plan_lifetime_admin',
    name: 'Vitalício Admin',
    price: 0,
    gatewayUrl: '#'
  }
};

/**
 * LÓGICA DE INTEGRAÇÃO COM SUPABASE E GATEWAY
 */
export const createCheckoutSession = async ({ email, userId, plan }: CheckoutSessionRequest): Promise<CheckoutSessionResponse> => {
  console.log(`[PaymentService] Iniciando checkout para: ${email} | Plano: ${plan}`);
  
  // Simulação de delay de rede (API Call)
  await new Promise(resolve => setTimeout(resolve, 1500));

  // MOCK: Como não temos backend aqui, vamos simular que o Gateway retornou uma URL
  const currentBaseUrl = window.location.origin;
  const mockCheckoutUrl = `${currentBaseUrl}?payment_success=true&plan=${plan}&ref=${userId}`;

  return {
    checkoutUrl: mockCheckoutUrl
  };
};
