
import React, { useState, useEffect } from 'react';
import { User, FoodLog, FoodAnalysisResult, FoodItem } from '../types';
import { analyzePlate, getManualFoodMacros } from '../services/openaiService';
import { compressImage } from '../utils/security';
import { db } from '../services/db';
import { Camera, Image as ImageIcon, CheckCircle2, Save, RefreshCw, ScanSearch } from 'lucide-react';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { motion, AnimatePresence } from 'framer-motion';

interface FoodAnalyzerProps {
  user: User;
  onAdd: (log: Omit<FoodLog, 'id' | 'timestamp'>) => void;
  onBack: () => void;
  mode: 'ai' | 'manual';
  onUpdateUser: (user: User) => void;
  onUpgrade: () => void;
  onUpgradePro: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const FoodAnalyzer = ({ user, onAdd, onBack, mode, onUpdateUser, onUpgrade, onUpgradePro, onShowToast }: FoodAnalyzerProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [error, setError] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalType, setLimitModalType] = useState<'free' | 'daily'>('daily');
  const [scanStep, setScanStep] = useState(0);
  const [mealDescription, setMealDescription] = useState('');

  const scanMessages = ["Digitalizando padrões...", "Extraindo vetores...", "Calculando densidade...", "Gerando relatório..."];

