
export type PlanType = 'monthly' | 'annual' | 'pro_monthly' | 'pro_annual' | 'free' | 'lifetime';

export interface PlanConfig {
    id: PlanType;
    caktoProductId: string;
    checkoutUrl: string;
    name: string;
    price: number;
}

export const PAYMENT_CONFIG: Record<PlanType, PlanConfig> = {
    monthly: {
        id: 'monthly',
        caktoProductId: '5vw2inp', // Atualizado conforme PlanSelection.tsx
        checkoutUrl: 'https://pay.cakto.com.br/5vw2inp_771416',
        name: 'Standard Mensal',
        price: 29.90
    },
    annual: {
        id: 'annual',
        caktoProductId: '3ce3ypz',
        checkoutUrl: 'https://pay.cakto.com.br/3ce3ypz_769675',
        name: 'Standard Anual',
        price: 247.00
    },
    pro_monthly: {
        id: 'pro_monthly',
        caktoProductId: '598qhka',
        checkoutUrl: 'https://pay.cakto.com.br/598qhka_769676',
        name: 'Pro Mensal',
        price: 44.90
    },
    pro_annual: {
        id: 'pro_annual',
        caktoProductId: '392xpbn',
        checkoutUrl: 'https://pay.cakto.com.br/392xpbn_769680',
        name: 'Pro Anual',
        price: 347.00
    },
    free: {
        id: 'free',
        caktoProductId: '',
        checkoutUrl: '',
        name: 'Gratuito',
        price: 0
    },
    lifetime: {
        id: 'lifetime',
        caktoProductId: '',
        checkoutUrl: '',
        name: 'Vitalício',
        price: 0
    }
};

export const getCheckoutUrl = (plan: PlanType, email: string, userId: string) => {
    const config = PAYMENT_CONFIG[plan];
    if (!config || !config.checkoutUrl) return '';

    const url = new URL(config.checkoutUrl);
    url.searchParams.append('email', email);
    url.searchParams.append('src', userId); // Vinculação via UUID
    return url.toString();
};
