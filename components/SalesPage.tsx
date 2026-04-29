import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle2, Shield, ChevronDown, ChevronUp, Camera, Dumbbell, MessageCircle, Zap, Lock, Tag } from 'lucide-react';
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

// ── Mockup iPhone pronto (PNG com fundo transparente) ────────────────────────

const AppMockup = () => (
  <>
    {/* Mobile: full-bleed ~120vw — phones maiores, fundo transparente via screen blend */}
    <div
      className="relative select-none md:hidden"
      style={{ width: '120vw', marginLeft: 'calc(-60vw + 50%)' }}
    >
      <img
        src="/app-mockup.jpg"
        alt="ShapeScan app no iPhone"
        className="w-full h-auto"
        style={{ mixBlendMode: 'screen' }}
        draggable={false}
      />
    </div>
    {/* Desktop: centralizado com largura limitada */}
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

// ── Static copy ───────────────────────────────────────────────────────────────

const goalCopy: Record<string, { badge: string; headline: string; sub: string; diagnostic: string[]; consequence: string }> = {
  lose: {
    badge: 'PERDA DE GORDURA',
    headline: 'Descubra exatamente quanto comer para perder gordura — e comece a ver resultado ainda essa semana.',
    sub: 'Você completou o diagnóstico. Agora sabemos exatamente o que está travando seu progresso. O ShapeScan monta o plano certo para o seu corpo — sem dieta genérica, sem chute.',
    diagnostic: [
      'Você treina, tenta se alimentar bem — e o resultado não aparece. Sem rastreamento, tudo é chute',
      'Seu déficit calórico atual é uma estimativa. Sem número real, você pode estar comendo 400 cal a mais — sem saber',
      'Cada semana sem plano preciso é uma semana de treino e dieta que não somam',
    ],
    consequence: 'Cada dia que você adia é mais um dia treinando no escuro.',
  },
  gain: {
    badge: 'GANHO DE MASSA',
    headline: 'Você está treinando há meses. O resultado que deveria ter chegado — não chegou. Isso tem um motivo.',
    sub: 'O gargalo é claro: sem superávit calórico e proteína precisos, o músculo não cresce — não importa o quanto você treina. O ShapeScan te dá os números exatos para mudar isso.',
    diagnostic: [
      'Sem superávit calórico preciso, seu músculo não cresce — não importa quanto você treina',
      'A maioria come proteína insuficiente sem saber. Isso sozinho trava o ganho de massa por meses',
      'Sem acompanhamento diário, a estagnação continua — sem explicação e sem saída clara',
    ],
    consequence: 'Cada semana sem dados reais é uma semana de treino desperdiçado.',
  },
  recomp: {
    badge: 'RECOMPOSIÇÃO CORPORAL',
    headline: 'Recomposição sem dado é sorte. Com dado, é método. Você acabou de escolher o método.',
    sub: 'Recomposição é o objetivo mais técnico que existe — por isso a maioria falha. O que falta não é esforço: são dados diários do seu corpo para ajustar a estratégia em tempo real.',
    diagnostic: [
      'Recomposição exige precisão calórica que nenhuma dieta genérica consegue entregar',
      'Sem medir, você oscila entre acúmulo de gordura e perda de músculo — sem saber qual está acontecendo',
      'A maioria abandona a recomposição porque não vê dado. Sem dado, parece que nada funciona',
    ],
    consequence: 'Cada dia sem medição é um dia em que você não sabe se está avançando ou regredindo.',
  },
  maintain: {
    badge: 'MANUTENÇÃO DE RESULTADO',
    headline: 'O resultado que você conquistou pode desaparecer em semanas — se você não tiver um sistema.',
    sub: 'Manter resultado é tão exigente quanto conquistar. O ShapeScan te dá o controle diário para garantir que o que você construiu — não seja desfeito por descuido.',
    diagnostic: [
      'Sem acompanhamento, o peso volta silenciosamente — poucos gramas por dia, invisível até virar kg',
      'Um erro calórico pequeno, repetido por semanas, desfaz meses de trabalho',
      'A maioria que "mantém" está, na verdade, regredindo devagar sem perceber',
    ],
    consequence: 'Manutenção sem dado não é manutenção. É descuido com consequência lenta.',
  },
};

const faqs = [
  { q: 'Preciso saber de nutrição para usar?', a: 'Não. O app faz todo o trabalho técnico por você. Basta fotografar o que comeu — o ShapeScan calcula tudo.' },
  { q: 'Funciona sem academia?', a: 'Sim. O ShapeScan acompanha sua nutrição e evolução independente de onde você treina — ou se treina.' },
  { q: 'Quando tenho acesso?', a: 'Imediatamente após o pagamento. Você receberá um e-mail para criar sua senha e já começa hoje.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Cancele direto pelo app, a qualquer momento, sem precisar entrar em contato com ninguém.' },
  { q: 'E se eu não gostar?', a: 'Garantia total de 7 dias. Se por qualquer motivo não ficar satisfeito, devolvemos 100% do valor pago — sem perguntas, sem burocracia.' },
];

// ── Reusable UI ───────────────────────────────────────────────────────────────

/** Faixa de selos de segurança usada em vários pontos */
const TrustRow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 ${className}`}>
    <span className="text-zinc-500 text-[10px] font-bold">🔒 Compra protegida com segurança bancária</span>
    <span className="text-zinc-500 text-[10px] font-bold">🛡️ Seus dados ficam 100% protegidos</span>
    <span className="text-zinc-500 text-[10px] font-bold">✅ Teste por 7 dias sem risco</span>
  </div>
);

/** Resumo do pedido exibido dentro do bloco de pagamento */
const PurchaseSummaryCard: React.FC<{
  planName: string;
  planPeriod: string;
  pricing: PricingInfo;
}> = ({ planName, planPeriod, pricing }) => {
  const isAnnual = planPeriod === 'annual' || planPeriod === 'pro_annual';
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-4">
      <p className="text-zinc-600 text-[9px] font-black uppercase tracking-widest mb-3">Resumo do pedido</p>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white font-bold text-sm">{planName}</p>
          <p className="text-zinc-600 text-[10px] mt-0.5">
            {isAnnual
              ? `Cobrado anualmente · R$${pricing.originalPrice.toFixed(0)}/ano`
              : 'Cobrado mensalmente'}
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
          {!isAnnual && <p className="text-zinc-600 text-[9px]">/mês</p>}
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
};

// ── GuestPaymentForm ──────────────────────────────────────────────────────────

const GuestPaymentForm: React.FC<{
  email: string;
  name: string;
  planName: string;
  planPeriod: string;
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

    pixel.addPaymentInfo(planName, pricing.finalPrice, email, '');

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

      {/* PaymentElement — wallets (Apple/Google Pay) aparecem automaticamente quando disponíveis */}
      <div className="rounded-2xl overflow-hidden border border-zinc-800">
        <PaymentElement
          options={{
            layout: 'accordion',
            wallets: { applePay: 'auto', googlePay: 'auto' },
            fields: {
              billingDetails: {
                email: 'never',    // já coletamos acima
                name: name.trim() ? 'never' : 'auto', // ocultar se já temos o nome
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
        className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
  planPeriod: string;
  planValue: number;
  quizData: QuizData;
  onCancel: () => void;
}> = ({ email, name, priceId, plan, planName, planPeriod, planValue, quizData, onCancel }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingInfo>({ originalPrice: planValue, finalPrice: planValue, discount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const getUtmParams = () => {
    try {
      const raw = document.cookie.split('; ').find(c => c.startsWith('utmify='));
      return raw ? JSON.parse(decodeURIComponent(raw.split('=').slice(1).join('='))) : {};
    } catch { return {}; }
  };

  const getMetaCookie = (name: string) => {
    try {
      const m = document.cookie.match(new RegExp(`${name}=([^;]+)`));
      return m ? m[1] : null;
    } catch { return null; }
  };

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const purchaseEventId = `purchase-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('pending_purchase_event_id', purchaseEventId);

      const body: Record<string, any> = {
        email, priceId, plan, quizData, utmParams: getUtmParams(),
        purchaseEventId,
        fbp: getMetaCookie('_fbp'),
        fbc: getMetaCookie('_fbc'),
        clientUserAgent: navigator.userAgent.slice(0, 490),
        sourceUrl: window.location.href,
      };

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
  }, [email, priceId, plan]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || couponApplying) return;
    setCouponApplying(true);
    setCouponError(null);
    try {
      const body: Record<string, any> = {
        email, priceId, plan, quizData, utmParams: getUtmParams(),
        couponCode: couponInput.trim().toUpperCase(),
        purchaseEventId: localStorage.getItem('pending_purchase_event_id') || undefined,
        fbp: getMetaCookie('_fbp'),
        fbc: getMetaCookie('_fbc'),
        clientUserAgent: navigator.userAgent.slice(0, 490),
        sourceUrl: window.location.href,
      };
      const res = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Cupom inválido.');
      if (data.isFree) {
        window.location.href = '/assinar?payment=success';
        return;
      }
      if (!data.clientSecret) throw new Error('Cupom inválido ou expirado.');
      if (data.pricing) setPricing(data.pricing);
      setClientSecret(data.clientSecret);
      setCouponApplied(true);
    } catch (err: any) {
      setCouponError(err.message || 'Cupom inválido ou expirado.');
    } finally {
      setCouponApplying(false);
    }
  };

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
    <div className="space-y-3">
      {/* Cupom */}
      <div>
        {couponApplied && pricing.discount > 0 ? (
          <div className="flex items-center gap-2 px-1">
            <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 text-xs font-bold flex-1">
              Cupom aplicado — economia de R${pricing.discount.toFixed(2).replace('.', ',')}
            </span>
            <button
              onClick={() => { setCouponInput(''); setCouponApplied(false); setCouponError(null); setPricing({ originalPrice: planValue, finalPrice: planValue, discount: 0 }); init(); }}
              className="text-zinc-600 hover:text-zinc-400 text-xs"
            >✕ remover</button>
          </div>
        ) : (
          <details className="group">
            <summary className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-bold cursor-pointer list-none select-none">
              <Tag className="w-3 h-3" />
              Tem um cupom?
              <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                placeholder="CÓDIGO DO CUPOM"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 font-mono uppercase focus:border-emerald-500 focus:outline-none transition-colors"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!couponInput.trim() || couponApplying}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest"
              >
                {couponApplying ? '...' : 'Aplicar'}
              </button>
            </div>
            {couponError && <p className="text-red-400 text-xs font-bold mt-2 px-1">⚠️ {couponError}</p>}
          </details>
        )}
      </div>
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
    </div>
  );
};

