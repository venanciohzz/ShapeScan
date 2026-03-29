import React from 'react';
import { FoodLog } from '../../types';
import { Utensils } from 'lucide-react';
import { motion } from 'framer-motion';

interface MealHistoryProps {
    todayLogs: FoodLog[];
    onEditLog: (log: FoodLog) => void;
    onDeleteLog: (id: string) => void;
    formatValue: (val: number) => number;
}

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const MealHistory: React.FC<MealHistoryProps> = ({ todayLogs, onEditLog, onDeleteLog, formatValue }) => {
    return (
        <div className="space-y-4 pb-20">
            <div className="flex items-center gap-4">
                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.5em] opacity-25 shrink-0">
                    Refeições de Hoje
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                {todayLogs.length > 0 && (
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-wider">
                        {todayLogs.length} {todayLogs.length === 1 ? 'item' : 'itens'}
                    </span>
                )}
            </div>

            {todayLogs.length > 0 ? (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2.5"
                >
                    {todayLogs.map((log) => (
                        <motion.div
                            key={log.id}
                            variants={itemVariants}
                            className="group relative overflow-hidden bg-zinc-950/40 backdrop-blur-xl px-5 py-4 rounded-[1.5rem] border border-white/8 hover:border-white/15 transition-all duration-300 shadow-lg flex justify-between items-center"
                        >
                            <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/[0.02] transition-colors duration-500 pointer-events-none" />

                            <div className="relative z-10 flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
                                    <p className="font-serif-premium font-bold text-sm text-white truncate">
                                        {log.name}
                                    </p>
                                </div>
                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-wider ml-3.5">
                                    {formatValue(log.protein)}g P&nbsp;&nbsp;·&nbsp;&nbsp;{formatValue(log.carbs)}g C&nbsp;&nbsp;·&nbsp;&nbsp;{formatValue(log.fat)}g G
                                </p>
                                <div className="flex gap-4 mt-3 ml-3.5">
                                    <button
                                        onClick={() => onEditLog(log)}
                                        className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-wider transition-colors"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => onDeleteLog(log.id)}
                                        className="text-[9px] font-black text-zinc-600 hover:text-red-400 uppercase tracking-wider transition-colors"
                                    >
                                        Remover
                                    </button>
                                </div>
                            </div>

                            <div className="relative z-10 text-right shrink-0">
                                <p className="font-serif-premium font-bold text-xl text-white tracking-tighter">
                                    {Math.round(log.calories)}
                                </p>
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">kcal</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <div className="bg-zinc-950/20 backdrop-blur-xl p-12 rounded-[2.5rem] text-center border border-dashed border-white/5">
                    <div className="w-12 h-12 bg-white/[0.03] border border-white/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Utensils className="w-5 h-5 text-zinc-600" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-2">
                        Nenhuma refeição hoje
                    </p>
                    <p className="text-[11px] text-zinc-700 leading-relaxed">
                        Suas análises aparecerão aqui.
                    </p>
                </div>
            )}
        </div>
    );
};

export default MealHistory;
