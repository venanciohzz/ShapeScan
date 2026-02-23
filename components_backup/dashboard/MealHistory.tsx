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
        <div className="space-y-4 pb-8">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 tracking-tight text-gray-900 dark:text-white">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                Refeições de Hoje
            </h2>
            {todayLogs.length > 0 ? (
                todayLogs.map((log) => (
                    <div
                        key={log.id}
                        className="glass-panel p-4 rounded-2xl flex justify-between items-center group hover:border-emerald-500/50 transition-colors min-w-0"
                    >
                        <div className="flex-1 min-w-0 pr-3">
                            <p className="font-bold text-gray-900 dark:text-white leading-tight truncate text-base">
                                {log.name}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-1 truncate">
                                {formatValue(log.protein)}P • {formatValue(log.carbs)}C • {formatValue(log.fat)}G
                            </p>
                            <div className="flex gap-4 mt-3">
                                <button
                                    onClick={() => onEditLog(log)}
                                    className="text-[10px] font-black text-gray-400 hover:text-emerald-500 uppercase tracking-widest p-1"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => onDeleteLog(log.id)}
                                    className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest p-1"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="font-black text-lg md:text-xl text-gray-900 dark:text-white">
                                {formatValue(log.calories)}
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">kcal</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="glass-panel p-10 rounded-[2.5rem] text-center border-dashed border-2 border-gray-300 dark:border-zinc-700">
                    <p className="text-4xl mb-3">🍽️</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Nenhum registro hoje.
                    </p>
                </div>
            )}
        </div>
    );
};

export default MealHistory;
