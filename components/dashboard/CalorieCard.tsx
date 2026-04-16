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

    /* ─── LAYOUT MOBILE: compacto horizontal ─── */
    if (isMobile) {
        return (
            <div className="relative bg-zinc-900/60 rounded-[1.5rem] p-4 shadow-xl overflow-hidden">
                {/* Linha de topo decorativa */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`} />

                {/* Linha 1: Status + Consumo % */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <span className={`relative flex h-2 w-2 shrink-0`}>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isOverLimit ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isOverLimit ? 'Limite excedido' : 'Performance otimizada'}
                        </span>
                    </div>
                    <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                        Consumo <span className="text-white font-black">{realPercent.toFixed(0)}%</span>
                    </span>
                </div>

                {/* Linha 2: Número principal + Restante/Objetivo */}
                <div className="flex items-center justify-between mb-3">
                    {/* Calorias */}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Energia processada</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-serif-premium font-bold text-white tracking-tighter leading-none">
                                {formatValue(consumed)}
                            </span>
                            <span className="text-emerald-500/80 text-sm font-serif-premium italic">kcal</span>
                        </div>
                    </div>

                    {/* Mini cards lado a lado */}
                    <div className="flex gap-2">
                        <div className="bg-white/[0.04] rounded-xl p-2.5 border border-white/5 flex flex-col items-center min-w-[72px]">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Restante</span>
                            <span className="text-base font-serif-premium font-bold text-white leading-none">{Math.max(0, safeGoal - consumed)}</span>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl p-2.5 border border-white/5 flex flex-col items-center min-w-[72px]">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Objetivo</span>
                            <span className="text-base font-serif-premium font-bold text-white leading-none">{safeGoal}</span>
                        </div>
                    </div>
                </div>

                {/* Barra de progresso */}
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${visualPercent}%` }}
                        transition={{ duration: 1.2, ease: "circOut" }}
                        className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
                    />
                </div>
                <div className="flex justify-end mt-1">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                        {visualPercent.toFixed(0)}% do objetivo
                    </span>
                </div>
            </div>
        );
    }

    /* ─── LAYOUT DESKTOP: original premium ─── */
    return (
        <div className="relative group">
            <div className={`absolute -inset-4 rounded-[3rem] blur-3xl opacity-0 transition-all duration-1000 group-hover:opacity-20 pointer-events-none ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}></div>

            <div className="relative bg-zinc-900/50 backdrop-blur-2xl rounded-[2.5rem] p-14 shadow-2xl overflow-hidden transition-all duration-500">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.1),transparent)]"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="flex justify-between items-center w-full mb-12">
                        <div className="flex flex-col">
                            <span className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.4em] mb-2 leading-none drop-shadow-md">Status do Sistema</span>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isOverLimit ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}></span>
                                </span>
                                <span className={`text-[11px] font-black uppercase tracking-widest ${isOverLimit ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {isOverLimit ? 'Limite Excedido' : 'Performance Otimizada'}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.4em] mb-2 leading-none drop-shadow-md block">Consumo Atual</span>
                            <p className="text-2xl font-serif-premium font-bold text-white leading-none drop-shadow-md">{realPercent.toFixed(0)}%</p>
                        </div>
                    </div>

                    <div className="relative mb-12 flex flex-col items-center justify-center py-4">
                        <span className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.5em] mb-4 opacity-90 drop-shadow-sm">Energia Processada</span>
                        <div className="flex items-baseline gap-3">
                            <span className="text-9xl font-serif-premium font-bold text-white tracking-tighter drop-shadow-[0_10px_40px_rgba(255,255,255,0.1)] leading-none">
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
                                className={`h-full ${isOverLimit ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]'}`}
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
