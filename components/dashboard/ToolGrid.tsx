import React from 'react';
import { View } from '../../types';
import { Scan, User, LineChart, NotebookPen, Save, Droplets, Scale, Flame, Target, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const PREMIUM_TOOLS = [
    {
        view: 'food_ai' as View,
        icon: Scan,
        title: 'Análise de Refeição',
        subtitle: 'Análise nutricional por IA',
        accent: 'emerald',
    },
    {
        view: 'shape' as View,
        icon: User,
        title: 'Análise Física',
        subtitle: 'Morfologia e composição',
        accent: 'violet',
    },
    {
        view: 'chat' as View,
        icon: MessageSquare,
        title: 'Personal 24h',
        subtitle: 'Suporte inteligente 24/7',
        accent: 'sky',
    },
    {
        view: 'evolution' as View,
        icon: LineChart,
        title: 'Sua Evolução',
        subtitle: 'Analytics pessoal',
        accent: 'amber',
    },
];

const FREE_TOOLS = [
    { view: 'food_manual' as View, icon: NotebookPen, title: 'Manual' },
    { view: 'saved_meals' as View, icon: Save, title: 'Salvas' },
    { view: 'water_calc' as View, icon: Droplets, title: 'Água' },
    { view: 'bmi_calc' as View, icon: Scale, title: 'IMC' },
    { view: 'calorie_calc' as View, icon: Flame, title: 'Gasto' },
    { view: 'calorie_plan' as View, icon: Target, title: 'Meta' },
];

const accentMap: Record<string, { text: string; bg: string; border: string; glow: string; bar: string }> = {
    emerald: {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        glow: 'bg-emerald-500/15',
        bar: 'bg-emerald-500',
    },
    violet: {
        text: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/30',
        glow: 'bg-violet-500/15',
        bar: 'bg-violet-500',
    },
    sky: {
        text: 'text-sky-400',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/30',
        glow: 'bg-sky-500/15',
        bar: 'bg-sky-500',
    },
    amber: {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        glow: 'bg-amber-500/15',
        bar: 'bg-amber-500',
    },
};

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface ToolGridProps {
    onNavigate: (view: View) => void;
}

const ToolGrid: React.FC<ToolGridProps> = ({ onNavigate }) => {
    return (
        <div className="space-y-10 pb-20">
            {/* PREMIUM TOOLS */}
            <section>
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-[10px] font-black text-white uppercase tracking-[0.5em] opacity-25 shrink-0">
                        Ferramentas IA
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 gap-3"
                >
                    {PREMIUM_TOOLS.map((tool) => {
                        const Icon = tool.icon;
                        const accent = accentMap[tool.accent];
                        return (
                            <motion.button
                                key={tool.view}
                                variants={cardVariants}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onNavigate(tool.view)}
                                className="relative overflow-hidden group bg-zinc-950/50 backdrop-blur-2xl p-5 md:p-7 rounded-[2rem] border border-white/8 hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col items-start text-left h-full min-h-[140px] md:min-h-[160px]"
                            >
                                {/* Hover glow */}
                                <div className={`absolute -inset-12 ${accent.glow} rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

                                {/* Top accent line */}
                                <div className={`absolute top-0 left-6 right-6 h-px ${accent.bar} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />

                                <div className="relative z-10 flex flex-col h-full w-full">
                                    {/* Icon + Pro badge */}
                                    <div className="flex items-start justify-between mb-auto">
                                        <div className={`p-2.5 rounded-2xl ${accent.bg} border ${accent.border} mb-4 transition-all duration-300 group-hover:scale-110`}>
                                            <Icon className={`w-5 h-5 md:w-6 md:h-6 ${accent.text}`} />
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${accent.text} opacity-60 mt-1`}>IA</span>
                                    </div>

                                    {/* Text */}
                                    <div>
                                        <h3 className={`font-serif-premium font-bold text-sm md:text-base text-white leading-tight mb-1 group-hover:${accent.text} transition-colors duration-300`}>
                                            {tool.title}
                                        </h3>
                                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider leading-relaxed">
                                            {tool.subtitle}
                                        </p>
                                    </div>

                                    {/* Bottom bar */}
                                    <div className={`mt-4 h-px w-6 ${accent.bar} opacity-30 group-hover:w-full group-hover:opacity-60 transition-all duration-500`} />
                                </div>
                            </motion.button>
                        );
                    })}
                </motion.div>
            </section>

            {/* FREE TOOLS */}
            <section>
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-[10px] font-black text-white uppercase tracking-[0.5em] opacity-25 shrink-0">
                        Ferramentas Gratuitas
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-3 gap-3"
                >
                    {FREE_TOOLS.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <motion.button
                                key={tool.view}
                                variants={cardVariants}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onNavigate(tool.view)}
                                className="relative overflow-hidden group bg-zinc-950/40 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/8 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300 shadow-lg flex flex-col items-center justify-center gap-3 min-h-[80px]"
                            >
                                <Icon className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors duration-300" />
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider group-hover:text-white transition-colors duration-300 text-center leading-tight">
                                    {tool.title}
                                </span>
                            </motion.button>
                        );
                    })}
                </motion.div>
            </section>
        </div>
    );
};

export default ToolGrid;
