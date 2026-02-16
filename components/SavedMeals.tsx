
import React, { useState, useEffect } from 'react';
import { User, SavedMeal, FoodLog } from '../types';
import { db } from '../services/db';

interface SavedMealsProps {
  user: User;
  onAddLog: (log: Omit<FoodLog, 'id' | 'timestamp'>) => void;
  onBack: () => void;
}

const SavedMeals: React.FC<SavedMealsProps> = ({ user, onAddLog, onBack }) => {
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await db.savedMeals.list(user.id);
      setMeals(data);
      setLoading(false);
    };
    load();
  }, [user.email]);

  const handleDelete = async (id: string) => {
    await db.savedMeals.delete(user.id, id);
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  const handleAddToDay = (meal: SavedMeal) => {
    // CRITICAL FIX: Generate new IDs for items to avoid React key collisions
    // if the same meal is added multiple times or edited.
    const newItems = meal.items.map(item => ({
      ...item,
      id: crypto.randomUUID()
    }));

    onAddLog({
      name: meal.name,
      items: newItems,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      weight: meal.weight
    });
    alert("Refeição adicionada ao dia! ✅");
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 md:pt-14 pb-24 text-black dark:text-white min-h-screen">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-black dark:text-white">
        <span className="text-lg pb-0.5">←</span>
      </button>

      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-black italic tracking-tight">Refeições Salvas</h1>
        <span className="bg-cyan-100 text-cyan-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Favoritos</span>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
      ) : meals.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border-2 border-dashed border-gray-300 dark:border-zinc-700">
          <p className="text-6xl mb-4">💾</p>
          <p className="font-black text-gray-500 uppercase text-[10px] tracking-widest">Nenhuma refeição salva.</p>
          <p className="text-xs text-emerald-600 font-bold mt-2">Salve refeições no "Registro Manual" ou Scanner.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meals.map(meal => (
            <div key={meal.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-zinc-800 shadow-sm relative group hover:border-emerald-500/30 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-lg leading-tight">{meal.name}</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">{meal.calories} kcal</p>
                </div>
                <button onClick={() => handleDelete(meal.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase">Excluir</button>
              </div>
              <div className="text-xs text-gray-500 font-medium mb-4">
                {meal.items.map(i => i.name).join(', ')}
              </div>
              <button onClick={() => handleAddToDay(meal)} className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                + Adicionar ao Dia
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedMeals;
