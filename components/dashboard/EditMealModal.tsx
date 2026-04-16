import React, { useState, useEffect } from 'react';
import { FoodLog, FoodItem } from '../../types';

interface EditMealModalProps {
    log: FoodLog | null;
    onClose: () => void;
    onSave: (log: FoodLog) => void;
    formatValue: (val: number) => number;
}

const EditMealModal: React.FC<EditMealModalProps> = ({ log, onClose, onSave, formatValue }) => {
    const [localLog, setLocalLog] = useState<FoodLog | null>(null);

    useEffect(() => {
        if (log) {
            setLocalLog(JSON.parse(JSON.stringify(log))); // Deep copy
        } else {
            setLocalLog(null);
        }
    }, [log]);

    if (!localLog) return null;

    const handleUpdateItem = (itemId: string, updates: Partial<FoodItem>) => {
        if (!localLog) return;
        const newItems = localLog.items.map((item) => {
            if (item.id === itemId) {
                const updatedItem = { ...item, ...updates };
                if (updates.weight !== undefined && typeof updates.weight === 'number') {
                    if (item.weight > 0) {
                        const density = item.calories / item.weight;
                        updatedItem.calories = Number((updates.weight * density).toFixed(1));
                    }
                }
                return updatedItem;
            }
            return item;
        });

        const newTotalCal = newItems.reduce((acc, item) => acc + item.calories, 0);
        const newTotalWeight = newItems.reduce((acc, item) => acc + item.weight, 0);
        const ratio = localLog.calories > 0 ? newTotalCal / localLog.calories : 1;

        setLocalLog({
            ...localLog,
            items: newItems,
            calories: newTotalCal,
            weight: newTotalWeight,
            protein: Number((localLog.protein * ratio).toFixed(1)),
            carbs: Number((localLog.carbs * ratio).toFixed(1)),
            fat: Number((localLog.fat * ratio).toFixed(1)),
        });
    };

    const handleRemoveItem = (itemId: string) => {
        if (!localLog) return;
        const newItems = localLog.items.filter((item) => item.id !== itemId);
        if (newItems.length === 0) {
            setLocalLog({ ...localLog, items: [], calories: 0, weight: 0, protein: 0, carbs: 0, fat: 0 });
            return;
        }
        const newTotalCal = newItems.reduce((acc, item) => acc + item.calories, 0);
        const newTotalWeight = newItems.reduce((acc, item) => acc + item.weight, 0);
        const removedItem = localLog.items.find((i) => i.id === itemId);
        let newProt = localLog.protein;
        let newCarb = localLog.carbs;
        let newFat = localLog.fat;

        if (removedItem && localLog.calories > 0) {
            const ratioRemoved = removedItem.calories / localLog.calories;
            newProt = localLog.protein - localLog.protein * ratioRemoved;
            newCarb = localLog.carbs - localLog.carbs * ratioRemoved;
            newFat = localLog.fat - localLog.fat * ratioRemoved;
        }

        setLocalLog({
            ...localLog,
            items: newItems,
            calories: newTotalCal,
            weight: newTotalWeight,
            protein: Math.max(0, Number(newProt.toFixed(1))),
            carbs: Math.max(0, Number(newCarb.toFixed(1))),
            fat: Math.max(0, Number(newFat.toFixed(1))),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="bg-white dark:bg-zinc-950 w-full md:max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border-t-2 md:border border-emerald-500/20 shadow-2xl flex flex-col max-h-[85dvh] md:max-h-[90vh] animate-in slide-in-from-bottom-10 duration-200">
                <div className="mb-6 text-center shrink-0">
                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 md:hidden"></div>
                    <h3 className="text-2xl font-black italic tracking-tighter text-gray-900 dark:text-white">
                        Editar Refeição
                    </h3>
                </div>
                <div className="overflow-y-auto flex-1 mb-6 pr-1 scrollbar-hide">
                    <div className="mb-6">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase mb-2 tracking-widest">
                            Título
                        </label>
                        <input
                            type="text"
                            value={localLog.name}
                            onChange={(e) => setLocalLog({ ...localLog, name: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl input-premium outline-none font-bold text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="space-y-4 mb-4">
                        {localLog.items.map((item) => (
                            <div
                                key={item.id}
                                className="bg-gray-50 dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 relative group transition-colors focus-within:border-emerald-500"
                            >
                                <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full text-xs font-black shadow-lg z-10 flex items-center justify-center"
                                >
                                    ×
                                </button>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                        className="w-full bg-transparent border-b border-gray-200 dark:border-zinc-700 py-1 font-bold outline-none focus:border-emerald-500 text-gray-900 dark:text-white text-sm"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                                Peso (g)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={item.weight}
                                                onChange={(e) =>
                                                    handleUpdateItem(item.id, { weight: parseFloat(e.target.value) })
                                                }
                                                className="w-full bg-transparent font-mono text-sm outline-none text-emerald-600 dark:text-emerald-500 font-bold border-b border-transparent focus:border-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                                kcal
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={item.calories}
                                                onChange={(e) =>
                                                    handleUpdateItem(item.id, { calories: parseFloat(e.target.value) })
                                                }
                                                className="w-full bg-transparent font-mono text-sm outline-none text-gray-900 dark:text-white border-b border-transparent focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Novo Total</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                            {formatValue(localLog.calories)} <span className="text-sm text-gray-400">kcal</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 shrink-0 pb-4 md:pb-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-gray-100 dark:bg-zinc-800 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-colors text-gray-600 dark:text-white"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(localLog)}
                        className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-colors"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditMealModal;
