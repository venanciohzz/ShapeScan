import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle2, Shield, ChevronDown, ChevronUp, Camera, Dumbbell, MessageCircle, Zap } from 'lucide-react';
import { PAYMENT_CONFIG } from '../services/paymentConfig';
import { User } from '../types';
import { callEdgeFunction, getValidToken, supabaseUrl, supabaseAnonKey } from '../services/supabaseService';
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
  },
};

interface QuizData {
  gender?: 'male' | 'female';
  height?: number;
  weight?: number;
  goal?: 'lose' | 'gain' | 'recomp' | 'maintain';
  age?: number;
  activityLevel?: string;
  frequency?: string;
}

interface SalesPageProps {
  user: User | null;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const goalCopy: Record<string, { badge: string; headline: string; sub: string; diagnostic: string[] }> = {
  lose: {
    badge: 'PERDA DE GORDURA',
    headline: 'Você tem todo o potencial. O que faltava era clareza.',
    sub: 'Com base no seu perfil, preparamos uma estratégia personalizada para queimar gordura de forma consistente — sem adivinhação, sem dieta genérica de internet.',
    diagnostic: ['Seu metabolismo está operando abaixo do ideal', 'Você provavelmente não sabe quantas calorias consome de verdade', 'Sem rastreamento preciso, o déficit calórico é um chute'],
  },
  gain: {
    badge: 'GANHO DE MASSA',
    headline: 'Massa muscular real exige mais do que treino. Exige precisão.',
    sub: 'Detectamos o seu perfil e identificamos o que você precisa ajustar na nutrição para finalmente ver crescimento de verdade — sem achismo, sem plateau.',
    diagnostic: ['Você provavelmente está em déficit calórico sem perceber', 'Proteína insuficiente é o erro número 1 de quem quer ganhar massa', 'Sem acompanhamento diário, o ganho é lento demais'],
  },
  recomp: {
    badge: 'RECOMPOSIÇÃO CORPORAL',
    headline: 'Perder gordura e ganhar músculo ao mesmo tempo é possível. Com o método certo.',
    sub: 'Recomposição é o objetivo mais técnico — por isso exige acompanhamento diário. Preparamos uma abordagem exata para o seu caso.',
    diagnostic: ['Recomposição exige ciclagem calórica precisa', 'Sem medir, você vai para um lado ou para o outro', 'A maioria não consegue porque não tem dados reais do próprio corpo'],
  },
  maintain: {
    badge: 'SAÚDE E MANUTENÇÃO',
    headline: 'Manter o resultado exige tanta disciplina quanto conquistar.',
    sub: 'Com base no seu perfil, identificamos como você pode manter o seu shape sem abrir mão da vida.',
    diagnostic: ['Sem acompanhamento, o peso volta silenciosamente', 'A manutenção exige tanta atenção quanto a fase de perda', 'Um erro calórico pequeno, repetido por semanas, desfaz meses de trabalho'],
  },
};

const faqs = [
  { q: 'Preciso saber de nutrição para usar?', a: 'Não. O app faz todo o trabalho técnico por você. Basta fotografar o que comeu.' },
  { q: 'Funciona sem academia?', a: 'Sim. O ShapeScan acompanha sua nutrição e evolução independente de onde você treina — ou se treina.' },
  { q: 'Quando tenho acesso?', a: 'Imediatamente após o pagamento. Você receberá um e-mail para criar sua senha e acessar o app.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim, sem burocracia. Cancele pelo próprio app, a qualquer momento, sem precisar entrar em contato.' },
  { q: 'E se eu não gostar?', a: 'Garantia de 7 dias. Se por qualquer motivo não ficar satisfeito, devolvemos 100% do valor pago — sem perguntas.' },
];

// ── Inner payment form ──────────────────────────────────────────────────────

const GuestPaymentForm: React.FC<{
  email: string;
  planName: string;
  planValue: number;
  onCancel: () => void;
}> = ({ email, planName, planValue, onCancel }) => {
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
    localStorage.setItem('guest_checkout_email', email);

    pixel.addPaymentInfo(planName, planValue, undefined, '');

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/assinar?payment=success' },
    });

    if (confirmError) {
      localStorage.removeItem('awaiting_stripe_payment');
      const isNetwork = confirmError.type === 'api_connection_error';
      setError(isNetwork
        ? 'Erro de conexão. Desative ad blockers ou VPN e tente novamente.'
        : confirmError.message || 'Erro ao processar pagamento.');
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
      <div className="rounded-2xl overflow-hidden border border-zinc-800">
        <PaymentElement options={{ layout: 'accordion' }} onReady={() => setReady(true)} />
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      <button
        disabled={processing || !stripe || !ready}
        className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {processing ? (
          <><div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />Processando...</>
        ) : (
          <>Desbloquear acesso →</>
        )}
      </button>

      <p className="text-center text-[10px] text-zinc-600">Cancele quando quiser · Sem fidelidade · 7 dias de garantia</p>

      <button type="button" onClick={onCancel} className="w-full py-2 text-zinc-600 hover:text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors">
        Voltar
      </button>
    </form>
  );
};

