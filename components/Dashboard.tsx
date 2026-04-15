import React, { useState, useMemo, useEffect } from 'react';
import { User, FoodLog, View, DailyFeedback } from '../types';
import { isSameTrackingDay } from '../services/dateUtils';
import { getDailyFeedback } from '../services/openaiService';
import { resendConfirmationEmail } from '../services/supabaseService';
import { motion } from 'framer-motion';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';

// Sub-componentes
import CalorieCard from './dashboard/CalorieCard';
import MacroGrid from './dashboard/MacroGrid';
import HydrationCard from './dashboard/HydrationCard';
import ToolGrid from './dashboard/ToolGrid';
import MealHistory from './dashboard/MealHistory';
import EditMealModal from './dashboard/EditMealModal';
import DeleteMealModal from './dashboard/DeleteMealModal';
import DailyFeedbackCard from './dashboard/DailyFeedbackCard';

interface DashboardProps {
   user: User;
   logs: FoodLog[];
   onNavigate: (view: View) => void;
   onLogout: () => void;
   onDeleteLog: (id: string) => void;
   onEditLog: (log: FoodLog) => void;
   waterConsumed: number;
   setWaterConsumed: (amount: number) => void;
   onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
   onUpgrade: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, logs, onNavigate, onLogout, onDeleteLog, onEditLog, waterConsumed, setWaterConsumed, onShowToast, onUpgrade }) => {
   const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
   const [logToDelete, setLogToDelete] = useState<string | null>(null);
   const [dailyFeedback, setDailyFeedback] = useState<DailyFeedback | null>(null);
   const [loadingFeedback, setLoadingFeedback] = useState(false);
   const [resendingEmail, setResendingEmail] = useState(false);
   const [emailResent, setEmailResent] = useState(false);
   const todayLogs = useMemo(() => logs.filter(log => isSameTrackingDay(log.timestamp)), [logs]);

   const totals = useMemo(() => ({
      consumed: todayLogs.reduce((acc, log) => acc + log.calories, 0),
      protein: todayLogs.reduce((acc, log) => acc + log.protein, 0),
      carbs: todayLogs.reduce((acc, log) => acc + log.carbs, 0),
      fat: todayLogs.reduce((acc, log) => acc + log.fat, 0),
   }), [todayLogs]);

   const { consumed, protein, carbs, fat } = totals;

   useEffect(() => {
      const fetchDailyFeedback = async () => {
         if (todayLogs.length === 0) {
            setDailyFeedback(null);
            return;
         }
         
         setLoadingFeedback(true);
         try {
            const consumedData = { calories: consumed, protein, carbs, fat };
            const goals = { 
               calories: user.dailyCalorieGoal || 2000, 
               protein: user.dailyProtein || 150, 
               carbs: user.dailyCarbs || 200, 
               fat: user.dailyFat || 60 
            };
            const feedback = await getDailyFeedback(consumedData, goals, user.goal || 'Hipertrofia');
            setDailyFeedback(feedback);
         } catch (err) {
            console.error('Erro ao buscar feedback diário:', err);
         } finally {
            setLoadingFeedback(false);
         }
      };

      // Performance: delay aumentado para não bloquear o carregamento inicial do Dashboard.
      // A IA faz uma chamada de rede pesada (Edge Function → OpenAI) — melhor esperar a UI estar estável.
      const timer = setTimeout(fetchDailyFeedback, 5000);
      return () => clearTimeout(timer);
   }, [todayLogs.length, user.dailyCalorieGoal, user.goal]);

   const safeGoal = user.dailyCalorieGoal > 0 ? user.dailyCalorieGoal : 2000;
   const realPercent = (consumed / safeGoal) * 100;
   const visualPercent = Math.min(realPercent, 100);
   const isOverLimit = realPercent > 100;

   const formatValue = (val: number) => Number(val.toFixed(1));

   const handleResendEmail = async () => {
      if (resendingEmail || emailResent) return;
      setResendingEmail(true);
      try {
         await resendConfirmationEmail(user.email);
         setEmailResent(true);
         onShowToast('E-mail de confirmação reenviado!', 'success');
      } catch {
         onShowToast('Erro ao reenviar e-mail. Tente novamente.', 'error');
      } finally {
         setResendingEmail(false);
      }
   };

   const confirmDelete = () => {
      if (logToDelete) {
         onDeleteLog(logToDelete);
         setLogToDelete(null);
      }
   };

   return (
      <PremiumBackground className="pt-20 md:pt-28 pb-32 md:pb-12 h-screen overflow-y-auto scrollbar-hide overflow-x-hidden">
         <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-20"
         >

            {/* Banner de confirmação de e-mail */}
            {user.emailConfirmed === false && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-amber-300 font-bold text-sm">Confirme seu e-mail para liberar o acesso completo</p>
                    <p className="text-amber-400/70 text-xs mt-0.5">Verifique sua caixa de entrada e clique no link de confirmação que enviamos.</p>
                  </div>
                </div>
                <button
                  onClick={handleResendEmail}
                  disabled={resendingEmail || emailResent}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {emailResent ? 'Enviado!' : resendingEmail ? 'Enviando...' : 'Reenviar e-mail'}
                </button>
              </motion.div>
            )}

            {/* Modais de Controle */}
            <DeleteMealModal
               isOpen={!!logToDelete}
               onClose={() => setLogToDelete(null)}
               onConfirm={confirmDelete}
            />

            <EditMealModal
               log={editingLog}
               onClose={() => setEditingLog(null)}
               onSave={(updatedLog) => {
                  onEditLog(updatedLog);
                  setEditingLog(null);
               }}
               formatValue={formatValue}
            />

            {/* Header Unificado e Compacto */}
            <header className="mb-8 md:mb-20">
               <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 md:gap-8 min-w-0">
                     <div className="relative shrink-0">
                        <div className="w-14 h-14 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2rem] bg-white/5 border border-emerald-500/20 flex items-center justify-center shadow-2xl relative z-10 p-0.5">
                           <div className="w-full h-full rounded-[1.3rem] md:rounded-[1.8rem] overflow-hidden bg-zinc-900">
                              {user.photo ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-2xl md:text-6xl flex items-center justify-center h-full">👤</span>}
                           </div>
                           <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-emerald-500 rounded-full border-[3px] border-zinc-950 z-20 shadow-lg"></div>
                        </div>
                     </div>

                     <div className="flex flex-col min-w-0">
                        <p className="text-emerald-500/50 font-black uppercase text-[8px] md:text-[11px] tracking-widest md:tracking-[0.4em] mb-1">DASHBOARD</p>
                        <h1 className="text-xl md:text-7xl font-serif-premium font-bold text-white tracking-tight leading-none drop-shadow-xl flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 mb-2">
                           <span className="opacity-60 text-base md:text-5xl font-light">Olá,</span>
                           <span className="font-bold">{user.name.split(' ')[0]}</span>
                        </h1>
                        <div className="flex items-center gap-2">
                           <span className="text-emerald-400 font-bold text-[9px] md:text-xs tracking-widest uppercase">
                              {user.username.startsWith('@') ? user.username : `@${user.username}`}
                           </span>
                           <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center gap-1">
                              <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></div>
                              <span className="text-[7px] md:text-[9px] font-black text-amber-500 tracking-tighter uppercase">
                                 {user.plan === 'pro_monthly' || user.plan === 'pro_annual' ? 'PRO' :
                                    (user.plan === 'free' || !user.plan) ? 'GRATUITO' : 'PADRÃO'}
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <motion.button
                     whileTap={{ scale: 0.95 }}
                     onClick={onLogout}
                     className="bg-white/5 w-12 h-12 md:w-auto md:px-8 md:py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-red-500/10 group/logout transition-all"
                  >
                     <span className="hidden md:inline text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 group-hover/logout:text-red-400 transition-colors">Sair da Conta</span>
                     <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-500 group-hover/logout:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                     </svg>
                  </motion.button>
               </div>
            </header>

            {/* Banner de Ativação de Plano (pending_payment legacy) */}
            {localStorage.getItem('awaiting_stripe_payment') === 'true' && !user.isPremium && (
               <div className="mb-8 p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div>
                     <p className="text-emerald-400 font-black text-sm uppercase tracking-widest">Ativando seu plano…</p>
                     <p className="text-emerald-400/60 text-xs font-medium mt-0.5">Seu pagamento foi recebido. O acesso será liberado em instantes.</p>
                  </div>
               </div>
            )}

            {/* Banner: Completar perfil físico */}
            {(!user.weight || !user.height) && (
               <div className="mb-8 p-5 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                     <span className="text-2xl shrink-0">📊</span>
                     <div className="min-w-0">
                        <p className="text-white font-black text-sm">Personalize suas metas</p>
                        <p className="text-zinc-400 text-xs font-medium mt-0.5">Responda 5 perguntas rápidas para ter calorias e macros calculados para você.</p>
                     </div>
                  </div>
                  <button
                     onClick={() => onNavigate('quiz' as View)}
                     className="shrink-0 px-5 py-3 rounded-2xl bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all whitespace-nowrap"
                  >
                     Começar
                  </button>
               </div>
            )}

            {/* Grid Principal */}
            <div className="flex flex-col md:flex-row gap-8 items-start">

               {/* Lado Esquerdo: Estatísticas e Hidratação */}
               <div className="w-full md:w-[60%] space-y-8">
                  <CalorieCard
                     consumed={consumed}
                     safeGoal={safeGoal}
                     isOverLimit={isOverLimit}
                     realPercent={realPercent}
                     visualPercent={visualPercent}
                  />

                  <MacroGrid
                     protein={protein}
                     carbs={carbs}
                     fat={fat}
                     user={user}
                     formatValue={formatValue}
                  />

                  <HydrationCard
                     waterConsumed={waterConsumed}
                     setWaterConsumed={setWaterConsumed}
                     waterGoal={user.dailyWaterGoal || 2500}
                     onShowToast={onShowToast}
                  />
               </div>

               {/* Lado Direito: Ferramentas e Histórico */}
               <div className="w-full md:w-[40%] space-y-8">
                  <DailyFeedbackCard feedback={dailyFeedback} loading={loadingFeedback} />
                  
                  <ToolGrid user={user} onNavigate={onNavigate} onUpgrade={onUpgrade} />

                  <MealHistory
                     todayLogs={todayLogs}
                     onEditLog={setEditingLog}
                     onDeleteLog={setLogToDelete}
                     formatValue={formatValue}
                  />
               </div>
            </div>
         </motion.div>
      </PremiumBackground>
   );
};

export default Dashboard;
