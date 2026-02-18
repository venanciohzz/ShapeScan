import React from 'react';

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
        <div className="glass-panel p-4 md:p-5 rounded-2xl md:rounded-[2rem] flex flex-col md:items-center md:justify-center hover:-translate-y-1 transition-all duration-300 group shadow-premium hover:shadow-premium-hover min-w-0 dark:bg-zinc-900/40">
            {/* MOBILE: HORIZONTAL DENSE LAYOUT */}
            <div className="md:hidden flex flex-col w-full gap-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border ${activeColor}`}
                        >
                            {label.substring(0, 1)}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                            {fullLabel}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-gray-900 dark:text-white">{Math.round(value)}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{unit}</span>
                    </div>
                </div>

                {hasGoal && (
                    <div className="w-full space-y-1">
                        <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                            <div
                                className={`h-full transition-all duration-1000 ${barColor} shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                            <span>Consumido</span>
                            <span>
                                Meta: {goal}
                                {unit}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* DESKTOP: ORIGINAL ROUNDED LAYOUT */}
            <div className="hidden md:flex flex-col items-center justify-center w-full">
                <div className="w-16 h-16 rounded-full border-[4px] flex items-center justify-center mb-3 transition-all shadow-lg border-gray-100 dark:border-zinc-800">
                    <span className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">
                        {Math.round(value)}
                    </span>
                </div>
                <p className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    {fullLabel}
                </p>
                {hasGoal && (
                    <div className="flex items-baseline gap-1 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-white/5">
                        <span className="text-sm font-black text-gray-900 dark:text-white">{value}</span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">
                            / {goal}
                            {unit}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MacroCard;
