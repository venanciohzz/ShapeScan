import React, { useState } from 'react';
import { User } from '../types';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { ArrowLeft, Droplets, Activity, CheckCircle2, Save, ChevronDown, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <PremiumBackground className="flex flex-col p-6 overflow-y-auto" dim={true} intensity={1.0}>
      <div className="w-full max-w-lg mx-auto py-12 md:py-20 relative z-10">

        {/* Navigation */}
        <button
          onClick={onBack}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 mb-10 text-white group"
        >
          <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
        </button>

        {/* Title Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif-premium font-bold text-white tracking-tight mb-3">
            <LetterPuller text="Hidratação" />
          </h1>
          <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] opacity-80">
            Inteligência Metabólica
          </p>
        </div>

        {/* Liquid Glass Card */}
        <div className="bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none origin-center" />

          <div className="space-y-8 relative z-10">
            {/* Weight Input */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">
                <Activity className="w-3 h-3 text-emerald-500" /> Peso Corporal
              </label>
              <div className="relative group">
                <input
                  type="text"
                  inputMode="decimal"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="00.0"
                  className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all font-bold text-xl text-white placeholder:text-zinc-700"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-xs uppercase tracking-widest drop-shadow-sm">kg</span>
              </div>
            </div>

            {/* Activity Level Selector */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">
                <Droplets className="w-3 h-3 text-emerald-500" /> Nível de Desgaste
              </label>
              <div className="relative group">
                <select
                  value={activity}
                  onChange={e => setActivity(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all font-bold text-lg text-white appearance-none cursor-pointer"
                >
                  <option value="1.2" className="bg-zinc-900">Sedentário (-250ml)</option>
                  <option value="1.375" className="bg-zinc-900">Leve (+0ml)</option>
                  <option value="1.55" className="bg-zinc-900">Moderado (+500ml)</option>
                  <option value="1.725" className="bg-zinc-900">Intenso (+750ml)</option>
                  <option value="1.9" className="bg-zinc-900">Atleta (+1L)</option>
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculate}
              className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
            >
              Consultar Matriz de Hidratação
            </button>

            {/* Result Area */}
            <AnimatePresence>
              {calculatedGoal && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-8 mt-4 border-t border-white/5"
                >
                  <div className="bg-emerald-500/10 p-8 rounded-[2.5rem] border border-emerald-500/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                    <Waves className="w-8 h-8 text-emerald-500 mx-auto mb-4 opacity-70 animate-bounce" />

                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.4em]">Protocolo Diário</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-serif-premium font-bold text-white">{calculatedGoal}</span>
                        <span className="text-xl font-bold text-emerald-500 uppercase tracking-tighter">ml</span>
                      </div>
                    </div>

                    {!isSaved ? (
                      <button
                        onClick={handleSave}
                        className="mt-8 flex items-center justify-center gap-3 w-full py-5 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_15px_30px_rgba(16,185,129,0.2)]"
                      >
                        <Save className="w-4 h-4" /> Sincronizar com Diário
                      </button>
                    ) : (
                      <div className="mt-8 flex items-center justify-center gap-3 w-full py-5 bg-zinc-950/50 text-emerald-500 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" /> Sincronizado
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.5em] mt-10 opacity-50 px-6">
          ShapeScan Professional Matrix System
        </p>
      </div>
    </PremiumBackground>
  );
};

export default WaterCalculator;
