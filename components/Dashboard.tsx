import React, { useState } from 'react';
import { User, FoodLog, View } from '../types';
import { isSameTrackingDay } from '../services/dateUtils';

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
      <div className="w-full max-w-md md:max-w-6xl mx-auto px-4 pt-4 md:pt-24 pb-12 md:pb-12 text-gray-900 dark:text-white min-h-screen">

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
         <div className="flex justify-between items-center mb-6 md:mb-10 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
               <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white dark:bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {user.photo ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-xl md:text-2xl">👤</span>}
               </div>
               <div className="flex flex-col min-w-0">
                  <h1 className="text-lg md:text-3xl font-black leading-tight tracking-tight text-gray-900 dark:text-white truncate">Olá, {user.name.split(' ')[0]} 👋</h1>
                  <p className="text-emerald-600 font-bold uppercase text-[9px] md:text-[11px] tracking-widest truncate">{user.username.startsWith('@') ? user.username : `@${user.username}`}</p>
               </div>
            </div>
            <button onClick={onLogout} className="glass-card px-3 py-1.5 md:px-6 md:py-3 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors text-gray-500 dark:text-gray-400 shrink-0">Sair</button>
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
   );
};

export default Dashboard;
