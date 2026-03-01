import React, { useState } from 'react';

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
            className={`
      p-6 md:p-10 rounded-[2.5rem] relative overflow-hidden transition-all duration-500 border
      ${isWaterGoalMet
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-500 shadow-2xl shadow-cyan-500/40 border-cyan-400/50 scale-[1.01]'
                    : 'glass-panel border-l-4 border-l-cyan-500 hover:shadow-cyan-500/10 dark:bg-zinc-900/30'
                }
    `}
        >
            {isWaterGoalMet && <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none"></div>}
            <div className="flex flex-col md:flex-row items-center gap-3 w-full mb-8">
                <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner transition-transform group-hover:scale-110 ${isWaterGoalMet ? 'bg-white/20 text-white' : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600'
                        }`}
                >
                    💧
                </div>
                <div className="flex flex-col flex-1 min-w-0 text-center md:text-left">
                    <h3
                        className={`font-black text-2xl leading-tight ${isWaterGoalMet ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                    >
                        Hidratação
                    </h3>
                    {manualWaterEdit ? (
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                            <input
                                type="number"
                                value={waterConsumed}
                                onChange={(e) => setWaterConsumed(parseInt(e.target.value) || 0)}
                                className="w-24 bg-black/5 dark:bg-white/5 rounded-lg px-2 py-1 text-lg font-bold outline-none border border-cyan-500 text-center md:text-left"
                                autoFocus
                                onBlur={() => setManualWaterEdit(false)}
                            />
                            <span className={`text-sm font-bold ${isWaterGoalMet ? 'text-white/60' : 'text-gray-400'}`}>
                                / {waterGoal} ml
                            </span>
                        </div>
                    ) : (
                        <span
                            className={`text-sm font-black uppercase tracking-widest mt-1 cursor-pointer hover:underline ${isWaterGoalMet ? 'text-cyan-100' : 'text-cyan-600 dark:text-cyan-400'
                                }`}
                            onClick={() => setManualWaterEdit(true)}
                        >
                            {waterConsumed} / {waterGoal} ml
                        </span>
                    )}
                </div>
                {isWaterGoalMet && (
                    <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
                        <span className="text-[11px] font-black text-white uppercase tracking-widest">Completo!</span>
                    </div>
                )}
            </div>
            <div className="w-full h-5 rounded-full overflow-hidden border p-0.5 mb-8 bg-black/20 border-white/10 relative">
                <div
                    className={`h-full transition-all duration-1000 ease-out relative rounded-full ${isWaterGoalMet
                            ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]'
                            : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                        }`}
                    style={{ width: `${waterPercent}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse transition-opacity"></div>
                </div>
            </div>
            <div className="flex gap-4">
                <button
                    onClick={() => addWater(250)}
                    className={`flex-1 py-5 rounded-2xl font-black uppercase text-base tracking-[0.1em] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 ${isWaterGoalMet
                            ? 'bg-white text-blue-600 hover:bg-cyan-50'
                            : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-cyan-500/30'
                        }`}
                >
                    <span className="text-2xl">+</span> 250ml
                </button>
                <button
                    onClick={() => setShowWaterShortcuts(!showWaterShortcuts)}
                    className={`w-16 flex items-center justify-center rounded-2xl border-2 transition-all ${isWaterGoalMet
                            ? 'border-white/30 text-white hover:bg-white/10'
                            : showWaterShortcuts
                                ? 'bg-cyan-50 dark:bg-cyan-900/40 border-cyan-500 text-cyan-600'
                                : 'border-gray-100 dark:border-zinc-800 text-gray-400'
                        }`}
                >
                    <svg
                        className={`w-8 h-8 transition-transform duration-300 ${showWaterShortcuts ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
            {showWaterShortcuts && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4 animate-in slide-in-from-top-2 duration-200">
                    {[250, 500, 1000, 1500, 2000].map((amount) => (
                        <button
                            key={amount}
                            onClick={() => {
                                addWater(amount);
                                setShowWaterShortcuts(false);
                            }}
                            className={`py-3 rounded-lg text-xs font-black transition-colors border ${isWaterGoalMet
                                    ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                    : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-transparent hover:border-cyan-200 hover:text-cyan-600'
                                }`}
                        >
                            +{amount < 1000 ? `${amount}ml` : `${amount / 1000}L`}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            setWaterConsumed(0);
                            setShowWaterShortcuts(false);
                        }}
                        className={`py-3 rounded-lg text-xs font-black transition-colors ${isWaterGoalMet ? 'bg-red-500/20 text-white hover:bg-red-500/40' : 'bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100'
                            }`}
                    >
                        Reset
                    </button>
                </div>
            )}
        </div>
    );
};

export default HydrationCard;
