
import React, { useState } from 'react';
import { PlanType } from '../services/paymentService';
import { User } from '../types';

interface UpgradeProProps {
   user?: User | null;
   onBack: () => void;
}

const UpgradePro: React.FC<UpgradeProProps> = ({ user, onBack }) => {
   const [loading, setLoading] = useState<PlanType | null>(null);

   const handleSubscribe = async (plan: PlanType) => {
      if (!user) return;
      setLoading(plan);

      try {
         // Links de checkout Cakto
         const checkoutLinks: Record<string, string> = {
            'pro_monthly': 'https://pay.cakto.com.br/598qhka_769676',
            'pro_annual': 'https://pay.cakto.com.br/392xpbn_769680',
         };

         const checkoutUrl = checkoutLinks[plan];

         if (!checkoutUrl) {
            alert("Plano não disponível.");
            setLoading(null);
            return;
         }

         // Adicionar email do usuário como query param
         const url = new URL(checkoutUrl);
         url.searchParams.append('email', user.email);

         // Redirecionar para checkout Cakto
         window.location.href = url.toString();

      } catch (error) {
         console.error("Erro:", error);
         setLoading(null);
      }
   };

   return (
      <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans relative selection:bg-emerald-500 selection:text-white">
         {/* Background Effects */}
         <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
         </div>

         {/* Safe Area Adjustment */}
         <div className="absolute top-12 left-6 z-50">
            <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/20 shadow-lg hover:scale-105 transition-all active:scale-95 text-white group">
               <span className="text-xl pb-0.5 group-hover:-translate-x-0.5 transition-transform">←</span>
            </button>
         </div>

         <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-24">
            <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="inline-block px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest mb-6 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]">
                  Limite Diário Atingido
               </div>
               <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-[1.1]">
                  Sua evolução pede <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-200 to-white">mais liberdade.</span>
               </h1>
               <p className="text-zinc-400 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
                  Você utilizou todas as análises do Plano Standard hoje. Novas análises liberam à meia-noite, ou faça o upgrade agora.
               </p>
            </div>

            {/* Comparison Cards */}
            <div className="grid md:grid-cols-2 gap-6 items-center max-w-4xl mx-auto mb-16">
               {/* Standard (Current) */}
               <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-8 opacity-60 scale-95 blur-[0.5px] grayscale-[0.5]">
                  <h3 className="text-zinc-500 font-black uppercase tracking-widest text-sm mb-6">Seu Plano Atual (Standard)</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">Refeições/Dia</span>
                        <span className="text-white font-black text-xl">6</span>
                     </div>
                     <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden"><div className="w-1/2 bg-zinc-600 h-full"></div></div>

                     <div className="flex justify-between items-center pt-2">
                        <span className="text-zinc-400 font-bold">Shapes/Dia</span>
                        <span className="text-white font-black text-xl">2</span>
                     </div>
                     <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden"><div className="w-1/2 bg-zinc-600 h-full"></div></div>
                  </div>
               </div>

               {/* PRO (Target) */}
               <div className="bg-zinc-900/80 border-2 border-emerald-500 rounded-[2.5rem] p-8 shadow-2xl shadow-emerald-500/10 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>

                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-emerald-400 font-black uppercase tracking-widest text-sm">Plano Pro</h3>
                     <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Recomendado</span>
                  </div>

                  <div className="space-y-6">
                     <div>
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-white font-bold text-lg">Refeições/Dia</span>
                           <span className="text-emerald-400 font-black text-3xl">12</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden border border-emerald-500/20">
                           <div className="w-full bg-gradient-to-r from-emerald-600 to-cyan-500 h-full shadow-[0_0_10px_#10b981]"></div>
                        </div>
                        <p className="text-[10px] text-emerald-500/70 font-bold mt-1 uppercase tracking-wider text-right">Dobro de capacidade</p>
                     </div>

                     <div>
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-white font-bold text-lg">Shapes/Dia</span>
                           <span className="text-emerald-400 font-black text-3xl">4</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden border border-emerald-500/20">
                           <div className="w-full bg-gradient-to-r from-emerald-600 to-cyan-500 h-full shadow-[0_0_10px_#10b981]"></div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Pricing Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
               {/* Monthly Option */}
               <button
                  onClick={() => handleSubscribe('pro_monthly')}
                  disabled={loading === 'pro_monthly'}
                  className="bg-zinc-900 border border-white/10 p-6 rounded-3xl hover:border-emerald-500 transition-all group relative overflow-hidden"
               >
                  <div className="relative z-10 text-left">
                     <p className="text-zinc-400 font-black uppercase text-xs tracking-widest mb-2">Pro Mensal</p>
                     <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">R$ 44,90</span>
                        <span className="text-zinc-500 text-sm font-bold">/mês</span>
                     </div>
                     <p className="mt-4 text-emerald-500 font-bold text-xs group-hover:underline">Assinar Mensal →</p>
                  </div>
               </button>

               {/* Annual Option */}
               <button
                  onClick={() => handleSubscribe('pro_annual')}
                  disabled={loading === 'pro_annual'}
                  className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-emerald-500/50 p-6 rounded-3xl hover:bg-emerald-900/30 transition-all group relative overflow-hidden shadow-lg shadow-emerald-900/20"
               >
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">Economize</div>
                  <div className="relative z-10 text-left">
                     <p className="text-emerald-400 font-black uppercase text-xs tracking-widest mb-2">Pro Anual</p>
                     <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">R$ 347</span>
                        <span className="text-zinc-500 text-sm font-bold">/ano</span>
                     </div>
                     <p className="mt-4 text-white font-bold text-xs group-hover:underline">Assinar Anual →</p>
                  </div>
               </button>
            </div>
         </div>
      </div>
   );
};

export default UpgradePro;
