
import React, { useState } from 'react';
import { User } from '../types';

interface QuizProps {
  onComplete: (metrics: Partial<User>) => void;
}

const Quiz: React.FC<QuizProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [metrics, setMetrics] = useState<Partial<User>>({
    gender: 'male',
    activityLevel: '1.2',
    goal: 'maintain'
  });

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = () => {
    onComplete(metrics);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center py-10 px-6 overflow-y-auto scrollbar-hide">
      <div className="glass-panel w-full max-w-md p-6 md:p-10 rounded-[2.5rem] shadow-2xl relative border border-white/20 my-auto">
        
        {/* Progress Bar */}
        <div className="mb-8 flex justify-between items-center">
           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Passo {step} de 4</p>
           <div className="flex gap-1.5">
             {[1,2,3,4].map(s => (
               <div key={s} className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${s <= step ? 'bg-emerald-500' : 'bg-black/10 dark:bg-white/10'}`} />
             ))}
           </div>
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-3xl font-black mb-2 text-gray-900 dark:text-white leading-tight tracking-tight">Gênero e Idade</h2>
            <p className="text-gray-500 dark:text-zinc-400 mb-8 font-medium text-sm">Para calcular seu metabolismo basal.</p>
            
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setMetrics({...metrics, gender: 'male'})}
                className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${metrics.gender === 'male' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-gray-200 dark:border-transparent bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-black/10'}`}
              >Masculino</button>
              <button 
                onClick={() => setMetrics({...metrics, gender: 'female'})}
                className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${metrics.gender === 'female' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-gray-200 dark:border-transparent bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-black/10'}`}
              >Feminino</button>
            </div>
            
            <div className="mb-8">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Idade</label>
              <input 
                type="number" 
                value={metrics.age || ''} 
                onChange={e => setMetrics({...metrics, age: parseInt(e.target.value)})}
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-black/20 border-2 border-gray-200 dark:border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all font-bold text-gray-900 dark:text-white"
                placeholder="Ex: 25"
              />
            </div>
            <button onClick={nextStep} disabled={!metrics.age} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 hover:-translate-y-1 transition-all disabled:opacity-50">Próximo</button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-3xl font-black mb-2 text-gray-900 dark:text-white leading-tight tracking-tight">Medidas Atuais</h2>
            <p className="text-gray-500 dark:text-zinc-400 mb-8 font-medium text-sm">Seu ponto de partida.</p>
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Peso (kg)</label>
                <input 
                  type="number" 
                  value={metrics.weight || ''} 
                  onChange={e => setMetrics({...metrics, weight: parseFloat(e.target.value)})}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-black/20 border-2 border-gray-200 dark:border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all font-bold text-gray-900 dark:text-white"
                  placeholder="Ex: 80"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Altura (cm)</label>
                <input 
                  type="number" 
                  value={metrics.height || ''} 
                  onChange={e => setMetrics({...metrics, height: parseFloat(e.target.value)})}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-black/20 border-2 border-gray-200 dark:border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all font-bold text-gray-900 dark:text-white"
                  placeholder="Ex: 180"
                />
              </div>
            </div>
            <div className="flex gap-4">
               <button onClick={prevStep} className="flex-1 py-5 bg-transparent border-2 border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-black/5">Voltar</button>
               <button onClick={nextStep} disabled={!metrics.weight || !metrics.height} className="flex-[2] bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-500">Próximo</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-3xl font-black mb-2 text-gray-900 dark:text-white leading-tight tracking-tight">Objetivo Principal</h2>
            <p className="text-gray-500 dark:text-zinc-400 mb-8 font-medium text-sm">Definiremos seu plano com base nisso.</p>
            <div className="space-y-3 mb-8">
              <GoalOption 
                label="Emagrecer" 
                desc="Queima de gordura" 
                active={metrics.goal === 'lose'} 
                onClick={() => setMetrics({...metrics, goal: 'lose'})} 
              />
              <GoalOption 
                label="Manter Peso" 
                desc="Saúde e manutenção" 
                active={metrics.goal === 'maintain'} 
                onClick={() => setMetrics({...metrics, goal: 'maintain'})} 
              />
              <GoalOption 
                label="Ganhar Massa" 
                desc="Hipertrofia muscular" 
                active={metrics.goal === 'gain'} 
                onClick={() => setMetrics({...metrics, goal: 'gain'})} 
              />
            </div>
            <div className="flex gap-4">
               <button onClick={prevStep} className="flex-1 py-5 bg-transparent border-2 border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-black/5">Voltar</button>
               <button onClick={nextStep} className="flex-[2] bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-500">Próximo</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-3xl font-black mb-2 text-gray-900 dark:text-white leading-tight tracking-tight">Nível de Atividade</h2>
            <p className="text-gray-500 dark:text-zinc-400 mb-6 font-medium text-sm">Seja sincero para o cálculo correto.</p>
            <div className="space-y-2.5 mb-8">
               <ActivityOption label="Sedentário" desc="Pouco ou nenhum exercício" val="1.2" active={metrics.activityLevel === '1.2'} onClick={(v) => setMetrics({...metrics, activityLevel: v})} />
               <ActivityOption label="Leve" desc="1-3 dias de treino/semana" val="1.375" active={metrics.activityLevel === '1.375'} onClick={(v) => setMetrics({...metrics, activityLevel: v})} />
               <ActivityOption label="Moderado" desc="3-5 dias de treino/semana" val="1.55" active={metrics.activityLevel === '1.55'} onClick={(v) => setMetrics({...metrics, activityLevel: v})} />
               <ActivityOption label="Intenso" desc="6-7 dias de treino/semana" val="1.725" active={metrics.activityLevel === '1.725'} onClick={(v) => setMetrics({...metrics, activityLevel: v})} />
               <ActivityOption label="Atleta" desc="Treino pesado/Bi-diário" val="1.9" active={metrics.activityLevel === '1.9'} onClick={(v) => setMetrics({...metrics, activityLevel: v})} />
            </div>
            <div className="flex gap-4">
               <button onClick={prevStep} className="flex-1 py-5 bg-transparent border-2 border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-black/5">Voltar</button>
               <button onClick={handleSubmit} className="flex-[2] bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-500">Ver Plano</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const GoalOption = ({ label, desc, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${active ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-gray-200 dark:border-transparent bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-black/10'}`}
  >
    <div className="flex justify-between items-center">
        <div>
            <p className={`font-black uppercase tracking-tight ${active ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>{label}</p>
            <p className={`text-xs font-medium ${active ? 'text-emerald-600/70' : 'text-gray-500 dark:text-zinc-400'}`}>{desc}</p>
        </div>
        {active && <span className="text-emerald-500 font-bold">✓</span>}
    </div>
  </button>
);

const ActivityOption = ({ label, desc, val, active, onClick }: any) => (
  <button 
    onClick={() => onClick(val)}
    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${active ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-gray-200 dark:border-transparent bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-black/10'}`}
  >
    <div className="flex justify-between items-center">
      <div>
        <p className={`font-black text-xs ${active ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>{label}</p>
        <p className="text-[9px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wide">{desc}</p>
      </div>
      {active && <span className="text-emerald-500 font-bold text-xs">✓</span>}
    </div>
  </button>
);

export default Quiz;
