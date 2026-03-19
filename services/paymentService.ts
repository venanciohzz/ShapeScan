
import { User } from '../types';
import { PAYMENT_CONFIG, PlanType } from './paymentConfig';
import { supabase } from './supabaseService';

export type { PlanType };

interface CheckoutSessionRequest {
  email: string;
  userId: string;
  plan: PlanType;
}

interface CheckoutSessionResponse {
  clientSecret: string;
}

/**
 * LÓGICA DE INTEGRAÇÃO COM STRIPE INVISIBLE CHECKOUT
 * Substitui a integração antiga com Cakto
 */
export const createStripeCheckoutSession = async ({ email, userId, plan }: CheckoutSessionRequest): Promise<CheckoutSessionResponse> => {
  console.log(`[PaymentService] Iniciando checkout Stripe para: ${email} | Plano: ${plan}`);

  const config = PAYMENT_CONFIG[plan];
  
  if (!config || !config.stripePriceId) {
    throw new Error("ID de preço Stripe não configurado para este plano.");
  }

  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: { 
      priceId: config.stripePriceId, 
      userId, 
      email, 
      returnUrl: window.location.origin + '/dashboard' 
    },
  });

  if (error) {
    console.error('[PaymentService] Erro ao invocar stripe-checkout:', error);
    throw new Error(error.message);
  }

  return {
    clientSecret: data.clientSecret
  };
};
