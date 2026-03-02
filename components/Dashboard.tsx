import React, { useState } from 'react';
import { User, FoodLog, View } from '../types';
import { isSameTrackingDay } from '../services/dateUtils';
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

const Dashboard: React.FC<DashboardProps> = ({ user, logs, onNavigate, onLogout, onDeleteLog, onEditLog, waterConsumed, setWaterConsumed, onShowToast }) => {
   const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
   const [logToDelete, setLogToDelete] = useState<string | null>(null);

   const todayLogs = logs.filter(log => isSameTrackingDay(log.timestamp));

   const consumed = todayLogs.reduce((acc, log) => acc + log.calories, 0);
   const protein = todayLogs.reduce((acc, log) => acc + log.protein, 0);
   const carbs = todayLogs.reduce((acc, log) => acc + log.carbs, 0);
   const fat = todayLogs.reduce((acc, log) => acc + log.fat, 0);

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

   return (
      <PremiumBackground className="pt-24 pb-32 md:pb-12 h-screen overflow-y-auto scrollbar-hide">
         <div className="w-full max-w-7xl mx-auto px-6 relative z-20">

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

            {/* Header do Usuário */}
            <div className="mb-12 md:mb-16 group/header">
               {/* Top Bar: Label e Logout */}
               <div className="flex justify-between items-center mb-10 gap-4 border-b border-white/5 pb-6">
                  <div className="flex flex-col">
                     <p className="text-zinc-500 font-black uppercase text-[10px] md:text-xs tracking-[0.4em] drop-shadow-md">SISTEMA ATIVO</p>
                     <p className="text-zinc-300/40 font-bold uppercase text-[8px] md:text-[10px] tracking-[0.2em] mt-1">ShapeScan v2.0</p>
                  </div>
                  <button
                     onClick={onLogout}
                     className="bg-white/5 border border-white/10 px-4 py-2 md:px-6 md:py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-all text-zinc-400 shrink-0 active:scale-95 flex items-center gap-2 shadow-lg backdrop-blur-sm"
                  >
                     <span>Sair</span>
                     <span className="opacity-30 hidden md:inline">EXIT</span>
                  </button>
               </div>

               {/* Profile Info Row */}
               <div className="flex items-center gap-6 md:gap-10">
                  <div className="relative group/avatar">
                     <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-700"></div>
                     <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-white/[0.03] border-2 border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-2xl relative z-10 transition-transform duration-700 group-hover/avatar:scale-110">
                        {user.photo ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-4xl md:text-6xl">👤</span>}
                     </div>
                     <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-zinc-950 z-20 shadow-lg"></div>
                  </div>

                  <div className="flex flex-col min-w-0">
                     <p className="text-emerald-500/50 font-black uppercase text-[9px] md:text-[11px] tracking-[0.3em] mb-2">Bem-vindo de volta</p>
                     <h1 className="text-3xl md:text-7xl font-serif-premium font-bold text-white tracking-tight leading-none drop-shadow-xl flex flex-wrap items-center gap-x-2 gap-y-0 min-w-0 mb-3">
                        <span>Olá,</span>
                        <LetterPuller text={user.name.split(' ')[0]} />
                        <span className="animate-smooth-float inline-block">👋</span>
                     </h1>
                     <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 font-black uppercase text-[8px] md:text-[10px] tracking-widest cursor-default hover:bg-emerald-500/20 transition-colors">
                           {user.username.startsWith('@') ? user.username : `@${user.username}`}
                        </span>
                        {user.plan !== 'free' && (
                           <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 opacity-80">
                              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                              PRO
                           </span>
                        )}
                     </div>
                  </div>
               </div>
            </div>

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
                  <ToolGrid onNavigate={onNavigate} />

                  <MealHistory
                     todayLogs={todayLogs}
                     onEditLog={setEditingLog}
                     onDeleteLog={setLogToDelete}
                     formatValue={formatValue}
                  />
               </div>
            </div>
         </div>
      </PremiumBackground>
   );
};

export default Dashboard;
