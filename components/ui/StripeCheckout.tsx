import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { pixel } from '../../utils/pixel';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { getValidToken, callEdgeFunction } from '../../services/supabaseService';
import { CheckCircle2 } from 'lucide-react';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripeCheckoutProps {
  priceId: string;
  userId: string;
  email: string;
  plan: string;
  onClose: () => void;
  planName?: string;
  planPrice?: string;
  planPeriod?: string;
}

const PaymentForm = ({
  onCancel,
  userId,
  planId,
  planPeriod,
  planName,
  planValue,
}: {
  onCancel: () => void;
  userId: string;
  planId: string;
  planPeriod: string;
  planName: string;
  planValue: number;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);

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

    localStorage.setItem('awaiting_stripe_payment', 'true');
    localStorage.setItem('awaiting_stripe_plan_name', planName);
    localStorage.setItem('awaiting_stripe_plan_value', String(planValue));

    pixel.addPaymentInfo(planName, planValue, undefined, userId);

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-2xl overflow-hidden border border-zinc-800">
        <PaymentElement
          options={{ layout: 'accordion' }}
          onReady={() => setElementReady(true)}
          onLoadError={(e) => {
            console.error('[PaymentElement] Load error:', e);
            setErrorMessage('Erro ao carregar métodos de pagamento. Tente fechar e abrir o checkout novamente.');
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
          <span>⚠️</span> {errorMessage}
        </div>
      )}

      <button
        disabled={isProcessing || !stripe}
        className="group relative w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-500/25"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Desbloquear agora
              <span className="text-base group-hover:translate-x-0.5 transition-transform">→</span>
            </>
          )}
        </span>
      </button>

      <p className="text-center text-[10px] text-zinc-600 font-medium leading-relaxed">
        Cancele quando quiser · Sem fidelidade
      </p>

      <button
        type="button"
        onClick={onCancel}
        disabled={isProcessing}
        className="w-full py-2 text-zinc-600 hover:text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
      >
        Voltar
      </button>
    </form>
  );
};

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  priceId,
  userId,
  email,
  plan,
  onClose,
  planName = 'ShapeScan Premium',
  planPrice = '29,90',
  planPeriod = '/mês',
}) => {
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponAppliedSuccess, setCouponAppliedSuccess] = useState(false);
  const [isCouponApplying, setIsCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [pricingOverview, setPricingOverview] = useState<{
    originalPrice: number;
    finalPrice: number;
    discount: number;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const appliedCouponRef = useRef<string | null>(null);

  // Derive a clean plan label for the header (e.g. "Plano Pro" from "Pro Mensal")
  const planLabel = planName.toLowerCase().includes('pro') ? 'Plano Pro' : 'Plano Standard';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const initializeCheckout = useCallback(async (signal: AbortSignal) => {
    setIsInitializing(true);
    setError(null);

    try {
      if (!userId) throw new Error('Usuário não autenticado. Faça login novamente para continuar.');
      if (signal.aborted) return;

      await getValidToken();
      if (signal.aborted) return;

      const getUtmParams = () => {
        try {
          const raw = document.cookie.split('; ').find(c => c.startsWith('utmify='));
          if (!raw) return {};
          return JSON.parse(decodeURIComponent(raw.split('=').slice(1).join('=')));
        } catch { return {}; }
      };
      const utmParams = getUtmParams();

      const fetchPromise = callEdgeFunction('stripe-checkout', {
        priceId,
        couponCode: appliedCouponRef.current,
        plan,
        utmParams,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('O servidor demorou para responder. Tente novamente.')), 30000)
      );

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      if (signal.aborted) return;

      if (data?.isError) throw new Error(data.error);
      if (data?.pricing) setPricingOverview(data.pricing);

      if (data?.isFree) {
        const freeValue = data.pricing?.finalPrice ?? 0;
        localStorage.setItem('awaiting_stripe_payment', 'true');
        localStorage.setItem('awaiting_stripe_plan_name', planName);
        localStorage.setItem('awaiting_stripe_plan_value', String(freeValue));
        window.location.href = '/dashboard?payment=success';
        return;
      }

      if (!data?.clientSecret) throw new Error(data?.error || 'Falha ao obter chave de pagamento. Tente novamente.');
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      if (signal.aborted) return;
      setError(err.message || 'Erro ao carregar o checkout. Tente novamente.');
    } finally {
      if (!signal.aborted) setIsInitializing(false);
    }
  }, [priceId, plan]);

  useEffect(() => {
    const controller = new AbortController();
    initializeCheckout(controller.signal);
    return () => controller.abort();
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
      await getValidToken();
      const data = await callEdgeFunction('stripe-checkout', { priceId, couponCode: couponCodeInput, plan });

      if (data?.isError) throw new Error(data.error || 'Cupom inválido ou expirado.');

      if (data?.isFree) {
        const freeValue = data.pricing?.finalPrice ?? 0;
        localStorage.setItem('awaiting_stripe_payment', 'true');
        localStorage.setItem('awaiting_stripe_plan_name', planName);
        localStorage.setItem('awaiting_stripe_plan_value', String(freeValue));
        window.location.href = '/dashboard?payment=success';
        return;
      }

      if (!data?.clientSecret) throw new Error(data?.error || 'Falha ao aplicar cupom.');

      appliedCouponRef.current = couponCodeInput;
      setCouponAppliedSuccess(true);
      if (data.pricing) setPricingOverview(data.pricing);
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setCouponError(err.message || 'Cupom inválido ou expirado.');
    } finally {
      setIsCouponApplying(false);
    }
  };

  // zinc-950 (#09090b) as background — elimina o azul escuro padrão do Stripe night theme
  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#10b981',
      colorBackground: '#09090b',
      colorText: '#ffffff',
      colorSecondaryText: '#a1a1aa',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '12px',
      colorIconTab: '#71717a',
      colorIconTabSelected: '#10b981',
      colorIconTabHover: '#a1a1aa',
    },
    rules: {
      '.Input': {
        border: '1px solid #27272a',
        backgroundColor: '#18181b',
        color: '#ffffff',
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
      '.Tab': {
        border: '1px solid #27272a',
        backgroundColor: '#18181b',
        color: '#a1a1aa',
      },
      '.Tab--selected': {
        border: '1px solid #10b981',
        backgroundColor: '#18181b',
        color: '#ffffff',
      },
      '.Tab:hover': {
        backgroundColor: '#27272a',
        color: '#ffffff',
      },
      '.Block': {
        backgroundColor: '#09090b',
        border: '1px solid #27272a',
      },
      '.AccordionItem': {
        backgroundColor: '#09090b',
        borderColor: '#27272a',
      },
      '.PickerItem': {
        backgroundColor: '#18181b',
        border: '1px solid #27272a',
      },
      '.PickerItem--selected': {
        backgroundColor: '#18181b',
        border: '1px solid #10b981',
      },
    },
  };

  const displayPrice = pricingOverview
    ? `R$ ${pricingOverview.finalPrice.toFixed(2).replace('.', ',')}`
    : `R$ ${planPrice}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center md:p-8 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full md:max-w-lg bg-zinc-950 border-t border-zinc-800 md:border md:rounded-3xl md:shadow-2xl rounded-t-3xl flex flex-col max-h-[92dvh] md:max-h-[90vh] transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-zinc-800 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-4 border-b border-zinc-800/80 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-white font-black text-base leading-tight">{planLabel}</p>
            <p className="text-zinc-500 text-[10px] font-medium mt-0.5">Acesso imediato após pagamento</p>
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            {pricingOverview && pricingOverview.discount > 0 && (
              <span className="text-zinc-500 text-xs line-through leading-none mb-0.5">
                R$ {pricingOverview.originalPrice.toFixed(2).replace('.', ',')}
              </span>
            )}
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-emerald-400 leading-none">{displayPrice}</span>
              <span className="text-zinc-500 text-xs font-bold">{planPeriod}</span>
            </div>
            {pricingOverview && pricingOverview.discount > 0 && (
              <span className="text-[9px] text-emerald-500 font-bold mt-0.5">
                − R$ {pricingOverview.discount.toFixed(2).replace('.', ',')} de desconto
              </span>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 flex flex-col gap-4">

          {error ? (
            <div className="py-10 text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h4 className="text-base font-black text-white mb-1 uppercase tracking-tight">Erro no Checkout</h4>
                <p className="text-zinc-400 text-sm max-w-xs">{error}</p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-95"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3.5 bg-zinc-900 border border-zinc-800 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-zinc-800 transition-all active:scale-95"
                >
                  Voltar
                </button>
              </div>
            </div>

          ) : isInitializing ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 border-4 border-emerald-500/10 rounded-full" />
                <div className="absolute top-0 left-0 w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-zinc-500 font-medium text-xs">Conectando com pagamento seguro…</p>
            </div>

          ) : clientSecret ? (
            <>
              {/* O que você está desbloqueando */}
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 px-4 py-3.5">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2.5">
                  Você está desbloqueando:
                </p>
                <ul className="space-y-2">
                  {[
                    'Análise completa da sua refeição',
                    'Seu percentual de gordura',
                    'Personal trainer 24h',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-medium text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust badge */}
              <div className="flex items-center gap-3 px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
                <span className="text-base flex-shrink-0">🔒</span>
                <div>
                  <p className="text-white text-[11px] font-bold leading-tight">Pagamento seguro com Stripe</p>
                  <p className="text-zinc-500 text-[10px] font-medium">Seus dados são criptografados</p>
                </div>
              </div>

              {/* Payment form */}
              <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, appearance }}>
                <PaymentForm
                  onCancel={handleClose}
                  userId={userId}
                  planId={priceId}
                  planPeriod={planPeriod}
                  planName={planName}
                  planValue={parseFloat(planPrice.replace(',', '.'))}
                />
              </Elements>

              {/* Cupom colapsável */}
              <div className="border-t border-zinc-800/50 pt-3">
                {!showCouponInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCouponInput(true)}
                    className="text-zinc-600 hover:text-zinc-400 text-xs font-medium transition-colors"
                  >
                    Tem um cupom?
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={e => {
                          setCouponCodeInput(e.target.value);
                          setCouponError(null);
                          setCouponAppliedSuccess(false);
                        }}
                        onKeyDown={e => e.key === 'Enter' && couponCodeInput && handleApplyCoupon()}
                        placeholder="Código de desconto"
                        disabled={isCouponApplying}
                        autoFocus
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponCodeInput || isCouponApplying}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase px-5 py-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 min-w-[76px]"
                      >
                        {isCouponApplying ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : 'Aplicar'}
                      </button>
                    </div>
                    {couponAppliedSuccess && !couponError && (
                      <p className="text-xs font-bold text-emerald-500 flex items-center gap-1 px-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        Cupom aplicado com sucesso!
                      </p>
                    )}
                    {couponError && (
                      <p className="text-xs font-bold text-red-400 px-1">⚠️ {couponError}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer fixo */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-zinc-800/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-zinc-600">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Garantia ShapeScan</span>
          </div>
          <div className="flex items-center gap-1.5">
            {['CARTÕES', 'APPLE PAY', 'GOOGLE PAY'].map(m => (
              <span key={m} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[8px] font-black text-zinc-500 tracking-wide">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;
