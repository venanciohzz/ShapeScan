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
            <div className="flex justify-between items-end mb-12 md:mb-16 gap-6">
               <div className="flex items-center gap-6 min-w-0 flex-1">
                  <div className="relative group">
                     <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                     <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/[0.03] border-2 border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105">
                        {user.photo ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-3xl md:text-5xl">👤</span>}
                     </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                     <p className="text-zinc-500 font-bold uppercase text-[10px] md:text-xs tracking-[0.3em] mb-2 opacity-70">Painel de Controle</p>
                     <h1 className="text-3xl md:text-6xl font-serif-premium font-bold text-white tracking-tight truncate leading-tight">
                        Olá, <LetterPuller text={user.name.split(' ')[0]} /> 👋
                     </h1>
                     <p className="text-emerald-500 font-black uppercase text-[10px] md:text-xs tracking-[0.2em] mt-2">{user.username.startsWith('@') ? user.username : `@${user.username}`}</p>
                  </div>
               </div>
               <button
                  onClick={onLogout}
                  className="bg-white/5 border border-white/10 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-all text-zinc-500 shrink-0 active:scale-95 flex items-center gap-2"
               >
                  <span>Sair</span>
                  <span className="opacity-50">BYE</span>
               </button>
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
