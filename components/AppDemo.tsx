import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Play, Camera, Activity, CheckCircle2, Star, Zap, ScanSearch, Dumbbell, ChefHat, Sparkles, Image as ImageIcon, Scale, Target } from 'lucide-react';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';

interface Props {
    onBack: () => void;
    onRegister: () => void;
}

type DemoType = 'selection' | 'scanning_food' | 'result_food' | 'scanning_shape' | 'result_shape';

const PremiumScoreBar = ({ label, score, isFatScore = false }: { label: string, score: number, isFatScore?: boolean }) => {
    const getScoreColor = () => {
        if (isFatScore) {
            if (score < 12) return 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]'; // < 12% is excellent usually handled dynamically, but keeping simple here
            if (score < 18) return 'bg-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.5)]';
            return 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]';
        }
        if (score >= 8) return 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
        if (score >= 6) return 'bg-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.5)]';
        return 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]';
    };

    const getPercentage = () => {
        if (isFatScore) return score;
        return (score / 10) * 100;
    }

    return (
        <div className="bg-zinc-950/40 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/5 space-y-4 text-center pb-10">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
            <div className="flex items-baseline justify-center gap-1 mb-6">
                <span className={`text-5xl md:text-6xl font-serif-premium font-bold ${isFatScore && score > 20 ? 'text-amber-500' : 'text-white'}`}>
                    {score}
                </span>
                {!isFatScore && <span className="text-zinc-600 font-bold text-xl">/10</span>}
                {isFatScore && <span className="text-zinc-600 font-bold text-xl">%</span>}
            </div>

            <div className="h-1.5 w-full bg-white/5 rounded-full mx-auto max-w-[120px] shrink-0 mt-auto">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getPercentage()}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className={`h-full rounded-full ${getScoreColor()}`}
                />
            </div>
        </div>
    );
};

const TargetWeightRow = ({ label, target }: { label: string, target: number }) => (
    <div className="flex justify-between items-center py-5 border-b border-white/5 last:border-0 group hover:px-4 transition-all duration-300 rounded-2xl hover:bg-white/[0.02]">
        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{label}</span>
        <span className="text-xl font-serif-premium font-bold text-white tracking-tight">{target.toFixed(1)}<span className="text-[10px] ml-1 opacity-50 uppercase tracking-widest italic">kg</span></span>
    </div>
);

