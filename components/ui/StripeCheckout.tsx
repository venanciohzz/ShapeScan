import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { pixel } from '../../utils/pixel';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { getValidToken, callEdgeFunction } from '../../services/supabaseService';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripeCheckoutProps {
  priceId: string;
  userId: string;
  email: string;
  plan: string;
  onClose: () => void;
  planName?: string;   // Nome do plano, ex: "Standard Mensal"
  planPrice?: string;  // Valor formatado, ex: "29,90"
  planPeriod?: string; // Período, ex: "/mês" ou "/ano"
}

const PaymentForm = ({ onCancel, userId, planId, planPeriod, planName, planValue }: { onCancel: () => void; userId: string; planId: string; planPeriod: string; planName: string; planValue: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [agreedToRecurring, setAgreedToRecurring] = useState(false);

  // Timeout: se o PaymentElement não carregar em 20s, mostra erro
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!elementReady) {
        setErrorMessage('Não foi possível carregar o formulário de pagamento. Verifique sua conexão ou tente novamente.');
      }
    }, 20000);
    return () => clearTimeout(timer);
  }, [elementReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    // Gravar flag local ANTES do redirect para ativar o polling no retorno
    localStorage.setItem('awaiting_stripe_payment', 'true');
    localStorage.setItem('awaiting_stripe_plan_name', planName);
    localStorage.setItem('awaiting_stripe_plan_value', String(planValue));
    localStorage.setItem('awaiting_stripe_payment_started', String(Date.now()));

    pixel.addPaymentInfo(planName, planValue);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/dashboard?payment=success',
      },
    });

    if (error) {
      localStorage.removeItem('awaiting_stripe_payment');
      setErrorMessage(error.message || 'Ocorreu um erro ao processar o pagamento.');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl backdrop-blur-sm">
        <PaymentElement
          options={{ layout: 'tabs' }}
          onReady={() => setElementReady(true)}
          onLoadError={(e) => {
            console.error('[PaymentElement] Load error:', e);
            setErrorMessage('Erro ao carregar métodos de pagamento. Tente fechar e abrir o checkout novamente.');
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-3 animate-in zoom-in duration-300">
          <span>⚠️</span> {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-4 pt-2">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div
            onClick={() => setAgreedToRecurring(v => !v)}
            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${agreedToRecurring ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 group-hover:border-zinc-400'}`}
          >
            {agreedToRecurring && <svg className="w-3 h-3 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          </div>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            Entendi que esta assinatura tem <strong className="text-white">renovação automática {planPeriod?.includes('ano') ? 'anual' : 'mensal'}</strong>. Posso cancelar a qualquer momento sem taxas adicionais.
          </p>
        </label>
        <button
          disabled={isProcessing || !stripe || !agreedToRecurring}
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

const LOADING_STEPS = [
  'Preparando ambiente seguro...',
  'Verificando sua identidade...',
  'Conectando ao processador de pagamento...',
  'Quase pronto...',
];

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  priceId,
  userId,
  email,
  plan,
  onClose,
  planName = 'ShapeScan Premium',
  planPrice = '29,90',
  planPeriod = '/mês'
}) => {
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponAppliedSuccess, setCouponAppliedSuccess] = useState(false);
  const [isCouponApplying, setIsCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [pricingOverview, setPricingOverview] = useState<{
    originalPrice: number;
    finalPrice: number;
    discount: number;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Progress messages durante loading
  useEffect(() => {
    if (!isInitializing) return;
    const interval = setInterval(() => {
      setLoadingStepIdx(i => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [isInitializing]);

  const initializeCheckout = useCallback(async (signal: AbortSignal) => {
    setIsInitializing(true);
    setError(null);

    try {
      console.log('[StripeCheckout] Iniciando checkout para priceId:', priceId);

      // Bypass SDK — getUser() e getSession() podem travar com Google OAuth.
      // userId já vem como prop; token via getValidToken() com refresh automático.
      if (!userId) {
        throw new Error('Usuário não autenticado. Faça login novamente para continuar.');
      }

      if (signal.aborted) return;

      const token = await getValidToken();
      if (signal.aborted) return;

      // Timeout de 30s para não travar o loading infinito
      const fetchPromise = callEdgeFunction('stripe-checkout', { priceId, couponCode: appliedCouponCode, plan });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('O servidor demorou para responder. Verifique sua conexão e tente novamente.')), 15000)
      );

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      if (signal.aborted) return;

      if (data?.isError) throw new Error(data.error);

      if (data?.pricing) {
        setPricingOverview(data.pricing);
      }

      if (data?.isFree) {
        console.log('[StripeCheckout] Assinatura gratuita ativada com sucesso!');
        window.location.href = '/dashboard?payment=success';
        return;
      }

      if (!data?.clientSecret) {
        throw new Error(data?.error || 'Falha ao obter chave de pagamento. Tente novamente.');
      }

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      if (signal.aborted) return;
      console.error('[StripeCheckout] Initialization error:', err);
      setError(err.message || 'Erro ao carregar o checkout. Tente novamente.');
    } finally {
      if (!signal.aborted) {
        setIsInitializing(false);
      }
    }
  }, [priceId, appliedCouponCode, plan]);

  useEffect(() => {
    const controller = new AbortController();
    initializeCheckout(controller.signal);
    return () => {
      controller.abort();
    };
  }, [initializeCheckout, retryCount]);

  const handleRetry = () => {
    setClientSecret(null);
    setError(null);
    setRetryCount(c => c + 1);
  };

  const handleApplyCoupon = async () => {
    if (!couponCodeInput || isCouponApplying) return;
    setIsCouponApplying(true);
    setCouponError(null);

    try {
      // Bypass SDK — usar getValidToken() + callEdgeFunction direto.
      await getValidToken(); // renova se expirado, para consistência

      const data = await callEdgeFunction('stripe-checkout', { priceId, couponCode: couponCodeInput, plan });

      if (data?.isError) throw new Error(data.error || 'Cupom inválido ou expirado.');

      if (data?.isFree) {
        window.location.href = '/dashboard?payment=success';
        return;
      }

      if (!data?.clientSecret) throw new Error(data?.error || 'Falha ao aplicar cupom.');

      // Não chamar setAppliedCouponCode aqui — mudaria dep do useCallback initializeCheckout
      // e dispararia re-inicialização desnecessária do checkout inteiro.
      setCouponAppliedSuccess(true);
      if (data.pricing) setPricingOverview(data.pricing);
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error('[StripeCheckout] Coupon error:', err);
      setCouponError(err.message || 'Cupom inválido ou expirado.');
    } finally {
      setIsCouponApplying(false);
    }
  };

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
            {pricingOverview && pricingOverview.discount > 0 ? (
              <div className="flex flex-col items-end">
                <span className="line-through text-zinc-500 text-sm font-bold mb-0.5">
                  R$ {pricingOverview.originalPrice.toFixed(2).replace('.', ',')}
                </span>
                <div className="text-2xl font-black text-emerald-400 tracking-tighter flex items-end gap-1">
                  <span>R$ {pricingOverview.finalPrice.toFixed(2).replace('.', ',')}</span>
                  <span className="text-zinc-500 text-sm font-bold mb-1">{planPeriod}</span>
                </div>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded mt-1">
                  Desconto de R$ {pricingOverview.discount.toFixed(2).replace('.', ',')}
                </span>
              </div>
            ) : (
              <div className="text-2xl font-black text-white tracking-tighter">
                R$ {planPrice}
                <span className="text-zinc-500 text-sm font-bold">{planPeriod}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-10 py-10 flex-1">
          {error ? (
            <div className="py-16 text-center animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <span className="text-4xl">⚠️</span>
              </div>
              <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Erro no Checkout</h4>
              <p className="text-zinc-400 mb-8 max-w-xs mx-auto text-sm">{error}</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={handleRetry}
                  className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase text-xs tracking-widest rounded-2xl transition-all"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-zinc-800 transition-all"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : isInitializing ? (
            <div className="py-32 flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-emerald-500/10 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px] transition-all duration-500">{LOADING_STEPS[loadingStepIdx]}</p>
              <div className="flex gap-1.5 mt-4">
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i <= loadingStepIdx ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                ))}
              </div>
            </div>
          ) : clientSecret ? (
            <div className="flex flex-col gap-6">
              {/* Cupom Section */}
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2">
                     <input
                       type="text"
                       value={couponCodeInput}
                       onChange={e => { setCouponCodeInput(e.target.value); setCouponError(null); setCouponAppliedSuccess(false); }}
                       onKeyDown={e => e.key === 'Enter' && couponCodeInput && handleApplyCoupon()}
                       placeholder="Código de desconto"
                       disabled={isCouponApplying}
                       className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50"
                     />
                   <button
                     type="button"
                     onClick={handleApplyCoupon}
                     disabled={!couponCodeInput || isCouponApplying}
                     className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase px-6 py-3.5 rounded-xl transition-colors disabled:opacity-50 min-w-[80px] flex items-center justify-center gap-2"
                   >
                     {isCouponApplying ? (
                       <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                     ) : 'Aplicar'}
                   </button>
                 </div>
                 {couponAppliedSuccess && !couponError && (
                    <div className="text-xs font-bold px-2 flex items-center gap-1 text-emerald-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Cupom aplicado com sucesso!</span>
                    </div>
                 )}
                 {couponError && (
                    <div className="text-xs font-bold px-2 flex items-center gap-1 text-red-400">
                        <span>⚠️ {couponError}</span>
                    </div>
                 )}
              </div>

              <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <div className="text-emerald-500 animate-pulse">🛡️</div>
                <div className="text-[10px] text-zinc-400 font-medium leading-tight">
                  <span className="text-emerald-500 font-bold block mb-0.5 uppercase tracking-wider">Compra 100% Segura</span>
                  Suas informações são encriptadas de ponta a ponta e processadas confidencialmente pela Stripe.
                </div>
              </div>

              <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, appearance }}>
                <PaymentForm onCancel={onClose} userId={userId} planId={priceId} planPeriod={planPeriod} planName={planName} planValue={parseFloat(planPrice.replace(',', '.'))} />
              </Elements>
            </div>
          ) : null}
        </div>

        <div className="px-10 py-6 bg-zinc-900/50 border-t border-zinc-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <span className="text-xs font-black text-white uppercase tracking-widest block">Garantia de 7 dias</span>
              <span className="text-[9px] text-zinc-500 font-medium">Não ficou satisfeito? Devolvemos sem perguntas.</span>
            </div>
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
