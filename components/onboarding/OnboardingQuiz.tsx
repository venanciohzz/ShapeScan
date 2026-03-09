
import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import OnboardingLayout from './OnboardingLayout';
import PremiumPicker from './PremiumPicker';
import LetterPuller from '../ui/LetterPuller';

interface OnboardingQuizProps {
    onComplete: (metrics: Partial<User>) => void;
    isLoading?: boolean;
}

const OnboardingQuiz: React.FC<OnboardingQuizProps> = ({ onComplete, isLoading = false }) => {
    const [step, setStep] = useState(1);
    const totalSteps = 12;

    const [data, setData] = useState({
        gender: null as 'male' | 'female' | null,
        frequency: null as string | null,
        height: 175,
        weight: 75,
        birthDay: 1,
        birthMonth: 1,
        birthYear: 2000,
        goal: null as User['goal'] | null,
        targetWeight: 75,
        velocity: null as number | null,
        impediments: [] as string[],
        conquests: [] as string[],
        knowsMacros: null as boolean | null
    });

    // Auto-scroll to top on step change
    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const next = () => setStep(s => Math.min(s + 1, totalSteps));
    const prev = () => setStep(s => Math.max(s - 1, 1));

    // Options
    const heightOptions = useMemo(() => Array.from({ length: 71 }, (_, i) => 140 + i), []);
    const weightOptions = useMemo(() => Array.from({ length: 161 }, (_, i) => 40 + i), []);
    const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthNums = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    const monthLabel = (m: number) => months[m - 1] ?? '';
    const years = useMemo(() => Array.from({ length: 100 }, (_, i) => 2010 - i), []);

    const calculateAge = () => {
        const today = new Date();
        let age = today.getFullYear() - data.birthYear;
        const m = today.getMonth() - (data.birthMonth - 1);
        if (m < 0 || (m === 0 && today.getDate() < data.birthDay)) age--;
        return age;
    };

    const handleFinish = () => {
        const metrics: Partial<User> = {
            gender: data.gender || 'male',
            height: data.height,
            weight: data.weight,
            goal: data.goal || 'maintain',
            age: calculateAge(),
            activityLevel: data.frequency === '0-2' ? '1.2' : data.frequency === '3-5' ? '1.55' : '1.725',
            velocity: data.velocity,
            impediments: data.impediments,
            conquests: data.conquests,
            targetWeight: data.targetWeight
        };
        onComplete(metrics);
    };

    // Helper validation for "Continue" button
    const canContinue = () => {
        if (step === 1) return data.gender !== null;
        if (step === 2) return data.frequency !== null;
        if (step === 5) return data.goal !== null;
        if (step === 6) {
            if (data.goal === 'lose') return data.targetWeight < data.weight;
            if (data.goal === 'gain') return data.targetWeight > data.weight;
            if (data.goal === 'maintain') return data.targetWeight === data.weight;
            return true;
        }
        if (step === 8) return data.velocity !== null;
        if (step === 9) return data.impediments.length > 0;
        if (step === 10) return data.conquests.length > 0;
        if (step === 12) return data.knowsMacros !== null;
        return true;
    };

    const compatibilityScore = useMemo(() => Math.floor(Math.random() * (97 - 90 + 1)) + 90, []);

    return (
        <OnboardingLayout progress={step / totalSteps} onBack={prev} showBack={step > 1}>

            {/* STEP 1: GENDER */}
            {step === 1 && (
                <div className="space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Qual seu gênero?" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">Análise metabólica personalizada</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <PremiumCard
                            title="Masculino"
                            subtitle="Otimizar performance e massa"
                            icon="♂️"
                            active={data.gender === 'male'}
                            onClick={() => setData({ ...data, gender: 'male' })}
                        />
                        <PremiumCard
                            title="Feminino"
                            subtitle="Equilíbrio hormonal e definição"
                            icon="♀️"
                            active={data.gender === 'female'}
                            onClick={() => setData({ ...data, gender: 'female' })}
                        />
                    </div>
                </div>
            )}

            {/* STEP 2: FREQUENCY */}
            {step === 2 && (
                <div className="space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Frequência de treino?" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">Seja sincero com sua rotina</p>
                    </div>
                    <div className="space-y-4">
                        {['0-2', '3-5', '6 ou mais'].map(opt => (
                            <SelectionButton
                                key={opt}
                                label={`${opt} treinos por semana`}
                                active={data.frequency === opt}
                                onClick={() => setData({ ...data, frequency: opt })}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 3: MEASUREMENTS */}
            {step === 3 && (
                <div className="space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Suas medidas" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">Seu ponto de partida</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 text-center">Altura (cm)</p>
                            <PremiumPicker options={heightOptions} value={data.height} unit="cm" onChange={(v) => setData({ ...data, height: v as number })} />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 text-center">Peso (kg)</p>
                            <PremiumPicker options={weightOptions} value={data.weight} unit="kg" onChange={(v) => setData({ ...data, weight: v as number })} />
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4: BIRTH DATE */}
            {step === 4 && (
                <div className="space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Data de Nascimento" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">Essencial para taxas metabólicas</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 text-center">Dia</p>
                            <PremiumPicker
                                options={days}
                                value={data.birthDay}
                                onChange={(v) => setData({ ...data, birthDay: v as number })}
                            />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 text-center">Mês</p>
                            <PremiumPicker
                                options={monthNums}
                                value={data.birthMonth}
                                formatOption={(v) => monthLabel(v as number)}
                                onChange={(v) => setData({ ...data, birthMonth: v as number })}
                            />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 text-center">Ano</p>
                            <PremiumPicker
                                options={years}
                                value={data.birthYear}
                                onChange={(v) => setData({ ...data, birthYear: v as number })}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 5: GOAL */}
            {step === 5 && (
                <div className="space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Qual seu objetivo?" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">O plano será moldado aqui</p>
                    </div>
                    <div className="space-y-4">
                        <PremiumCard title="Perder gordura" icon="🔥" active={data.goal === 'lose'} onClick={() => setData({ ...data, goal: 'lose' })} />
                        <PremiumCard title="Manter peso" icon="⚖️" active={data.goal === 'maintain'} onClick={() => setData({ ...data, goal: 'maintain' })} />
                        <PremiumCard title="Recomposição" icon="🧬" active={data.goal === 'recomp'} onClick={() => setData({ ...data, goal: 'recomp' })} />
                        <PremiumCard title="Ganhar massa" icon="💪" active={data.goal === 'gain'} onClick={() => setData({ ...data, goal: 'gain' })} />
                    </div>
                </div>
            )}

            {/* STEP 6: TARGET WEIGHT */}
            {step === 6 && (
                <div className="space-y-10">
                    <div className="text-center space-y-6 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Meta de Peso" />
                        </h2>
                        <div className="mt-6 flex items-center justify-center gap-10 bg-white/5 py-8 px-10 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-zinc-400 drop-shadow-sm uppercase tracking-widest mb-1">Atual</p>
                                <p className="text-3xl font-black text-white">{data.weight}kg</p>
                            </div>
                            <div className="text-emerald-500 font-black text-3xl animate-pulse">→</div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-zinc-400 drop-shadow-sm uppercase tracking-widest mb-1">Meta</p>
                                <p className="text-4xl font-black text-white">{data.targetWeight}kg</p>
                            </div>
                        </div>
                        <p className={`mt-4 font-black transition-all duration-500 ${(data.goal === 'lose' && data.targetWeight >= data.weight) ||
                            (data.goal === 'gain' && data.targetWeight <= data.weight)
                            ? 'text-amber-500 animate-pulse'
                            : (data.targetWeight < data.weight ? 'text-red-500' : data.targetWeight > data.weight ? 'text-emerald-500' : 'text-gray-400')
                            }`}>
                            {(data.goal === 'lose' && data.targetWeight >= data.weight)
                                ? '⚠️ Meta deve ser menor que o peso atual'
                                : (data.goal === 'gain' && data.targetWeight <= data.weight)
                                    ? '⚠️ Meta deve ser maior que o peso atual'
                                    : `${data.targetWeight - data.weight > 0 ? '+' : ''}${(data.targetWeight - data.weight).toFixed(1)}kg de variação`}
                        </p>
                    </div>
                    <PremiumPicker options={weightOptions} value={data.targetWeight} unit="kg" onChange={(v) => setData({ ...data, targetWeight: v as number })} />
                </div>
            )}

            {/* STEP 7: MOTIVATIONAL */}
            {step === 7 && (
                <div className="space-y-10 py-4">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                        <span className="text-4xl">🎯</span>
                    </div>
                    <div className="text-center space-y-8">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Meta realista" />
                        </h2>
                        <p className="text-zinc-400 text-xl font-medium leading-relaxed italic max-w-sm mx-auto opacity-80">
                            "{data.goal === 'lose' ? 'Perder peso é o primeiro passo para sua melhor versão física.' : 'Ganhar massa magra transformará sua composição e disposição.'}"
                        </p>
                    </div>
                </div>
            )}

            {/* STEP 8: VELOCITY */}
            {step === 8 && (
                <div className="space-y-12">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Velocidade" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">Qual seu compromisso semanal?</p>
                    </div>

                    <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl relative overflow-hidden group shadow-2xl">
                        {/* Fixed Emotes with Pop Animation */}
                        <div className="flex justify-around items-end mb-8 px-4 h-24">
                            {[
                                { icon: '🐢', label: 'Estratégico', min: 0, max: 0.4 },
                                { icon: '🐇', label: 'Equilibrado', min: 0.41, max: 0.8 },
                                { icon: '🐆', label: 'Acelerado', min: 0.81, max: 2.0 }
                            ].map((item) => {
                                const isActive = data.velocity! >= item.min && data.velocity! <= item.max;
                                return (
                                    <div key={item.icon} className="flex flex-col items-center transition-all duration-500">
                                        <div className={`text-6xl mb-2 transition-all duration-500 transform ${isActive ? 'scale-150 -translate-y-4 filter drop-shadow-[0_10px_20px_rgba(16,185,129,0.2)]' : 'scale-75 opacity-10 grayscale'}`}>
                                            {item.icon}
                                        </div>
                                        <p className={`text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${isActive ? 'text-emerald-500' : 'opacity-0'}`}>
                                            {item.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Numerical Value Display */}
                        <div className="text-center mb-8">
                            <div className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                                {data.goal === 'lose' ? '-' : data.goal === 'gain' ? '+' : ''}{data.velocity} <span className="text-xl font-bold text-emerald-600 dark:text-emerald-500">kg/sem</span>
                            </div>
                            {data.velocity && data.velocity > 0 && Math.abs(data.weight - data.targetWeight) > 0 && (
                                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mt-2 animate-pulse">
                                    Meta em aproximadamente {Math.ceil(Math.abs(data.weight - data.targetWeight) / data.velocity)} semanas
                                </p>
                            )}
                        </div>

                        {/* Custom Styled Slider */}
                        <div className="px-6">
                            <input
                                type="range"
                                min="0.25"
                                max={data.goal === 'lose' ? "2.0" : "1.5"}
                                step="0.25"
                                value={data.velocity || 0.5}
                                onChange={(e) => setData({ ...data, velocity: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500 transition-all hover:accent-emerald-400"
                            />
                            <div className="flex justify-between mt-6 text-[10px] font-black text-zinc-400 drop-shadow-sm uppercase tracking-widest">
                                <span>Equilibrado</span>
                                <span>Intenso</span>
                            </div>
                        </div>

                        {/* Warning/Recommendation */}
                        {data.velocity! > 1.0 ? (
                            <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center animate-pulse">
                                <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest leading-relaxed">
                                    ⚠️ Ritmo intenso requer disciplina total e acompanhamento rigoroso.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">
                                    ✅ Ritmo recomendado para resultados sustentáveis.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STEP 9: IMPEDIMENTS */}
            {step === 9 && (
                <div className="space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Obstáculos" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">O que te impede hoje?</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                        {[
                            "Falta de consistência",
                            "Hábitos alimentares ruins",
                            "Falta de conhecimento",
                            "Falta de motivação",
                            "Rotina corrida",
                            "Dificuldade em contar macros"
                        ].map(opt => (
                            <CheckOption
                                key={opt}
                                label={opt}
                                active={data.impediments.includes(opt)}
                                onClick={() => {
                                    const val = data.impediments.includes(opt)
                                        ? data.impediments.filter(i => i !== opt)
                                        : [...data.impediments, opt];
                                    setData({ ...data, impediments: val });
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 10: CONQUESTS */}
            {step === 10 && (
                <div className="space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Conquistas" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">Visualize sua vitória</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                        {[
                            "Vida mais saudável",
                            "Mais energia e humor",
                            "Autoestima renovada",
                            "Ter mais confiança",
                            "Performance física elite",
                            "Corpo forte e definido"
                        ].map(opt => (
                            <CheckOption
                                key={opt}
                                label={opt}
                                active={data.conquests.includes(opt)}
                                onClick={() => {
                                    const val = data.conquests.includes(opt)
                                        ? data.conquests.filter(i => i !== opt)
                                        : [...data.conquests, opt];
                                    setData({ ...data, conquests: val });
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 11: FINAL TRANSITION */}
            {step === 11 && (
                <div className="space-y-12 text-center">
                    <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                        <LetterPuller text="Plano traçado" />
                    </h2>

                    <div className="relative h-60 bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 p-8 flex items-center justify-center overflow-hidden backdrop-blur-md">
                        <svg className="w-full h-full opacity-30" viewBox="0 0 400 200">
                            <path d="M0,150 Q100,100 200,80 T400,20" fill="none" stroke="#10b981" strokeWidth="6" className="animate-draw" />
                            <circle cx="400" cy="20" r="8" fill="#10b981" />
                            <path d="M0,200 L0,150 Q100,100 200,80 T400,20 L400,200 Z" fill="url(#grad)" opacity="0.2" />
                            <defs>
                                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
                            <span className="text-6xl font-black text-gray-900 dark:text-white">{compatibilityScore}%</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Compatibilidade elite</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-xl font-bold text-gray-700 dark:text-zinc-300">
                            Você tem o potencial necessário para atingir seus objetivos com consistência.
                        </p>
                        <p className="text-emerald-600 font-black uppercase tracking-[0.2em] text-xs">Sincronização concluída.</p>
                    </div>
                </div>
            )}

            {/* STEP 12: MACROS EDUCATIONAL */}
            {step === 12 && (
                <div className="space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold text-white leading-tight">
                            <LetterPuller text="O que são Macros?" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium leading-relaxed">
                            Proteínas, Carboidratos e Gorduras são o combustível do seu corpo. <br />
                            Equilibrá-los é o segredo para ter resultados reais sem passar fome.
                        </p>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl text-center mb-8">
                        <p className="text-zinc-300 font-medium">Você já ouviu falar ou sabe como contar macros?</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <SelectionButton label="Sim, entendo" active={data.knowsMacros === true} onClick={() => setData({ ...data, knowsMacros: true })} />
                        <SelectionButton label="Não, sou iniciante" active={data.knowsMacros === false} onClick={() => setData({ ...data, knowsMacros: false })} />
                    </div>

                    <div className="min-h-[140px] flex items-center justify-center">
                        {data.knowsMacros !== null && (
                            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl animate-in slide-in-from-top-4 duration-500 text-center">
                                <p className="text-gray-600 dark:text-zinc-400 font-bold leading-relaxed">
                                    {data.knowsMacros
                                        ? "Show! Nossa IA vai facilitar sua vida, calculando tudo automaticamente através das fotos."
                                        : "Fica tranquilo! A IA cuida da parte técnica. Você só precisa seguir as metas que o app vai te dar."
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FIXED FOOTER NAVIGATION */}
            <div className="mt-12">
                <button
                    onClick={step === totalSteps ? handleFinish : next}
                    disabled={isLoading || !canContinue()}
                    className="w-full bg-white text-zinc-950 py-6 rounded-[2rem] font-bold text-lg shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                    {isLoading ? (
                        <div className="w-6 h-6 border-4 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>{step === totalSteps ? 'Finalizar Análise' : (step === 11 ? 'Desbloquear meu plano' : 'Continuar')}</span>
                            <span className="text-xl">→</span>
                        </>
                    )}
                </button>
            </div>

        </OnboardingLayout>
    );
};

// Sub-components - Site Themed (Emerald/Zinc)
const PremiumCard = ({ title, subtitle, icon, active, onClick }: { title: string, subtitle?: string, icon: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full p-8 rounded-[2.5rem] border transition-all duration-500 flex items-center gap-8 group active:scale-[0.98] relative overflow-hidden ${active ? 'bg-white border-white shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)]' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'}`}
    >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl transition-all duration-500 ${active ? 'bg-zinc-950/5 scale-110' : 'bg-white/5'}`}>
            {icon}
        </div>
        <div className="text-left">
            <p className={`font-serif-premium font-bold text-2xl tracking-tight transition-colors duration-500 ${active ? 'text-zinc-950' : 'text-white'}`}>{title}</p>
            {subtitle && <p className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${active ? 'text-zinc-950/60' : 'text-zinc-500'}`}>{subtitle}</p>}
        </div>
        <div className={`ml-auto transition-all duration-500 ${active ? 'translate-x-0 opacity-100 text-zinc-950' : 'translate-x-4 opacity-0'}`}>
            <span className="text-2xl">→</span>
        </div>
    </button>
);

const SelectionButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full p-8 rounded-[2.5rem] border font-serif-premium font-bold text-xl transition-all duration-500 text-left flex justify-between items-center active:scale-[0.98] ${active ? 'bg-white text-zinc-950 border-white shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)]' : 'bg-white/[0.03] text-zinc-400 border-white/10 hover:text-white hover:bg-white/[0.07]'}`}
    >
        {label}
        {active && <span className="text-2xl">✓</span>}
    </button>
);

const CheckOption = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full p-6 rounded-[2rem] border font-bold text-left transition-all duration-500 flex items-center gap-6 active:scale-[0.98] ${active ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/[0.03] border-white/10 text-zinc-400 drop-shadow-sm hover:bg-white/[0.07] hover:text-white'}`}
    >
        <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${active ? 'bg-emerald-500 border-emerald-500 rotate-[360deg]' : 'border-white/10'}`}>
            {active && <span className="text-white text-sm">✓</span>}
        </div>
        <span className="text-lg">{label}</span>
    </button>
);

export default OnboardingQuiz;
