import React, { useState, useMemo, useEffect } from 'react';
import { User, FoodLog, View, DailyFeedback } from '../types';
import { isSameTrackingDay } from '../services/dateUtils';
import { getDailyFeedback } from '../services/openaiService';
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
}

const sectionVariants = {
   hidden: { opacity: 0, y: 16 },
   visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, delay: i * 0.08, ease: 'easeOut' },
   }),
};

const Dashboard: React.FC<DashboardProps> = ({ user, logs, onNavigate, onLogout, onDeleteLog, onEditLog, waterConsumed, setWaterConsumed, onShowToast }) => {
   const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
   const [logToDelete, setLogToDelete] = useState<string | null>(null);
   const [dailyFeedback, setDailyFeedback] = useState<DailyFeedback | null>(null);
   const [loadingFeedback, setLoadingFeedback] = useState(false);
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
               fat: user.dailyFat || 60,
            };
            const feedback = await getDailyFeedback(consumedData, goals, user.goal || 'Hipertrofia');
            setDailyFeedback(feedback);
         } catch (err) {
            console.error('Erro ao buscar feedback diário:', err);
         } finally {
            setLoadingFeedback(false);
         }
      };

      const timer = setTimeout(fetchDailyFeedback, 5000);
      return () => clearTimeout(timer);
   }, [todayLogs.length, user.dailyCalorieGoal, user.goal]);

   const safeGoal = user.dailyCalorieGoal > 0 ? user.dailyCalorieGoal : 2000;
   const realPercent = (consumed / safeGoal) * 100;
   const visualPercent = Math.min(realPercent, 100);
   const isOverLimit = realPercent > 100;

   const formatValue = (val: number) => Number(val.toFixed(1));

   const confirmDelete = () => {
      if (logToDelete) {
         onDeleteLog(logToDelete);
         setLogToDelete(null);
      }
   };

   // Username pode ser null para usuários Google que ainda não preencheram o perfil
   const displayUsername = user.username
      ? (user.username.startsWith('@') ? user.username : `@${user.username}`)
      : user.email?.split('@')[0] ?? '—';

   const planLabel =
      user.plan === 'pro_monthly' || user.plan === 'pro_annual' ? 'PRO' :
      user.plan === 'free' || !user.plan ? 'GRATUITO' : 'PADRÃO';

   const planColor =
      user.plan === 'pro_monthly' || user.plan === 'pro_annual'
         ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
         : user.plan === 'free' || !user.plan
         ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
         : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';

   return (
      <PremiumBackground className="pt-20 md:pt-28 pb-32 md:pb-12 h-screen overflow-y-auto scrollbar-hide overflow-x-hidden">
         <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-20"
         >
            {/* Modais */}
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

            {/* Header */}
            <motion.header
               custom={0}
               variants={sectionVariants}
               initial="hidden"
               animate="visible"
               className="mb-10 md:mb-16"
            >
               <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 md:gap-6 min-w-0">
                     {/* Avatar */}
                     <div className="relative shrink-0">
                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-xl relative z-10 p-0.5">
                           <div className="w-full h-full rounded-[1.3rem] md:rounded-[1.8rem] overflow-hidden bg-zinc-900">
                              {user.photo
                                 ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                                 : <span className="text-2xl md:text-4xl flex items-center justify-center h-full">👤</span>
                              }
                           </div>
                           <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-950 z-20" />
                        </div>
                     </div>

                     {/* Name + meta */}
                     <div className="flex flex-col min-w-0">
                        <p className="text-emerald-500/40 font-black uppercase text-[8px] md:text-[10px] tracking-[0.4em] mb-0.5">Dashboard</p>
                        <h1 className="text-xl sm:text-2xl md:text-5xl font-serif-premium font-bold text-white tracking-tight leading-none flex flex-wrap items-baseline gap-x-2 mb-2">
                           <span className="opacity-50 text-base sm:text-xl md:text-4xl font-light">Olá,</span>
                           <LetterPuller text={user.name?.split(' ')[0] ?? 'Atleta'} />
                        </h1>
                        <div className="flex items-center gap-2">
                           <span className="text-zinc-500 font-bold text-[9px] md:text-[10px] tracking-widest uppercase truncate max-w-[120px]">
                              {displayUsername}
                           </span>
                           <div className={`px-2 py-0.5 border rounded-md flex items-center gap-1 ${planColor}`}>
                              <div className="w-1 h-1 rounded-full bg-current animate-pulse" />
                              <span className="text-[7px] md:text-[8px] font-black tracking-wider uppercase">{planLabel}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Logout */}
                  <motion.button
                     whileTap={{ scale: 0.95 }}
                     onClick={onLogout}
                     className="shrink-0 bg-white/[0.03] border border-white/8 w-11 h-11 md:w-auto md:px-6 md:py-3 rounded-2xl flex items-center justify-center gap-2.5 hover:bg-red-500/10 hover:border-red-500/20 group transition-all duration-300"
                  >
                     <span className="hidden md:inline text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-red-400 transition-colors">Sair</span>
                     <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-500 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                     </svg>
                  </motion.button>
               </div>
            </motion.header>

            {/* Banner pagamento pendente */}
            {localStorage.getItem('awaiting_stripe_payment') === 'true' && !user.isPremium && (
               <div className="mb-6 p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin shrink-0" />
                  <div>
                     <p className="text-emerald-400 font-black text-xs uppercase tracking-widest">Ativando seu plano…</p>
                     <p className="text-emerald-400/50 text-[10px] font-medium mt-0.5">Seu pagamento foi recebido. O acesso será liberado em instantes.</p>
                  </div>
               </div>
            )}

            {/* Grid Principal */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
               {/* Coluna esquerda */}
               <div className="w-full md:w-[60%] space-y-6">
                  <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
                     <CalorieCard
                        consumed={consumed}
                        safeGoal={safeGoal}
                        isOverLimit={isOverLimit}
                        realPercent={realPercent}
                        visualPercent={visualPercent}
                     />
                  </motion.div>

                  <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
                     <MacroGrid
                        protein={protein}
                        carbs={carbs}
                        fat={fat}
                        user={user}
                        formatValue={formatValue}
                     />
                  </motion.div>

                  <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
                     <HydrationCard
                        waterConsumed={waterConsumed}
                        setWaterConsumed={setWaterConsumed}
                        waterGoal={user.dailyWaterGoal || 2500}
                        onShowToast={onShowToast}
                     />
                  </motion.div>
               </div>

               {/* Coluna direita */}
               <div className="w-full md:w-[40%] space-y-6">
                  <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
                     <DailyFeedbackCard feedback={dailyFeedback} loading={loadingFeedback} />
                  </motion.div>

                  <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
                     <ToolGrid onNavigate={onNavigate} />
                  </motion.div>

                  <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible">
                     <MealHistory
                        todayLogs={todayLogs}
                        onEditLog={setEditingLog}
                        onDeleteLog={setLogToDelete}
                        formatValue={formatValue}
                     />
                  </motion.div>
               </div>
            </div>
         </motion.div>
      </PremiumBackground>
   );
};

export default Dashboard;