// ── Checkout initializer for guest mode ─────────────────────────────────────

const GuestCheckoutWrapper: React.FC<{
  email: string;
  priceId: string;
  plan: string;
  planName: string;
  planValue: number;
  quizData: QuizData;
  onCancel: () => void;
}> = ({ email, priceId, plan, planName, planValue, quizData, onCancel }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
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

      const res = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
        body: JSON.stringify({ email, priceId, plan, quizData, utmParams }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao iniciar checkout.');
      if (data.isFree) {
        window.location.href = '/assinar?payment=success';
        return;
      }
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar checkout. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [email, priceId, plan]);

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
        <button onClick={init} className="px-6 py-3 bg-emerald-500 text-zinc-950 font-black uppercase text-xs tracking-widest rounded-2xl">
          Tentar novamente
        </button>
        <button onClick={onCancel} className="text-zinc-600 text-xs">Voltar</button>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
      <GuestPaymentForm email={email} planName={planName} planValue={planValue} onCancel={onCancel} />
    </Elements>
  );
};

// ── Auth checkout wrapper (for logged-in non-premium users) ─────────────────

const AuthCheckoutWrapper: React.FC<{
  user: User;
  priceId: string;
  plan: string;
  planName: string;
  planValue: number;
  onCancel: () => void;
}> = ({ user, priceId, plan, planName, planValue, onCancel }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callEdgeFunction('stripe-checkout', { priceId, plan });
      if (data.isFree) { window.location.href = '/dashboard?payment=success'; return; }
      if (!data.clientSecret) throw new Error(data.error || 'Erro ao obter checkout.');
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar checkout.');
    } finally {
      setLoading(false);
    }
  }, [priceId, plan]);

  useEffect(() => { init(); }, [init]);

  const stripe = useStripe();
  const elements = useElements();

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
    <div className="py-6 text-center">
      <p className="text-red-400 text-sm mb-4">⚠️ {error}</p>
      <button onClick={init} className="px-6 py-3 bg-emerald-500 text-zinc-950 font-black uppercase text-xs rounded-2xl">Tentar novamente</button>
    </div>
  );

  if (!clientSecret) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
      <AuthPaymentForm user={user} planName={planName} planValue={planValue} onCancel={onCancel} />
    </Elements>
  );
};

const AuthPaymentForm: React.FC<{ user: User; planName: string; planValue: number; onCancel: () => void }> = ({ user, planName, planValue, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
      <div className="rounded-2xl overflow-hidden border border-zinc-800">
        <PaymentElement options={{ layout: 'accordion' }} onReady={() => setReady(true)} />
      </div>
      {error && <p className="text-red-400 text-xs font-bold">⚠️ {error}</p>}
      <button disabled={processing || !ready} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black uppercase text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
        {processing ? <><div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />Processando...</> : <>Desbloquear acesso →</>}
      </button>
      <button type="button" onClick={onCancel} className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Voltar</button>
    </form>
  );
};

