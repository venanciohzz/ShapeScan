import React from 'react';
import { FoodLog } from '../../types';

interface MealHistoryProps {
    todayLogs: FoodLog[];
    onEditLog: (log: FoodLog) => void;
    onDeleteLog: (id: string) => void;
    formatValue: (val: number) => number;
}

const MealHistory: React.FC<MealHistoryProps> = ({
    todayLogs,
    onEditLog,
    onDeleteLog,
    formatValue,
}) => {
    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-[11px] font-black text-white uppercase tracking-[0.5em] opacity-30">
                    Registros Recentes
                </h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>

            {todayLogs.length > 0 ? (
                <div className="space-y-4">
                    {todayLogs.map((log) => (
                        <div
                            key={log.id}
                            className="group relative overflow-hidden bg-zinc-950/40 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 hover:border-emerald-500/30 transition-all duration-500 shadow-xl flex justify-between items-center active:scale-[0.99]"
                        >
                            {/* Hover Glow */}
                            <div className="absolute -inset-10 bg-emerald-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                            <div className="relative z-10 flex-1 min-w-0 pr-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    <p className="font-serif-premium font-bold text-lg text-white truncate">
                                        {log.name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest opacity-60">
                                        Macros Detectados:
                                    </span>
                                    <p className="text-[10px] font-black text-emerald-500/80 tracking-widest uppercase">
                                        {formatValue(log.protein)}P <span className="text-zinc-700 mx-1">/</span> {formatValue(log.carbs)}C <span className="text-zinc-700 mx-1">/</span> {formatValue(log.fat)}G
                                    </p>
                                </div>

                                <div className="flex gap-4 mt-6">
                                    <button
                                        onClick={() => onEditLog(log)}
                                        className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em] transition-colors"
                                    >
                                        Ajustar
                                    </button>
                                    <button
                                        onClick={() => onDeleteLog(log.id)}
                                        className="text-[9px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-[0.2em] transition-colors"
                                    >
                                        Remover
                                    </button>
                                </div>
                            </div>

                            <div className="relative z-10 text-right shrink-0">
                                <p className="font-serif-premium font-bold text-3xl text-white tracking-tighter">
                                    {formatValue(log.calories)}
                                </p>
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest opacity-50">kcal</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-zinc-950/20 backdrop-blur-xl p-16 rounded-[3rem] text-center border border-dashed border-white/5">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl filter grayscale opacity-30">
                        🍽️
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 opacity-50">
                        Nenhum registro no cache
                    </p>
                </div>
            )}
        </div>
    );
};

export default MealHistory;
