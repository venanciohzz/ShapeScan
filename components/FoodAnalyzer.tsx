import React, { useState, useEffect } from 'react';
import { User, FoodLog, FoodAnalysisResult, FoodItem } from '../types';
import { analyzePlate, getManualFoodMacros } from '../services/openaiService';
import { compressImage } from '../utils/security';
import { db } from '../services/db';
import { Camera, Image as ImageIcon, CheckCircle2, Save, RefreshCw, ScanSearch, Target, Search } from 'lucide-react';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import PremiumLoading from './ui/PremiumLoading';
import Skeleton from './ui/Skeleton';
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
    // Incremento controlado pela Edge Function — esta função é mantida apenas para sincronizar
    // o estado local do usuário (freeScansUsed) após confirmar sucesso
    if (user.isAdmin) return { success: true };
    if (user.plan === 'free') {
      // Apenas atualizar contagem local para UX imediata
      onUpdateUser({ ...user, freeScansUsed: (user.freeScansUsed || 0) + 1 });
      return { success: true };
    }
    return { success: true };
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

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        onShowToast("Por favor, selecione apenas imagens JPEG, PNG ou WEBP.", 'error');
        setLoading(false);
        return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        onShowToast("A imagem deve ter no máximo 5MB.", 'error');
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
          const data = await analyzePlate(apiBase64, mealDescription, user.goal, user.weight, user.height, user.gender);
          if (!data || !data.items) throw new Error("Não foi possível identificar alimentos.");
          
          // Edge Function já incrementou o uso atomicamente
          // Sincronizar apenas o estado local para UX imediata
          await incrementUsage();
          
          setResult(data);
        } catch (err: any) {
          console.error("Erro no scanner:", err);
          // Se a Edge Function retornou limite atingido, mostrar modal
          if (err.isLimitReached) {
            setLimitModalType(err.showPaywall ? 'free' : 'daily');
            setShowLimitModal(true);
            return;
          }
          let msg = err.message || "Falha na análise";
          onShowToast(msg, 'error');
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
      const analysis = await getManualFoodMacros(manualName, user.goal);
      if (!analysis?.items?.length) throw new Error("Falha no cálculo.");
      setResult(analysis);
    } catch (err) {
      onShowToast("Erro ao processar análise.", 'error');
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

    const mealName = result.dish_name || manualName || (foodItems.length > 1 ? "Refeição Completa" : (foodItems[0]?.name || "Refeição"));
    const mealData = {
      name: mealName,
      items: foodItems,
      calories: Number(result.calories.toFixed(1)),
      protein: Number(result.protein_g.toFixed(1)),
      carbs: Number(result.carbs_g.toFixed(1)),
      fat: Number(result.fat_g.toFixed(1)),
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
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-emerald-500/20">
            <ScanSearch className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-4xl font-serif-premium font-bold text-white mb-4 tracking-tight">
            <LetterPuller text="Acesso Exclusivo" />
          </h2>
          <p className="text-zinc-400 font-medium text-base mb-12 leading-relaxed max-w-xs mx-auto">
            Acesse a nossa análise avançada para descobrir os macronutrientes exatos da sua refeição apenas tirando uma foto.
          </p>
          <motion.button 
            whileTap={{ scale: 0.97 }}
            onClick={onUpgrade} 
            className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black uppercase tracking-widest text-xs mb-6 transition-all"
          >
            Fazer Upgrade Pro
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onBack} 
            className="flex items-center justify-center gap-2 mx-auto text-zinc-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
          >
            ← Voltar ao Painel
          </motion.button>
        </div>
      </PremiumBackground>
    );
  }

  return (
    <PremiumBackground>
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col min-h-screen relative">
        <AnimatePresence>
          {showLimitModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
              <div className="bg-zinc-950 w-full max-w-sm rounded-[3rem] p-10 border border-white/10 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-white/20 to-emerald-500"></div>
                <div className="text-5xl mb-6">{limitModalType === 'daily' ? '🛑' : '🔒'}</div>
                <h3 className="text-2xl font-serif-premium font-bold text-white mb-4">Limite Atingido</h3>
                <p className="text-zinc-500 mb-8 text-sm leading-relaxed tracking-wide">
                  {limitModalType === 'daily'
                    ? (user.isPremium && user.plan?.includes('pro')
                        ? "Você atingiu o limite diário do plano Pro. Seu limite renova à meia-noite."
                        : "Você atingiu o limite de scanners do seu plano hoje.")
                    : "Sua análise experimental terminou."
                  }
                </p>
                {(limitModalType !== 'daily' || !(user.isPremium && user.plan?.includes('pro'))) && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setShowLimitModal(false); if (limitModalType === 'daily') onUpgradePro(); else onUpgrade(); }}
                    className="w-full py-5 bg-white text-zinc-950 rounded-2xl font-black uppercase tracking-widest text-[10px] mb-4 hover:bg-zinc-200 transition-all"
                  >
                    Fazer Upgrade
                  </motion.button>
                )}
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowLimitModal(false); onBack(); }} 
                  className="text-zinc-500 font-black uppercase tracking-widest text-[9px] hover:text-white transition-colors"
                >
                  Voltar
                </motion.button>
              </div>
            </motion.div>
          )}

          <PremiumLoading loading={loading} messages={scanMessages} previewImage={previewImage} />
        </AnimatePresence>

        <header className="flex justify-between items-center mb-8">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onBack} 
            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-white shadow-xl backdrop-blur-md"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </motion.button>
        </header>

        <main className="flex-1 flex flex-col">
          {!result ? (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-[2px] bg-emerald-500/50"></div>
                  <span className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.4em] leading-none">
                    {mode === 'manual' ? 'Registro Manual' : 'Análise de Refeição'}
                  </span>
                </div>
                <h1 className="text-4xl md:text-8xl font-serif-premium font-bold text-white tracking-tighter leading-[0.9] flex flex-col text-balance">
                  {mode === 'manual' ? (
                    <>
                      <LetterPuller text="Registro" className="opacity-60 md:opacity-40 text-2xl md:text-6xl" />
                      <LetterPuller text="Manual" />
                    </>
                  ) : (
                    <LetterPuller text="Scanner" />
                  )}
                </h1>
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
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleManualAdd}
                    disabled={loading}
                    className="w-full bg-white text-zinc-950 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-200 transition-all shadow-xl flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin"></div>
                        Processando...
                      </>
                    ) : (
                      'Processar Dados'
                    )}
                  </motion.button>
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

                  <div className="relative group bg-zinc-950/40 backdrop-blur-2xl p-12 rounded-[3.5rem] border-2 border-dashed border-emerald-500/20 flex flex-col items-center justify-center min-h-[400px] transition-all duration-500">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3.5rem]"></div>
                    <ScanSearch className="w-32 h-32 text-emerald-500/20 mb-10 transform group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg z-10">
                      <motion.label whileTap={{ scale: 0.97 }} className="cursor-pointer bg-white text-zinc-950 p-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all">
                        <Camera className="w-5 h-5" /> Iniciar Câmera
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} disabled={loading} />
                      </motion.label>
                      <motion.label whileTap={{ scale: 0.97 }} className="cursor-pointer bg-zinc-900 text-white p-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 border border-white/10 hover:bg-zinc-800 transition-all">
                        <ImageIcon className="w-5 h-5" /> Importar Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
                      </motion.label>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="space-y-12 pb-32">
                  <div className="w-full aspect-video rounded-[3rem] overflow-hidden border border-white/5 bg-white/5">
                    <Skeleton className="w-full h-full" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-32 rounded-full" />
                        <Skeleton className="h-16 w-3/4 rounded-2xl" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                      <div className="flex items-baseline gap-4">
                        <Skeleton className="h-24 w-48 rounded-2xl" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                      </div>
                      <div className="grid grid-cols-3 gap-6">
                        <Skeleton className="h-24 rounded-3xl" />
                        <Skeleton className="h-24 rounded-3xl" />
                        <Skeleton className="h-24 rounded-3xl" />
                      </div>
                    </div>
                    
                    <div className="bg-zinc-950/20 backdrop-blur-xl p-10 rounded-[3rem] border border-white/5 space-y-8">
                       <div className="space-y-6">
                          <div className="space-y-4">
                             <div className="flex justify-between">
                                <Skeleton className="h-4 w-32 rounded-full" />
                                <Skeleton className="h-8 w-16 rounded-full" />
                             </div>
                             <Skeleton className="h-1.5 w-full rounded-full" />
                          </div>
                          <div className="space-y-4">
                             <div className="flex justify-between">
                                <Skeleton className="h-4 w-32 rounded-full" />
                                <Skeleton className="h-8 w-16 rounded-full" />
                             </div>
                             <Skeleton className="h-1.5 w-full rounded-full" />
                          </div>
                          <div className="space-y-4 pt-6 border-t border-white/5">
                             <Skeleton className="h-20 w-full rounded-2xl" />
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Skeleton className="h-4 w-40 rounded-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Skeleton className="h-32 rounded-[2.5rem]" />
                      <Skeleton className="h-32 rounded-[2.5rem]" />
                      <Skeleton className="h-32 rounded-[2.5rem]" />
                      <Skeleton className="h-32 rounded-[2.5rem]" />
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
                  <div className="space-y-4">
                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-70">Resultado Identificado</span>
                    <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif-premium font-bold text-white tracking-tight leading-none uppercase break-words text-balance">
                      {result?.dish_name}
                    </h2>
                    {result?.dish_category && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                          {result.dish_category.includes('fitness') ? '🥗 ' : 
                           result.dish_category.includes('fast food') ? '🍔 ' : 
                           result.dish_category.includes('brasileiro') ? '🇧🇷 ' : 
                           result.dish_category.includes('sobremesa') ? '🍰 ' : 
                           result.dish_category.includes('lanche') ? '🥪 ' : '🍽️ '}
                          {result.dish_category}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-baseline gap-4 flex-wrap">
                    <span className="text-5xl sm:text-6xl md:text-8xl font-serif-premium font-bold text-white tracking-tighter hover:text-emerald-500 transition-colors duration-500">
                      {result?.calories.toFixed(0)}
                    </span>
                    <span className="text-emerald-500/50 text-lg md:text-2xl font-serif-premium italic">kcal</span>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { l: 'Prot', v: result?.protein_g || 0, u: 'g' },
                      { l: 'Carb', v: result?.carbs_g || 0, u: 'g' },
                      { l: 'Gord', v: result?.fat_g || 0, u: 'g' }
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
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest opacity-40 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Health Score (Saúde)
                        </span>
                        <span className="text-3xl font-serif-premium font-bold text-emerald-500">{result?.score || 0}/10</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${((result?.score || 0) / 10) * 100}%` }} transition={{ duration: 2, ease: "circOut" }} className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest opacity-40 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                          Muscle Score (Músculo)
                        </span>
                        <span className="text-3xl font-serif-premium font-bold text-indigo-500">{result?.muscle_score || 0}/10</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${((result?.muscle_score || 0) / 10) * 100}%` }} transition={{ duration: 2, ease: "circOut" }} className="h-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
                      </div>
                    </div>

                    {result?.goal_analysis && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
                        <div className={`space-y-1 p-3 rounded-2xl ${user.goal === 'gain' ? 'bg-orange-500/10 border border-orange-500/30' : 'opacity-30'}`}>
                          <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">💪 Bulking</p>
                          <p className="text-[11px] text-zinc-500 leading-relaxed italic">"{result.goal_analysis.bulking}"</p>
                        </div>
                        <div className={`space-y-1 p-3 rounded-2xl ${user.goal === 'lose' ? 'bg-cyan-500/10 border border-cyan-500/30' : 'opacity-30'}`}>
                          <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">🔥 Cutting</p>
                          <p className="text-[11px] text-zinc-500 leading-relaxed italic">"{result.goal_analysis.cutting}"</p>
                        </div>
                      </div>
                    )}

                    <p className="text-sm font-medium text-zinc-400 leading-relaxed italic border-l-2 border-emerald-500/30 pl-6 py-2">
                      "{result?.observation}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] px-2 opacity-50">Vetores Nutrigenômicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result?.items.map((item, idx) => (
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
                  <motion.button 
                    whileTap={{ scale: 0.97 }}
                    onClick={() => confirmAdd(false)} 
                    className="md:col-span-2 bg-white text-zinc-950 py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all shadow-2xl flex items-center justify-center gap-3"
                  >
                    Confirmar Registro <CheckCircle2 className="w-5 h-5" />
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => confirmAdd(true)} 
                    className="bg-zinc-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-[9px] border border-white/10 hover:bg-zinc-800 transition-all"
                  >
                    Salvar Favorito <Save className="w-4 h-4 ml-2 inline-block" />
                  </motion.button>
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
