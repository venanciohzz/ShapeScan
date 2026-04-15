import React from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../src/utils/useIsMobile';

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
    const isMobile = useIsMobile();
    const formatValue = (val: number) => Number(val.toFixed(1));

    return (
        <div className="relative group">
            {/* Glow Effect */}
            <div
                className={`absolute -inset-4 rounded-[3rem] blur-3xl opacity-0 transition-all duration-1000 group-hover:opacity-20 pointer-events-none ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
            ></div>

            <div className="relative bg-zinc-900/50 backdrop-blur-2xl rounded-[2.5rem] p-10 md:p-14 shadow-2xl overflow-hidden transition-all duration-500">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.1),transparent)]"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="flex justify-between items-center w-full mb-12">
                        <div className="flex flex-col">
                            <span className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.4em] mb-2 leading-none drop-shadow-md">Status do Sistema</span>
                            <div className="flex items-center gap-2">
                                <span className={`relative flex h-2 w-2`}>
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isOverLimit ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}></span>
                                </span>
                                <span className={`text-[11px] font-black uppercase tracking-widest ${isOverLimit ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {isOverLimit ? 'Limite Excedido' : 'Performance Otimizada'}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.4em] mb-2 leading-none drop-shadow-md">Consumo Atual</span>
                            <p className="text-2xl font-serif-premium font-bold text-white leading-none drop-shadow-md">{realPercent.toFixed(0)}%</p>
                        </div>
                    </div>

                    <div className="relative mb-12 flex flex-col items-center justify-center py-4">
                        <span className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.5em] mb-4 opacity-90 drop-shadow-sm">Energia Processada</span>
                        <div className="flex items-baseline gap-3">
                            <span className="text-7xl md:text-9xl font-serif-premium font-bold text-white tracking-tighter drop-shadow-[0_10px_40px_rgba(255,255,255,0.1)] leading-none">
                                {formatValue(consumed)}
                            </span>
                            <span className="text-emerald-500/80 text-xl font-serif-premium italic">kcal</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 w-full gap-6 mb-12">
                        <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 flex flex-col items-center group/card hover:bg-white/[0.05] transition-colors duration-500">
                            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-2 drop-shadow-sm">Restante</span>
                            <span className="text-2xl font-serif-premium font-bold text-white">{Math.max(0, safeGoal - consumed)}</span>
                        </div>
                        <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 flex flex-col items-center group/card hover:bg-white/[0.05] transition-colors duration-500">
                            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-2 drop-shadow-sm">Objetivo Final</span>
                            <span className="text-2xl font-serif-premium font-bold text-white">{safeGoal}</span>
                        </div>
                    </div>

                    <div className="w-full space-y-4">
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10 relative">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${visualPercent}%` }}
                                transition={{ duration: 1.2, ease: "circOut" }}
                                className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}${isMobile ? '' : isOverLimit ? ' shadow-[0_0_20px_rgba(239,68,68,0.5)]' : ' shadow-[0_0_20px_rgba(16,185,129,0.5)]'}`}
                            />
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <div className="flex gap-1">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-0.5 w-1 rounded-sm transition-all duration-700 ${visualPercent > i * (100 / 20)
                                            ? isOverLimit ? 'bg-red-500' : 'bg-emerald-500'
                                            : 'bg-white/20'
                                            }`}
                                    ></div>
                                ))}
                            </div>
                            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest opacity-80 drop-shadow-sm">
                                {visualPercent.toFixed(1)}% Load System
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalorieCard;
