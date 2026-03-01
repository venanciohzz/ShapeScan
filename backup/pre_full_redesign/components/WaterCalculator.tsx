
import React, { useState } from 'react';
import { User } from '../types';

interface WaterCalculatorProps {
  user: User;
  onBack: () => void;
  onUpdateWaterGoal: (newGoal: number) => void;
}

const WaterCalculator: React.FC<WaterCalculatorProps> = ({ user, onBack, onUpdateWaterGoal }) => {
  const [weight, setWeight] = useState(user.weight?.toString() || '');
  const [activity, setActivity] = useState(user.activityLevel || '1.2');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | 'recomp'>(user.goal as any || 'maintain');
  const [calculatedGoal, setCalculatedGoal] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const calculate = () => {
    setIsSaved(false);
    // FIX: Comma handling
    const w = parseFloat(weight.replace(',', '.'));
    if (w > 0) {
      let total = w * 35;
      const activityVal = parseFloat(activity);
      if (activityVal >= 1.9) total += 1000;
      else if (activityVal >= 1.725) total += 750;
      else if (activityVal >= 1.55) total += 500;
      else if (activityVal >= 1.375) total += 250;
      if (goal === 'gain') total += 300;
      setCalculatedGoal(Math.ceil(total / 50) * 50);
    }
  };

  const handleSave = () => {
    if (calculatedGoal) {
      onUpdateWaterGoal(calculatedGoal);
      setIsSaved(true);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-8 md:pt-14 pb-24 text-black dark:text-white">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-black dark:text-white">
        <span className="text-lg pb-0.5">←</span>
      </button>
      
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-black text-black dark:text-white tracking-tight">Hidratação Inteligente</h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-xl border-2 border-cyan-500/30 space-y-6">
        <div><label className="block text-[10px] font-black uppercase tracking-widest mb-2">Peso (kg)</label><input type="text" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-bold text-black dark:text-white" /></div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Atividade</label>
          <div className="relative">
            <select value={activity} onChange={e => setActivity(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-bold text-black dark:text-white appearance-none relative z-10 bg-transparent">
                <option value="1.2">Sedentário</option>
                <option value="1.375">Leve</option>
                <option value="1.55">Moderado</option>
                <option value="1.725">Intenso</option>
                <option value="1.9">Atleta</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-0 pointer-events-none text-gray-400">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
        <button onClick={calculate} className="w-full py-5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest">Calcular Meta</button>

        {calculatedGoal && (
          <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-100 dark:border-zinc-800 animate-in fade-in">
            <div className="bg-cyan-50 dark:bg-cyan-900/10 p-6 rounded-3xl border border-cyan-100 dark:border-cyan-800 text-center mb-6">
               <p className="text-5xl font-black text-cyan-600 dark:text-cyan-400">{calculatedGoal} <span className="text-sm">ml</span></p>
               <p className="text-xs text-gray-500 mt-2">Recomendação Diária</p>
            </div>
            {!isSaved ? <button onClick={handleSave} className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase">Aplicar Meta</button> : <div className="bg-emerald-50 dark:bg-emerald-900/30 p-6 rounded-2xl text-center text-emerald-600 font-black">Meta Aplicada! 🚀</div>}
          </div>
        )}
      </div>
    </div>
  );
};
export default WaterCalculator;
