
import React, { useState } from 'react';
import { User, FoodLog, View, FoodItem } from '../types';

interface DashboardProps {
  user: User;
  logs: FoodLog[];
  onNavigate: (view: View) => void;
  onLogout: () => void;
  onDeleteLog: (id: string) => void;
  onEditLog: (log: FoodLog) => void;
  waterConsumed: number;
  setWaterConsumed: (amount: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, logs, onNavigate, onLogout, onDeleteLog, onEditLog, waterConsumed, setWaterConsumed }) => {
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [showWaterShortcuts, setShowWaterShortcuts] = useState(false);
  const [manualWaterEdit, setManualWaterEdit] = useState(false);
  
  const today = new Date().setHours(0, 0, 0, 0);
  const todayLogs = logs.filter(log => new Date(log.timestamp).setHours(0, 0, 0, 0) === today);

  const consumed = todayLogs.reduce((acc, log) => acc + log.calories, 0);
  const protein = todayLogs.reduce((acc, log) => acc + log.protein, 0);
  const carbs = todayLogs.reduce((acc, log) => acc + log.carbs, 0);
  const fat = todayLogs.reduce((acc, log) => acc + log.fat, 0);

  const safeGoal = user.dailyCalorieGoal > 0 ? user.dailyCalorieGoal : 2000;
  const realPercent = (consumed / safeGoal) * 100;
  const visualPercent = Math.min(realPercent, 100);
  const isOverLimit = realPercent > 100;

  const waterGoal = user.dailyWaterGoal || 2500;
  const waterPercent = Math.min((waterConsumed / waterGoal) * 100, 100);
  const isWaterGoalMet = waterConsumed >= waterGoal;
  
  const addWater = (amount: number) => setWaterConsumed(waterConsumed + amount);

  const formatValue = (val: number) => Number(val.toFixed(1));

  const handleUpdateItem = (itemId: string, updates: Partial<FoodItem>) => {
    if (!editingLog) return;
    const newItems = editingLog.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates };
        if (updates.weight !== undefined && typeof updates.weight === 'number') {
           if (item.weight > 0) {
             const density = item.calories / item.weight;
             updatedItem.calories = Number((updates.weight * density).toFixed(1));
           }
        }
        return updatedItem;
      }
      return item;
    });

    const newTotalCal = newItems.reduce((acc, item) => acc + item.calories, 0);
    const newTotalWeight = newItems.reduce((acc, item) => acc + item.weight, 0);
    const ratio = editingLog.calories > 0 ? newTotalCal / editingLog.calories : 1;
    
    setEditingLog({ 
        ...editingLog, 
        items: newItems, 
        calories: newTotalCal, 
        weight: newTotalWeight,
        protein: Number((editingLog.protein * ratio).toFixed(1)),
        carbs: Number((editingLog.carbs * ratio).toFixed(1)),
        fat: Number((editingLog.fat * ratio).toFixed(1))
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!editingLog) return;
    const newItems = editingLog.items.filter(item => item.id !== itemId);
    if (newItems.length === 0) {
        setEditingLog({ ...editingLog, items: [], calories: 0, weight: 0, protein: 0, carbs: 0, fat: 0 });
        return;
    }
    const newTotalCal = newItems.reduce((acc, item) => acc + item.calories, 0);
    const newTotalWeight = newItems.reduce((acc, item) => acc + item.weight, 0);
    const removedItem = editingLog.items.find(i => i.id === itemId);
    let newProt = editingLog.protein;
    let newCarb = editingLog.carbs;
    let newFat = editingLog.fat;

    if (removedItem && editingLog.calories > 0) {
        const ratioRemoved = removedItem.calories / editingLog.calories;
        newProt = editingLog.protein - (editingLog.protein * ratioRemoved);
        newCarb = editingLog.carbs - (editingLog.carbs * ratioRemoved);
        newFat = editingLog.fat - (editingLog.fat * ratioRemoved);
    }
    setEditingLog({ ...editingLog, items: newItems, calories: newTotalCal, weight: newTotalWeight, protein: Math.max(0, Number(newProt.toFixed(1))), carbs: Math.max(0, Number(newCarb.toFixed(1))), fat: Math.max(0, Number(newFat.toFixed(1))) });
  };

  const confirmDelete = () => {
    if (logToDelete) {
        onDeleteLog(logToDelete);
        setLogToDelete(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:pt-24 pb-8 md:pb-12 text-gray-900 dark:text-white">
      
      {logToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 rounded-full blur-3xl -mt-16 pointer-events-none"></div>
              <div className="text-center relative z-10">
                 <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🗑️</div>
                 <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">Excluir Refeição?</h3>
                 <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-8 leading-relaxed">Essa ação vai remover as calorias do seu dia.</p>
                 <div className="flex flex-col gap-3">
                    <button onClick={confirmDelete} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 hover:scale-[1.02] transition-all shadow-lg shadow-red-500/20">Sim, Excluir</button>
                    <button onClick={() => setLogToDelete(null)} className="w-full py-4 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all">Cancelar</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-full bg-white dark:bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
             {user.photo ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-2xl">👤</span>}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-2xl font-black leading-tight tracking-tight text-gray-900 dark:text-white truncate">Olá, {user.name.split(' ')[0]} 👋</h1>
            <p className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest truncate">{user.username.startsWith('@') ? user.username : `@${user.username}`}</p>
          </div>
        </div>
        <button onClick={onLogout} className="glass-card px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors text-gray-500 dark:text-gray-400 shrink-0">Sair</button>
      </div>

      {/* CALORIE CARD */}
      <div className={`rounded-[2.5rem] p-8 md:p-10 shadow-2xl mb-6 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-500 border ${isOverLimit ? 'bg-gradient-to-br from-yellow-500 to-orange-600 shadow-orange-500/30 border-orange-400/50' : 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30 border-emerald-400/50'}`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <p className="text-white/90 text-[10px] font-black uppercase tracking-widest opacity-80">{isOverLimit ? 'Meta Excedida' : 'Meta Diária'}</p>
                <span className="text-white font-black text-3xl drop-shadow-sm">{realPercent.toFixed(0)}%</span>
            </div>
            <div className="flex items-baseline gap-2 mb-8 flex-wrap">
                <span className="text-6xl md:text-7xl font-black text-white tracking-tighter leading-none">{formatValue(consumed)}</span>
                <span className="text-white/80 font-bold text-sm tracking-wide">/ {safeGoal} kcal</span>
            </div>
            <div className="w-full bg-black/20 h-4 md:h-5 rounded-full overflow-hidden backdrop-blur-sm border border-black/5">
                <div className="h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)] relative bg-white" style={{ width: `${visualPercent}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/50 opacity-50"></div>
                </div>
            </div>
        </div>
      </div>

      {/* HYDRATION CARD */}
      <div className={`
          p-6 md:p-8 rounded-[2rem] mb-8 relative overflow-hidden transition-all duration-500
          ${isWaterGoalMet 
             ? 'bg-gradient-to-br from-blue-600 to-cyan-500 shadow-2xl shadow-cyan-500/40 border border-cyan-400/50 scale-[1.02]' 
             : 'glass-panel border-l-4 border-l-cyan-500 hover:shadow-cyan-500/10'
          }
      `}>
         {/* Premium Glow for Met Goal */}
         {isWaterGoalMet && (
            <>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-800/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
            </>
         )}

         <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${isWaterGoalMet ? 'bg-white/20 text-white backdrop-blur-md shadow-inner' : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600'}`}>
                   💧
               </div>
               <div>
                  <h3 className={`font-black text-lg leading-none ${isWaterGoalMet ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Hidratação</h3>
                  {manualWaterEdit ? (
                     <div className="flex items-center gap-2 mt-1">
                        <input type="number" value={waterConsumed} onChange={(e) => setWaterConsumed(parseInt(e.target.value) || 0)} className="w-20 bg-gray-100 dark:bg-zinc-800 rounded px-2 py-0.5 text-xs font-bold outline-none border border-cyan-500" autoFocus onBlur={() => setManualWaterEdit(false)} />
                        <span className="text-[10px] font-bold text-gray-400">/ {waterGoal} ml</span>
                     </div>
                  ) : (
                     <p 
                        className={`text-xs font-bold uppercase tracking-widest mt-1 cursor-pointer transition-colors ${isWaterGoalMet ? 'text-cyan-100 hover:text-white' : 'text-gray-400 dark:text-zinc-500 hover:text-cyan-500'}`} 
                        onClick={() => setManualWaterEdit(true)}
                     >
                        {waterConsumed} / {waterGoal} ml
                     </p>
                  )}
               </div>
            </div>
            {isWaterGoalMet && (
                 <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Meta Batida! 🎉</span>
                 </div>
            )}
         </div>

         <div className={`w-full h-4 md:h-5 rounded-full overflow-hidden mb-6 border transition-colors ${isWaterGoalMet ? 'bg-black/20 border-white/10' : 'bg-gray-100 dark:bg-zinc-800 border-black/5 dark:border-white/5'}`}>
            <div 
                className={`h-full transition-all duration-1000 ease-out relative rounded-full ${isWaterGoalMet ? 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.7)]' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`} 
                style={{ width: `${waterPercent}%` }}
            >
                {!isWaterGoalMet && <div className="absolute inset-0 bg-white/20"></div>}
            </div>
         </div>

         <div className="flex gap-2 relative z-10">
            <button 
                onClick={() => addWater(250)} 
                className={`flex-1 py-3 rounded-xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1 ${isWaterGoalMet ? 'bg-white text-blue-600 hover:bg-cyan-50 shadow-black/20' : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-cyan-500/20'}`}
            >
                + 250ml
            </button>
            <button 
                onClick={() => setShowWaterShortcuts(!showWaterShortcuts)} 
                className={`w-12 flex items-center justify-center rounded-xl border-2 transition-all ${
                    isWaterGoalMet 
                        ? 'border-white/30 text-white hover:bg-white/10 bg-white/10' 
                        : (showWaterShortcuts ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-500 text-cyan-600' : 'border-gray-100 dark:border-zinc-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800')
                }`}
            >
                <svg className={`w-4 h-4 transition-transform duration-300 ${showWaterShortcuts ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </button>
         </div>

         {showWaterShortcuts && (
            <div className="grid grid-cols-3 gap-2 mt-3 animate-in slide-in-from-top-2 duration-200 relative z-10">
               {[250, 500, 1000].map(amount => (
                  <button 
                    key={amount} 
                    onClick={() => { addWater(amount); setShowWaterShortcuts(false); }} 
                    className={`py-2 rounded-lg text-[10px] font-black transition-colors border ${
                        isWaterGoalMet 
                            ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' 
                            : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-transparent hover:border-cyan-200 hover:text-cyan-600'
                    }`}
                  >
                      +{amount < 1000 ? `${amount}ml` : `${amount/1000}L`}
                  </button>
               ))}
               {[1500, 2000].map(amount => (
                  <button 
                    key={amount} 
                    onClick={() => { addWater(amount); setShowWaterShortcuts(false); }} 
                    className={`py-2 rounded-lg text-[10px] font-black transition-colors border ${
                        isWaterGoalMet 
                            ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' 
                            : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-transparent hover:border-cyan-200 hover:text-cyan-600'
                    }`}
                  >
                      +{amount/1000}L
                  </button>
               ))}
               <button 
                    onClick={() => { setWaterConsumed(0); setShowWaterShortcuts(false); }} 
                    className={`py-2 rounded-lg text-[10px] font-black transition-colors ${
                        isWaterGoalMet
                            ? 'bg-red-500/20 text-white hover:bg-red-500/40'
                            : 'bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100'
                    }`}
               >
                   Reset
               </button>
            </div>
         )}
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-10">
        <MacroCard label="Prot" value={formatValue(protein)} unit="g" fullLabel="Proteínas" goal={user.dailyProtein} color="emerald" />
        <MacroCard label="Carb" value={formatValue(carbs)} unit="g" fullLabel="Carboidratos" goal={user.dailyCarbs} color="blue" />
        <MacroCard label="Gord" value={formatValue(fat)} unit="g" fullLabel="Gorduras" goal={user.dailyFat} color="yellow" />
      </div>

      <h2 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4 ml-1">Ferramentas Premium</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <ActionButton onClick={() => onNavigate('food_ai')} icon="🍽️" title="Scanner de Refeição" subtitle="Calcule macros com IA" premium={true} />
        <ActionButton onClick={() => onNavigate('shape')} icon="💪" title="Avalie seu físico" subtitle="Análise corporal completa" premium={true} />
        <ActionButton onClick={() => onNavigate('chat')} icon="👤" title="Personal IA" subtitle="Dieta e treino inteligente" premium={true} />
        <ActionButton onClick={() => onNavigate('evolution')} icon="📈" title="Sua Evolução" subtitle="Histórico de progresso" premium={true} />
      </div>

      <h2 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4 ml-1">Ferramentas Gratuitas</h2>
      <div className="grid grid-cols-2 gap-4 mb-12">
        <ActionButton onClick={() => onNavigate('food_manual')} icon="✍️" title="Add Manual" />
        <ActionButton onClick={() => onNavigate('saved_meals')} icon="💾" title="Refeições Salvas" />
        <ActionButton onClick={() => onNavigate('water_calc')} icon="💧" title="Meta de Água" />
        <ActionButton onClick={() => onNavigate('bmi_calc')} icon="📐" title="Calc. IMC" />
        <ActionButton onClick={() => onNavigate('calorie_calc')} icon="🔥" title="Gasto Calórico" />
        <ActionButton onClick={() => onNavigate('calorie_plan')} icon="🎯" title="Minha Meta" />
      </div>

      <h2 className="text-xl font-black mb-6 flex items-center gap-2 tracking-tight text-gray-900 dark:text-white">
        <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
        Refeições de Hoje
      </h2>
      <div className="space-y-4 pb-8">
        {todayLogs.length > 0 ? (
          todayLogs.map(log => (
            <div key={log.id} className="glass-panel p-5 rounded-3xl flex justify-between items-center group hover:border-emerald-500/50 transition-colors">
              <div className="flex-1 min-w-0 pr-3">
                <p className="font-bold text-gray-900 dark:text-white leading-tight truncate text-base">{log.name}</p>
                <p className="text-xs font-bold text-emerald-600 mt-1 truncate">{formatValue(log.protein)}P • {formatValue(log.carbs)}C • {formatValue(log.fat)}G</p>
                <div className="flex gap-4 mt-3">
                   <button onClick={() => setEditingLog(log)} className="text-[10px] font-black text-gray-400 hover:text-emerald-500 uppercase tracking-widest p-1">Editar</button>
                   <button onClick={() => setLogToDelete(log.id)} className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest p-1">Excluir</button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-lg md:text-xl text-gray-900 dark:text-white">{formatValue(log.calories)}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">kcal</p>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel p-10 rounded-[2.5rem] text-center border-dashed border-2 border-gray-300 dark:border-zinc-700">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nenhum registro hoje.</p>
          </div>
        )}
      </div>

      {editingLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
           <div className="bg-white dark:bg-zinc-950 w-full md:max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 border-t-2 md:border border-emerald-500/20 shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 duration-200">
              <div className="mb-6 text-center shrink-0">
                 <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 md:hidden"></div>
                 <h3 className="text-2xl font-black italic tracking-tighter text-gray-900 dark:text-white">Editar Refeição</h3>
              </div>
              <div className="overflow-y-auto flex-1 mb-6 pr-1 scrollbar-hide">
                  <div className="mb-6">
                     <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase mb-2 tracking-widest">Título</label>
                     <input type="text" value={editingLog.name} onChange={e => setEditingLog({...editingLog, name: e.target.value})} className="w-full px-5 py-4 rounded-2xl input-premium outline-none font-bold text-gray-900 dark:text-white" />
                  </div>
                  <div className="space-y-4 mb-4">
                     {editingLog.items.map((item) => (
                        <div key={item.id} className="bg-gray-50 dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 relative group transition-colors focus-within:border-emerald-500">
                           <button onClick={() => handleRemoveItem(item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full text-xs font-black shadow-lg z-10 flex items-center justify-center">×</button>
                           <div className="space-y-3">
                              <input type="text" value={item.name} onChange={e => handleUpdateItem(item.id, { name: e.target.value })} className="w-full bg-transparent border-b border-gray-200 dark:border-zinc-700 py-1 font-bold outline-none focus:border-emerald-500 text-gray-900 dark:text-white text-sm" />
                              <div className="grid grid-cols-2 gap-4">
                                 <div><label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Peso (g)</label><input type="number" step="0.1" value={item.weight} onChange={e => handleUpdateItem(item.id, { weight: parseFloat(e.target.value) })} className="w-full bg-transparent font-mono text-sm outline-none text-emerald-600 dark:text-emerald-500 font-bold border-b border-transparent focus:border-emerald-500" /></div>
                                 <div><label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">kcal</label><input type="number" step="0.1" value={item.calories} onChange={e => handleUpdateItem(item.id, { calories: parseFloat(e.target.value) })} className="w-full bg-transparent font-mono text-sm outline-none text-gray-900 dark:text-white border-b border-transparent focus:border-emerald-500" /></div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Novo Total</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{formatValue(editingLog.calories)} <span className="text-sm text-gray-400">kcal</span></p>
                  </div>
              </div>
              <div className="flex gap-3 shrink-0 pb-4 md:pb-0">
                 <button onClick={() => setEditingLog(null)} className="flex-1 py-4 bg-gray-100 dark:bg-zinc-800 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-colors text-gray-600 dark:text-white">Cancelar</button>
                 <button onClick={() => { onEditLog(editingLog); setEditingLog(null); }} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-colors">Salvar Alterações</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const MacroCard = ({ label, value, unit, fullLabel, goal, color = 'emerald' }: any) => {
  // Check if goal is a valid number (including 0)
  const hasGoal = typeof goal === 'number';
  
  // Color Maps
  const colors: Record<string, string> = {
      emerald: 'border-emerald-500/80 bg-emerald-50 dark:bg-emerald-500/5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 shadow-emerald-500/10',
      blue: 'border-blue-500/80 bg-blue-50 dark:bg-blue-500/5 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 shadow-blue-500/10',
      yellow: 'border-yellow-500/80 bg-yellow-50 dark:bg-yellow-500/5 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-500/20 shadow-yellow-500/10',
  };
  
  const textColors: Record<string, string> = {
      emerald: 'text-emerald-600',
      blue: 'text-blue-600',
      yellow: 'text-yellow-600',
  };

  const ringColor = colors[color] || colors.emerald;
  const textColor = textColors[color] || textColors.emerald;

  return (
    <div className="glass-panel p-4 md:p-5 rounded-3xl flex flex-col items-center justify-center hover:-translate-y-1 transition-transform duration-300 group shadow-premium hover:shadow-premium-hover h-full min-h-[140px]">
      {/* Ring with Glow Effect on Hover */}
      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-[4px] flex items-center justify-center mb-3 transition-all shadow-lg ${ringColor}`}>
        <span className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tighter">{Math.round(value)}</span>
      </div>
      
      {/* Label */}
      <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1 md:hidden text-center whitespace-nowrap">{label}</p>
      <p className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1 hidden md:block">{fullLabel}</p>
      
      {/* Goal Display */}
      {hasGoal ? (
         <div className="flex items-baseline gap-1 mt-1 bg-gray-50 dark:bg-white/5 px-3 py-1 rounded-lg border border-gray-100 dark:border-white/5">
            <span className="text-sm font-black text-gray-900 dark:text-white">{value}</span>
            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">/ {goal}{unit}</span>
         </div>
      ) : (
         <div className="flex items-center gap-1 mt-1">
             <span className="text-sm font-black text-gray-900 dark:text-white">{value}</span>
             <span className={`text-xs font-bold ${textColor}`}>{unit}</span>
         </div>
      )}
    </div>
  );
};

const ActionButton = ({ onClick, icon, title, subtitle, premium }: any) => (
  <button onClick={onClick} className="glass-panel p-5 md:p-6 rounded-[2rem] text-left hover:bg-white/80 dark:hover:bg-zinc-800/80 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group border border-transparent hover:border-emerald-500/30 shadow-premium hover:shadow-premium-hover h-full flex flex-col justify-between">
    <div className="flex justify-between items-start mb-3">
        <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">{icon}</span>
        {premium && <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Pro</span>}
    </div>
    <div>
        <h3 className="font-black text-sm md:text-base leading-tight text-gray-900 dark:text-white mb-0.5">{title}</h3>
        {subtitle && <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-tight truncate">{subtitle}</p>}
    </div>
  </button>
);

export default Dashboard;