// ── AuthPaymentForm ───────────────────────────────────────────────────────────

const AuthPaymentForm: React.FC<{
  user: User;
  planName: string;
  planPeriod: string;
  pricing: PricingInfo;
  onCancel: () => void;
}> = ({ user, planName, planPeriod, pricing, onCancel }) => {
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

    pixel.addPaymentInfo(planName, pricing.finalPrice, user.email, user.id);

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
        pricing={pricing}
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
        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
  planPeriod: string;
  planValue: number;
  onCancel: () => void;
}> = ({ user, priceId, plan, planName, planPeriod, planValue, onCancel }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingInfo>({ originalPrice: planValue, finalPrice: planValue, discount: 0 });
  const [couponInput, setCouponInput] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callEdgeFunction('stripe-checkout', { priceId, plan });
      if (data.isFree) {
        localStorage.setItem('awaiting_stripe_payment', 'true');
        localStorage.setItem('awaiting_stripe_plan_name', planName);
        localStorage.setItem('awaiting_stripe_plan_value', String(data.pricing?.finalPrice ?? 0));
        window.location.href = '/dashboard?payment=success';
        return;
      }
      if (!data.clientSecret) throw new Error(data.error || 'Erro ao obter checkout.');
      setClientSecret(data.clientSecret);
      if (data.pricing) setPricing(data.pricing);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar checkout.');
    } finally {
      setLoading(false);
    }
  }, [priceId, plan]);

  useEffect(() => { init(); }, [init]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || couponApplying) return;
    setCouponApplying(true);
    setCouponError(null);
    try {
      const data = await callEdgeFunction('stripe-checkout', {
        priceId, plan, couponCode: couponInput.trim().toUpperCase(),
      });
      if (data.isError || data.error) throw new Error(data.error || 'Cupom inválido.');
      if (data.isFree) {
        localStorage.setItem('awaiting_stripe_payment', 'true');
        localStorage.setItem('awaiting_stripe_plan_name', planName);
        localStorage.setItem('awaiting_stripe_plan_value', String(data.pricing?.finalPrice ?? 0));
        window.location.href = '/dashboard?payment=success';
        return;
      }
      if (!data.clientSecret) throw new Error('Cupom inválido ou expirado.');
      setClientSecret(data.clientSecret);
      if (data.pricing) setPricing(data.pricing);
      setCouponApplied(true);
    } catch (err: any) {
      setCouponError(err.message || 'Cupom inválido ou expirado.');
    } finally {
      setCouponApplying(false);
    }
  };

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
    <div className="space-y-3">
      {/* Cupom */}
      <div>
        {couponApplied && pricing.discount > 0 ? (
          <div className="flex items-center gap-2 px-1">
            <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 text-xs font-bold flex-1">
              Cupom aplicado — economia de R${pricing.discount.toFixed(2).replace('.', ',')}
            </span>
            <button
              onClick={() => { setCouponInput(''); setCouponApplied(false); setCouponError(null); setPricing({ originalPrice: planValue, finalPrice: planValue, discount: 0 }); init(); }}
              className="text-zinc-600 hover:text-zinc-400 text-xs"
            >✕ remover</button>
          </div>
        ) : (
          <details className="group">
            <summary className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-bold cursor-pointer list-none select-none">
              <Tag className="w-3 h-3" />
              Tem um cupom?
              <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                placeholder="CÓDIGO DO CUPOM"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 font-mono uppercase focus:border-emerald-500 focus:outline-none transition-colors"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!couponInput.trim() || couponApplying}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest"
              >
                {couponApplying ? '...' : 'Aplicar'}
              </button>
            </div>
            {couponError && <p className="text-red-400 text-xs font-bold mt-2 px-1">⚠️ {couponError}</p>}
          </details>
        )}
      </div>
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
        <AuthPaymentForm user={user} planName={planName} planPeriod={planPeriod} pricing={pricing} onCancel={onCancel} />
      </Elements>
    </div>
  );
};

