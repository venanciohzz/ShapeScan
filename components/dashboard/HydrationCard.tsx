import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HydrationCardProps {
    waterConsumed: number;
    setWaterConsumed: (amount: number) => void;
    waterGoal: number;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const HydrationCard: React.FC<HydrationCardProps> = ({
    waterConsumed,
    setWaterConsumed,
    waterGoal,
    onShowToast,
}) => {
    const [showWaterShortcuts, setShowWaterShortcuts] = useState(false);
    const [manualWaterEdit, setManualWaterEdit] = useState(false);

    const waterPercent = Math.min((waterConsumed / waterGoal) * 100, 100);
    const isWaterGoalMet = waterConsumed >= waterGoal;

    const addWater = (amount: number) => {
        setWaterConsumed(waterConsumed + amount);
        onShowToast(`${amount}ml adicionados! 💧`, 'success');
    };

    return (
        <div
            className={`p-10 rounded-[3rem] relative overflow-hidden transition-all duration-700 border border-white/10 bg-zinc-950/40 backdrop-blur-2xl group shadow-2xl`}
        >
            {/* Background Glow */}
            <div className={`absolute -inset-10 bg-cyan-500/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-30 transition-opacity duration-1000`}></div>

            <div className="relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10">
                    <div className="flex flex-col">
                        <span className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.4em] mb-3 leading-none opacity-90 drop-shadow-sm">Monitoramento H2O</span>
                        <div className="flex items-center gap-3">
                            <h3 className="font-serif-premium font-bold text-2xl md:text-3xl text-white tracking-tight drop-shadow-md">Hidratação</h3>
                            {isWaterGoalMet && (
                                <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                    Otimizado
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                        <span className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.4em] mb-3 leading-none opacity-90 drop-shadow-sm">Nível Atual</span>
                        {manualWaterEdit ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={waterConsumed}
                                    onChange={(e) => setWaterConsumed(parseInt(e.target.value) || 0)}
                                    className="w-20 bg-white/5 rounded-xl px-2 py-1 text-xl font-serif-premium font-bold text-white outline-none border border-cyan-500/50 text-center"
                                    autoFocus
                                    onBlur={() => setManualWaterEdit(false)}
                                />
                            </div>
                        ) : (
                            <div
                                className="flex items-baseline gap-1 cursor-pointer group/data"
                                onClick={() => setManualWaterEdit(true)}
                            >
                                <span className="text-2xl md:text-3xl font-serif-premium font-bold text-white group-hover/data:text-cyan-400 transition-colors drop-shadow-md">{waterConsumed}</span>
                                <span className="text-zinc-300 text-[10px] md:text-xs font-serif-premium italic drop-shadow-sm">/ {waterGoal}ml</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 mb-10">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${waterPercent}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className={`h-full relative rounded-full ${isWaterGoalMet
                            ? 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                            }`}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </motion.div>
                </div>

                <div className="flex gap-4">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addWater(250)}
                        className={`flex-[3] py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 border shadow-xl ${isWaterGoalMet
                            ? 'bg-white text-zinc-950 border-white shadow-white/10 hover:bg-zinc-100'
                            : 'bg-zinc-950 text-white border-white/10 hover:border-cyan-500/50 hover:bg-zinc-900'
                            }`}
                    >
                        <span className="text-xl">+</span> Injetar 250ml
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowWaterShortcuts(!showWaterShortcuts)}
                        className={`flex-1 flex items-center justify-center rounded-[2rem] border transition-all duration-500 active:scale-90 ${showWaterShortcuts
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                            : 'bg-zinc-950 border-white/10 text-zinc-500 hover:text-white hover:border-white/30'
                            }`}
                    >
                        <svg
                            className={`w-6 h-6 transition-transform duration-500 ${showWaterShortcuts ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </motion.button>
                </div>

                <AnimatePresence>
                    {showWaterShortcuts && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-6"
                        >
                            <div className="grid grid-cols-3 gap-3 p-1">
                                {[250, 500, 1000, 1500, 2000].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => {
                                            addWater(amount);
                                            setShowWaterShortcuts(false);
                                        }}
                                        className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all active:scale-95"
                                    >
                                        +{amount < 1000 ? `${amount}ml` : `${amount / 1000}L`}
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setWaterConsumed(0);
                                        setShowWaterShortcuts(false);
                                    }}
                                    className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-red-500/5 border border-red-500/10 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all active:scale-95"
                                >
                                    Reset
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default HydrationCard;