const AppDemo: React.FC<Props> = ({ onBack, onRegister }) => {
    const [demoState, setDemoState] = useState<DemoType>('selection');
    const [scanStep, setScanStep] = useState(0);

    const scanMessagesFood = ["Identificando ingredientes...", "Mapeando densidade calórica...", "Extraindo macronutrientes...", "Gerando laudo nutricional..."];
    const scanMessagesShape = ["Analisando topologia corporal...", "Calculando taxa de gordura subcutânea...", "Mapeando simetria muscular...", "Gerando arquitetura genética..."];

    useEffect(() => {
        let interval: any;
        if (demoState === 'scanning_food' || demoState === 'scanning_shape') {
            setScanStep(0);
            interval = setInterval(() => {
                setScanStep(prev => (prev < 3 ? prev + 1 : prev));
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [demoState]);

    useEffect(() => {
        if (demoState === 'scanning_food' || demoState === 'scanning_shape') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [demoState]);


    // Reliable Fallback Images from Wikimedia
    const MOCK_FOOD_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/4/43/Feijoada_carioca.jpg";
    const MOCK_SHAPE_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/e/e0/Arnold_Schwarzenegger_at_the_Muscle_Beach.jpg";

    // Hardcoded Food Result
    const mockFoodData = {
        mealName: "Prato Executivo Nutritivo",
        items: [
            { name: "Carne Bovina Assada", weight: 150, calories: 350, protein: 40, carbs: 0, fat: 20, observation: "Excelentes fontes de creatina e ferro biodisponível." },
            { name: "Arroz Branco", weight: 120, calories: 156, protein: 3, carbs: 34, fat: 0, observation: "Fonte de energia rápida e de fácil digestão." },
            { name: "Abacate", weight: 50, calories: 80, protein: 1, carbs: 4, fat: 7, observation: "Gorduras monoinsaturadas excelentes para saciedade e hormônios." },
            { name: "Mix de Folhas", weight: 100, calories: 20, protein: 2, carbs: 4, fat: 0, observation: "Volume sem calorias vazias, altíssima densidade nutritiva." }
        ],
        totalCalories: 554,
        totalProtein: 42,
        totalCarbs: 33,
        totalFat: 28,
        totalWeight: 420,
        score: 9.8,
        reasoning: "Mapeamento metabólico indica uma refeição excepcional. A proporção Proteína/Gordura Saudável (Salmão+Abacate) gera um pico prolongado de saciedade, enquanto a Quinoa previne picos de insulina. Perfil anabólico limpo e altamente funcional."
    };

    // Hardcoded Shape Result
    const mockShapeData = {
        bf: 11.5,
        bf_classification: "Atlético Superior",
        body_fat_range: "[10% - 13%]",
        bf_confidence: "Alta (96%)",
        bf_visual_justification: "Nível de detalhamento na linha alba e serrátil anterior indicam camada cutânea extremamente fina.",
        shape_score: 9.2,
        muscle_score: 8.5,
        definition_score: 9.0,
        fat_score: 11.5,
        structural_analysis: {
            name: "Mesomorfo Dominante",
            meaning: "Alto Índice de Responsividade Metabólica. Fibras tipo II otimizadas, resposta hipertrófica rápida ao treino tensional.",
            strength: "Biotipo estético clássico com ombros largos (clavículas longas) e cintura compacta. V-Taper evidente.",
            improvement: "Proporção inferior requer maior volume para equiparar à densidade muscular do tronco.",
            genetic_responsiveness: "Hipertrófica Rápida",
            fat_storage_tendency: "Subcutânea Lower Body",
            structural_limitation_strategy: "Prioridade para Agachamento Livre e Levantamento Terra para ampliar densidade da base."
        },
        weight_metrics: {
            current_weight: 78.5,
            lean_mass_kg: 69.5,
            fat_mass_kg: 9.0,
            bmi: 23.8
        },
        target_projections: [
            { label: "Palco / Extremo", bf: 8, weight: 75.5 },
            { label: "Manutenção Estética", bf: 10, weight: 77.2 }
        ],
        personal_ia_insight: {
            aesthetic_diagnosis: "Físico extremamente polido com proporções 'Golden Era'. A densidade muscular de peito e ombros está muito à frente, criando uma estética em V agressiva.",
            personal_ia_comment: "Excelente densidade muscular.",
            main_leverage: "Treinos metabólicos de perna (Super Slow e Drop Sets) para quebrar o platô de desenvolvimento inferior.",
            smart_strategy: "Ondulação Calórica Controlada: Ciclar carboidratos mantendo os picos apenas nos dias de leg-day intenso."
        },
        execution_strategy: {
            primary_focus_next_60_days: "Igualar a rocha do tronco com a densidade das pernas. O shape tá pronto pra competir se alinhar as proporções."
        },
        nutritional_protocol: {
            caloric_strategy: "Superávit Conservador (+10%)",
            protein_target: "2.8g/kg (220g)",
            distribution: "Cluster de Carboidratos Peritreino"
        }
    };

    const simulateFoodScan = () => {
        setDemoState('scanning_food');
        setTimeout(() => {
            setDemoState('result_food');
        }, 4500);
    };

    const simulateShapeScan = () => {
        setDemoState('scanning_shape');
        setTimeout(() => {
            setDemoState('result_shape');
        }, 4500);
    };

    const DemoHeader = () => (
        <header className="flex justify-between items-center mb-12 z-20 relative px-6 md:px-0 mt-8 md:mt-0">
            <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-white">
                <span className="text-xl">←</span>
            </button>
            <div className="flex bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-bold tracking-wider uppercase">Modo Demonstração</span>
            </div>
        </header>
    );

    return (
        <PremiumBackground>
            <div className="max-w-5xl mx-auto py-12 md:py-20 flex flex-col min-h-screen relative">

                {/* Loading Overlay */}
                <AnimatePresence>
                    {(demoState === 'scanning_food' || demoState === 'scanning_shape') && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overscroll-none"
                        >
                            <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mb-16">
                                <div className="absolute inset-0 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl z-10 flex items-center justify-center bg-zinc-900">
                                    <div className="absolute inset-0 bg-cover bg-center opacity-40 brightness-50" style={{ backgroundImage: demoState === 'scanning_food' ? "url('https://pub-e7d6666ba2834cfa9789396de6aa386a.r2.dev/food.png')" : "url('https://pub-e7d6666ba2834cfa9789396de6aa386a.r2.dev/shape.png')" }} />
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_30px_rgba(52,211,153,1)] animate-[scan-line_2.5s_ease-in-out_infinite] z-20"></div>
                                </div>
                                <div className="absolute animate-[spin_3s_linear_infinite] w-full h-full border-t-2 border-emerald-500/30 rounded-[3rem]"></div>
                            </div>
                            <div className="z-10 text-center space-y-6">
                                <LetterPuller text={demoState === 'scanning_food' ? scanMessagesFood[scanStep] : scanMessagesShape[scanStep]} className="text-white text-xl md:text-2xl tracking-[0.2em] uppercase" />
                                <div className="w-48 h-[1px] bg-white/10 mx-auto overflow-hidden">
                                    <motion.div
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                        className="w-full h-full bg-emerald-500"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {demoState === 'selection' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center pt-10 px-6">
                        <DemoHeader />
                        <div className="text-center mb-16 mt-8">
                            <h1 className="text-4xl md:text-6xl font-serif-premium font-bold tracking-tighter mb-4 drop-shadow-lg text-white">
                                <LetterPuller text="Selecione a " /><span className="text-emerald-400"><LetterPuller text="Demonstração" delay={0.5} /></span>
                            </h1>
                            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                                Experimente o poder da nossa IA em tempo real. Não se preocupe, o Modo Demonstração é gratuito e não consome seus créditos.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
                            {/* Food Card */}
                            <motion.div
                                whileHover={{ y: -5, scale: 1.02 }}
                                onClick={simulateFoodScan}
                                className="bg-zinc-950/40 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-10 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-2xl relative overflow-hidden flex flex-col items-center text-center"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-colors"></div>
                                <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform">
                                    <ScanSearch className="w-10 h-10 text-emerald-400" />
                                </div>
                                <h3 className="text-3xl font-serif-premium font-bold mb-4 text-white">Análise de Refeição</h3>
                                <p className="text-zinc-400 mb-8 leading-relaxed max-w-sm">
                                    A IA analisa sua foto e entrega gramas, calorias e macronutrientes exatos, além de um feedback metabólico.
                                </p>
                                <button className="w-full bg-white text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] group-hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2">
                                    Iniciar Simulação <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                </button>
                            </motion.div>

                            {/* Shape Card */}
                            <motion.div
                                whileHover={{ y: -5, scale: 1.02 }}
                                onClick={simulateShapeScan}
                                className="bg-zinc-950/40 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-10 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-2xl relative overflow-hidden flex flex-col items-center text-center"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-colors"></div>
                                <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(255,255,255,0.05)] group-hover:scale-110 transition-transform group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30">
                                    <Activity className="w-10 h-10 text-white group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <h3 className="text-3xl font-serif-premium font-bold mb-4 text-white">Análise Física</h3>
                                <p className="text-zinc-400 mb-8 leading-relaxed max-w-sm">
                                    Veja a IA Body Scan em ação identificando seu biotipo, pontos fortes e fracos, gerando um protocolo completo.
                                </p>
                                <button className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] group-hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                                    Iniciar Simulação <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {/* --- RESULTADO FOOD SCAN --- */}
                {demoState === 'result_food' && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-32 px-6">
                        <DemoHeader />

                        <div className="w-full max-w-2xl mx-auto text-center mb-12 mt-4">
                            <h2 className="text-4xl md:text-5xl font-serif-premium font-bold text-white mb-6 drop-shadow-lg tracking-tighter">
                                <LetterPuller text={mockFoodData.mealName} />
                            </h2>
                            <p className="text-zinc-400 text-sm md:text-base leading-relaxed px-4 max-w-xl mx-auto">
                                {mockFoodData.reasoning}
                            </p>
                        </div>

                        <div className="w-full aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl group relative mb-12 flex items-center justify-center bg-zinc-900">
                            <div className="absolute inset-0 bg-cover bg-center group-hover:bg-[length:105%] transition-all duration-1000" style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/4/43/Feijoada_carioca.jpg')" }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-70">Resultado Identificado</span>
                                    <h2 className="text-5xl md:text-6xl font-serif-premium font-bold text-white tracking-tight leading-none uppercase">
                                        {mockFoodData.mealName}
                                    </h2>
                                </div>

                                <div className="flex items-baseline gap-4">
                                    <span className="text-8xl font-serif-premium font-bold text-white tracking-tighter hover:text-emerald-500 transition-colors duration-500">
                                        {mockFoodData.totalCalories.toFixed(0)}
                                    </span>
                                    <span className="text-emerald-500/50 text-2xl font-serif-premium italic">kcal</span>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    {[
                                        { l: 'Prot', v: mockFoodData.totalProtein, u: 'g' },
                                        { l: 'Carb', v: mockFoodData.totalCarbs, u: 'g' },
                                        { l: 'Gord', v: mockFoodData.totalFat, u: 'g' }
                                    ].map(m => (
                                        <div key={m.l} className="bg-zinc-950/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 text-center group/macro hover:border-emerald-500/30 transition-all duration-500">
                                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 group-hover/macro:text-emerald-500 transition-colors">{m.l}</p>
                                            <p className="text-2xl font-serif-premium font-bold text-white">{m.v.toFixed(1)}<span className="text-[10px] opacity-40 italic ml-1">{m.u}</span></p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-zinc-950/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 space-y-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 transform group-hover:rotate-12 transition-transform duration-700 opacity-10">
                                    <CheckCircle2 className="w-24 h-24 text-emerald-500" strokeWidth={0.5} />
                                </div>

                                <div className="space-y-6 relative z-10">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest opacity-40">Pontuação Metabólica</span>
                                        <span className="text-3xl font-serif-premium font-bold text-emerald-500">{mockFoodData.score}/10</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(mockFoodData.score / 10) * 100}%` }}
                                            transition={{ duration: 2, ease: "circOut" }}
                                            className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                                        />
                                    </div>
                                    <p className="text-sm font-medium text-zinc-400 leading-relaxed italic border-l-2 border-emerald-500/30 pl-6 py-2">
                                        "{mockFoodData.reasoning}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 mt-16 px-2 md:px-0">
                            <h3 className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-[0.3em] opacity-80 mb-6">Vetores Nutrigenômicos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {mockFoodData.items.map((item, idx) => (
                                    <div key={idx} className="bg-zinc-950/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all group/item">
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="font-serif-premium font-bold text-xl text-white group-hover/item:text-emerald-400 transition-colors capitalize">{item.name}</h4>
                                            <span className="font-serif-premium font-bold text-base md:text-lg text-white/40">{item.weight}g</span>
                                        </div>
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">{item.calories} kcal</p>
                                        <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest opacity-70 mb-4 pb-4 border-b border-white/5 flex-wrap">
                                            <span className="p-2 px-3 bg-white/5 rounded-lg border border-white/5">P: {item.protein}g</span>
                                            <span className="p-2 px-3 bg-white/5 rounded-lg border border-white/5">C: {item.carbs}g</span>
                                            <span className="p-2 px-3 bg-white/5 rounded-lg border border-white/5">G: {item.fat}g</span>
                                        </div>
                                        {item.observation && (
                                            <p className="text-[11px] text-zinc-400 font-medium italic opacity-60 group-hover/item:opacity-100 transition-opacity">
                                                "{item.observation}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-center mt-16 mb-10">
                            <button
                                onClick={onRegister}
                                className="group relative px-10 py-6 rounded-full overflow-hidden flex items-center gap-4 border border-emerald-400/50 hover:border-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all bg-emerald-950/80 hover:bg-emerald-900 backdrop-blur-xl"
                            >
                                <div className="absolute top-0 -left-[100%] w-[150%] h-[200%] bg-gradient-to-br from-transparent via-emerald-400/20 to-transparent rotate-45 animate-[sweep_3s_ease-in-out_infinite]"></div>
                                <Sparkles className="w-6 h-6 text-emerald-400" />
                                <span className="font-black text-white uppercase tracking-[0.2em] text-sm md:text-base">
                                    Criar Minha Conta Grátis
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* --- RESULTADO BODY SCAN --- */}
                {demoState === 'result_shape' && (
                    <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-6 pt-6">
                        <DemoHeader />

                        <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden flex flex-col items-center group">
                            <div className="absolute inset-0 z-0 opacity-20 bg-center bg-cover brightness-110 contrast-125" style={{ backgroundImage: "url('https://pub-e7d6666ba2834cfa9789396de6aa386a.r2.dev/shape.png')" }}>
                                <div className="absolute inset-0 bg-zinc-950/80 mix-blend-multiply"></div>
                            </div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="flex items-baseline gap-2 mb-4">
                                    <h2 className="text-8xl md:text-[10rem] font-serif-premium font-bold text-white leading-none tracking-tighter drop-shadow-2xl">
                                        {mockShapeData.shape_score.toFixed(1)}
                                    </h2>
                                    <span className="text-3xl font-serif-premium text-zinc-500 font-bold tracking-tighter">/10</span>
                                </div>
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em] max-w-[300px] leading-relaxed text-center mb-8 drop-shadow">
                                    ÍNDICE DE COMPOSIÇÃO E PROPORÇÃO ESTÉTICA.
                                </p>

                                <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 text-center flex-1 max-w-sm space-y-6 w-full shadow-2xl">
                                    <div>
                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Biotipo Predominante</p>
                                        <p className="text-3xl font-serif-premium font-bold text-emerald-500 tracking-tight">{mockShapeData.structural_analysis.name}</p>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        <span className="inline-block px-6 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                                            {mockShapeData.bf_classification} • {mockShapeData.body_fat_range}
                                        </span>

                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Confiança {mockShapeData.bf_confidence}</span>
                                            <p className="text-[10px] text-zinc-400 font-medium leading-relaxed italic max-w-[200px]">
                                                "{mockShapeData.personal_ia_insight.aesthetic_diagnosis}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <PremiumScoreBar label="Musculatura" score={mockShapeData.muscle_score} />
                            <PremiumScoreBar label="Definição" score={mockShapeData.definition_score} />
                            <PremiumScoreBar label="Gordura" score={mockShapeData.fat_score} isFatScore />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <Scale className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Métricas de Composição</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2 hover:bg-white/[0.05] transition-colors">
                                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Massa Magra</p>
                                        <p className="text-3xl font-serif-premium font-bold text-white">{mockShapeData.weight_metrics.lean_mass_kg.toFixed(1)}<span className="text-xs ml-1 opacity-40">kg</span></p>
                                    </div>
                                    <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2 hover:bg-white/[0.05] transition-colors">
                                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Massa Gorda</p>
                                        <p className="text-3xl font-serif-premium font-bold text-emerald-500">{mockShapeData.weight_metrics.fat_mass_kg.toFixed(1)}<span className="text-xs ml-1 opacity-40">kg</span></p>
                                    </div>
                                    <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2 hover:bg-white/[0.05] transition-colors">
                                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Peso Total</p>
                                        <p className="text-3xl font-serif-premium font-bold text-white">{mockShapeData.weight_metrics.current_weight}<span className="text-xs ml-1 opacity-40">kg</span></p>
                                    </div>
                                    <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2 hover:bg-white/[0.05] transition-colors">
                                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">IMC</p>
                                        <p className="text-3xl font-serif-premium font-bold text-white">{mockShapeData.weight_metrics.bmi.toFixed(1)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <Target className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Alvos de Performance</h3>
                                </div>

                                <div className="space-y-3">
                                    {mockShapeData.target_projections.map((proj, idx) => (
                                        <TargetWeightRow
                                            key={idx}
                                            label={`${proj.label} (${proj.bf}%)`}
                                            target={proj.weight}
                                        />
                                    ))}
                                </div>
                                <p className="text-sm text-zinc-400 font-medium leading-relaxed italic border-l border-white/10 pl-4">
                                    "A curva de evolução projeta uma otimização metabólica progressiva, com maior eficiência lipolítica nas janelas de estímulo inicial."
                                </p>
                            </div>
                        </div>

                        <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-12 rounded-[3.5rem] relative overflow-hidden space-y-10 group mt-12 mb-12">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors"></div>
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em] mb-6 opacity-70">Diretriz Crítica: Ciclo de 60 Dias</p>
                            <p className="text-white text-3xl md:text-5xl font-serif-premium font-bold tracking-tight leading-tight italic drop-shadow-lg">
                                "{mockShapeData.execution_strategy.primary_focus_next_60_days}"
                            </p>
                        </div>

                        <div className="flex justify-center mt-16 mb-10">
                            <button
                                onClick={onRegister}
                                className="group relative px-10 py-6 rounded-full overflow-hidden flex items-center gap-4 border border-teal-400/50 hover:border-teal-300 shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:shadow-[0_0_60px_rgba(20,184,166,0.5)] transition-all bg-teal-950/80 hover:bg-teal-900 backdrop-blur-xl"
                            >
                                <div className="absolute top-0 -left-[100%] w-[150%] h-[200%] bg-gradient-to-br from-transparent via-teal-400/20 to-transparent rotate-45 animate-[sweep_3s_ease-in-out_infinite]"></div>
                                <Dumbbell className="w-6 h-6 text-teal-400" />
                                <span className="font-black text-white uppercase tracking-[0.2em] text-sm md:text-base">
                                    Criar Minha Conta Grátis
                                </span>
                            </button>
                        </div>

                    </div>
                )}

            </div>
        </PremiumBackground>
    );
};

export default AppDemo;
