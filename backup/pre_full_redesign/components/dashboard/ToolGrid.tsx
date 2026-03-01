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
        className="glass-panel glow-hover w-full p-5 md:p-6 rounded-3xl md:rounded-[2rem] text-center md:text-left hover:bg-white/80 dark:hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group border border-transparent hover:border-emerald-500/30 shadow-premium hover:shadow-premium-hover h-full flex flex-col items-center md:items-start justify-center md:justify-between min-w-0 dark:bg-zinc-900/60"
    >
        {/* Icon Wrapper */}
        <div className="relative mb-2 md:mb-3 flex justify-center w-full md:w-auto md:block">
            <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg block">
                {icon}
            </span>
            {premium && (
                <span className="absolute -top-1 -right-3 md:static md:ml-2 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm animate-pulse">
                    Pro
                </span>
            )}
        </div>

        <div className="min-w-0 w-full flex flex-col items-center md:items-start">
            <h3 className="font-black text-sm md:text-base leading-tight text-gray-900 dark:text-white mb-1 w-full">
                {title}
            </h3>
            {subtitle && (
                <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-tight w-full">
                    {subtitle}
                </p>
            )}
        </div>
    </button>
);

interface ToolGridProps {
    onNavigate: (view: View) => void;
}

const ToolGrid: React.FC<ToolGridProps> = ({ onNavigate }) => {
    return (
        <div className="space-y-8">
            {/* PREMIUM TOOLS (Unified) */}
            <div>
                <h2 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4 ml-1">
                    Ferramentas Premium
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    <ActionButton
                        onClick={() => onNavigate('food_ai')}
                        icon="🍽️"
                        title="Scanner de Refeição"
                        subtitle="Calcule macros com IA"
                        premium={true}
                    />
                    <ActionButton
                        onClick={() => onNavigate('shape')}
                        icon="💪"
                        title="Avalie seu físico"
                        subtitle="Análise corporal completa"
                        premium={true}
                    />
                    <ActionButton
                        onClick={() => onNavigate('chat')}
                        icon="👤"
                        title="Personal IA"
                        subtitle="Dieta e treino inteligente"
                        premium={true}
                    />
                    <ActionButton
                        onClick={() => onNavigate('evolution')}
                        icon="📈"
                        title="Sua Evolução"
                        subtitle="Histórico de progresso"
                        premium={true}
                    />
                </div>
            </div>

            <div>
                <h2 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4 ml-1">
                    Ferramentas Gratuitas
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-12">
                    <ActionButton onClick={() => onNavigate('food_manual')} icon="✍️" title="Add Manual" />
                    <ActionButton onClick={() => onNavigate('saved_meals')} icon="💾" title="Refeições Salvas" />
                    <ActionButton onClick={() => onNavigate('water_calc')} icon="💧" title="Meta de Água" />
                    <ActionButton onClick={() => onNavigate('bmi_calc')} icon="📐" title="Calc. IMC" />
                    <ActionButton onClick={() => onNavigate('calorie_calc')} icon="🔥" title="Gasto Calórico" />
                    <ActionButton onClick={() => onNavigate('calorie_plan')} icon="🎯" title="Minha Meta" />
                </div>
            </div>
        </div>
    );
};

export default ToolGrid;
