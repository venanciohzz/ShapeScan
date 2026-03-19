
export type PlanType = 'monthly' | 'annual' | 'pro_monthly' | 'pro_annual' | 'free' | 'lifetime';

export interface PlanConfig {
    id: PlanType;
    stripePriceId: string;
    name: string;
    price: number;
}

export const PAYMENT_CONFIG: Record<PlanType, PlanConfig> = {
    monthly: {
        id: 'monthly',
        stripePriceId: 'price_1TCCjDB2Kj43d7TH3yWQ41ZT',
        name: 'Standard Mensal',
        price: 29.90
    },
    annual: {
        id: 'annual',
        stripePriceId: 'price_1TCCjEB2Kj43d7THrK5ru4sJ',
        name: 'Standard Anual',
        price: 247.00
    },
    pro_monthly: {
        id: 'pro_monthly',
        stripePriceId: 'price_1TCCjEB2Kj43d7THaAJXfiiR',
        name: 'Pro Mensal',
        price: 44.90
    },
    pro_annual: {
        id: 'pro_annual',
        stripePriceId: 'price_1TCCjEB2Kj43d7TH1MzK5ixE',
        name: 'Pro Anual',
        price: 347.00
    },
    free: {
        id: 'free',
        stripePriceId: '',
        name: 'Gratuito',
        price: 0
    },
    lifetime: {
        id: 'lifetime',
        stripePriceId: '',
        name: 'Vitalício',
        price: 0
    }
};

// Simplified config for Stripe Invisible Checkout
