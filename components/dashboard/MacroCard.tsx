import React from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../src/utils/useIsMobile';

interface MacroCardProps {
    label: string;
    value: number;
    unit: string;
    fullLabel: string;
    goal?: number;
    color?: 'emerald' | 'blue' | 'yellow';
}

const MacroCard: React.FC<MacroCardProps> = ({
    label,
    value,
    unit,
    fullLabel,
    goal,
    color = 'emerald',
}) => {
    const isMobile = useIsMobile();
    const hasGoal = typeof goal === 'number';

    const colors: Record<string, string> = {
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        yellow: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    };

    const barColors: Record<string, string> = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        yellow: 'bg-yellow-500',
    };

    const activeColor = colors[color] || colors.emerald;
    const barColor = barColors[color] || barColors.emerald;

    const progress = hasGoal ? Math.min(100, (value / (goal || 1)) * 100) : 0;

    return (
        <div className="relative group overflow-hidden bg-zinc-900/50 backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] transition-all duration-500 shadow-xl flex flex-col items-center justify-between min-h-[160px] sm:min-h-[180px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="w-full flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] opacity-90 drop-shadow-sm">{fullLabel}</span>
                <div className={`w-2 h-2 rounded-full ${progress > 90 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`}></div>
            </div>

            <div className="flex flex-col items-center">
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-serif-premium font-bold text-white tracking-tighter drop-shadow-md">
                        {Math.round(value)}
                    </span>
                    <span className="text-emerald-500/80 text-[10px] font-serif-premium italic">{unit}</span>
                </div>
            </div>

            <div className="w-full mt-6">
                {hasGoal ? (
                    <div className="space-y-3">
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className={`h-full ${barColor}${isMobile ? '' : ' shadow-[0_0_15px_rgba(255,255,255,0.2)]'}`}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black text-zinc-300 uppercase tracking-widest drop-shadow-sm">
                            <span className="opacity-80">Consumo</span>
                            <span className="text-white/80">Meta: {goal}{unit}</span>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden opacity-40"></div>
                )}
            </div>
        </div>
    );
};

export default MacroCard;
