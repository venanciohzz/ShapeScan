import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle2, Shield, ChevronDown, ChevronUp, Camera, Dumbbell, MessageCircle, Zap, Lock, Tag, ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/400.css';
import { PAYMENT_CONFIG } from '../services/paymentConfig';
import { User } from '../types';
import { callEdgeFunction, supabaseUrl, supabaseAnonKey, supabase } from '../services/supabaseService';
import { pixel } from '../utils/pixel';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY);

const stripeAppearance = {
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
  },
  rules: {
    '.Input': { border: '1px solid #27272a', backgroundColor: '#18181b', color: '#ffffff' },
    '.Input:focus': { border: '1px solid #10b981', boxShadow: '0 0 0 2px rgba(16,185,129,0.1)' },
    '.Label': { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#71717a' },
    '.Tab': { border: '1px solid #27272a', backgroundColor: '#18181b', color: '#a1a1aa' },
    '.Tab--selected': { border: '1px solid #10b981', backgroundColor: '#18181b', color: '#ffffff' },
    '.Block': { backgroundColor: '#09090b', border: '1px solid #27272a' },
    '.WalletButton': { borderRadius: '12px' },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface QuizData {
  gender?: 'male' | 'female';
  height?: number;
  weight?: number;
  goal?: 'lose' | 'gain' | 'recomp' | 'maintain';
  age?: number;
  activityLevel?: string;
  frequency?: string;
}

interface PricingInfo {
  originalPrice: number;
  finalPrice: number;
  discount: number;
}

interface SalesPageProps {
  user: User | null;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// ── Google OAuth icon ────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ── App Mockup ────────────────────────────────────────────────────────────────

const AppMockup = () => (
  <>
    <div
      className="relative select-none overflow-hidden md:hidden"
      style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}
    >
      <img
        src="/app-mockup.jpg"
        alt="ShapeScan app no iPhone"
        className="w-full h-auto"
        style={{ mixBlendMode: 'screen' }}
        draggable={false}
      />
    </div>
    <div className="hidden md:flex justify-center">
      <img
        src="/app-mockup.jpg"
        alt="ShapeScan app no iPhone"
        className="h-auto"
        style={{ maxWidth: 540, mixBlendMode: 'screen' }}
        draggable={false}
      />
    </div>
  </>
);

// ── FAQs ──────────────────────────────────────────────────────────────────────

const faqs = [
  { q: 'Preciso saber de nutrição para usar?', a: 'Não. O app faz tudo por você. Basta fotografar o que comeu.' },
  { q: 'Funciona sem academia?', a: 'Sim. O ShapeScan acompanha sua nutrição e evolução independente de onde você treina — ou se treina.' },
  { q: 'Quando tenho acesso?', a: 'Imediatamente após o pagamento. Você receberá um e-mail para criar sua senha e acessar o app.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Cancele pelo próprio app, a qualquer momento, sem precisar entrar em contato.' },
  { q: 'E se eu não gostar?', a: 'Garantia de 7 dias. Se não fizer sentido pra você, devolvemos 100% do valor — sem perguntas.' },
];

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as any } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

// ── Reusable UI ───────────────────────────────────────────────────────────────

const TrustRow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 ${className}`}>
    <span className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold">
      <Lock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />SSL 256-bit
    </span>
    <span className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold">
      <Shield className="w-2.5 h-2.5 text-emerald-500 shrink-0" />Dados criptografados
    </span>
    <span className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold">
      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />Garantia de 7 dias
    </span>
  </div>
);

const PurchaseSummaryCard: React.FC<{
  planName: string;
  planPeriod: 'monthly' | 'annual';
  pricing: PricingInfo;
}> = ({ planName, planPeriod, pricing }) => (
  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-4">
    <p className="text-zinc-600 text-[9px] font-black uppercase tracking-widest mb-3">Resumo do pedido</p>
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-white font-bold text-sm">{planName}</p>
        <p className="text-zinc-600 text-[10px] mt-0.5">
          {planPeriod === 'annual' ? 'Cobrado anualmente · R$247/ano' : 'Cobrado mensalmente'}
        </p>
      </div>
      <div className="text-right shrink-0">
        {pricing.discount > 0 && (
          <p className="text-zinc-600 text-xs line-through">
            R${pricing.originalPrice.toFixed(2).replace('.', ',')}
          </p>
        )}
        <p className="text-emerald-400 font-black text-xl leading-none">
          R${pricing.finalPrice.toFixed(2).replace('.', ',')}
        </p>
        {planPeriod === 'monthly' && (
          <p className="text-zinc-600 text-[9px]">/mês</p>
        )}
      </div>
    </div>
    {pricing.discount > 0 && (
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-800">
        <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
        <span className="text-emerald-400 text-xs font-bold">
          Cupom aplicado — economia de R${pricing.discount.toFixed(2).replace('.', ',')}
        </span>
      </div>
    )}
  </div>
);

// ── GuestPaymentForm ──────────────────────────────────────────────────────────

const GuestPaymentForm: React.FC<{
  email: string;
  name: string;
  planName: string;
  planPeriod: 'monthly' | 'annual';
  pricing: PricingInfo;
  onCancel: () => void;
}> = ({ email, name, planName, planPeriod, pricing, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    localStorage.setItem('awaiting_stripe_payment', 'true');
    localStorage.setItem('awaiting_stripe_plan_name', planName);
    localStorage.setItem('awaiting_stripe_plan_value', String(pricing.finalPrice));
    localStorage.setItem('guest_checkout_email', email);

    pixel.addPaymentInfo(planName, pricing.finalPrice, undefined, '');

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/assinar?payment=success',
        payment_method_data: {
          billing_details: {
            email: email.toLowerCase().trim(),
            ...(name.trim() ? { name: name.trim() } : {}),
          },
        },
      },
    });

    if (confirmError) {
      localStorage.removeItem('awaiting_stripe_payment');
      const isNetwork = confirmError.type === 'api_connection_error';
      setError(
        isNetwork
          ? 'Erro de conexão. Desative ad blockers ou VPN e tente novamente.'
          : confirmError.message || 'Erro ao processar pagamento.'
      );
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PurchaseSummaryCard planName={planName} planPeriod={planPeriod} pricing={pricing} />

      <div className="rounded-2xl overflow-hidden border border-zinc-800">
        <PaymentElement
          options={{
            layout: 'accordion',
            wallets: { applePay: 'auto', googlePay: 'auto' },
            fields: {
              billingDetails: {
                email: 'never',
                name: name.trim() ? 'never' : 'auto',
              },
            },
            defaultValues: {
              billingDetails: {
                email: email.toLowerCase().trim(),
                ...(name.trim() ? { name: name.trim() } : {}),
              },
            },
          }}
          onReady={() => setReady(true)}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <button
        disabled={processing || !stripe || !ready}
        className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]"
      >
        {processing ? (
          <>
            <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
            Processando pagamento...
          </>
        ) : (
          <>Ativar meu acesso completo →</>
        )}
      </button>

      <TrustRow />

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2 text-zinc-600 hover:text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
      >
        Voltar
      </button>
    </form>
  );
};

// ── GuestCheckoutWrapper ──────────────────────────────────────────────────────

const GuestCheckoutWrapper: React.FC<{
  email: string;
  name: string;
  priceId: string;
  plan: string;
  planName: string;
  planPeriod: 'monthly' | 'annual';
  planValue: number;
  quizData: QuizData;
  couponCode: string;
  onCancel: () => void;
}> = ({ email, name, priceId, plan, planName, planPeriod, planValue, quizData, couponCode, onCancel }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingInfo>({ originalPrice: planValue, finalPrice: planValue, discount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const utmParams = (() => {
        try {
          const raw = document.cookie.split('; ').find(c => c.startsWith('utmify='));
          return raw ? JSON.parse(decodeURIComponent(raw.split('=').slice(1).join('='))) : {};
        } catch { return {}; }
      })();

      const body: Record<string, any> = { email, priceId, plan, quizData, utmParams };
      if (couponCode.trim()) body.couponCode = couponCode.trim().toUpperCase();

      const res = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao iniciar checkout.');

      if (data.isFree) {
        window.location.href = '/assinar?payment=success';
        return;
      }

      if (data.pricing) setPricing(data.pricing);
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar checkout. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [email, priceId, plan, couponCode]);

  useEffect(() => { init(); }, [init]);

  if (loading) {
    return (
      <div className="py-10 flex flex-col items-center gap-3">
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-zinc-500 text-xs">Conectando com pagamento seguro…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 flex flex-col items-center gap-4 text-center">
        <p className="text-red-400 text-sm font-bold">⚠️ {error}</p>
        <button
          onClick={init}
          className="px-6 py-3 bg-emerald-500 text-zinc-950 font-black uppercase text-xs tracking-widest rounded-2xl"
        >
          Tentar novamente
        </button>
        <button onClick={onCancel} className="text-zinc-600 text-xs underline">Voltar</button>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
      <GuestPaymentForm
        email={email}
        name={name}
        planName={planName}
        planPeriod={planPeriod}
        pricing={pricing}
        onCancel={onCancel}
      />
    </Elements>
  );
};

// ── AuthPaymentForm ───────────────────────────────────────────────────────────

const AuthPaymentForm: React.FC<{
  user: User;
  planName: string;
  planPeriod: 'monthly' | 'annual';
  planValue: number;
  onCancel: () => void;
}> = ({ user, planName, planPeriod, planValue, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    localStorage.setItem('awaiting_stripe_payment', 'true');
    localStorage.setItem('awaiting_stripe_plan_name', planName);
    localStorage.setItem('awaiting_stripe_plan_value', String(planValue));

    pixel.addPaymentInfo(planName, planValue, undefined, user.id);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/dashboard?payment=success' },
    });

    if (confirmError) {
      localStorage.removeItem('awaiting_stripe_payment');
      setError(confirmError.message || 'Erro ao processar pagamento.');
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PurchaseSummaryCard
        planName={planName}
        planPeriod={planPeriod}
        pricing={{ originalPrice: planValue, finalPrice: planValue, discount: 0 }}
      />

      <div className="rounded-2xl overflow-hidden border border-zinc-800">
        <PaymentElement
          options={{
            layout: 'accordion',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
          onReady={() => setReady(true)}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <button
        disabled={processing || !ready}
        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]"
      >
        {processing ? (
          <>
            <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
            Processando pagamento...
          </>
        ) : (
          <>Ativar meu acesso completo →</>
        )}
      </button>

      <TrustRow />

      <button type="button" onClick={onCancel} className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
        Voltar
      </button>
    </form>
  );
};

// ── AuthCheckoutWrapper ───────────────────────────────────────────────────────

const AuthCheckoutWrapper: React.FC<{
  user: User;
  priceId: string;
  plan: string;
  planName: string;
  planPeriod: 'monthly' | 'annual';
  planValue: number;
  couponCode: string;
  onCancel: () => void;
}> = ({ user, priceId, plan, planName, planPeriod, planValue, couponCode, onCancel }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, any> = { priceId, plan };
      if (couponCode.trim()) body.couponCode = couponCode.trim().toUpperCase();
      const data = await callEdgeFunction('stripe-checkout', body);
      if (data.isFree) { window.location.href = '/dashboard?payment=success'; return; }
      if (!data.clientSecret) throw new Error(data.error || 'Erro ao obter checkout.');
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar checkout.');
    } finally {
      setLoading(false);
    }
  }, [priceId, plan, couponCode]);

  useEffect(() => { init(); }, [init]);

  if (loading) return (
    <div className="py-10 flex flex-col items-center gap-3">
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-zinc-500 text-xs">Conectando…</p>
    </div>
  );

  if (error) return (
    <div className="py-6 text-center space-y-3">
      <p className="text-red-400 text-sm">⚠️ {error}</p>
      <button onClick={init} className="px-6 py-3 bg-emerald-500 text-zinc-950 font-black uppercase text-xs rounded-2xl">
        Tentar novamente
      </button>
    </div>
  );

  if (!clientSecret) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
      <AuthPaymentForm user={user} planName={planName} planPeriod={planPeriod} planValue={planValue} onCancel={onCancel} />
    </Elements>
  );
};

// ── FAQ item ──────────────────────────────────────────────────────────────────

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left bg-zinc-900/60 backdrop-blur-sm border border-white/5 hover:border-emerald-500/30 rounded-2xl p-5 transition-all duration-300"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-white text-sm">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-emerald-500 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
      </div>
      {open && <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{a}</p>}
    </button>
  );
};

// ── Main SalesPage ────────────────────────────────────────────────────────────

const SalesPage: React.FC<SalesPageProps> = ({ user, onShowToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isPaymentSuccess = params.get('payment') === 'success' || params.get('redirect_status') === 'succeeded';

  const [quizData, setQuizData] = useState<QuizData>({});
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

  const [email, setEmail] = useState('');
  const [emailDirty, setEmailDirty] = useState(false);
  const [name, setName] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);

  const [showCheckout, setShowCheckout] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/assinar',
          queryParams: { prompt: 'select_account' },
        },
      });
    } catch (err) {
      console.error('[SalesPage] Google OAuth erro:', err);
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isPremium) { navigate('/dashboard', { replace: true }); return; }
    try {
      const raw = localStorage.getItem('shapescan_quiz_data');
      if (raw) setQuizData(JSON.parse(raw));
    } catch {}
    pixel.pageView(user?.id);
  }, [user]);

  const plan = PAYMENT_CONFIG[selectedPlan];

  const emailValid = isValidEmail(email);
  const emailError = emailDirty && !emailValid;

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailDirty(true);
    if (!emailValid) return;
    setShowCheckout(true);
    pixel.initiateCheckout(plan.name, plan.price, user?.id || '', email);
    setTimeout(() => {
      document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ── Payment success screen ────────────────────────────────────────────────
  if (isPaymentSuccess) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-3">Pagamento confirmado!</h1>
            <p className="text-zinc-400 leading-relaxed">
              Seu acesso está sendo ativado. Em alguns minutos você receberá um e-mail para criar sua senha e entrar no ShapeScan.
            </p>
            <p className="text-zinc-500 text-sm mt-4">Não recebeu? Verifique o spam ou aguarde até 5 minutos.</p>
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-left">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">O que acontece agora:</p>
            {['Você receberá um e-mail com o link de acesso', 'Clique no link e crie sua senha', 'Acesse o ShapeScan e comece hoje'].map((step, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-sm text-zinc-300">{step}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/entrar')}
            className="w-full py-4 border border-zinc-700 text-zinc-400 font-bold text-sm rounded-2xl hover:border-zinc-600 transition-colors"
          >
            Já tenho minha senha → Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#020202] text-white overflow-x-hidden">
      <style>{`
        .font-serif-premium {
          font-family: 'Playfair Display', serif;
          letter-spacing: -0.02em;
        }
        .text-gradient {
          background: linear-gradient(to right, #34d399, #10b981, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glow-emerald {
          filter: drop-shadow(0 0 30px rgba(16,185,129,0.4));
        }
      `}</style>

      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl px-5 py-3 flex items-center justify-between">
        <span className="font-serif-premium font-bold text-white text-lg">ShapeScan<span className="text-emerald-500">.</span></span>
        <button
          onClick={() => navigate('/entrar')}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-zinc-400 hover:text-white text-[11px] font-black uppercase tracking-[0.15em] transition-all"
        >
          Já tenho conta
        </button>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-10 pb-0 overflow-hidden">
        {/* Glow blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/8 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto px-5">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Diagnóstico completo
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-6"
          >
            <h1 className="font-serif-premium text-[clamp(2rem,8vw,3.5rem)] font-bold text-white leading-[1.1] mb-4">
              Você treina, tenta comer melhor
              <br />
              <span className="text-gradient italic glow-emerald">e mesmo assim… nada muda</span>
            </h1>
            <p className="text-zinc-500 text-lg font-medium">e o pior</p>
            <p className="text-zinc-300 text-base mt-1">
              você nem sabe exatamente o que está errando
            </p>
          </motion.div>
        </div>

        {/* Mockup full-bleed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <AppMockup />
        </motion.div>

        {/* Transição */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="max-w-2xl mx-auto px-5 mt-8"
        >
          <div className="relative pl-4 border-l-2 border-emerald-500/40 py-2 space-y-1">
            <p className="text-zinc-300 text-base font-medium">Você não estava travado à toa</p>
            <p className="text-zinc-500 text-sm">você só estava tentando no escuro</p>
            <p className="text-white font-bold text-base mt-1">Agora isso ficou claro</p>
          </div>
        </motion.div>
      </section>

      <div className="max-w-2xl mx-auto px-5 space-y-20 pt-16 pb-10">

        {/* ── DIAGNÓSTICO PERSONALIZADO ── */}
        {quizData.goal && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
              <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-5">
                Baseado no seu perfil
              </p>
              <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4">
                {[
                  { cond: 'se você continuar sem rastrear', cons: 'vai continuar se esforçando… sem ver resultado' },
                  { cond: 'se continuar comendo no "achismo"', cons: 'vai errar mesmo tentando acertar' },
                  { cond: 'se não souber o quanto seu corpo precisa', cons: 'vai sempre ficar perto… mas nunca chegar' },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-[10px] font-black">✗</span>
                    <p className="text-sm leading-relaxed">
                      <span className="text-white font-semibold">{item.cond}</span>
                      <span className="text-zinc-400"> — {item.cons}</span>
                    </p>
                  </motion.div>
                ))}
              </motion.div>
              {quizData.height && quizData.weight && (
                <div className="mt-5 pt-5 border-t border-white/5 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Altura', value: `${quizData.height} cm` },
                    { label: 'Peso', value: `${quizData.weight} kg` },
                    { label: 'Frequência', value: quizData.frequency === '0-2' ? 'Iniciante' : quizData.frequency === '6 ou mais' ? 'Avançado' : 'Moderado' },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-white/[0.03] rounded-xl p-3 border border-white/5">
                      <p className="text-white font-bold text-sm">{s.value}</p>
                      <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* ── PROBLEMA ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="relative"
        >
          <div className="absolute -left-20 top-1/2 w-64 h-64 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />

          <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-8">
            E é aqui que começa a frustração de verdade
          </p>

          <div className="space-y-6 relative z-10">
            {[
              'você sai da academia cansado\ncom a sensação de "hoje foi"',
              'chega em casa\nolha pra comida\ne decide no olho',
              'às vezes come menos achando que ajuda\nàs vezes exagera sem perceber',
              'no outro dia\nrepete tudo de novo',
            ].map((block, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-zinc-300 text-base leading-loose whitespace-pre-line"
              >
                {block}
              </motion.p>
            ))}
            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-serif-premium text-3xl font-bold text-white"
            >
              e nada muda
            </motion.p>
          </div>

          {/* Quebra de crença */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-12 text-center space-y-2 py-6"
          >
            <p className="text-zinc-400 text-base">o problema não é falta de esforço</p>
            <p className="font-serif-premium text-2xl font-bold text-white leading-snug">
              é não saber se o que você está fazendo
              <br />
              <span className="text-gradient italic glow-emerald">realmente funciona</span>
            </p>
          </motion.div>

          {/* ShapeScan intro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6"
          >
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />
            <p className="text-zinc-400 text-sm mb-2">foi aí que tudo começou a fazer sentido</p>
            <p className="font-serif-premium text-2xl font-bold text-white leading-snug">
              O ShapeScan existe pra tirar você desse chute
            </p>
          </motion.div>
        </motion.section>

        {/* ── FUNCIONALIDADES ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-6">Como funciona</p>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 gap-3">
            {[
              {
                icon: <Camera className="w-5 h-5 text-emerald-400" />,
                title: 'Foto da refeição',
                desc: 'você tira uma foto\ne para de tentar adivinhar o que está acontecendo',
                result: 'Sem pesagem. Sem tabela. Sem chute.',
              },
              {
                icon: <Dumbbell className="w-5 h-5 text-emerald-400" />,
                title: 'Análise do corpo',
                desc: 'você vê seu corpo mudando\ne entende o que realmente está funcionando',
                result: 'Dado real. Semana a semana.',
              },
              {
                icon: <MessageCircle className="w-5 h-5 text-emerald-400" />,
                title: 'IA Personal',
                desc: 'você pergunta\ne recebe resposta baseada no que você realmente faz',
                result: 'Contexto real. 24h por dia.',
              },
              {
                icon: <Zap className="w-5 h-5 text-emerald-400" />,
                title: 'Plano personalizado',
                desc: 'você acorda já sabendo o que fazer\nsem dúvida\nsem tentativa',
                result: 'Um alvo claro. Todo dia.',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="group p-5 bg-zinc-900/60 backdrop-blur-sm border border-white/5 hover:border-emerald-500/30 rounded-3xl transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors border border-emerald-500/10">
                    {f.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm mb-1">{f.title}</p>
                    <p className="text-zinc-500 text-xs leading-relaxed whitespace-pre-line mb-2">{f.desc}</p>
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {f.result}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* não é sobre fazer mais */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-10 text-center"
          >
            <p className="text-zinc-500 text-base mb-1">não é sobre fazer mais</p>
            <p className="font-serif-premium text-3xl font-bold">
              é sobre{' '}
              <span className="text-gradient italic glow-emerald">fazer certo</span>
            </p>
          </motion.div>
        </motion.section>

        {/* ── DEPOIMENTOS ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-6">Quem já usa</p>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4">
            {[
              {
                name: 'Matheus R.',
                age: '28 anos',
                text: 'eu achei que era só treinar mais… mas eu tava comendo errado o tempo todo',
              },
              {
                name: 'Juliana F.',
                age: '31 anos',
                text: 'já tinha tentado de tudo. quando vi os números pela primeira vez, fez sentido na hora',
              },
              {
                name: 'Carlos M.',
                age: '24 anos',
                text: 'no começo eu não acreditei. mas foi a primeira vez que eu soube exatamente o que fazer',
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="relative p-6 bg-zinc-900/60 backdrop-blur-md border border-white/5 hover:border-emerald-500/20 rounded-3xl transition-all duration-300 group"
              >
                <div className="absolute top-6 right-6 font-serif-premium text-5xl text-emerald-500/10 leading-none pointer-events-none">"</div>
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />)}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-4 group-hover:text-zinc-200 transition-colors">
                  "{t.text}"
                </p>
                <div>
                  <p className="text-white text-xs font-bold">{t.name}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">{t.age}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ── PREÇO ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="relative"
        >
          <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/5 blur-[70px] rounded-full pointer-events-none" />
          <div className="space-y-5 relative z-10">
            <div className="space-y-3">
              <p className="text-zinc-400 text-base leading-relaxed">
                ou você continua gastando com dieta<br />
                tentando plano daqui e dali
              </p>
              <p className="font-serif-premium text-2xl font-bold text-white">
                ou resolve isso de{' '}
                <span className="text-gradient italic">forma simples</span>
              </p>
            </div>
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-white/5 rounded-3xl p-6 space-y-3">
              <p className="text-zinc-400 text-sm">por menos de</p>
              <p className="font-serif-premium text-4xl font-bold text-white">
                <span className="text-gradient">1 real</span>{' '}
                <span className="text-zinc-500 text-lg font-normal">por dia</span>
              </p>
              <p className="text-zinc-300 text-sm leading-loose">
                você sai do achismo<br />
                e entra na clareza
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── CHECKOUT ── */}
        <section id="checkout-section" className="scroll-mt-20 space-y-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center space-y-2"
          >
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Acesso imediato</p>
            <h2 className="font-serif-premium text-3xl font-bold text-white">
              Ativar meu acesso{' '}
              <span className="text-gradient italic">agora</span>
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              cada dia que você continua no chute<br />
              é mais um dia sem resultado
            </p>
          </motion.div>

          {/* Seleção de plano */}
          <div className="grid grid-cols-2 gap-3">
            {(['monthly', 'annual'] as const).map(p => {
              const active = selectedPlan === p;
              return (
                <button
                  key={p}
                  onClick={() => { if (!showCheckout) setSelectedPlan(p); }}
                  disabled={showCheckout}
                  className={`relative p-4 rounded-2xl border text-left transition-all duration-300 ${
                    active
                      ? 'border-emerald-500/60 bg-emerald-500/5 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]'
                      : 'border-white/5 bg-zinc-900/40 hover:border-white/10'
                  } disabled:opacity-60`}
                >
                  {p === 'annual' && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase rounded-full whitespace-nowrap">
                      Economize 31%
                    </span>
                  )}
                  <p className="font-bold text-white text-sm">{p === 'monthly' ? 'Mensal' : 'Anual'}</p>
                  <p className={`text-lg font-black mt-1 ${active ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    R$ {p === 'monthly' ? '29,90' : '20,58'}
                    <span className="text-xs font-normal text-zinc-600">/mês</span>
                  </p>
                  {p === 'annual' && <p className="text-[10px] text-zinc-600 mt-0.5">R$247 cobrado anualmente</p>}
                </button>
              );
            })}
          </div>

          {!showCheckout ? (
            user ? (
              <div className="space-y-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowCoupon(v => !v)}
                    className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors mb-2"
                  >
                    <Tag className="w-3 h-3" />
                    {showCoupon ? 'Fechar cupom' : 'Tem um cupom?'}
                    {showCoupon ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showCoupon && (
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO DO CUPOM"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 font-mono uppercase focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  )}
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="group relative w-full py-5 rounded-2xl overflow-hidden bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)]"
                >
                  <span>Ativar meu acesso agora</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
                </button>
                <p className="text-center text-zinc-600 text-[11px]">Leva menos de 2 minutos para começar</p>
                <TrustRow />
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white hover:bg-zinc-100 disabled:bg-zinc-200 text-zinc-900 font-bold rounded-2xl transition-all border border-zinc-200 text-sm active:scale-[0.98]"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  {googleLoading ? 'Redirecionando...' : 'Continuar com Google'}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-zinc-600 text-[11px] font-bold">ou continue com e-mail</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">
                      Seu e-mail <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailDirty(true); }}
                        onBlur={() => setEmailDirty(true)}
                        placeholder="seu@email.com"
                        required
                        className={`w-full bg-zinc-900/80 border rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-colors pr-10 ${
                          emailError
                            ? 'border-red-500/60 focus:border-red-500'
                            : emailDirty && emailValid
                            ? 'border-emerald-500/60 focus:border-emerald-500'
                            : 'border-white/10 focus:border-emerald-500'
                        }`}
                      />
                      {emailDirty && emailValid && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-sm">✓</span>
                      )}
                    </div>
                    {emailError && (
                      <p className="text-red-400 text-[10px] font-bold mt-1">Digite um e-mail válido.</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">
                      Nome completo <span className="text-zinc-600 font-normal normal-case">(recomendado)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setShowCoupon(v => !v)}
                      className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors py-1"
                    >
                      <Tag className="w-3 h-3" />
                      {showCoupon ? 'Fechar cupom' : 'Tem um cupom?'}
                      {showCoupon ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showCoupon && (
                      <input
                        type="text"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="CÓDIGO DO CUPOM"
                        className="w-full mt-2 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 font-mono uppercase focus:border-emerald-500 focus:outline-none transition-colors"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={emailDirty && !emailValid}
                    className="group relative w-full py-5 rounded-2xl overflow-hidden bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)]"
                  >
                    <span>Ativar meu acesso agora</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
                  </button>

                  <p className="text-center text-zinc-600 text-[11px]">Leva menos de 2 minutos para começar</p>
                  <TrustRow />
                </form>
              </div>
            )
          ) : (
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-white/5 rounded-3xl p-5">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/5">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/10">
                  <Lock className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold">Pagamento 100% seguro</p>
                  <p className="text-zinc-600 text-[10px]">Processado por Stripe · SSL 256-bit · PCI-DSS</p>
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                {['Análise completa de refeições por foto', 'Análise corporal com IA', 'Personal trainer 24h com contexto real'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {user ? (
                <AuthCheckoutWrapper
                  user={user}
                  priceId={plan.stripePriceId}
                  plan={plan.id}
                  planName={plan.name}
                  planPeriod={selectedPlan}
                  planValue={plan.price}
                  couponCode={couponCode}
                  onCancel={() => setShowCheckout(false)}
                />
              ) : (
                <GuestCheckoutWrapper
                  email={email}
                  name={name}
                  priceId={plan.stripePriceId}
                  plan={plan.id}
                  planName={plan.name}
                  planPeriod={selectedPlan}
                  planValue={plan.price}
                  quizData={quizData}
                  couponCode={couponCode}
                  onCancel={() => setShowCheckout(false)}
                />
              )}
            </div>
          )}
        </section>

        {/* ── GARANTIA ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <div className="flex items-start gap-4 p-6 bg-zinc-900/60 backdrop-blur-sm border border-white/5 rounded-3xl">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/10">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-white mb-1 text-base">teste por 7 dias</p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                se não fizer sentido pra você, você recebe tudo de volta — sem perguntas, sem burocracia
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── FAQ ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="space-y-4"
        >
          <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Dúvidas frequentes</p>
          <div className="space-y-2">
            {faqs.map((faq, i) => <FaqItem key={i} {...faq} />)}
          </div>
        </motion.section>

        {/* ── BLOCO FINAL ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="relative pb-10"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/20 via-transparent to-transparent rounded-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />

          <div className="relative z-10 text-center space-y-6">
            <div className="space-y-3">
              <p className="text-zinc-500 text-base">ou você continua tentando no escuro</p>
              <h2 className="font-serif-premium text-3xl font-bold text-white leading-snug">
                ou começa hoje<br />
                <span className="text-gradient italic glow-emerald">sabendo exatamente o que fazer</span>
              </h2>
            </div>

            <button
              onClick={() => {
                document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group relative w-full py-5 rounded-2xl overflow-hidden bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_0_50px_-10px_rgba(16,185,129,0.7)]"
            >
              <span>Começar agora</span>
              <div className="w-7 h-7 rounded-full bg-zinc-950/20 flex items-center justify-center group-hover:bg-zinc-950/30 transition-colors">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
              </div>
            </button>

            <p className="text-zinc-700 text-xs">Cancele quando quiser · 7 dias de garantia · Stripe SSL</p>
          </div>
        </motion.section>

      </div>
    </div>
  );
};

export default SalesPage;
