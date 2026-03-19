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
        headers: {
          'apikey': (import.meta as any).env.VITE_SUPABASE_ANON_KEY
        },
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

      if (data?.isError) {
        console.error('Stripe Edge Function error:', data.error);
        throw new Error(data.error || 'O servidor de pagamentos retornou um erro inesperado.');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto overflow-x-hidden">
      <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden min-h-[700px] flex flex-col my-auto origin-center animate-in zoom-in-95 duration-500 ease-out">
        
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px]"></div>

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between p-8 md:p-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-zinc-950 font-black text-xl italic select-none">S</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase italic">Checkout Seguro</h3>
            </div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.3em] ml-13">Finalize sua assinatura</p>
          </div>
          
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 text-zinc-400 group"
          >
            <span className="text-2xl group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>

        {/* Stripe Embedded Checkout Container */}
        <div id="checkout" className="relative z-10 flex-1 px-4 md:px-10 pb-10 flex flex-col min-h-[500px]">
          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fly-in-bottom duration-500">
              <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <span className="text-5xl">⚠️</span>
              </div>
              <h4 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Ops! Algo deu errado</h4>
              <p className="text-zinc-400 mb-10 max-w-sm mx-auto font-medium leading-relaxed">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="group relative px-10 py-5 bg-white hover:bg-emerald-500 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl transition-all duration-300 active:scale-95 shadow-xl hover:shadow-emerald-500/30 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Tentar Novamente <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </button>
            </div>
          ) : (
            <div className="flex-1 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 p-1 md:p-6 backdrop-blur-sm relative overflow-hidden group">
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-xl z-20 transition-all duration-500">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-500/10 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="mt-8 text-center space-y-2">
                    <p className="text-white font-black uppercase tracking-[0.3em] text-xs">Protegendo sua conexão</p>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Criptografia de ponta a ponta ativa</p>
                  </div>
                </div>
              )}
              
              <div className="w-full min-h-full transition-opacity duration-700 delay-150" style={{ opacity: isInitializing ? 0 : 1 }}>
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={options}
                >
                  <div className="stripe-custom-wrapper">
                    <EmbeddedCheckout />
                  </div>
                </EmbeddedCheckoutProvider>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="relative z-10 p-8 bg-zinc-900/30 border-t border-zinc-800/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-10 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest leading-none">Security by</span>
                <span className="text-white text-lg font-black tracking-tighter italic">stripe</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex -space-x-2">
                {['visa', 'mastercard', 'amex'].map(card => (
                  <div key={card} className="w-10 h-6 bg-zinc-800 border border-zinc-700 rounded-md flex items-center justify-center overflow-hidden">
                    <div className={`w-6 h-4 bg-zinc-500/20 rounded-sm`}></div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                Pagamento processado em ambiente 100% seguro
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Styles to "force" integration as much as possible */}
      <style dangerouslySetInnerHTML={{ __html: `
        .stripe-custom-wrapper iframe {
          border-radius: 1.5rem !important;
        }
        /* Note: Stripe Embedded Checkout is limited in CSS overrides via parent, 
           most branding should be done in Stripe Dashboard */
      `}} />
    </div>
  );
};

export default StripeCheckout;
