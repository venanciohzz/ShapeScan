import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { supabase } from '../../services/supabaseService';
import { setUserPendingPayment } from '../../services/supabaseService';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripeCheckoutProps {
  priceId: string;
  userId: string;
  email: string;
  onClose: () => void;
  planName?: string;   // Nome do plano, ex: "Standard Mensal"
  planPrice?: string;  // Valor formatado, ex: "29,90"
  planPeriod?: string; // Período, ex: "/mês" ou "/ano"
}

const PaymentForm = ({ onCancel, userId, planId, planPeriod }: { onCancel: () => void; userId: string; planId: string; planPeriod: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    // Gravar pending_payment ANTES do redirect
    // Isso permite que o App.tsx mostre UX imediata sem depender do webhook
    await setUserPendingPayment(userId, planId);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/dashboard?payment=success',
      },
    });

    if (error) {
      setErrorMessage(error.message || 'Ocorreu um erro ao processar o pagamento.');
    }
    
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl backdrop-blur-sm">
        <PaymentElement options={{
          layout: 'tabs',
        }} />
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-3 animate-in zoom-in duration-300">
          <span>⚠️</span> {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-4 pt-2">
        <p className="text-center text-[10px] text-zinc-500 font-medium px-4 leading-relaxed">
          Sua assinatura tem renovação automática {planPeriod?.includes('ano') ? 'anual' : 'mensal'}. Você pode cancelar a qualquer momento sem taxas adicionais.
        </p>
        <button
          disabled={isProcessing || !stripe}
          className="group relative w-full px-8 py-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-xs tracking-[0.2em] rounded-2xl transition-all duration-300 active:scale-95 shadow-xl shadow-emerald-500/20 overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin"></div>
                Processando...
              </>
            ) : (
              <>Assinar Agora <span className="text-lg group-hover:translate-x-1 transition-transform">→</span></>
            )}
          </span>
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full py-4 text-zinc-500 hover:text-zinc-300 text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
        >
          Cancelar e Voltar
        </button>
      </div>
    </form>
  );
};

const StripeCheckout: React.FC<StripeCheckoutProps> = ({ 
  priceId, 
  userId, 
  email, 
  onClose,
  planName = 'ShapeScan Premium',
  planPrice = '29,90',
  planPeriod = '/mês'
}) => {
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  // Trava anti-dupla: previne execuções simultâneas (React Strict Mode)
  const isInitializingRef = React.useRef(false);

  useEffect(() => {
    const initializeCheckout = async () => {
      // Se já está rodando, ignora (protege contra dupla execução do React Strict Mode)
      if (isInitializingRef.current) {
        console.log('[StripeCheckout] Inicialização já em andamento, ignorando segunda chamada.');
        return;
      }
      isInitializingRef.current = true;

      try {
        setIsInitializing(true);
        setError(null);
        
        console.log('[StripeCheckout] Iniciando checkout para priceId:', priceId);

        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData?.user) {
          throw new Error('Usuário não autenticado. O checkout requer login ativo.');
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('Usuário não autenticado');
        }

        console.log('[StripeCheckout] Token JWT obtido, invocando Edge Function...');
        const { data, error: invokeError } = await supabase.functions.invoke('stripe-checkout', {
          body: { priceId },
        });

        if (invokeError) {
          console.error('[StripeCheckout] Edge Function ERROR:', invokeError);
          // Tenta extrair o body real do erro (ex: mensagem do Stripe)
          let errorMessage = invokeError.message || 'Erro ao iniciar checkout';
          try {
            if (invokeError.context && typeof invokeError.context.json === 'function') {
              const body = await invokeError.context.json();
              errorMessage = body?.error || body?.message || errorMessage;
              console.error('[StripeCheckout] Edge Function error body:', body);
            }
          } catch (_) { /* seguro ignorar */ }
          throw new Error(errorMessage);
        }

        if (data?.isError) throw new Error(data.error);
        if (!data?.clientSecret) throw new Error('Falha ao obter chave de pagamento.');

        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error('[StripeCheckout] Initialization error:', err);
        setError(err.message || 'Erro ao carregar o checkout.');
      } finally {
        setIsInitializing(false);
        isInitializingRef.current = false; // Libera o lock para próximas tentativas
      }
    };

    initializeCheckout();
  }, [priceId, userId, email]);

  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#10b981',
      colorBackground: 'transparent',
      colorText: '#ffffff',
      colorSecondaryText: '#a1a1aa',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '16px',
    },
    rules: {
      '.Input': {
        border: '1px solid #27272a',
        backgroundColor: '#18181b',
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
      },
      '.Input:focus': {
        border: '1px solid #10b981',
        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.1)',
      },
      '.Label': {
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '8px',
        color: '#71717a',
      },
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-500">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0"></div>
        
        {/* Header & Summary */}
        <div className="p-10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-zinc-950 font-black italic">S</span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white uppercase italic">Assinatura ShapeScan</h3>
            </div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] ml-11">{planName}</p>
          </div>

          <div className="flex flex-col md:items-end">
            <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mb-1">Total a Pagar</span>
            {/* Valor dinâmico baseado no plano selecionado */}
            <div className="text-2xl font-black text-white tracking-tighter">
              R$ {planPrice}<span className="text-zinc-500 text-sm font-bold">{planPeriod}</span>
            </div>
          </div>
        </div>

        <div className="px-10 py-10 flex-1">
          {error ? (
            <div className="py-20 text-center animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <span className="text-4xl text-red-500">⚠️</span>
              </div>
              <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Erro no Checkout</h4>
              <p className="text-zinc-400 mb-8 max-w-xs mx-auto text-sm">{error}</p>
              <button 
                onClick={onClose}
                className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-zinc-800 transition-all"
              >
                Voltar
              </button>
            </div>
          ) : isInitializing ? (
            <div className="py-32 flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-emerald-500/10 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Preparando ambiente seguro...</p>
            </div>
          ) : clientSecret && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <div className="text-emerald-500 animate-pulse">🛡️</div>
                <div className="text-[10px] text-zinc-400 font-medium leading-tight">
                  <span className="text-emerald-500 font-bold block mb-0.5 uppercase tracking-wider">Compra 100% Segura</span>
                  Suas informações são encriptadas de ponta a ponta e processadas confidencialmente pela Stripe.
                </div>
              </div>

              <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
                <PaymentForm onCancel={onClose} userId={userId} planId={priceId} planPeriod={planPeriod} />
              </Elements>
            </div>
          )}
        </div>

        <div className="px-10 py-6 bg-zinc-900/50 border-t border-zinc-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Garantia ShapeScan</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-[9px] font-black text-zinc-500 tracking-wider">
              CARTÕES
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-[9px] font-black text-zinc-500 tracking-wider">
              APPLE PAY
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-[9px] font-black text-zinc-500 tracking-wider">
              GOOGLE PAY
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;
