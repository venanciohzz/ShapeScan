import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const fetchClientSecret = useCallback(async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      const { data, error: invokeError } = await supabase.functions.invoke('stripe-checkout', {
        body: { 
          priceId, 
          userId, 
          email, 
          returnUrl: window.location.origin + '/dashboard' 
        },
      });

      if (invokeError) {
        console.error('Error fetching client secret:', invokeError);
        throw new Error(invokeError.message || 'Falha ao conectar com o provedor de pagamento.');
      }

      if (!data?.clientSecret) {
        throw new Error('Não foi possível gerar a chave de checkout.');
      }

      setIsInitializing(false);
      return data.clientSecret;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Ocorreu um erro inesperado ao carregar o checkout.');
      setIsInitializing(false);
      throw err;
    }
  }, [priceId, userId, email]);

  // Stable options object to prevent unnecessary re-initialization
  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-zinc-950/90 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase text-left">Checkout Seguro</h3>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1 text-left">Sua evolução começa aqui</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 text-zinc-600 dark:text-zinc-400 group"
          >
            <span className="text-2xl pt-0.5 group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>

        {/* Stripe Embedded Checkout Container */}
        <div id="checkout" className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center min-h-[400px]">
          {error ? (
            <div className="text-center p-8 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">⚠️</span>
              </div>
              <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Ops! Algo deu errado</h4>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm mx-auto">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <>
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 z-10">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Preparando checkout seguro...</p>
                </div>
              )}
              <div className="w-full">
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={options}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            </>
          )}
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
