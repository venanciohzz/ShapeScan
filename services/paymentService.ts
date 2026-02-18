
import { User } from '../types';
import { PAYMENT_CONFIG, PlanType, getCheckoutUrl } from './paymentConfig';

export type { PlanType };

interface CheckoutSessionRequest {
  email: string;
  userId: string;
  plan: PlanType;
}

interface CheckoutSessionResponse {
  checkoutUrl: string;
}

/**
 * LÓGICA DE INTEGRAÇÃO COM GATEWAY CAKTO
 */
export const createCheckoutSession = async ({ email, userId, plan }: CheckoutSessionRequest): Promise<CheckoutSessionResponse> => {
  console.log(`[PaymentService] Iniciando checkout para: ${email} | Plano: ${plan}`);

  const checkoutUrl = getCheckoutUrl(plan, email, userId);

  if (!checkoutUrl) {
    throw new Error("Link de checkout não configurado para este plano.");
  }

  return {
    checkoutUrl: checkoutUrl
  };
};
