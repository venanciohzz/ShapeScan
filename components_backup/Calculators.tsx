
import React, { useState } from 'react';

export const BMICalculator: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [result, setResult] = useState<{ bmi: number; label: string } | null>(null);

  const calculate = () => {
    // FIX: Comma handling
    const w = parseFloat(weight.replace(',', '.'));
    const h = parseFloat(height.replace(',', '.')) / 100;
    if (w > 0 && h > 0) {
      const bmi = w / (h * h);
      let label = '';
      if (bmi < 18.5) label = 'Abaixo do peso';
      else if (bmi < 25) label = 'Peso normal';
      else if (bmi < 30) label = 'Sobrepeso';
      else label = 'Obesidade';
      setResult({ bmi, label });
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-8 md:pt-14 pb-24 text-black dark:text-white">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-black dark:text-white">
        <span className="text-lg pb-0.5">←</span>
      </button>

      <h1 className="text-3xl font-black mb-8 text-black dark:text-white tracking-tight">Calculadora de IMC</h1>
      <div className="bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] shadow-xl border-2 border-emerald-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 space-y-6">
        <div><label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Seu Peso (kg)</label><input type="text" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 outline-none focus:border-emerald-600 font-bold text-black dark:text-white" placeholder="70" /></div>
        <div><label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Sua Altura (cm)</label><input type="text" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 outline-none focus:border-emerald-600 font-bold text-black dark:text-white" placeholder="175" /></div>
        <button onClick={calculate} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 transition-all uppercase tracking-tight">Calcular Agora</button>
        {result && (
          <div className="mt-10 text-center p-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl animate-in zoom-in duration-500 border-2 border-emerald-100 dark:border-emerald-800 shadow-inner">
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-2 tracking-widest">Resultado</p>
            <p className="text-5xl font-black text-black dark:text-white mb-2">{result.bmi.toFixed(1)}</p>
            <p className="font-black text-emerald-700 dark:text-emerald-500 text-sm">{result.label.toUpperCase()}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const DailyCalorieCalculator: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activity, setActivity] = useState('1.2');
  const [calories, setCalories] = useState<number | null>(null);

  const calculate = () => {
    // FIX: Comma handling
    const w = parseFloat(weight.replace(',', '.'));
    const h = parseFloat(height.replace(',', '.'));
    const a = parseFloat(age.replace(',', '.'));
    if (w > 0 && h > 0 && a > 0) {
      let bmr = 10 * w + 6.25 * h - 5 * a;
      bmr = gender === 'male' ? bmr + 5 : bmr - 161;
      setCalories(Math.round(bmr * parseFloat(activity)));
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-8 md:pt-14 pb-24 text-black dark:text-white">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-black dark:text-white">
        <span className="text-lg pb-0.5">←</span>
      </button>

      <h1 className="text-3xl font-black mb-8 text-black dark:text-white tracking-tight">Gasto Calórico Diário</h1>
      <div className="bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] shadow-xl border-2 border-emerald-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 space-y-6">
        <div className="flex gap-4 p-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl mb-4">
          <button onClick={() => setGender('male')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${gender === 'male' ? 'bg-white dark:bg-zinc-700 shadow-md text-emerald-600' : 'text-black dark:text-zinc-400'}`}>Masculino</button>
          <button onClick={() => setGender('female')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${gender === 'female' ? 'bg-white dark:bg-zinc-700 shadow-md text-emerald-600' : 'text-black dark:text-zinc-400'}`}>Feminino</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Peso (kg)</label><input type="text" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 outline-none focus:border-emerald-600 font-bold text-black dark:text-white" /></div>
          <div><label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Altura (cm)</label><input type="text" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 outline-none focus:border-emerald-600 font-bold text-black dark:text-white" /></div>
        </div>
        <div><label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Idade</label><input type="text" inputMode="decimal" value={age} onChange={e => setAge(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 outline-none focus:border-emerald-600 font-bold text-black dark:text-white" /></div>
        <div><label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Nível de Atividade</label><select value={activity} onChange={e => setActivity(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-emerald-500 outline-none appearance-none bg-white dark:bg-zinc-800 font-bold text-black dark:text-white"><option value="1.2">Sedentário</option><option value="1.375">Leve</option><option value="1.55">Moderado</option><option value="1.725">Ativo</option><option value="1.9">Extremo</option></select></div>
        <button onClick={calculate} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 transition-all uppercase tracking-tight">Calcular Gasto 🔥</button>
        {calories && (
          <div className="mt-10 text-center p-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl animate-in fade-in duration-500 border-2 border-emerald-100 dark:border-emerald-800 shadow-inner">
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-2 tracking-widest">Gasto Estimado</p>
            <p className="text-5xl font-black text-black dark:text-white">{calories}</p>
            <p className="text-xs text-black dark:text-white mt-2 font-bold">CALORIAS POR DIA</p>
          </div>
        )}
      </div>
    </div>
  );
};
