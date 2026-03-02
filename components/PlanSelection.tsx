import React, { useState } from 'react';
import { PlanType, getCheckoutUrl } from '../services/paymentConfig';
import { User } from '../types';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface PlanSelectionProps {
   user?: User | null;
   onSelect: (plan: 'free' | 'monthly' | 'annual' | 'lifetime' | 'pro_monthly' | 'pro_annual') => void;
   onBack?: () => void;
   onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ user, onSelect, onBack, onShowToast }) => {
   const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
   const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

   const handleSubscribe = async (plan: PlanType) => {
      if (!user) { onShowToast("Erro: Usuário não identificado.", 'error'); return; }
      setLoadingPlan(plan);

      try {
         const checkoutUrl = getCheckoutUrl(plan, user.email, user.id);

         if (!checkoutUrl) {
            onShowToast("Plano não disponível.", 'error');
            setLoadingPlan(null);
            return;
         }

         // Redirecionar para checkout Cakto
         window.location.href = checkoutUrl;

      } catch (error) {
         console.error("Erro:", error);
         setLoadingPlan(null);
      }
   };

   return (
      <PremiumBackground className="overflow-x-hidden selection:bg-emerald-500 selection:text-white" dim={true} intensity={1.5}>
         {/* Top Navigation */}
         <div className="absolute top-8 left-6 md:top-12 md:left-12 z-50">
            <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-white group">
               <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
            </button>
         </div>

         <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24">
            <div className="text-center mb-16 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
               <h1 className="text-5xl md:text-7xl font-serif-premium font-bold tracking-tight mb-6 text-white leading-[1.1]">
                  Escolha o seu nível de<br />
                  <span className="text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                     <LetterPuller text="evolução." />
                  </span>
               </h1>
               <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs md:text-sm opactiy-80">
                  Desbloqueie todo o potencial da tecnologia para o seu físico.
               </p>
            </div>

            {/* Billing Toggle - Premium Redesign */}
            <div className="flex justify-center mb-16 animate-in fade-in duration-1000 delay-200">
               <div className="bg-zinc-950/50 backdrop-blur-xl p-1.5 rounded-full border border-white/10 flex relative h-16 w-80 max-w-full items-center shadow-2xl">
                  {/* Monthly Button */}
                  <button
                     onClick={() => setBillingCycle('monthly')}
                     className={`flex-1 h-full rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all relative z-10 flex items-center justify-center ${billingCycle === 'monthly' ? 'text-zinc-950' : 'text-zinc-500 hover:text-white'}`}
                  >
                     Mensal
                  </button>

                  {/* Annual Button */}
                  <button
                     onClick={() => setBillingCycle('annual')}
                     className={`flex-1 h-full rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all relative z-10 flex items-center justify-center gap-2 ${billingCycle === 'annual' ? 'text-zinc-950' : 'text-zinc-500 hover:text-white'}`}
                  >
                     Anual
                     <span className={`text-[8px] px-2 py-1 rounded bg-zinc-950 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]`}>-20%</span>
                  </button>

                  {/* Sliding Background */}
                  <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.4)] ${billingCycle === 'monthly' ? 'left-1.5' : 'left-[calc(50%+2px)]'}`}></div>
               </div>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
               {/* STANDARD PLAN */}
               <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                  <PlanCard
                     title="Standard"
                     price={billingCycle === 'monthly' ? "29,90" : "247"}
                     period={billingCycle === 'monthly' ? "/mês" : "/ano"}
                     features={[
                        "6 Análises de Refeição por dia",
                        "2 Análises de Shape por dia",
                        "Histórico de Evolução",
                        "Relatórios Detalhados"
                     ]}
                     onClick={() => handleSubscribe(billingCycle === 'monthly' ? 'monthly' : 'annual')}
                     loading={loadingPlan === 'monthly' || loadingPlan === 'annual'}
                     highlightTag={billingCycle === 'monthly' ? "Mais Escolhido" : "Melhor Custo-Benefício"}
                     isPro={false}
                  />
               </div>

               {/* PRO PLAN */}
               <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500/40 via-cyan-500/20 to-emerald-500/40 rounded-[3rem] blur-2xl opacity-50 animate-pulse"></div>
                  <PlanCard
                     title="Pro"
                     price={billingCycle === 'monthly' ? "44,90" : "347"}
                     period={billingCycle === 'monthly' ? "/mês" : "/ano"}
                     features={[
                        "12 Análises de Refeição por dia",
                        "4 Análises de Shape por dia",
                        "Histórico Completo",
                        "Prioridade no Coach",
                        "Acesso a Betas"
                     ]}
                     onClick={() => handleSubscribe(billingCycle === 'monthly' ? 'pro_monthly' : 'pro_annual')}
                     loading={loadingPlan === 'pro_monthly' || loadingPlan === 'pro_annual'}
                     highlightTag={billingCycle === 'annual' ? "Economia Máxima" : "Alta Performance"}
                     isPro={true}
                  />
               </div>
            </div>

            <div className="mt-20 max-w-3xl mx-auto text-center">
               <div className="p-8 rounded-[2rem] bg-zinc-950/40 backdrop-blur-xl border border-white/5 shadow-2xl">
                  <h3 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4">Sobre os Limites</h3>
                  <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">
                     Nossa tecnologia utiliza processamento avançado de alto desempenho em IA. Devido aos custos operacionais desta infraestrutura, aplicamos limites diários para manter a sustentabilidade do serviço.
                  </p>
               </div>
            </div>

            {/* Show "Continue Free" only if user hasn't used their 1 scan or isn't logged in yet */}
            {(!user || (user.plan === 'free' && (user.freeScansUsed || 0) < 1)) && (
               <div className="text-center mt-12 animate-in fade-in duration-1000 delay-700">
                  <button onClick={() => onSelect('free')} className="text-zinc-500 hover:text-emerald-400 transition-colors text-[10px] font-black uppercase tracking-[0.3em] border-b border-white/10 hover:border-emerald-500/50 pb-1">
                     Continuar no Plano Gratuito (1 Análise Total)
                  </button>
               </div>
            )}
         </div>
      </PremiumBackground>
   );
};

const PlanCard = ({ title, price, period, features, highlightTag, onClick, loading, subtext, isPro }: any) => (
   <div
      onClick={onClick}
      className={`
      group relative rounded-[3rem] p-10 md:p-12 border flex flex-col justify-between h-full cursor-pointer
      transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
      ${isPro ? 'bg-zinc-950/60 backdrop-blur-3xl border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]' : 'bg-zinc-950/40 backdrop-blur-3xl border-white/10'}
      hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-4
    `}
   >
      {/* Internal Glow Effect */}
      {isPro && <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none transition-opacity duration-700 group-hover:opacity-100 overflow-hidden rounded-tr-[3rem]"></div>}

      {highlightTag && (
         <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.5)] border z-20 transition-all duration-500 group-hover:scale-105 whitespace-nowrap
          ${isPro ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-white/20' : 'bg-white text-zinc-950 border-white'}
        `}>
            {highlightTag}
         </div>
      )}

      <div className="relative z-10">
         <h3 className={`font-black uppercase text-xl md:text-2xl tracking-[0.2em] mb-6 ${isPro ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-white transition-colors duration-500'}`}>
            {title}
         </h3>

         <div className="mb-2 flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-6xl md:text-7xl font-serif-premium font-bold text-white tracking-tighter drop-shadow-lg">
               {price.includes('R$') ? '' : <span className="text-3xl font-black text-zinc-500 mr-1">R$</span>}{price}
            </span>
            <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">{period}</span>
         </div>

         {subtext && <p className="text-[10px] text-zinc-500 font-bold mb-8 uppercase tracking-wider">{subtext}</p>}
         {!subtext && <div className="h-6 mb-4"></div>}

         <div className={`h-px w-full my-8 ${isPro ? 'bg-gradient-to-r from-emerald-500/50 to-transparent' : 'bg-gradient-to-r from-white/10 to-transparent'}`}></div>

         <ul className="space-y-6 mb-10">
            {features.map((f: string, i: number) => (
               <li key={i} className="flex items-start gap-4 text-sm font-medium text-zinc-300 group-hover:text-white transition-colors duration-500">
                  <div className={`mt-0.5 shrink-0 transition-transform duration-500 group-hover:scale-110 ${isPro ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-emerald-400'}`}>
                     <CheckCircle2 className="w-5 h-5" />
                  </div>
                  {f}
               </li>
            ))}
         </ul>
      </div>

      <button disabled={loading} className={`relative overflow-hidden w-full py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all duration-500 shadow-xl border ${isPro ? 'bg-emerald-500 text-zinc-950 border-emerald-400 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(52,211,153,0.4)]' : 'bg-white/5 text-white border-white/10 hover:bg-white hover:text-zinc-950'} active:scale-95`}>
         <span className="relative z-10">{loading ? 'Validando...' : 'Assinar Agora'}</span>
      </button>
   </div>
);

export default PlanSelection;
