import React from 'react';

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
    const formatValue = (val: number) => Number(val.toFixed(1));

    return (
        <div className="relative group px-1">
            <div
                className={`absolute -inset-1 rounded-[3rem] blur-2xl opacity-20 transition-opacity duration-1000 group-hover:opacity-40 pointer-events-none ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
            ></div>
            <div className="relative glass-panel rounded-[2.5rem] p-8 md:p-12 overflow-hidden border border-white/10 dark:bg-zinc-950/40 backdrop-blur-2xl shadow-3xl">
                <div className="absolute inset-0 pointer-events-none opacity-5 overflow-hidden">
                    <div className="w-full h-[1px] bg-white absolute animate-scan-y top-0"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_4px,3px_100%] pointer-events-none"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="flex justify-between items-center w-full mb-10 pb-4 border-b border-white/5">
                        <div className="flex flex-col">
                            <span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Status Sistema</span>
                            <div className="flex items-center gap-1.5">
                                <div
                                    className={`w-2 h-2 rounded-full animate-pulse ${isOverLimit ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                                        }`}
                                ></div>
                                <span
                                    className={`text-[11px] font-black uppercase tracking-widest ${isOverLimit ? 'text-red-500' : 'text-emerald-500 text-shadow-glow'
                                        }`}
                                >
                                    {isOverLimit ? 'Sobrecarga' : 'Otimizado'}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Eficiência</span>
                            <p className="text-xl font-black text-white leading-none">{realPercent.toFixed(0)}%</p>
                        </div>
                    </div>

                    <div className="relative mb-8 flex flex-col items-center justify-center py-6">
                        <div className="absolute -inset-10 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Energia Consumida</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] leading-none">
                                {formatValue(consumed)}
                            </span>
                            <span className="text-gray-500 text-lg font-bold">kcal</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 w-full gap-4 mb-8">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Restante</span>
                            <span className="text-lg font-black text-white">{Math.max(0, safeGoal - consumed)}</span>
                            <span className="text-[9px] font-bold text-gray-500 uppercase">kcal</span>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Capacidade</span>
                            <span className="text-lg font-black text-white">{safeGoal}</span>
                            <span className="text-[9px] font-bold text-gray-500 uppercase">kcal</span>
                        </div>
                    </div>

                    <div className="w-full space-y-2 lg:px-4">
                        <div className="flex justify-between items-center px-1">
                            <div className="flex gap-1.5 md:gap-2">
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 w-4 md:w-5 rounded-sm transition-all duration-500 ${visualPercent > i * (100 / 12)
                                            ? isOverLimit
                                                ? 'bg-red-500 shadow-[0_0_5px_red]'
                                                : 'bg-emerald-500 shadow-[0_0_5px_#10b981]'
                                            : 'bg-white/5'
                                            }`}
                                    ></div>
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-tighter font-mono">
                                {visualPercent.toFixed(1)}% LOAD
                            </span>
                        </div>
                        <div className="w-full h-2 md:h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'
                                    } shadow-[0_0_10px_rgba(16,185,129,0.5)]`}
                                style={{ width: `${visualPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalorieCard;
