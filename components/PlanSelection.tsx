
import React, { useState } from 'react';
import { PlanType } from '../services/paymentService';
import { User } from '../types';

interface PlanSelectionProps {
   user?: User | null;
   onSelect: (plan: 'free' | 'monthly' | 'annual' | 'lifetime' | 'pro_monthly' | 'pro_annual') => void;
   onBack?: () => void;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ user, onSelect, onBack }) => {
   const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
   const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

   const handleSubscribe = async (plan: PlanType) => {
      if (!user) { alert("Erro: Usuário não identificado."); return; }
      setLoadingPlan(plan);

      try {
         // Links de checkout Cakto
         const checkoutLinks: Record<PlanType, string> = {
            'monthly': 'https://pay.cakto.com.br/e2j2mqh_769673',
            'annual': 'https://pay.cakto.com.br/3ce3ypz_769675',
            'pro_monthly': 'https://pay.cakto.com.br/598qhka_769676',
            'pro_annual': 'https://pay.cakto.com.br/392xpbn_769680',
            'free': '',
            'lifetime': '',
         };

         const checkoutUrl = checkoutLinks[plan];

         if (!checkoutUrl) {
            alert("Plano não disponível.");
            setLoadingPlan(null);
            return;
         }

         // Adicionar email do usuário como query param
         const url = new URL(checkoutUrl);
         url.searchParams.append('email', user.email);

         // Redirecionar para checkout Cakto
         window.location.href = url.toString();

      } catch (error) {
         console.error("Erro:", error);
         setLoadingPlan(null);
      }
   };

   return (
      <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans relative selection:bg-emerald-500 selection:text-white">
         <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
         </div>

         {/* Safe Area Fix for Mobile Notch */}
         <div className="absolute top-12 left-6 z-50">
            <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/20 shadow-lg hover:scale-105 transition-all active:scale-95 text-white group">
               <span className="text-xl pb-0.5 group-hover:-translate-x-0.5 transition-transform">←</span>
            </button>
         </div>

         <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24">
            <div className="text-center mb-10 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
               <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-[1.1]">Escolha o seu nível de <br className="hidden md:block" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-white">evolução.</span></h1>
               <p className="text-zinc-400 font-medium text-lg">Desbloqueie todo o potencial da tecnologia para o seu físico.</p>
            </div>

            {/* Billing Toggle - Redesigned & Centered */}
            <div className="flex justify-center mb-12 animate-in fade-in duration-700 delay-100">
               <div className="bg-zinc-950 p-1 rounded-full border border-white/10 flex relative h-14 w-80 max-w-full items-center shadow-inner shadow-black/50">
                  {/* Monthly Button */}
                  <button
                     onClick={() => setBillingCycle('monthly')}
                     className={`flex-1 h-full rounded-full text-xs font-black uppercase tracking-widest transition-all relative z-10 flex items-center justify-center ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                     Mensal
                  </button>

                  {/* Annual Button */}
                  <button
                     onClick={() => setBillingCycle('annual')}
                     className={`flex-1 h-full rounded-full text-xs font-black uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 ${billingCycle === 'annual' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                     Anual
                     <span className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${billingCycle === 'annual' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>-20%</span>
                  </button>

                  {/* Sliding Background (Emerald with Glow) */}
                  <div className={`absolute top-1 bottom-1 w-[calc(50%-6px)] bg-emerald-600 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] ${billingCycle === 'monthly' ? 'left-1' : 'left-[calc(50%+2px)]'}`}></div>
               </div>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

               {/* STANDARD PLAN */}
               <div className="relative">
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
                     highlightColor={billingCycle === 'monthly' ? "blue" : "emerald"}
                     isPro={false}
                  />
               </div>

               {/* PRO PLAN */}
               <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 rounded-[2.5rem] blur opacity-20 animate-pulse"></div>
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

            <div className="mt-16 max-w-2xl mx-auto text-center">
               <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
                  <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-2">Sobre os Limites</h3>
                  <p className="text-zinc-500 text-sm">
                     Nossa tecnologia utiliza processamento avançado de alto desempenho. Devido aos custos operacionais desta infraestrutura, aplicamos limites diários para manter a sustentabilidade do serviço.
                  </p>
               </div>
            </div>

            {/* Show "Continue Free" only if user hasn't used their 1 scan or isn't logged in yet */}
            {(!user || (user.plan === 'free' && (user.freeScansUsed || 0) < 1)) && (
               <div className="text-center mt-12 animate-in fade-in duration-1000 delay-300">
                  <button onClick={() => onSelect('free')} className="text-zinc-600 hover:text-emerald-500 transition-colors text-xs font-bold uppercase tracking-widest border-b border-transparent hover:border-emerald-500/50 pb-0.5">Continuar no Plano Gratuito (1 Análise Total)</button>
               </div>
            )}
         </div>
      </div>
   );
};

const PlanCard = ({ title, price, period, features, highlightTag, highlightColor = 'emerald', onClick, loading, subtext, isPro }: any) => (
   <div
      onClick={onClick}
      className={`
      group relative rounded-[2.5rem] p-8 border flex flex-col justify-between h-full cursor-pointer
      transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
      ${isPro ? 'bg-zinc-900/90 border-emerald-500/30' : 'bg-zinc-900/40 border-white/5'}
      hover:bg-zinc-800/90 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2
    `}
   >
      {highlightTag && (
         <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/5 z-20 
          ${highlightColor === 'blue' ? 'bg-blue-600 text-white' : ''}
          ${highlightColor === 'emerald' ? 'bg-emerald-600 text-white' : ''}
          ${isPro ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white' : ''}
          ${!isPro && highlightColor !== 'blue' && highlightColor !== 'emerald' ? 'bg-zinc-800 text-zinc-400' : ''}
        `}>
            {highlightTag}
         </div>
      )}

      <div>
         <h3 className={`font-black uppercase text-xl tracking-tighter mb-4 ${isPro ? 'text-white' : 'text-zinc-500 group-hover:text-white transition-colors'}`}>
            {title}
         </h3>

         <div className="mb-1 flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-5xl font-black text-white tracking-tighter">
               {price.includes('R$') ? '' : 'R$'} {price}
            </span>
            <span className="text-zinc-500 font-bold text-xs uppercase tracking-wide">{period}</span>
         </div>

         {subtext && <p className="text-[10px] text-zinc-400 font-bold mb-6">{subtext}</p>}
         {!subtext && <div className="h-4 mb-2"></div>}

         <div className={`h-px w-full my-6 transition-colors duration-300 ${isPro ? 'bg-emerald-500/30' : 'bg-white/5 group-hover:bg-emerald-500/30'}`}></div>

         <ul className="space-y-4 mb-8">
            {features.map((f: string, i: number) => (
               <li key={i} className="flex items-start gap-3 text-sm font-bold text-zinc-300">
                  <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isPro ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors'}`}>
                     ✓
                  </div>
                  {f}
               </li>
            ))}
         </ul>
      </div>

      <button disabled={loading} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg ${isPro ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-white/5 text-zinc-400 hover:bg-emerald-500 hover:text-white'}`}>
         {loading ? 'Processando...' : 'Escolher Plano'}
      </button>
   </div>
);

export default PlanSelection;
