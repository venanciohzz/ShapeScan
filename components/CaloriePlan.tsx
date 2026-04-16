
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface CaloriePlanProps {
  user: User;
  onBack: () => void;
  onUpdateGoal: (newGoal: number, metrics: Partial<User>) => void;
}

type GoalType = 'lose' | 'maintain' | 'gain' | 'recomp';

const CaloriePlan: React.FC<CaloriePlanProps> = ({ user, onBack, onUpdateGoal }) => {
  const [weight, setWeight] = useState(user.weight?.toString() || '');
  const [height, setHeight] = useState(user.height?.toString() || '');
  const [age, setAge] = useState(user.age?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female'>(user.gender || 'male');
  const [activity, setActivity] = useState(user.activityLevel || '1.2');
  const [selectedGoal, setSelectedGoal] = useState<GoalType>(user.goal as GoalType || 'lose');
  
  // Macro States (g/kg)
  const [protRatio, setProtRatio] = useState(2.0);
  const [carbRatio, setCarbRatio] = useState(3.0);
  const [fatRatio, setFatRatio] = useState(0.8);

  const [tdee, setTdee] = useState<number>(0);
  const [targetCalories, setTargetCalories] = useState<number>(0); // Based on Goal
  const [actualCalories, setActualCalories] = useState<number>(0); // Based on Sliders
  const [isSaved, setIsSaved] = useState(false);

  // 1. Calculate TDEE (Maintenance)
  useEffect(() => {
    const w = parseFloat(weight.replace(',', '.'));
    const h = parseFloat(height.replace(',', '.'));
    const a = parseFloat(age.replace(',', '.'));

    if (w > 0 && h > 0 && a > 0) {
      // Mifflin-St Jeor
      let bmr = 10 * w + 6.25 * h - 5 * a;
      bmr = gender === 'male' ? bmr + 5 : bmr - 161;
      const maintenance = Math.round(bmr * parseFloat(activity));
      setTdee(maintenance);
    }
  }, [weight, height, age, gender, activity]);

  // 2. Calculate Target Calories based on selected Goal
  useEffect(() => {
     if (tdee === 0) return;
     let target = tdee;
     switch (selectedGoal) {
         case 'lose': target = tdee - 500; break;
         case 'gain': target = tdee + 300; break;
         case 'recomp': target = tdee - 200; break; // Slight deficit
         case 'maintain': default: target = tdee; break;
     }
     setTargetCalories(target);
  }, [tdee, selectedGoal]);

  // 3. Apply Goal Presets (Auto-move sliders when goal changes)
  const applyGoalPreset = (goal: GoalType) => {
      setSelectedGoal(goal);
      switch (goal) {
          case 'lose': // High Prot, Low Carb, Low Fat
              setProtRatio(2.2);
              setCarbRatio(1.5);
              setFatRatio(0.6);
              break;
          case 'gain': // Mod Prot, High Carb, Mod Fat
              setProtRatio(1.8);
              setCarbRatio(4.5);
              setFatRatio(1.0);
              break;
          case 'recomp': // High Prot, Mod Carb, Mod Fat
              setProtRatio(2.4);
              setCarbRatio(2.5);
              setFatRatio(0.8);
              break;
          case 'maintain': // Balanced
              setProtRatio(2.0);
              setCarbRatio(3.5);
              setFatRatio(1.0);
              break;
      }
      setIsSaved(false);
  };

  // 4. Calculate Actual Calories from Sliders
  useEffect(() => {
    const w = parseFloat(weight.replace(',', '.'));
    if (w > 0) {
        const pCal = (w * protRatio) * 4;
        const cCal = (w * carbRatio) * 4;
        const fCal = (w * fatRatio) * 9;
        setActualCalories(Math.round(pCal + cCal + fCal));
        setIsSaved(false);
    }
  }, [weight, protRatio, carbRatio, fatRatio]);

  const handleSave = () => {
    if (actualCalories > 0) {
      onUpdateGoal(actualCalories, {
        weight: parseFloat(weight.replace(',', '.')),
        height: parseFloat(height.replace(',', '.')),
        age: parseInt(age.replace(',', '.')),
        gender,
        activityLevel: activity,
        goal: selectedGoal,
        dailyProtein: Math.round(parseFloat(weight.replace(',', '.')) * protRatio),
        dailyCarbs: Math.round(parseFloat(weight.replace(',', '.')) * carbRatio),
        dailyFat: Math.round(parseFloat(weight.replace(',', '.')) * fatRatio),
      });
      setIsSaved(true);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const getProtFeedback = (val: number) => {
      if (val < 1.2) return { text: "Baixa / Sedentário", desc: "⚠️ CUIDADO: Abaixo do ideal. Risco de perda muscular.", color: "text-red-500" };
      if (val < 1.6) return { text: "Manutenção", desc: "⚖️ OK para saúde, mas não otimiza estética.", color: "text-yellow-500" };
      if (val <= 2.2) return { text: "Hipertrofia Ideal", desc: "✅ FAIXA DE OURO: Constrói músculo e acelera recuperação.", color: "text-emerald-500" };
      return { text: "Alta / Definição", desc: "🔥 ESTRATÉGICO: Aumenta saciedade em dietas de fome.", color: "text-blue-500" };
  };

  const getCarbFeedback = (val: number) => {
      if (val <= 0.5) return { text: "Keto / Cetogênica", desc: "📉 Queima gordura máxima, mas força cai no início.", color: "text-purple-500" };
      if (val <= 2.0) return { text: "Low Carb", desc: "🔥 Controle de insulina. Ótimo para secar.", color: "text-blue-500" };
      if (val <= 4.0) return { text: "Moderado", desc: "⚡ Equilíbrio. Energia para treinar sem engordar.", color: "text-emerald-500" };
      return { text: "Bulking / Volume", desc: "🚀 Máxima energia e volume muscular. Cuidado com gordura.", color: "text-orange-500" };
  };

  const getFatFeedback = (val: number) => {
      if (val < 0.6) return { text: "Perigo Hormonal", desc: "🚫 PERIGO: Pode derrubar testosterona e libido.", color: "text-red-500" };
      if (val <= 1.0) return { text: "Saudável", desc: "✅ Ideal para saúde hormonal e cardiovascular.", color: "text-emerald-500" };
      return { text: "Alta Energia", desc: "🥑 Útil para bater calorias em bulking ou keto.", color: "text-yellow-500" };
  };

  const wVal = parseFloat(weight.replace(',', '.')) || 70;

  return (
    <div className="max-w-xl mx-auto px-6 py-8 md:pt-14 pb-32 text-black dark:text-white">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-black dark:text-white">
        <span className="text-lg pb-0.5">←</span>
      </button>
      
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-black text-black dark:text-white tracking-tight">Laboratório de Macros</h1>
      </div>
      <p className="text-gray-500 dark:text-zinc-400 font-medium text-sm mb-8 leading-relaxed">
        Defina seu objetivo principal e refine sua estratégia nutricional.
      </p>

      {/* 1. Goal Selector */}
      <div className="mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">1. Qual seu objetivo agora?</h3>
        <div className="grid grid-cols-2 gap-3">
            <GoalButton 
                label="Secar Gordura" 
                sub="Déficit Calórico"
                emoji="🔥"
                active={selectedGoal === 'lose'} 
                onClick={() => applyGoalPreset('lose')} 
            />
            <GoalButton 
                label="Ganhar Massa" 
                sub="Superávit Calórico"
                emoji="💪"
                active={selectedGoal === 'gain'} 
                onClick={() => applyGoalPreset('gain')} 
            />
            <GoalButton 
                label="Recomposição" 
                sub="Trocar Gordura por Músculo"
                emoji="⚖️"
                active={selectedGoal === 'recomp'} 
                onClick={() => applyGoalPreset('recomp')} 
            />
            <GoalButton 
                label="Manter Peso" 
                sub="Manutenção Saudável"
                emoji="⚓"
                active={selectedGoal === 'maintain'} 
                onClick={() => applyGoalPreset('maintain')} 
            />
        </div>
      </div>

      {/* 2. Basic Stats */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800 mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">2. Dados Corporais</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
             <div><label className="text-[9px] font-bold uppercase text-gray-400">Peso (kg)</label><input type="text" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 p-2 rounded-lg font-bold text-gray-900 dark:text-white border-none outline-none focus:ring-1 ring-emerald-500" placeholder="70" /></div>
             <div><label className="text-[9px] font-bold uppercase text-gray-400">Atividade</label>
                <select value={activity} onChange={e => setActivity(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 p-2 rounded-lg font-bold text-gray-900 dark:text-white border-none outline-none text-sm">
                    <option value="1.2">Sedentário</option>
                    <option value="1.375">Leve</option>
                    <option value="1.55">Moderado</option>
                    <option value="1.725">Intenso</option>
                    <option value="1.9">Atleta</option>
                </select>
             </div>
        </div>
        <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl">
             <span className="text-xs font-bold text-gray-500">Gasto Basal (TDEE):</span>
             <span className="text-sm font-black text-gray-900 dark:text-white">{tdee > 0 ? tdee : '...'} kcal</span>
        </div>
      </div>

      {/* 3. Sliders Section */}
      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">3. Ajuste Fino (Macros)</h3>
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* PROTEIN */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border-l-4 border-emerald-500 shadow-lg shadow-emerald-500/5 relative overflow-hidden">
              <div className="flex justify-between items-end mb-4 relative z-10">
                  <div>
                      <h3 className="text-emerald-600 font-black text-sm uppercase tracking-wide">Proteína</h3>
                      <p className={`text-xs font-bold mt-1 transition-colors ${getProtFeedback(protRatio).color}`}>{getProtFeedback(protRatio).text}</p>
                  </div>
                  <div className="text-right">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{protRatio.toFixed(1)}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">g/kg</span>
                  </div>
              </div>
              <input type="range" min="0.8" max="3.5" step="0.1" value={protRatio} onChange={(e) => setProtRatio(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 mb-4 relative z-10" />
              <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20 relative z-10">
                  <p className="text-[10px] text-gray-700 dark:text-zinc-300 font-medium leading-relaxed">
                    <span className="font-bold block mb-0.5 text-emerald-700 dark:text-emerald-400">{Math.round(wVal * protRatio)}g totais ({Math.round((wVal * protRatio)*4)} kcal)</span> 
                    {getProtFeedback(protRatio).desc}
                  </p>
              </div>
          </div>

          {/* CARBS */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border-l-4 border-blue-500 shadow-lg shadow-blue-500/5 relative overflow-hidden">
              <div className="flex justify-between items-end mb-4 relative z-10">
                  <div>
                      <h3 className="text-blue-500 font-black text-sm uppercase tracking-wide">Carboidrato</h3>
                      <p className={`text-xs font-bold mt-1 transition-colors ${getCarbFeedback(carbRatio).color}`}>{getCarbFeedback(carbRatio).text}</p>
                  </div>
                  <div className="text-right">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{carbRatio.toFixed(1)}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">g/kg</span>
                  </div>
              </div>
              <input type="range" min="0.0" max="8.0" step="0.1" value={carbRatio} onChange={(e) => setCarbRatio(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-4 relative z-10" />
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-500/20 relative z-10">
                  <p className="text-[10px] text-gray-700 dark:text-zinc-300 font-medium leading-relaxed">
                    <span className="font-bold block mb-0.5 text-blue-700 dark:text-blue-400">{Math.round(wVal * carbRatio)}g totais ({Math.round((wVal * carbRatio)*4)} kcal)</span> 
                    {getCarbFeedback(carbRatio).desc}
                  </p>
              </div>
          </div>

          {/* FAT */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border-l-4 border-yellow-500 shadow-lg shadow-yellow-500/5 relative overflow-hidden">
              <div className="flex justify-between items-end mb-4 relative z-10">
                  <div>
                      <h3 className="text-yellow-500 font-black text-sm uppercase tracking-wide">Gordura</h3>
                      <p className={`text-xs font-bold mt-1 transition-colors ${getFatFeedback(fatRatio).color}`}>{getFatFeedback(fatRatio).text}</p>
                  </div>
                  <div className="text-right">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{fatRatio.toFixed(1)}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">g/kg</span>
                  </div>
              </div>
              <input type="range" min="0.4" max="2.0" step="0.1" value={fatRatio} onChange={(e) => setFatRatio(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500 mb-4 relative z-10" />
              <div className="bg-yellow-50/50 dark:bg-yellow-900/10 p-3 rounded-xl border border-yellow-100 dark:border-yellow-500/20 relative z-10">
                  <p className="text-[10px] text-gray-700 dark:text-zinc-300 font-medium leading-relaxed">
                    <span className="font-bold block mb-0.5 text-yellow-700 dark:text-yellow-400">{Math.round(wVal * fatRatio)}g totais ({Math.round((wVal * fatRatio)*9)} kcal)</span> 
                    {getFatFeedback(fatRatio).desc}
                  </p>
              </div>
          </div>
      </div>

      {/* Result Sticky Footer */}
      <div className={`fixed bottom-0 left-0 right-0 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] z-50 transition-transform duration-300 ${actualCalories > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-xl mx-auto bg-zinc-900 border-4 border-emerald-500 text-white p-6 rounded-[2rem] shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col gap-4">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Resultado Final</p>
                      <p className="text-3xl font-black">{actualCalories} <span className="text-sm text-gray-400">kcal</span></p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Meta Sugerida</p>
                      <p className="text-xl font-bold text-gray-300">{targetCalories} kcal</p>
                      <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-wide">
                        {selectedGoal === 'lose' && "Secar"}
                        {selectedGoal === 'gain' && "Crescer"}
                        {selectedGoal === 'maintain' && "Manter"}
                        {selectedGoal === 'recomp' && "Recomp"}
                      </p>
                  </div>
              </div>
              
              {!isSaved ? (
                <button onClick={handleSave} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-emerald-500">
                    Aplicar Esta Estratégia
                </button>
              ) : (
                <div className="w-full py-4 bg-emerald-900/50 text-emerald-200 rounded-xl font-black uppercase tracking-widest text-center border border-emerald-500/30">
                    Meta Atualizada! ✅
                </div>
              )}
          </div>
      </div>
      
      {/* Spacer for sticky footer */}
      <div className="h-32"></div>

    </div>
  );
};

const GoalButton = ({ label, sub, emoji, active, onClick }: any) => (
    <button onClick={onClick} className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${active ? 'bg-emerald-500/10 border-emerald-500 shadow-lg' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-emerald-500/30'}`}>
        <div className="relative z-10">
            <span className="text-2xl mb-2 block">{emoji}</span>
            <p className={`font-black text-xs uppercase tracking-tight mb-0.5 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{label}</p>
            <p className="text-[9px] text-gray-500 font-medium leading-tight">{sub}</p>
        </div>
        {active && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>}
    </button>
);

export default CaloriePlan;