// ── FAQ item ─────────────────────────────────────────────────────────────────

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(o => !o)} className="w-full text-left border border-zinc-800 rounded-2xl p-5 bg-zinc-900/40 hover:bg-zinc-900/80 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-white text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
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
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (user?.isPremium) { navigate('/dashboard', { replace: true }); return; }
    try {
      const raw = localStorage.getItem('shapescan_quiz_data');
      if (raw) setQuizData(JSON.parse(raw));
    } catch {}
    pixel.pageView(user?.id);
  }, [user]);

  const goal = quizData.goal || 'lose';
  const copy = goalCopy[goal] || goalCopy.lose;
  const plan = PAYMENT_CONFIG[selectedPlan];

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setEmailSubmitted(true);
    setShowCheckout(true);
    pixel.initiateCheckout(plan.name, plan.price, user?.id || '', email);
    setTimeout(() => {
      document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ── Payment success screen ─────────────────────────────────────────────────
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
          <button onClick={() => navigate('/entrar')} className="w-full py-4 border border-zinc-700 text-zinc-400 font-bold text-sm rounded-2xl hover:border-zinc-600 transition-colors">
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
        <button onClick={() => navigate('/entrar')} className="text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase tracking-widest transition-colors">
          Já tenho conta
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-10 space-y-16">

        {/* Quiz result banner */}
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{copy.badge}</span>
          </div>

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
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">O problema não é você. É a falta de estratégia.</h2>
          <p className="text-zinc-400 leading-relaxed">
            A maioria das pessoas que não consegue resultado come de forma aleatória, treina sem referência e nunca sabe ao certo o que está funcionando ou não. Não é preguiça — é falta de dado.
          </p>
          <p className="text-zinc-400 leading-relaxed">
            O ShapeScan existe para resolver exatamente isso: dar a você os dados certos, na hora certa, de forma simples.
          </p>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">O que você desbloqueia</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              {
                icon: <Camera className="w-5 h-5 text-emerald-400" />,
                title: 'Análise de refeição com IA',
                desc: 'Fotografe qualquer prato e saiba na hora calorias, proteína, carbs e gordura — sem tabelas, sem cálculo manual.',
              },
              {
                icon: <Dumbbell className="w-5 h-5 text-emerald-400" />,
                title: 'Análise corporal com IA',
                desc: 'Veja seu percentual de gordura estimado e acompanhe a evolução real do seu shape ao longo do tempo.',
              },
              {
                icon: <MessageCircle className="w-5 h-5 text-emerald-400" />,
                title: 'Personal trainer 24h',
                desc: 'Tire qualquer dúvida de nutrição ou treino com uma IA que já conhece o seu perfil, suas metas e seu histórico.',
              },
              {
                icon: <Zap className="w-5 h-5 text-emerald-400" />,
                title: 'Plano 100% personalizado',
                desc: 'Meta calórica, proteína, carbs e gordura calculados para o seu corpo, seu objetivo e seu ritmo de vida.',
              },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="font-bold text-white text-sm mb-1">{f.title}</p>
                  <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Price anchor */}
        <section className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Comparação real</p>
          <div className="space-y-2">
            {[
              { label: 'Nutricionista (mensal)', price: 'R$400–800', cross: true },
              { label: 'Personal trainer (mensal)', price: 'R$600–1.200', cross: true },
              { label: 'ShapeScan (mensal)', price: 'R$29,90', cross: false, highlight: true },
            ].map((row, i) => (
              <div key={i} className={`flex items-center justify-between py-2 ${i < 2 ? 'border-b border-zinc-800' : ''}`}>
                <span className={`text-sm ${row.highlight ? 'text-white font-bold' : 'text-zinc-500'}`}>{row.label}</span>
                <span className={`text-sm font-bold ${row.cross ? 'text-zinc-600 line-through' : 'text-emerald-400'}`}>{row.price}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing + checkout */}
        <section id="checkout-section" className="space-y-6 scroll-mt-20">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Comece agora</h2>
            <p className="text-zinc-500 text-sm">Cancele quando quiser. Sem compromisso.</p>
          </div>

          {/* Plan toggle */}
          <div className="grid grid-cols-2 gap-3">
            {(['monthly', 'annual'] as const).map(p => {
              const cfg = PAYMENT_CONFIG[p];
              const active = selectedPlan === p;
              return (
                <button
                  key={p}
                  onClick={() => { if (!showCheckout) setSelectedPlan(p); }}
                  disabled={showCheckout}
                  className={`relative p-4 rounded-2xl border text-left transition-all ${active ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}
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

          {/* Checkout section */}
          {!showCheckout ? (
            user ? (
              /* Logged-in non-premium: go straight to checkout */
              <div className="space-y-3">
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] rounded-2xl transition-all active:scale-[0.98]"
                >
                  Desbloquear acesso agora →
                </button>
                <div className="flex items-center justify-center gap-1.5 text-zinc-600">
                  <Shield className="w-3 h-3" />
                  <span className="text-[10px] font-bold">Garantia de 7 dias · Pagamento seguro com Stripe</span>
                </div>
              </div>
            ) : (
              /* Guest: collect email first */
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Seu e-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] rounded-2xl transition-all active:scale-[0.98]"
                >
                  Desbloquear acesso agora →
                </button>
                <div className="flex items-center justify-center gap-1.5 text-zinc-600">
                  <Shield className="w-3 h-3" />
                  <span className="text-[10px] font-bold">Garantia de 7 dias · Pagamento seguro com Stripe</span>
                </div>
              </form>
            )
          ) : (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              {/* Trust badge */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-white text-xs font-bold">Pagamento 100% seguro com Stripe</p>
                  <p className="text-zinc-600 text-[10px]">Seus dados são criptografados</p>
                </div>
              </div>

              {/* What you unlock */}
              <ul className="space-y-2 mb-4">
                {['Análise completa de refeições', 'Análise corporal com IA', 'Personal trainer 24h'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Checkout embed */}
              {user ? (
                <AuthCheckoutWrapper
                  user={user}
                  priceId={plan.stripePriceId}
                  plan={plan.id}
                  planName={plan.name}
                  planValue={plan.price}
                  onCancel={() => setShowCheckout(false)}
                />
              ) : (
                <GuestCheckoutWrapper
                  email={email}
                  priceId={plan.stripePriceId}
                  plan={plan.id}
                  planName={plan.name}
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
            <p className="font-bold text-white mb-1">Garantia de 7 dias</p>
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
          <button
            onClick={() => {
              document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase text-sm tracking-[0.15em] rounded-2xl transition-all active:scale-[0.98]"
          >
            Desbloquear acesso agora →
          </button>
          <p className="text-zinc-600 text-xs">Cancele quando quiser · 7 dias de garantia · Stripe SSL</p>
        </section>

      </div>
    </div>
  );
};

export default SalesPage;