// ── FAQ item ──────────────────────────────────────────────────────────────────

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left border border-zinc-800 rounded-2xl p-5 bg-zinc-900/40 hover:bg-zinc-900/80 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-white text-sm">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
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
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'pro_monthly' | 'pro_annual'>('pro_annual');

  // Guest form fields
  const [email, setEmail] = useState('');
  const [emailDirty, setEmailDirty] = useState(false);
  const [name, setName] = useState('');

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);

  // Google OAuth
  const [googleLoading, setGoogleLoading] = useState(false);
  const viewContentFired = useRef(false);

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
      // Supabase redireciona o navegador — não precisa resetar loading
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
    // Guard: dispara ViewContent apenas uma vez por montagem, mesmo se user re-renderizar
    if (!viewContentFired.current) {
      viewContentFired.current = true;
      pixel.viewContent('Página de Planos', user?.id);
    }
  }, [user]);

  // Rastreia a feature que o usuário tentou acessar antes de ser redirecionado para /assinar
  useEffect(() => {
    const from = params.get('from');
    if (from) {
      pixel.featureBlocked(decodeURIComponent(from), user?.id);
    }
  }, []);

  // Rastreia quando o usuário alcança a seção de planos (IntersectionObserver)
  useEffect(() => {
    const section = document.getElementById('checkout-section');
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          pixel.customEvent('PlanSectionViewed', {}, user?.id);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Rastreia tempo de engajamento na página (30s e 60s)
  useEffect(() => {
    const t30 = setTimeout(() => pixel.customEvent('SalesPage30s', {}, user?.id), 30_000);
    const t60 = setTimeout(() => pixel.customEvent('SalesPage60s', {}, user?.id), 60_000);
    return () => { clearTimeout(t30); clearTimeout(t60); };
  }, []);

  // Limpa localStorage e exibe erro se 3DS falhou para guest (redirect_status != succeeded)
  useEffect(() => {
    const redirectStatus = params.get('redirect_status');
    if (redirectStatus && redirectStatus !== 'succeeded') {
      localStorage.removeItem('awaiting_stripe_payment');
      localStorage.removeItem('awaiting_stripe_payment_started');
      localStorage.removeItem('awaiting_stripe_plan_name');
      localStorage.removeItem('awaiting_stripe_plan_value');
      onShowToast?.('Pagamento não concluído. Verifique seus dados e tente novamente.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const goal = quizData.goal || 'lose';
  const copy = goalCopy[goal] || goalCopy.lose;
  const plan = PAYMENT_CONFIG[selectedPlan];

  const emailValid = isValidEmail(email);
  const emailError = emailDirty && !emailValid;

  // Derived active variants for each card's toggle (independent of the other card)
  const stdActive = (selectedPlan === 'monthly' || selectedPlan === 'annual') ? selectedPlan : ('monthly' as const);
  const proActive = (selectedPlan === 'pro_monthly' || selectedPlan === 'pro_annual') ? selectedPlan : ('pro_annual' as const);

  const handleStandardCta = () => {
    setSelectedPlan(stdActive);
    if (user) {
      pixel.initiateCheckout(PAYMENT_CONFIG[stdActive].name, PAYMENT_CONFIG[stdActive].price, user.id, user.email);
      setShowCheckout(true);
      setTimeout(() => document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } else {
      setTimeout(() => document.getElementById('email-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  const handleProCta = () => {
    setSelectedPlan(proActive);
    if (user) {
      pixel.initiateCheckout(PAYMENT_CONFIG[proActive].name, PAYMENT_CONFIG[proActive].price, user.id, user.email);
      setShowCheckout(true);
      setTimeout(() => document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } else {
      setTimeout(() => document.getElementById('email-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

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
    <div className="min-h-[100dvh] bg-zinc-950 text-white">

      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md px-5 py-3 flex items-center justify-between">
        <span className="font-serif font-bold text-white text-lg tracking-tight">ShapeScan</span>
        <button
          onClick={() => navigate('/entrar')}
          className="text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          Já tenho conta
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-10 space-y-16">

        {/* Hero visual + headline */}
        <section className="space-y-8">
          {/* Mockup do app — full-bleed 100vw */}
          <AppMockup />

          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
              {copy.headline}
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed">{copy.sub}</p>
          </div>

          {/* Personalized diagnostic */}
          {quizData.goal && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Baseado no seu perfil, detectamos:</p>
              <div className="space-y-3">
                {copy.diagnostic.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-red-400 mt-0.5 shrink-0 text-base">✗</span>
                    <p className="text-zinc-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
              {quizData.height && quizData.weight && (
                <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Altura', value: `${quizData.height} cm` },
                    { label: 'Peso', value: `${quizData.weight} kg` },
                    { label: 'Frequência', value: quizData.frequency === '0-2' ? 'Iniciante' : quizData.frequency === '6 ou mais' ? 'Avançado' : 'Moderado' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-white font-bold text-sm">{s.value}</p>
                      <p className="text-zinc-600 text-[10px] uppercase tracking-widest">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Pain → Shift */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-white leading-snug">
            O problema não é falta de esforço.<br />É falta de um sistema que te diga exatamente o que fazer — todos os dias.
          </h2>
          <p className="text-zinc-400 leading-relaxed">
            Você treina. Tenta se alimentar bem. Mas no final do mês, o resultado não aparece — ou aparece tão devagar que parece que nada está funcionando.
          </p>
          <p className="text-zinc-400 leading-relaxed">
            Isso não é falta de dedicação. É falta de informação precisa sobre o seu próprio corpo.
          </p>
          <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-2xl p-5">
            <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-3">O diferencial do ShapeScan</p>
            <p className="text-white font-bold text-lg leading-snug mb-2">
              Você não precisa de mais uma dieta.
            </p>
            <p className="text-zinc-300 text-base leading-relaxed">
              Você precisa de um sistema que te diga{' '}
              <span className="text-emerald-400 font-semibold">o que fazer todos os dias</span>{' '}
              — baseado no <span className="text-white font-semibold">seu</span> corpo real, não em uma tabela genérica.
            </p>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            É a diferença entre adivinhar e saber. Entre tentar e executar. Entre mais um mês sem resultado — e começar a ver mudança de verdade.
          </p>
        </section>

        {/* Features = Mecanismo único */}
        <section className="space-y-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">O que você desbloqueia hoje</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              {
                icon: <Camera className="w-5 h-5 text-emerald-400" />,
                title: 'Fotografe. Saiba tudo.',
                desc: 'Tire foto de qualquer refeição e receba em segundos: calorias, proteína, carbs e gordura. Sem tabela, sem pesagem, sem achismo.',
                result: '→ Você para de adivinhar o que come',
              },
              {
                icon: <Dumbbell className="w-5 h-5 text-emerald-400" />,
                title: 'Veja seu corpo evoluir com dado real',
                desc: 'A IA analisa sua foto e estima percentual de gordura. Acompanhe a evolução do seu shape semana a semana — com evidência visual.',
                result: '→ Você enxerga o que está funcionando',
              },
              {
                icon: <MessageCircle className="w-5 h-5 text-emerald-400" />,
                title: 'Personal que já te conhece — 24h por dia',
                desc: 'A IA tem acesso ao seu histórico completo: o que você comeu, como está seu shape, qual sua meta. Responde qualquer dúvida com contexto real.',
                result: '→ Você para de agir sem orientação',
              },
              {
                icon: <Zap className="w-5 h-5 text-emerald-400" />,
                title: 'Plano calculado para o seu corpo',
                desc: 'Calorias, proteína, carbs e gordura calculados com base no seu peso, altura, metabolismo e objetivo. Não para um corpo genérico — para o seu.',
                result: '→ Você tem um alvo claro todo dia',
              },
            ].map((f, i) => (
              <div key={i} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm mb-1">{f.title}</p>
                    <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </div>
                <p className="text-emerald-400 text-xs font-bold ml-14">{f.result}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social proof */}
        <section className="space-y-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quem já usa</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { name: 'Matheus R., 28 anos', goal: 'Perda de gordura', text: 'Em 3 semanas perdi 2,4kg sem cortar tudo que gosto — só ajustando o que o app mostrou. Nunca tinha conseguido manter foco por tanto tempo porque nunca sabia se estava no caminho certo. Agora sei.' },
              { name: 'Juliana F., 31 anos', goal: 'Recomposição', text: 'Achei que ia ser mais um app de dieta. Mas fotografar a refeição e ver os macros na hora muda tudo — parei de comer "mais ou menos certo" e comecei a comer com precisão. Em 5 semanas minha composição mudou visivelmente.' },
              { name: 'Carlos M., 24 anos', goal: 'Ganho de massa', text: 'Descobri que estava comendo 600 calorias abaixo do necessário todo dia. Em um mês ajustando isso com o plano do app, desbloqueei uma evolução no treino que não acontecia há meses.' },
            ].map((t, i) => (
              <div key={i} className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-emerald-400 text-xs">★</span>)}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-3">"{t.text}"</p>
                <div>
                  <p className="text-white text-xs font-bold">{t.name}</p>
                  <p className="text-zinc-600 text-[10px]">Objetivo: {t.goal}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Price anchor */}
        <section className="space-y-4">
          <p className="text-zinc-300 text-base leading-relaxed font-medium">
            Montar isso separado custaria mais de R$1.000/mês:
          </p>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Comparação real</p>
            <div className="space-y-2">
              {[
                { label: 'Nutricionista (mensal)', price: 'R$400–800', cross: true },
                { label: 'Personal trainer (mensal)', price: 'R$600–1.200', cross: true },
                { label: 'Avaliação corporal constante', price: 'R$150–300', cross: true },
                { label: 'ShapeScan — tudo isso junto', price: 'R$29,90', cross: false, highlight: true },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between py-2 ${i < 3 ? 'border-b border-zinc-800' : ''}`}>
                  <span className={`text-sm ${row.highlight ? 'text-white font-bold' : 'text-zinc-500'}`}>{row.label}</span>
                  <span className={`text-sm font-bold ${row.cross ? 'text-zinc-600 line-through' : 'text-emerald-400'}`}>{row.price}</span>
                </div>
              ))}
            </div>
            <p className="text-zinc-500 text-xs">Menos de R$1 por dia. Nutricionista, personal e análise corporal — no bolso, 24h por dia.</p>
          </div>
        </section>

        {/* ── Pricing + checkout ── */}
        <section id="checkout-section" className="space-y-14 scroll-mt-20">

          {/* Section header */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white tracking-tight">Escolha seu plano ideal</h2>
            <p className="text-zinc-500 text-base">Comece hoje e acelere seus resultados com o plano certo.</p>
          </div>

          {/* ── Plan cards ── */}
          {!showCheckout && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">

              {/* STANDARD */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col">
                <div className="mb-7">
                  <p className="text-base font-semibold text-zinc-300 mb-1">Standard</p>
                  <p className="text-zinc-600 text-sm">Para começar a monitorar</p>
                </div>

                <div className="flex p-1 bg-zinc-800/60 rounded-lg mb-7">
                  {(['monthly', 'annual'] as const).map(p => (
                    <button key={p}
                      onClick={() => setSelectedPlan(p)}
                      className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${
                        stdActive === p ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}>
                      {p === 'monthly' ? 'Mensal' : 'Anual'}
                    </button>
                  ))}
                </div>

                <div className="mb-7">
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-4xl font-bold text-zinc-200 tracking-tight">
                      R${stdActive === 'annual' ? '20,58' : '29,90'}
                    </span>
                    <span className="text-zinc-500 text-sm font-normal">/mês</span>
                  </div>
                  <p className="text-zinc-600 text-xs">
                    {stdActive === 'annual' ? 'R$247/ano · R$0,68/dia' : 'R$0,99/dia'}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    '6 análises de refeição por dia',
                    '2 análises de shape por dia',
                    'Personal IA integrado',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleStandardCta}
                  className="w-full py-3.5 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/60 text-zinc-400 hover:text-white font-medium text-sm rounded-xl transition-all"
                >
                  Começar com Standard
                </button>
              </div>

              {/* PRO */}
              <div className="relative rounded-2xl border border-zinc-700 bg-zinc-900/70 p-7 flex flex-col shadow-xl shadow-black/30">
                <div className="flex items-start justify-between mb-7">
                  <div>
                    <p className="text-base font-semibold text-white mb-1">Pro</p>
                    <p className="text-zinc-500 text-sm">Para resultado real</p>
                  </div>
                  <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800 border border-zinc-700/50 px-2.5 py-1 rounded-full shrink-0 mt-0.5">
                    Mais escolhido
                  </span>
                </div>

                <div className="flex p-1 bg-zinc-800/60 rounded-lg mb-7">
                  {(['pro_monthly', 'pro_annual'] as const).map(p => (
                    <button key={p}
                      onClick={() => setSelectedPlan(p)}
                      className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${
                        proActive === p ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
                      }`}>
                      {p === 'pro_monthly' ? 'Mensal' : 'Anual'}
                    </button>
                  ))}
                </div>

                <div className="mb-7">
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-5xl font-bold text-white tracking-tight">
                      R${proActive === 'pro_annual' ? '28,92' : '44,90'}
                    </span>
                    <span className="text-zinc-500 text-sm font-normal">/mês</span>
                  </div>
                  <p className="text-zinc-500 text-xs">
                    {proActive === 'pro_annual' ? 'R$347/ano · R$0,95/dia' : 'R$1,50/dia'}
                  </p>
                  {proActive === 'pro_annual' && (
                    <p className="text-emerald-500 text-xs mt-1">Economize R$191 vs mensal</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    '12 análises de refeição por dia',
                    '4 análises de shape por dia',
                    'Personal IA avançado com histórico',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleProCta}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-semibold text-sm rounded-xl transition-all"
                >
                  Começar agora
                </button>
                <p className="text-center text-zinc-600 text-xs mt-3">7 dias de garantia · cancele quando quiser</p>
              </div>

            </div>
          )}

          {/* ── Comparison table ── */}
          {!showCheckout && (
            <div>
              <div className="grid grid-cols-3 pb-3 border-b border-zinc-800/60">
                <div />
                <p className="text-xs text-zinc-600 font-medium text-center uppercase tracking-wider">Standard</p>
                <p className="text-xs text-zinc-400 font-medium text-center uppercase tracking-wider">Pro</p>
              </div>
              {[
                { feature: 'Análises de refeição', std: '6 / dia', pro: '12 / dia' },
                { feature: 'Análises de shape',    std: '2 / dia', pro: '4 / dia' },
                { feature: 'Personal IA',          std: 'Básico',  pro: 'Avançado' },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-3 py-4 border-b border-zinc-800/40 last:border-0">
                  <p className="text-zinc-500 text-sm">{row.feature}</p>
                  <p className="text-zinc-600 text-sm text-center">{row.std}</p>
                  <p className="text-zinc-300 text-sm font-medium text-center">{row.pro}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Guest: Google + e-mail form ── */}
          {!showCheckout && !user && (
            <div id="email-section" className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white hover:bg-zinc-100 disabled:bg-zinc-200 text-zinc-900 font-semibold rounded-2xl transition-all text-sm active:scale-[0.98]"
              >
                {googleLoading
                  ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                  : <GoogleIcon />}
                {googleLoading ? 'Redirecionando...' : 'Continuar com Google'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-zinc-600 text-xs">ou continue com e-mail</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setEmailDirty(true); }}
                    onBlur={() => setEmailDirty(true)}
                    placeholder="seu@email.com" required
                    className={`w-full bg-zinc-900 border rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                      emailError ? 'border-red-500/60 focus:border-red-500'
                      : emailDirty && emailValid ? 'border-zinc-700 focus:border-zinc-600'
                      : 'border-zinc-800 focus:border-zinc-700'
                    }`}
                  />
                  {emailError && <p className="text-red-400 text-xs mt-1.5 font-medium">Digite um e-mail válido.</p>}
                </div>
                <div>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Seu nome (opcional)" autoComplete="name"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit" disabled={emailDirty && !emailValid}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold text-sm rounded-xl transition-all active:scale-[0.98]"
                >
                  Começar agora
                </button>
                <p className="text-center text-zinc-600 text-xs">Pagamento 100% seguro · 7 dias de garantia</p>
              </form>
            </div>
          )}

          {/* ── Payment form (checkout step) ── */}
          {showCheckout && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-800">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
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
                  onCancel={() => setShowCheckout(false)}
                />
              )}
            </div>
          )}

        </section>

        {/* Guarantee */}
        <section className="flex items-start gap-4 p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-white mb-1">Risco zero — garantia de 7 dias</p>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Se por qualquer motivo você não ficar satisfeito nos primeiros 7 dias, devolvemos 100% do valor pago — sem perguntas, sem burocracia.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">Dúvidas frequentes</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => <FaqItem key={i} {...faq} />)}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center space-y-4 pb-10">
          <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-left space-y-2">
            <p className="text-zinc-400 text-sm leading-relaxed">Você pode continuar no modo tentativa e erro — treinando forte, comendo "bem", sem resultado claro.</p>
            <p className="text-white font-bold text-base leading-relaxed">Ou começar hoje com um plano exato para o seu corpo. A escolha é simples.</p>
          </div>
          <button
            onClick={() => {
              document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] rounded-2xl transition-all active:scale-[0.98]"
          >
            Começar minha transformação agora →
          </button>
          <p className="text-zinc-600 text-xs">Cancele quando quiser · Garantia de 7 dias · Pagamento 100% seguro</p>
        </section>

      </div>
    </div>
  );
};

export default SalesPage;
