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
      <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/60">
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

      <p className="text-center text-[10px] text-zinc-500 font-medium leading-relaxed px-2">
        Renovação automática {planPeriod?.includes('ano') ? 'anual' : 'mensal'}. Cancele quando quiser, sem taxas.
      </p>

      <button
        disabled={isProcessing || !stripe}
        className="group relative w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-500/25 overflow-hidden"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Assinar Agora
              <span className="text-base group-hover:translate-x-0.5 transition-transform">→</span>
            </>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={isProcessing}
        className="w-full py-3 text-zinc-500 hover:text-zinc-300 text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
      >
        Cancelar e Voltar
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

  // Animate in after mount
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
      borderRadius: '14px',
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
      '.Tab': {
        border: '1px solid #27272a',
        backgroundColor: '#18181b',
      },
      '.Tab--selected': {
        border: '1px solid #10b981',
      },
    },
  };

  const displayPrice = pricingOverview
    ? `R$ ${pricingOverview.finalPrice.toFixed(2).replace('.', ',')}`
    : `R$ ${planPrice}`;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center md:p-8 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Sheet / Modal */}
      <div
        className={[
          // Mobile: bottom sheet that slides up
          'w-full md:max-w-lg bg-zinc-950 border-t border-zinc-800',
          'md:border md:rounded-3xl md:shadow-2xl',
          // Rounded top corners on mobile
          'rounded-t-3xl',
          'flex flex-col',
          // Max height + scroll on mobile
          'max-h-[92dvh] md:max-h-[90vh]',
          'transition-transform duration-300 ease-out',
        ].join(' ')}
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Top accent line */}
        <div className="hidden md:block absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent rounded-t-3xl" />

        {/* Header — compact, always visible */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-800/80 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
              <span className="text-zinc-950 font-black italic text-sm">S</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-tight truncate">Assinatura ShapeScan</p>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider truncate">{planName}</p>
            </div>
          </div>

          <div className="flex items-end gap-1 flex-shrink-0">
            {pricingOverview && pricingOverview.discount > 0 && (
              <span className="text-zinc-500 text-xs line-through mb-0.5">
                R$ {pricingOverview.originalPrice.toFixed(2).replace('.', ',')}
              </span>
            )}
            <div className="text-right">
              <span className="text-lg font-black text-emerald-400 leading-none">{displayPrice}</span>
              <span className="text-zinc-500 text-xs font-bold">{planPeriod}</span>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 flex flex-col gap-4">

          {error ? (
            <div className="py-10 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                <span className="text-3xl">⚠️</span>
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
            <div className="py-16 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 border-4 border-emerald-500/10 rounded-full" />
                <div className="absolute top-0 left-0 w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-zinc-500 font-black uppercase tracking-[0.25em] text-[10px] animate-pulse">Preparando ambiente seguro...</p>
            </div>

          ) : clientSecret ? (
            <>
              {/* Trust badge */}
              <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                <span className="text-emerald-500 text-base flex-shrink-0">🛡️</span>
                <p className="text-[10px] text-zinc-400 font-medium leading-tight">
                  <span className="text-emerald-400 font-bold">Compra 100% Segura — </span>
                  Dados encriptados e processados pela Stripe.
                </p>
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

              {/* Coupon — collapsible to save vertical space */}
              <div className="border-t border-zinc-800/60 pt-4">
                {!showCouponInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCouponInput(true)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs font-bold tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Tenho um cupom de desconto
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

              {/* Discount badge if applied */}
              {pricingOverview && pricingOverview.discount > 0 && (
                <div className="flex items-center justify-between text-xs font-bold px-1">
                  <span className="text-zinc-500">Desconto aplicado</span>
                  <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                    − R$ {pricingOverview.discount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer — payment methods, always visible */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-zinc-800/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-600">
            <svg className="w-3.5 h-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Garantia ShapeScan</span>
          </div>
          <div className="flex items-center gap-1.5">
            {['CARTÕES', 'APPLE PAY', 'GOOGLE PAY'].map(m => (
              <span key={m} className="px-1.5 py-0.5 bg-zinc-800/60 border border-zinc-700/40 rounded text-[8px] font-black text-zinc-500 tracking-wide">
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
