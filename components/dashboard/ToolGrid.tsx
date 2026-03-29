import React from 'react';
import { View } from '../../types';
import { Scan, User, LineChart, NotebookPen, Save, Droplets, Scale, Flame, Target, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    premium?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, title, subtitle, premium }) => (
    <motion.button
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        onClick={onClick}
        className="relative overflow-hidden group bg-zinc-900/50 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] hover:bg-zinc-800/60 transition-all duration-500 shadow-xl flex flex-col items-center md:items-start text-center md:text-left h-full"
    >
        {/* Hover Glow */}
        <div className="absolute -inset-20 bg-emerald-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-1000"></div>

        <div className="relative z-10 w-full flex flex-col items-center md:items-start">
            <div className="flex justify-center md:justify-between items-start mb-6 md:mb-10 w-full">
                <div className="text-zinc-300 group-hover:text-emerald-400 transition-all duration-500 transform group-hover:scale-110 drop-shadow-md">
                    {icon}
                </div>
                {premium && (
                    <div className="absolute top-0 right-0 md:relative bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        Pro
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center md:items-start">
                <h3 className="font-serif-premium font-bold text-lg md:text-xl text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors drop-shadow-md">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest leading-relaxed opacity-80 drop-shadow-sm">
                        {subtitle}
                    </p>
                )}
            </div>

            <div className="mt-6 w-8 h-0.5 bg-white/10 group-hover:w-full group-hover:bg-emerald-500/30 transition-all duration-700"></div>
        </div>
    </motion.button>
);

interface ToolGridProps {
    onNavigate: (view: View) => void;
}

const ToolGrid: React.FC<ToolGridProps> = ({ onNavigate }) => {
    return (
        <div className="space-y-12 pb-20">
            {/* PREMIUM TOOLS */}
            <section>
                <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-[11px] font-black text-white uppercase tracking-[0.5em] opacity-30">
                        Ferramentas Premium
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ActionButton
                        onClick={() => onNavigate('food_ai')}
                        icon={<Scan className="w-10 h-10 md:w-12 md:h-12" />}
                        title="Análise de Refeição"
                        subtitle="Análise nutricional"
                        premium={true}
                    />
                    <ActionButton
                        onClick={() => onNavigate('shape')}
                        icon={<User className="w-10 h-10 md:w-12 md:h-12" />}
                        title="Análise Física"
                        subtitle="Morfologia física"
                        premium={true}
                    />
                    <ActionButton
                        onClick={() => onNavigate('chat')}
                        icon={<MessageSquare className="w-10 h-10 md:w-12 md:h-12" />}
                        title="Personal 24h"
                        subtitle="Suporte 24/7"
                        premium={true}
                    />
                    <ActionButton
                        onClick={() => onNavigate('evolution')}
                        icon={<LineChart className="w-10 h-10 md:w-12 md:h-12" />}
                        title="Sua Evolução"
                        subtitle="Analytics pessoal"
                        premium={true}
                    />
                </div>
            </section>

            {/* FREE TOOLS */}
            <section>
                <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-[11px] font-black text-white uppercase tracking-[0.5em] opacity-30">
                        Ferramentas Gratuitas
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <ActionButton onClick={() => onNavigate('food_manual')} icon={<NotebookPen className="w-8 h-8" />} title="Adicionar Manualmente" />
                    <ActionButton onClick={() => onNavigate('saved_meals')} icon={<Save className="w-8 h-8" />} title="Refeições Salvas" />
                    <ActionButton onClick={() => onNavigate('water_calc')} icon={<Droplets className="w-8 h-8" />} title="Meta de Água" />
                    <ActionButton onClick={() => onNavigate('bmi_calc')} icon={<Scale className="w-8 h-8" />} title="IMC" />
                    <ActionButton onClick={() => onNavigate('calorie_calc')} icon={<Flame className="w-8 h-8" />} title="Gasto Calórico" />
                    <ActionButton onClick={() => onNavigate('calorie_plan')} icon={<Target className="w-8 h-8" />} title="Minha Meta" />
                </div>
            </section>
        </div>
    );
};

export default ToolGrid;
