
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
    const totalSteps = 5;

    const [data, setData] = useState({
        gender: null as 'male' | 'female' | null,
        height: 175,
        weight: 75,
        birthYear: 2000,
        goal: null as User['goal'] | null,
        frequency: null as string | null,
    });

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const next = () => setStep(s => Math.min(s + 1, totalSteps));
    const prev = () => setStep(s => Math.max(s - 1, 1));

    const heightOptions = useMemo(() => Array.from({ length: 71 }, (_, i) => 140 + i), []);
    const weightOptions = useMemo(() => Array.from({ length: 161 }, (_, i) => 40 + i), []);
    const years = useMemo(() => Array.from({ length: 80 }, (_, i) => 2010 - i), []);

    const calculateAge = () => {
        const today = new Date();
        return today.getFullYear() - data.birthYear;
    };

    const handleFinish = () => {
        const metrics: Partial<User> = {
            gender: data.gender || 'male',
            height: data.height,
            weight: data.weight,
            goal: data.goal || 'maintain',
            age: calculateAge(),
            activityLevel: data.frequency === '0-2' ? '1.2' : data.frequency === '6 ou mais' ? '1.725' : '1.55',
        };
        localStorage.setItem('shapescan_quiz_data', JSON.stringify({ ...metrics, frequency: data.frequency }));
        onComplete(metrics);
    };

    const canContinue = () => {
        if (step === 1) return data.gender !== null;
        if (step === 4) return data.goal !== null;
        if (step === 5) return data.frequency !== null;
        return true;
    };

    return (
        <OnboardingLayout progress={step / totalSteps} onBack={prev} showBack={step > 1}>
            <div className="absolute top-8 right-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest z-50">
                Passo {step} <span className="text-zinc-700">/ {totalSteps}</span>
            </div>

            {/* STEP 1: GENDER */}
            {step === 1 && (
                <div className="space-y-6 md:space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-3xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight text-balance">
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

            {/* STEP 2: MEASUREMENTS */}
            {step === 2 && (
                <div className="space-y-6 md:space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-3xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight text-balance">
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

            {/* STEP 3: BIRTH YEAR */}
            {step === 3 && (
                <div className="space-y-6 md:space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-4xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight">
                            <LetterPuller text="Ano de Nascimento" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">Essencial para taxas metabólicas</p>
                    </div>
                    <PremiumPicker
                        options={years}
                        value={data.birthYear}
                        onChange={(v) => setData({ ...data, birthYear: v as number })}
                    />
                    <p className="text-center text-zinc-400 font-bold text-sm">
                        Sua idade: <span className="text-white">{calculateAge()} anos</span>
                    </p>
                </div>
            )}

            {/* STEP 4: GOAL */}
            {step === 4 && (
                <div className="space-y-6 md:space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-3xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight text-balance">
                            <LetterPuller text="Qual seu objetivo?" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">O plano será moldado aqui</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <PremiumCard title="Perder gordura" subtitle="Foco em queima e definição" icon="🔥" active={data.goal === 'lose'} onClick={() => setData({ ...data, goal: 'lose' })} />
                        <PremiumCard title="Manter peso" subtitle="Foco em saúde e longevidade" icon="⚖️" active={data.goal === 'maintain'} onClick={() => setData({ ...data, goal: 'maintain' })} />
                        <PremiumCard title="Recomposição" subtitle="Queimar gordura e ganhar massa" icon="🧬" active={data.goal === 'recomp'} onClick={() => setData({ ...data, goal: 'recomp' })} />
                        <PremiumCard title="Ganhar massa" subtitle="Foco em volume e hipertrofia" icon="💪" active={data.goal === 'gain'} onClick={() => setData({ ...data, goal: 'gain' })} />
                    </div>
                </div>
            )}

            {/* STEP 5: FREQUENCY */}
            {step === 5 && (
                <div className="space-y-6 md:space-y-10">
                    <div className="text-center space-y-4 mb-2">
                        <h2 className="text-3xl md:text-5xl font-serif-premium font-bold tracking-tight text-white leading-tight text-balance">
                            <LetterPuller text="Frequência de treino?" />
                        </h2>
                        <p className="text-zinc-400 drop-shadow-sm text-sm md:text-base font-medium uppercase tracking-[0.2em]">Seja sincero com sua rotina</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { id: '0-2', label: '0 a 2 vezes', sub: 'Iniciante ou vida corrida', icon: '🐢' },
                            { id: '3-5', label: '3 a 5 vezes', sub: 'Consistência moderada', icon: '👟' },
                            { id: '6 ou mais', label: '6 ou mais', sub: 'Atleta ou alta intensidade', icon: '⚡' }
                        ].map(opt => (
                            <PremiumCard
                                key={opt.id}
                                title={opt.label}
                                subtitle={opt.sub}
                                icon={opt.icon}
                                active={data.frequency === opt.id}
                                onClick={() => setData({ ...data, frequency: opt.id })}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* FIXED FOOTER NAVIGATION */}
            <div className="mt-6 md:mt-12">
                <button
                    onClick={step === totalSteps ? handleFinish : next}
                    disabled={isLoading || !canContinue()}
                    className="w-full bg-white text-zinc-950 py-6 rounded-[2rem] font-bold text-lg shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                    {isLoading ? (
                        <div className="w-6 h-6 border-4 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>{step === totalSteps ? 'Gerar meu plano' : 'Continuar'}</span>
                            <span className="text-xl">→</span>
                        </>
                    )}
                </button>
            </div>

        </OnboardingLayout>
    );
};

const PremiumCard = ({ title, subtitle, icon, active, onClick }: { title: string, subtitle?: string, icon: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full p-4 sm:p-6 md:p-8 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] border transition-all duration-500 flex items-center gap-4 sm:gap-6 md:gap-8 group active:scale-[0.98] relative overflow-hidden ${active ? 'bg-white border-white shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)]' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'}`}
    >
        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl transition-all duration-500 ${active ? 'bg-zinc-950/5 scale-110' : 'bg-white/5'}`}>
            {icon}
        </div>
        <div className="text-left">
            <p className={`font-serif-premium font-bold text-xl sm:text-2xl tracking-tight transition-colors duration-500 ${active ? 'text-zinc-950' : 'text-white'}`}>{title}</p>
            {subtitle && <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${active ? 'text-zinc-950/60' : 'text-zinc-500'}`}>{subtitle}</p>}
        </div>
        <div className={`ml-auto transition-all duration-500 ${active ? 'translate-x-0 opacity-100 text-zinc-950' : 'translate-x-4 opacity-0'}`}>
            <span className="text-2xl">→</span>
        </div>
    </button>
);

export default OnboardingQuiz;
