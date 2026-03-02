import React, { useState, useEffect } from 'react';
import { User, SavedMeal, FoodLog } from '../types';
import { db } from '../services/db';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { ArrowLeft, Trash2, Plus, Utensils, Bookmark, Save, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedMealsProps {
  user: User;
  onAddLog: (log: Omit<FoodLog, 'id' | 'timestamp'>) => void;
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const SavedMeals: React.FC<SavedMealsProps> = ({ user, onAddLog, onBack, onShowToast }) => {
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await db.savedMeals.list(user.id);
      setMeals(data);
      setLoading(false);
    };
    load();
  }, [user.id]);

  const handleDelete = async (id: string) => {
    await db.savedMeals.delete(user.id, id);
    setMeals(prev => prev.filter(m => m.id !== id));
    onShowToast("Refeição removida do arquivo.", 'info');
  };

  const handleAddToDay = (meal: SavedMeal) => {
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
    onShowToast("Refeição restaurada ao log diário! ✅", 'success');
    onBack();
  };

  return (
    <PremiumBackground className="flex flex-col p-6 overflow-y-auto" dim={true} intensity={1.0}>
      <div className="w-full max-w-2xl mx-auto py-12 md:py-20 relative z-10">
        <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 mb-10 text-white group">
          <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
        </button>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl md:text-5xl font-serif-premium font-bold text-white tracking-tight">
              <LetterPuller text="Favoritos" />
            </h1>
            <Bookmark className="w-8 h-8 text-emerald-500 opacity-60" />
          </div>
          <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] opacity-80">
            Arquivo de Nutrição Salva
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin opacity-40" />
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Sincronizando Banco de Dados...</p>
          </div>
        ) : meals.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/5 border-dashed">
            <Bookmark className="w-16 h-16 text-emerald-500/20 mx-auto mb-6" />
            <p className="font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em] mb-2 drop-shadow-sm">Arquivo Vazio</p>
            <p className="text-sm text-zinc-300 font-medium px-12 drop-shadow-sm">Você ainda não salvou refeições. Use o scanner ou registro manual para alimentar seu arquivo.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence>
              {meals.map((meal, index) => (
                <motion.div key={meal.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }} className="bg-zinc-950/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 relative group hover:border-emerald-500/30 transition-all overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all" />

                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                      <h3 className="font-serif-premium font-bold text-xl text-white leading-tight mb-2">{meal.name}</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{meal.calories} kcal</span>
                        </div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest drop-shadow-sm">{meal.weight}g</span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(meal.id)} className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 transition-all text-red-500 opacity-60 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-zinc-400 font-medium mb-8 leading-relaxed line-clamp-2 italic opacity-80 drop-shadow-sm">
                    <Utensils className="w-3 h-3 inline mr-2 opacity-30" />
                    {meal.items.map(i => i.name).join(', ')}
                  </div>

                  <button onClick={() => handleAddToDay(meal)} className="w-full py-4 bg-white/[0.03] border border-white/5 text-emerald-400 font-bold rounded-2xl uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-500 hover:text-white transition-all active:scale-[0.98] shadow-lg">
                    + Restaurar Refeição
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PremiumBackground>
  );
};

export default SavedMeals;
