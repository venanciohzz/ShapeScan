import React, { useState, useEffect } from 'react';
import { PlanType, PAYMENT_CONFIG } from '../services/paymentConfig';
import { pixel } from '../utils/pixel';
import { User } from '../types';
import PremiumBackground from './ui/PremiumBackground';
import StripeCheckout from './ui/StripeCheckout';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface PlanSelectionProps {
   user?: User | null;
   onSelect: (plan: 'free' | 'monthly' | 'annual' | 'lifetime' | 'pro_monthly' | 'pro_annual') => void;
   onBack?: () => void;
   onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ user, onSelect, onBack, onShowToast }) => {
   const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
   const [stripePriceId, setStripePriceId] = useState<string | null>(null);
   const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

   useEffect(() => {
      pixel.viewContent('Página de Planos', user?.id);
   }, []);

   const handleSubscribe = async (plan: PlanType) => {
      if (!user) { onShowToast("Erro: Usuário não identificado.", 'error'); return; }

      const config = PAYMENT_CONFIG[plan];
      if (!config || !config.stripePriceId) {
         onShowToast("Plano não disponível para Stripe no momento.", 'error');
         return;
      }

      pixel.initiateCheckout(config.name, config.price, user?.id, user?.email);
      setStripePriceId(config.stripePriceId);
      setSelectedPlan(plan);
   };

   const isAnnual = billingCycle === 'annual';

   return (
      <PremiumBackground className="overflow-x-hidden selection:bg-emerald-500 selection:text-white" dim={true} intensity={1.5} showShaders={!stripePriceId}>
         {/* Back button */}
         <div className="absolute top-6 left-5 md:top-10 md:left-10 z-50">
            <button
               onClick={onBack}
               className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-white group"
            >
               <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
            </button>
         </div>

         <div className="relative z-10 max-w-2xl mx-auto px-5 pt-20 md:pt-28 pb-20">

            {/* Header */}
            <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
               <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight mb-3">
                  Desbloqueie seu<br />
                  <span className="text-emerald-400">resultado completo</span>
               </h1>
               <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                  Análise por foto, percentual de gordura<br className="sm:hidden" /> e personal trainer 24h
               </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center mb-6 animate-in fade-in duration-700 delay-100">
               <div className="bg-zinc-900/80 backdrop-blur-xl p-1 rounded-full border border-white/10 flex relative h-14 w-72 items-center shadow-xl">
                  <button
                     onClick={() => setBillingCycle('monthly')}
                     className={`flex-1 h-full rounded-full text-xs font-black uppercase tracking-widest transition-all relative z-10 flex items-center justify-center ${billingCycle === 'monthly' ? 'text-zinc-950' : 'text-zinc-500 hover:text-white'}`}
                  >
                     Mensal
                  </button>

                  <button
                     onClick={() => setBillingCycle('annual')}
                     className={`flex-1 h-full rounded-full text-xs font-black uppercase tracking-widest transition-all relative z-10 flex flex-col items-center justify-center leading-none gap-0.5 ${billingCycle === 'annual' ? 'text-zinc-950' : 'text-zinc-500 hover:text-white'}`}
                  >
                     <span>Anual</span>
                     <span className={`text-[8px] font-black tracking-wider ${billingCycle === 'annual' ? 'text-emerald-600' : 'text-emerald-500'}`}>
                        Economize 20%
                     </span>
                  </button>

                  <div className={`absolute top-1 bottom-1 w-[calc(50%-6px)] bg-white rounded-full transition-all duration-400 shadow-md ${billingCycle === 'monthly' ? 'left-1' : 'left-[calc(50%+2px)]'}`} />
               </div>
            </div>

            {/* Subtitle between toggle and plans */}
            <p className="text-center text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-8 animate-in fade-in duration-700 delay-150">
               Escolha o nível da sua evolução
            </p>

            {/* Plans — PRO first in DOM (mobile sees PRO on top) */}
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">

               {/* PRO — hero */}
               <div className="relative">
                  <div className="absolute -inset-px bg-gradient-to-br from-emerald-500/50 via-cyan-500/20 to-emerald-500/50 rounded-[2rem] blur-sm opacity-70" />
                  <div
                     onClick={() => handleSubscribe(isAnnual ? 'pro_annual' : 'pro_monthly')}
                     className="relative rounded-[2rem] border border-emerald-500/40 bg-zinc-950/70 backdrop-blur-2xl p-6 md:p-8 cursor-pointer transition-all duration-300 active:scale-[0.99] hover:border-emerald-400/60"
                  >
                     {/* Badge */}
                     <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase tracking-widest mb-4">
                        🔥 Mais escolhido
                     </div>

                     <div className="flex items-start justify-between gap-4 mb-1">
                        <h3 className="text-emerald-400 font-black text-lg uppercase tracking-widest">Plano Pro</h3>
                     </div>

                     <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-zinc-500 text-base font-bold">R$</span>
                        <span className="text-5xl font-black text-white tracking-tighter leading-none">
                           {isAnnual ? '347' : '44,90'}
                        </span>
                        <span className="text-zinc-500 text-sm font-bold">{isAnnual ? '/ano' : '/mês'}</span>
                     </div>

                     {isAnnual && (
                        <p className="text-emerald-500 text-xs font-bold mb-3">≈ R$ 28,92/mês</p>
                     )}

                     <p className="text-zinc-400 text-sm font-medium mb-5 leading-snug">
                        Para quem quer resultados rápidos e sem limitações
                     </p>

                     <div className="h-px bg-gradient-to-r from-emerald-500/40 to-transparent mb-5" />

                     <ul className="space-y-3 mb-6">
                        {[
                           'Uso intensivo de análises por foto',
                           'Mais análises corporais por dia',
                           'Personal trainer 24h com prioridade',
                           'Histórico completo de evolução',
                           'Acesso antecipado a novas funções',
                        ].map((f, i) => (
                           <li key={i} className="flex items-start gap-3 text-sm font-medium text-zinc-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                              {f}
                           </li>
                        ))}
                     </ul>

                     <p className="text-zinc-500 text-xs font-bold text-center mb-4 tracking-wide">
                        Evite limitar sua evolução
                     </p>

                     <button className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/25">
                        Desbloquear Pro
                     </button>
                  </div>
               </div>

               {/* STANDARD — secondary */}
               <div
                  onClick={() => handleSubscribe(isAnnual ? 'annual' : 'monthly')}
                  className="rounded-[2rem] border border-white/10 bg-zinc-950/50 backdrop-blur-2xl p-6 md:p-8 cursor-pointer transition-all duration-300 active:scale-[0.99] hover:border-white/20"
               >
                  <h3 className="text-zinc-400 font-black text-lg uppercase tracking-widest mb-1">Plano Standard</h3>

                  <div className="flex items-baseline gap-1 mb-1">
                     <span className="text-zinc-500 text-base font-bold">R$</span>
                     <span className="text-4xl font-black text-white tracking-tighter leading-none">
                        {isAnnual ? '247' : '29,90'}
                     </span>
                     <span className="text-zinc-500 text-sm font-bold">{isAnnual ? '/ano' : '/mês'}</span>
                  </div>

                  {isAnnual && (
                     <p className="text-emerald-500 text-xs font-bold mb-3">≈ R$ 20,58/mês</p>
                  )}

                  <p className="text-zinc-500 text-sm font-medium mb-5 leading-snug">
                     Para quem quer começar a organizar a dieta
                  </p>

                  <div className="h-px bg-gradient-to-r from-white/10 to-transparent mb-5" />

                  <ul className="space-y-3 mb-6">
                     {[
                        'Até 6 análises de refeições por dia',
                        'Até 2 análises corporais por dia',
                        'Personal trainer IA',
                        'Registro de evolução',
                     ].map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm font-medium text-zinc-400">
                           <CheckCircle2 className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
                           {f}
                        </li>
                     ))}
                  </ul>

                  <button className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-sm uppercase tracking-widest border border-white/10 transition-all">
                     Começar agora
                  </button>
               </div>
            </div>

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-6 mt-8 animate-in fade-in duration-700 delay-300">
               {[
                  { icon: '🔒', text: 'Pagamento seguro com Stripe' },
                  { icon: '✕', text: 'Cancele quando quiser' },
                  { icon: '📋', text: 'Sem fidelidade' },
               ].map(({ icon, text }) => (
                  <div key={text} className="flex flex-col items-center gap-1 text-center">
                     <span className="text-base">{icon}</span>
                     <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-wider leading-tight max-w-[70px]">{text}</span>
                  </div>
               ))}
            </div>
         </div>

         {/* Stripe Checkout Overlay */}
         {stripePriceId && user && selectedPlan && (
            <StripeCheckout
               priceId={stripePriceId}
               userId={user.id}
               email={user.email}
               planName={PAYMENT_CONFIG[selectedPlan]?.name}
               plan={selectedPlan}
               planPrice={isAnnual
                  ? (selectedPlan === 'pro_annual' ? '347' : '247')
                  : (selectedPlan === 'pro_monthly' ? '44,90' : '29,90')}
               planPeriod={isAnnual ? '/ano' : '/mês'}
               onClose={() => { setStripePriceId(null); setSelectedPlan(null); }}
            />
         )}
      </PremiumBackground>
   );
};

export default PlanSelection;
