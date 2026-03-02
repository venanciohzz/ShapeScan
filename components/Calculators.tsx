import React, { useState } from 'react';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { ArrowLeft, Scale, Activity, Flame, ChevronDown, CheckCircle2, User, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const BMICalculator: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [result, setResult] = useState<{ bmi: number; label: string } | null>(null);

  const calculate = () => {
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
    <PremiumBackground className="flex flex-col p-6 overflow-y-auto" dim={true} intensity={1.0}>
      <div className="w-full max-w-lg mx-auto py-12 md:py-20 relative z-10">
        <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 mb-10 text-white group">
          <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
        </button>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif-premium font-bold text-white tracking-tight mb-3">
            <LetterPuller text="Índice IMC" />
          </h1>
          <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] opacity-80">
            Análise de Massa Corporal
          </p>
        </div>

        <div className="bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

          <div className="space-y-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">Peso Corporal (kg)</label>
              <input type="text" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all font-bold text-xl text-white placeholder:text-zinc-600" placeholder="00.0" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">Altura Corporal (cm)</label>
              <input type="text" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all font-bold text-xl text-white placeholder:text-zinc-600" placeholder="175" />
            </div>
            <button onClick={calculate} className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">Processar Matriz</button>

            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 p-8 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                  <Scale className="w-8 h-8 text-emerald-500 mx-auto mb-4 opacity-70" />
                  <p className="text-[10px] font-black text-emerald-500/70 uppercase mb-2 tracking-[0.3em]">Score Identificado</p>
                  <p className="text-6xl font-serif-premium font-bold text-white mb-2">{result.bmi.toFixed(1)}</p>
                  <p className="font-black text-emerald-500 text-xs uppercase tracking-[0.4em]">{result.label}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PremiumBackground>
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
    <PremiumBackground className="flex flex-col p-6 overflow-y-auto" dim={true} intensity={1.0}>
      <div className="w-full max-w-lg mx-auto py-12 md:py-20 relative z-10">
        <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 mb-10 text-white group">
          <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
        </button>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif-premium font-bold text-white tracking-tight mb-3">
            <LetterPuller text="Bio Termo" />
          </h1>
          <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] opacity-80">
            Gasto Calórico Estimado
          </p>
        </div>

        <div className="bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

          <div className="space-y-8 relative z-10">
            <div className="flex gap-4 p-1.5 bg-white/[0.03] border border-white/5 rounded-2xl">
              <button onClick={() => setGender('male')} className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${gender === 'male' ? 'bg-white text-zinc-950 shadow-xl scale-105' : 'text-zinc-400 hover:text-white drop-shadow-sm'}`}>MASC</button>
              <button onClick={() => setGender('female')} className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${gender === 'female' ? 'bg-white text-zinc-950 shadow-xl scale-105' : 'text-zinc-400 hover:text-white drop-shadow-sm'}`}>FEM</button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">Peso (kg)</label>
                <input type="text" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-xl text-white placeholder:text-zinc-600" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">Altura (cm)</label>
                <input type="text" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-xl text-white placeholder:text-zinc-600" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">Idade</label>
              <input type="text" inputMode="decimal" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-xl text-white placeholder:text-zinc-600" />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">Nível de Atividade</label>
              <div className="relative group">
                <select value={activity} onChange={e => setActivity(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-lg text-white appearance-none cursor-pointer">
                  <option value="1.2" className="bg-zinc-900">Sedentário</option>
                  <option value="1.375" className="bg-zinc-900">Leve</option>
                  <option value="1.55" className="bg-zinc-900">Moderado</option>
                  <option value="1.725" className="bg-zinc-900">Ativo</option>
                  <option value="1.9" className="bg-zinc-900">Extremo</option>
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>

            <button onClick={calculate} className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">Calcular TMB</button>

            <AnimatePresence>
              {calories && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-10 p-8 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                  <Flame className="w-8 h-8 text-emerald-500 mx-auto mb-4 opacity-70" />
                  <p className="text-[10px] font-black text-emerald-500/70 uppercase mb-2 tracking-[0.3em]">Manutenção Estimada</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl font-serif-premium font-bold text-white tracking-tighter">{calories}</span>
                    <span className="text-sm font-bold text-emerald-500 uppercase">kcal/dia</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PremiumBackground>
  );
};
