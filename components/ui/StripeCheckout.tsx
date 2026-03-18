import React, { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { supabase } from '../../services/supabaseService';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripeCheckoutProps {
  priceId: string;
  userId: string;
  email: string;
  onClose: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({ priceId, userId, email, onClose }) => {
  const fetchClientSecret = useCallback(async () => {
    // Call the Supabase Edge Function to create a Checkout Session
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: { 
        priceId, 
        userId, 
        email, 
        returnUrl: window.location.origin + '/dashboard' 
      },
    });

    if (error) {
      console.error('Error fetching client secret:', error);
      throw new Error(error.message);
    }

    return data.clientSecret;
  }, [priceId, userId, email]);

  const options = { fetchClientSecret };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-zinc-950/90 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Checkout Seguro</h3>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Sua evolução começa aqui</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 text-zinc-600 dark:text-zinc-400 group"
          >
            <span className="text-2xl pt-0.5 group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>

        {/* Stripe Embedded Checkout Container */}
        <div id="checkout" className="flex-1 p-4 md:p-8">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={options}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>

        {/* Footer info */}
        <div className="p-6 bg-zinc-50 dark:bg-zinc-950/50 text-center border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <span className="text-emerald-500 text-lg">🔒</span> Pagamento processado com segurança pelo Stripe
          </p>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;
