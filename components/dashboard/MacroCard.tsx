import React from 'react';
import { motion } from 'framer-motion';

interface MacroCardProps {
    label: string;
    value: number;
    unit: string;
    fullLabel: string;
    goal?: number;
    color?: 'emerald' | 'blue' | 'yellow';
}

const colorMap = {
    emerald: {
        text: 'text-emerald-400',
        bar: 'bg-emerald-500',
        dot: 'bg-emerald-500',
        glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    },
    blue: {
        text: 'text-blue-400',
        bar: 'bg-blue-500',
        dot: 'bg-blue-500',
        glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
    },
    yellow: {
        text: 'text-amber-400',
        bar: 'bg-amber-500',
        dot: 'bg-amber-500',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
    },
};

const MacroCard: React.FC<MacroCardProps> = ({ label, value, unit, fullLabel, goal, color = 'emerald' }) => {
    const colors = colorMap[color];
    const hasGoal = typeof goal === 'number' && goal > 0;
    const progress = hasGoal ? Math.min(100, (value / goal!) * 100) : 0;
    const isNearGoal = progress >= 90;

    return (
        <div className="relative group overflow-hidden bg-zinc-950/40 backdrop-blur-2xl p-5 rounded-[2rem] border border-white/8 hover:border-white/18 transition-all duration-400 shadow-xl flex flex-col justify-between min-h-[140px]">
            {/* Top shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{fullLabel}</span>
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isNearGoal ? `${colors.dot} animate-pulse ${colors.glow}` : 'bg-white/15'}`} />
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-serif-premium font-bold text-white tracking-tighter">
                    {Math.round(value)}
                </span>
                <span className={`text-[10px] font-serif-premium italic ${colors.text}`}>{unit}</span>
            </div>

            {/* Progress bar */}
            {hasGoal ? (
                <div className="space-y-2">
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.4, ease: 'circOut' }}
                            className={`h-full ${colors.bar} rounded-full`}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-wider">{progress.toFixed(0)}%</span>
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-wider">/ {goal}{unit}</span>
                    </div>
                </div>
            ) : (
                <div className="h-1 bg-white/5 rounded-full" />
            )}
        </div>
    );
};

export default MacroCard;
