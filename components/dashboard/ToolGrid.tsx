import React from 'react';
import { View } from '../../types';
import { Scan, User, LineChart, NotebookPen, Save, Droplets, Scale, Flame, Target, MessageSquare, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    highlight?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, title, subtitle, highlight }) => (
    <motion.button
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        onClick={onClick}
        className={`relative overflow-hidden group backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] transition-all duration-500 shadow-xl flex flex-col items-center md:items-start text-center md:text-left h-full ${
            highlight
                ? 'bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-zinc-900/50 border border-white/5 hover:bg-zinc-800/60'
        }`}
    >
        <div className="absolute -inset-20 bg-emerald-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-1000"></div>
        <div className="relative z-10 w-full flex flex-col items-center md:items-start">
            <div className="flex justify-center md:justify-between items-start mb-6 md:mb-10 w-full">
                <div className={`transition-all duration-500 transform group-hover:scale-110 drop-shadow-md ${highlight ? 'text-emerald-400' : 'text-zinc-300 group-hover:text-emerald-400'}`}>
                    {icon}
                </div>
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

interface PremiumButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
}

const PremiumButton: React.FC<PremiumButtonProps> = ({ onClick, icon, title, subtitle }) => (
    <motion.button
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        onClick={onClick}
        className="relative overflow-hidden group bg-zinc-900/40 border border-white/5 backdrop-blur-2xl p-5 md:p-6 rounded-[2rem] hover:bg-zinc-800/50 hover:border-emerald-500/20 transition-all duration-500 shadow-xl flex flex-col items-center md:items-start text-center md:text-left h-full"
    >
        <div className="absolute -inset-20 bg-emerald-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-30 transition-opacity duration-1000"></div>
        <div className="relative z-10 w-full flex flex-col items-center md:items-start">
            <div className="flex justify-between items-start mb-4 w-full">
                <div className="text-zinc-500 group-hover:text-emerald-400/70 transition-all duration-500 transform group-hover:scale-110">
                    {icon}
                </div>
                <div className="bg-emerald-500/10 text-emerald-400/70 px-2 py-0.5 rounded-md border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest">
                    Pro
                </div>
            </div>
            <div className="flex flex-col items-center md:items-start">
                <h3 className="font-serif-premium font-bold text-base md:text-lg text-zinc-400 group-hover:text-zinc-200 mb-1 tracking-tight transition-colors">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    </motion.button>
);

interface ToolGridProps {
    onNavigate: (view: View) => void;
    onUpgrade: () => void;
}

const ToolGrid: React.FC<ToolGridProps> = ({ onNavigate, onUpgrade }) => {
    return (
        <div className="space-y-10 pb-20">

            {/* FREE TOOLS — em destaque, primeiro */}
            <section>
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em]">
                        Disponível agora
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <ActionButton
                        onClick={() => onNavigate('food_manual')}
                        icon={<NotebookPen className="w-8 h-8" />}
                        title="Adicionar Refeição"
                        subtitle="Registre o que comeu"
                        highlight={true}
                    />
                    <ActionButton onClick={() => onNavigate('water_calc')} icon={<Droplets className="w-8 h-8" />} title="Meta de Água" subtitle="Hidratação diária" />
                    <ActionButton onClick={() => onNavigate('bmi_calc')} icon={<Scale className="w-8 h-8" />} title="Calcular IMC" subtitle="Índice de massa" />
                    <ActionButton onClick={() => onNavigate('calorie_calc')} icon={<Flame className="w-8 h-8" />} title="Gasto Calórico" subtitle="Seu TDEE" />
                    <ActionButton onClick={() => onNavigate('calorie_plan')} icon={<Target className="w-8 h-8" />} title="Minha Meta" subtitle="Meta de calorias" />
                    <ActionButton onClick={() => onNavigate('saved_meals')} icon={<Save className="w-8 h-8" />} title="Refeições Salvas" subtitle="Seus favoritos" />
                </div>
            </section>

            {/* PREMIUM UPSELL */}
            <section>
                <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                        Ferramentas Pro
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
                </div>

                {/* CTA de upgrade */}
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={onUpgrade}
                    className="w-full mb-4 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 hover:border-emerald-500/40 hover:from-emerald-500/15 transition-all duration-300 group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-white">Desbloqueie o Plano Pro</p>
                            <p className="text-[10px] text-zinc-400 font-medium">Análise de fotos, Personal 24h e muito mais</p>
                        </div>
                    </div>
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider shrink-0 group-hover:translate-x-1 transition-transform">Ver planos →</span>
                </motion.button>

                <div className="grid grid-cols-2 gap-3">
                    <PremiumButton
                        onClick={() => onNavigate('food_ai')}
                        icon={<Scan className="w-8 h-8" />}
                        title="Análise por Foto"
                        subtitle="IA nutricional"
                    />
                    <PremiumButton
                        onClick={() => onNavigate('shape')}
                        icon={<User className="w-8 h-8" />}
                        title="Análise Física"
                        subtitle="Morfologia"
                    />
                    <PremiumButton
                        onClick={() => onNavigate('chat')}
                        icon={<MessageSquare className="w-8 h-8" />}
                        title="Personal 24h"
                        subtitle="Suporte IA"
                    />
                    <PremiumButton
                        onClick={() => onNavigate('evolution')}
                        icon={<LineChart className="w-8 h-8" />}
                        title="Sua Evolução"
                        subtitle="Analytics"
                    />
                </div>
            </section>
        </div>
    );
};

export default ToolGrid;
