import React from 'react';
import { View } from '../../types';

interface ActionButtonProps {
    onClick: () => void;
    icon: string;
    title: string;
    subtitle?: string;
    premium?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, title, subtitle, premium }) => (
    <button
        onClick={onClick}
        className="relative overflow-hidden group bg-zinc-950/40 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border border-white/10 hover:border-emerald-500/30 transition-all duration-500 shadow-xl flex flex-col items-center md:items-start text-center md:text-left h-full active:scale-[0.98]"
    >
        {/* Hover Glow */}
        <div className="absolute -inset-20 bg-emerald-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-1000"></div>

        <div className="relative z-10 w-full">
            <div className="flex justify-between items-start mb-6 md:mb-10">
                <span className="text-4xl md:text-5xl filter grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110">
                    {icon}
                </span>
                {premium && (
                    <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        Pro
                    </div>
                )}
            </div>

            <div className="flex flex-col">
                <h3 className="font-serif-premium font-bold text-lg md:text-xl text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-relaxed opacity-60">
                        {subtitle}
                    </p>
                )}
            </div>

            <div className="mt-6 w-8 h-0.5 bg-white/10 group-hover:w-full group-hover:bg-emerald-500/30 transition-all duration-700"></div>
        </div>
    </button>
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
                        Inteligência Artificial
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ActionButton
                        onClick={() => onNavigate('food_ai')}
                        icon="🍽️"
                        title="Scanner de IA"
                        subtitle="Análise nutricional"
                        premium={true}
                    />
                    <ActionButton
                        onClick={() => onNavigate('shape')}
                        icon="💪"
                        title="Body Scan"
                        subtitle="Morfologia física"
                        premium={true}
                    />
                    <ActionButton
                        onClick={() => onNavigate('chat')}
                        icon="👤"
                        title="IA Coach"
                        subtitle="Suporte 24/7"
                        premium={true}
                    />
                    <ActionButton
                        onClick={() => onNavigate('evolution')}
                        icon="📈"
                        title="Metrics"
                        subtitle="Analytics pessoal"
                        premium={true}
                    />
                </div>
            </section>

            {/* FREE TOOLS */}
            <section>
                <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-[11px] font-black text-white uppercase tracking-[0.5em] opacity-30">
                        Sistema Base
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <ActionButton onClick={() => onNavigate('food_manual')} icon="✍️" title="Manual" />
                    <ActionButton onClick={() => onNavigate('saved_meals')} icon="💾" title="Database" />
                    <ActionButton onClick={() => onNavigate('water_calc')} icon="💧" title="H2O" />
                    <ActionButton onClick={() => onNavigate('bmi_calc')} icon="📐" title="IMC" />
                    <ActionButton onClick={() => onNavigate('calorie_calc')} icon="🔥" title="BMR" />
                    <ActionButton onClick={() => onNavigate('calorie_plan')} icon="🎯" title="Focus" />
                </div>
            </section>
        </div>
    );
};

export default ToolGrid;
