import React from 'react';
import { motion } from 'framer-motion';

interface CalorieCardProps {
    consumed: number;
    safeGoal: number;
    isOverLimit: boolean;
    realPercent: number;
    visualPercent: number;
}

const CalorieCard: React.FC<CalorieCardProps> = ({
    consumed,
    safeGoal,
    isOverLimit,
    realPercent,
    visualPercent,
}) => {
    const remaining = Math.max(0, safeGoal - consumed);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative group"
        >
            {/* Ambient glow */}
            <div className={`absolute -inset-4 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-20 transition-all duration-1000 pointer-events-none ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`} />

            <div className="relative bg-zinc-950/40 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-2xl overflow-hidden group-hover:border-white/20 transition-all duration-500">
                {/* Subtle radial background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.06),transparent_60%)] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    {/* Header row */}
                    <div className="flex justify-between items-start w-full mb-10">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Status</span>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isOverLimit ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {isOverLimit ? 'Limite Excedido' : 'Em Dia'}
                                </span>
                            </div>
                        </div>
                        <div className="text-right flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Consumido</span>
                            <span className="text-xl font-serif-premium font-bold text-white">{realPercent.toFixed(0)}%</span>
                        </div>
                    </div>

                    {/* Main number */}
                    <div className="flex flex-col items-center mb-10">
                        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-500 mb-3">Calorias do Dia</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-7xl md:text-9xl font-serif-premium font-bold text-white tracking-tighter leading-none">
                                {Math.round(consumed)}
                            </span>
                            <span className={`text-lg font-serif-premium italic ${isOverLimit ? 'text-red-400/70' : 'text-emerald-400/70'}`}>kcal</span>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 w-full gap-4 mb-8">
                        <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5 flex flex-col items-center hover:bg-white/[0.05] transition-colors duration-300">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1.5">Restante</span>
                            <span className="text-xl font-serif-premium font-bold text-white">{Math.round(remaining)}</span>
                        </div>
                        <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5 flex flex-col items-center hover:bg-white/[0.05] transition-colors duration-300">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1.5">Meta</span>
                            <span className="text-xl font-serif-premium font-bold text-white">{safeGoal}</span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full space-y-3">
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${visualPercent}%` }}
                                transition={{ duration: 1.2, ease: 'circOut' }}
                                className={`h-full rounded-full ${isOverLimit
                                    ? 'bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.4)]'
                                    : 'bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.4)]'
                                }`}
                            />
                        </div>
                        <div className="flex justify-between items-center px-0.5">
                            <div className="flex gap-0.5">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1 w-1 rounded-sm transition-all duration-500 ${visualPercent > i * 5
                                            ? isOverLimit ? 'bg-red-500/60' : 'bg-emerald-500/60'
                                            : 'bg-white/10'
                                        }`}
                                    />
                                ))}
                            </div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                                {visualPercent.toFixed(0)}% da meta
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default CalorieCard;