  useEffect(() => {
    let interval: any;
    if (loading) {
      setScanStep(0);
      interval = setInterval(() => {
        setScanStep(prev => (prev < scanMessages.length - 1 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [loading]);

  const getDailyLimit = () => {
    if (user.isAdmin) return 999;
    switch (user.plan) {
      case 'pro_monthly':
      case 'pro_annual': return 12;
      case 'monthly':
      case 'annual':
      case 'lifetime': return 6;
      default: return 0;
    }
  };

  const checkUsageLimit = async () => {
    if (user.isAdmin) return true;
    if (user.plan === 'free') {
      if ((user.freeScansUsed || 0) >= 1) {
        setLimitModalType('free');
        setShowLimitModal(true);
        return false;
      }
      return true;
    }
    const limit = getDailyLimit();
    const currentUsage = await db.usage.getDaily(user.id, 'food');
    if (currentUsage >= limit) {
      setLimitModalType('daily');
      setShowLimitModal(true);
      return false;
    }
    return true;
  };

  const incrementUsage = async () => {
    if (user.isAdmin) return;
    if (user.plan === 'free') {
      const newCount = await db.usage.incrementTrial(user.id);
      onUpdateUser({ ...user, freeScansUsed: newCount });
    } else {
      await db.usage.incrementDaily(user.id, 'food');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    setError('');
    const canContinue = await checkUsageLimit();
    if (!canContinue) {
      setLoading(false);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) {
      setLoading(false);
      return;
    }
    setPreviewImage(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const rawBase64 = reader.result as string;
          const compressedBase64 = await compressImage(rawBase64);
          setPreviewImage(compressedBase64);
          const apiBase64 = compressedBase64.split(',')[1];
          const data = await analyzePlate(apiBase64, mealDescription);
          if (!data || !data.items) throw new Error("Não foi possível identificar alimentos.");
          await incrementUsage();
          setResult(data);
        } catch (err: any) {
          console.error("Erro no scanner:", err);
          let msg = err.message || "Falha na análise";
          if (msg.includes('401') || msg.includes('jwt')) msg = "Sessão expirada.";
          else if (msg.includes('403') || msg.includes('limit')) {
            setLimitModalType('daily');
            setShowLimitModal(true);
          }
          onShowToast(`Erro: ${msg}`, 'error');
          setPreviewImage(null);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      onShowToast("Erro ao iniciar análise.", 'error');
      setLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualName) {
      onShowToast("Descreva o alimento com detalhes.", 'error');
      return;
    }
    setLoading(true);
    try {
      const analysis = await getManualFoodMacros(manualName);
      if (!analysis?.items?.length) throw new Error("Falha no cálculo.");
      setResult(analysis);
    } catch (err) {
      onShowToast("Erro ao consultar a IA.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmAdd = async (saveAsSavedMeal: boolean = false) => {
    if (!result) return;
    const items = result.items || [];
    const foodItems: FoodItem[] = items.map(it => ({
      id: Math.random().toString(36).substr(2, 9),
      name: it.name,
      calories: Number(it.calories.toFixed(1)),
      weight: Number(it.weight.toFixed(1)),
      protein: Number((it.protein || 0).toFixed(1)),
      carbs: Number((it.carbs || 0).toFixed(1)),
      fat: Number((it.fat || 0).toFixed(1))
    }));

    const mealName = result.mealName || manualName || (foodItems.length > 1 ? "Refeição Completa" : (foodItems[0]?.name || "Refeição"));
    const mealData = {
      name: mealName,
      items: foodItems,
      calories: Number(result.totalCalories.toFixed(1)),
      protein: Number(result.totalProtein.toFixed(1)),
      carbs: Number(result.totalCarbs.toFixed(1)),
      fat: Number(result.totalFat.toFixed(1)),
      weight: Number(result.totalWeight.toFixed(1))
    };

    try {
      if (saveAsSavedMeal) {
        await db.savedMeals.add(user.id, mealData);
        onShowToast("Salvo nos favoritos!", 'success');
      } else {
        onAdd(mealData);
        onShowToast("Adicionado! ✅", 'success');
        onBack();
      }
    } catch (error) {
      onShowToast('Erro ao salvar.', 'error');
    }
  };

  const isFreeLocked = mode === 'ai' && user.plan === 'free' && !user.isAdmin;

  if (isFreeLocked) {
    return (
      <PremiumBackground className="flex items-center justify-center p-6" dim={true} intensity={1.5}>
        <div className="w-full max-w-lg bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] p-10 md:p-14 border border-emerald-500/20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <ScanSearch className="w-10 h-10 text-emerald-500" />
          </div>

          <h2 className="text-4xl font-serif-premium font-bold text-white mb-4 tracking-tight">
            <LetterPuller text="Acesso Exclusivo" />
          </h2>
          <p className="text-zinc-400 font-medium text-base mb-12 leading-relaxed max-w-xs mx-auto">
            Acesse a Inteligência Artificial para descobrir os macronutrientes exatos da sua refeição apenas tirando uma foto. Disponível no plano Pro.
          </p>

          <button
            onClick={onUpgrade}
            className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:bg-zinc-200 active:scale-95 transition-all text-xs mb-6"
          >
            Fazer Upgrade Pro
          </button>

          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 mx-auto text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors"
          >
            ← Voltar ao Painel
          </button>
        </div>
      </PremiumBackground>
    );
  }

  return (
    <PremiumBackground>
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col min-h-screen relative">
        <AnimatePresence>
          {showLimitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
            >
              <div className="bg-zinc-950 w-full max-w-sm rounded-[3rem] p-10 border border-white/10 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-white/20 to-emerald-500"></div>
                <div className="text-5xl mb-6">{limitModalType === 'daily' ? '🛑' : '🔒'}</div>
                <h3 className="text-2xl font-serif-premium font-bold text-white mb-4">Limite Atingido</h3>
                <p className="text-zinc-500 mb-8 text-sm leading-relaxed tracking-wide">
                  {limitModalType === 'daily'
                    ? "Você atingiu o limite de scanners do seu plano hoje. Novas análises disponíveis em breve."
                    : "Sua análise experimental terminou. Desbloqueie o acesso completo para continuar treinando com IA."
                  }
                </p>
                <button
                  onClick={() => { setShowLimitModal(false); if (limitModalType === 'daily') onUpgradePro(); else onUpgrade(); }}
                  className="w-full py-5 bg-white text-zinc-950 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] mb-4 hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
                >
                  Fazer Upgrade
                </button>
                <button onClick={() => { setShowLimitModal(false); onBack(); }} className="text-zinc-500 font-black uppercase tracking-widest text-[9px] hover:text-white transition-colors">
                  Voltar
                </button>
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overscroll-none"
            >
              <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mb-16">
                {previewImage && (
                  <div className="absolute inset-0 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl z-10">
                    <img src={previewImage} alt="Scanning" className="w-full h-full object-cover opacity-40 brightness-50" />
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_30px_rgba(52,211,153,1)] animate-[scan-line_2.5s_ease-in-out_infinite] z-20"></div>
                  </div>
                )}
                <div className="absolute animate-spin w-full h-full border-t-2 border-emerald-500/30 rounded-full"></div>
              </div>
              <div className="z-10 text-center space-y-6">
                <LetterPuller text={scanMessages[scanStep]} className="text-white text-xl md:text-2xl tracking-[0.2em] uppercase" />
                <div className="w-48 h-[1px] bg-white/10 mx-auto overflow-hidden">
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-full h-full bg-emerald-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <header className="flex justify-between items-center mb-12">
          <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-white">
            <span className="text-xl">←</span>
          </button>
        </header>

        <main className="flex-1 flex flex-col">
          {!result ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-2">
                <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] leading-none opacity-70">Módulo de Análise</span>
                <LetterPuller text={mode === 'manual' ? 'Registro Manual' : 'Neural Food Scan'} className="text-2xl md:text-6xl text-white tracking-tighter" />
              </div>

              {mode === 'manual' ? (
                <div className="bg-zinc-950/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Composição da Refeição</label>
                    <textarea
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Ex: 200g Salmão grelhado com aspargos..."
                      className="w-full bg-white/[0.03] p-6 rounded-3xl border border-white/5 font-serif-premium text-xl text-white outline-none focus:border-emerald-500/50 transition-colors min-h-[150px] resize-none"
                    />
                  </div>
                  <button
                    onClick={handleManualAdd}
                    className="w-full bg-white text-zinc-950 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
                  >
                    Processar Dados
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-zinc-950/40 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 space-y-6">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Contexto Adicional (Opcional)</label>
                    <textarea
                      value={mealDescription}
                      onChange={(e) => setMealDescription(e.target.value)}
                      placeholder="Ex: Refeição do pós-treino..."
                      className="w-full bg-white/5 p-5 rounded-2xl border border-white/5 font-bold text-white outline-none focus:border-emerald-500/30 text-sm min-h-[100px] resize-none"
                    />
                  </div>

                  <div className={`relative group bg-zinc-950/40 backdrop-blur-2xl p-12 rounded-[3.5rem] border-2 border-dashed border-emerald-500/20 flex flex-col items-center justify-center min-h-[400px] transition-all duration-500`}>
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3.5rem]"></div>

                    <ScanSearch className="w-32 h-32 text-emerald-500/20 mb-10 transform group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg z-10">
                      <label className="cursor-pointer bg-white text-zinc-950 p-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5">
                        <Camera className="w-5 h-5" /> Iniciar Câmera
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} disabled={loading} />
                      </label>
                      <label className="cursor-pointer bg-zinc-900 text-white p-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 border border-white/10 hover:bg-zinc-800 transition-all active:scale-95">
                        <ImageIcon className="w-5 h-5" /> Importar Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-32">
              {previewImage && (
                <div className="w-full aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl group relative">
                  <img src={previewImage} alt="Analysis" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-70">Resultado Identificado</span>
                    <h2 className="text-5xl md:text-6xl font-serif-premium font-bold text-white tracking-tight leading-none uppercase">
                      {result.mealName}
                    </h2>
                  </div>

                  <div className="flex items-baseline gap-4">
                    <span className="text-8xl font-serif-premium font-bold text-white tracking-tighter hover:text-emerald-500 transition-colors duration-500">
                      {result.totalCalories.toFixed(0)}
                    </span>
                    <span className="text-emerald-500/50 text-2xl font-serif-premium italic">kcal</span>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { l: 'Prot', v: result.totalProtein, u: 'g' },
                      { l: 'Carb', v: result.totalCarbs, u: 'g' },
                      { l: 'Gord', v: result.totalFat, u: 'g' }
                    ].map(m => (
                      <div key={m.l} className="bg-zinc-950/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 text-center group/macro hover:border-emerald-500/30 transition-all duration-500">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 group-hover/macro:text-emerald-500 transition-colors">{m.l}</p>
                        <p className="text-2xl font-serif-premium font-bold text-white">{m.v.toFixed(1)}<span className="text-[10px] opacity-40 italic ml-1">{m.u}</span></p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-950/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 space-y-8 relative overflow-hidden group">
                  <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest opacity-40 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Pontuação Metabólica
                      </span>
                      <span className="text-3xl font-serif-premium font-bold text-emerald-500">{result.score}/10</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(result.score / 10) * 100}%` }}
                        transition={{ duration: 2, ease: "circOut" }}
                        className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                      />
                    </div>
                    <p className="text-sm font-medium text-zinc-400 leading-relaxed italic border-l-2 border-emerald-500/30 pl-6 py-2">
                      "{result.reasoning}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] px-2 opacity-50">Vetores Nutrigenômicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.items.map((item, idx) => (
                    <div key={idx} className="bg-zinc-950/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all group/item">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-serif-premium font-bold text-xl text-white group-hover/item:text-emerald-400 transition-colors capitalize">{item.name}</h4>
                        <span className="font-serif-premium font-bold text-lg text-white/40">{item.weight.toFixed(0)}g</span>
                      </div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">{item.calories.toFixed(0)} kcal</p>
                      {item.observation && (
                        <p className="text-[11px] text-zinc-500 font-medium italic border-t border-white/5 pt-4 opacity-60 group-hover/item:opacity-100 transition-opacity">
                          "{item.observation}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="fixed bottom-10 left-0 w-full px-6 z-50">
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => confirmAdd(false)}
                    className="md:col-span-2 bg-white text-zinc-950 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-zinc-200 transition-all shadow-2xl shadow-white/10 flex items-center justify-center gap-3 active:scale-95"
                  >
                    Confirmar Registro <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => confirmAdd(true)}
                    className="bg-zinc-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[9px] border border-white/10 hover:bg-zinc-800 transition-all active:scale-95"
                  >
                    Set as Favorite <Save className="w-4 h-4 ml-2 inline-block" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </PremiumBackground>
  );
};

export default FoodAnalyzer;

