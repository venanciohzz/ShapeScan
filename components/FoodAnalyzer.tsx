
import React, { useState, useEffect } from 'react';
import { User, FoodLog, FoodAnalysisResult, FoodItem } from '../types';
import { analyzePlate, getManualFoodMacros } from '../services/openaiService';
import { compressImage } from '../utils/security';
import { db } from '../services/db';

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

  // Check if free user is already locked out on mount
  useEffect(() => {
    if (mode === 'ai' && user.plan === 'free' && (user.freeScansUsed || 0) >= 1) {
      // Keep internal state
    }
  }, [mode, user]);

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

  const getDailyLimit = () => {
    if (user.isAdmin) return 999;
    switch (user.plan) {
      case 'pro_monthly':
      case 'pro_annual': return 12; // Pro Plan Limit
      case 'monthly':
      case 'annual':
      case 'lifetime': return 6; // Standard Plan Limit
      default: return 0; // Free limit handled separately
    }
  };

  const checkUsageLimit = async () => {
    if (user.isAdmin) return true;

    // 1. Check Free Plan Lifetime Limit (1 scan trial)
    if (user.plan === 'free') {
      if ((user.freeScansUsed || 0) >= 1) {
        setLimitModalType('free');
        setShowLimitModal(true);
        return false;
      }
      return true; // Allow, will increment after success
    }

    // 2. Check Paid Plan Daily Limit
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
      // Increment lifetime counter in DB (Trial)
      const newCount = await db.usage.incrementTrial(user.id);
      onUpdateUser({ ...user, freeScansUsed: newCount });
    } else {
      // Increment daily counter in DB
      await db.usage.incrementDaily(user.id, 'food');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    setError('');

    // Check limits (now async)
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

          if (!data || !data.items) {
            throw new Error("Não foi possível identificar alimentos.");
          }

          // SUCCESS: Increment usage here
          await incrementUsage();

          setResult(data);
          setResult(data);
        } catch (err: any) {
          console.error("Erro no scanner:", err);
          let msg = err.message || "Falha na análise";

          if (msg.includes('401') || msg.includes('jwt')) {
            msg = "Sessão expirada. Por favor, faça login novamente.";
          } else if (msg.includes('403') || msg.includes('limit')) {
            msg = "Limite diário atingido. Faça upgrade para continuar.";
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
      onShowToast("Descreva o alimento com detalhes (Ex: Arroz Branco 150g).", 'error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const analysis = await getManualFoodMacros(manualName);
      const items = analysis?.items || [];
      if (items.length === 0) throw new Error("Não foi possível calcular os macros.");
      setResult(analysis);
    } catch (err) {
      onShowToast("Erro ao consultar a IA. Tente descrever de outra forma.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmAdd = async (saveAsSavedMeal: boolean = false) => {
    if (!result) return;

    console.log('🍽️ confirmAdd chamado - saveAsSavedMeal:', saveAsSavedMeal);

    const items = result.items || [];
    const foodItems: FoodItem[] = items.map(it => ({
      id: Math.random().toString(36).substr(2, 9),
      name: it.name,
      calories: Number(it.calories.toFixed(1)),
      weight: Number(it.weight.toFixed(1))
    }));

    const mealName = manualName || (foodItems.length > 1 ? "Refeição Completa" : (foodItems[0]?.name || "Refeição"));
    const mealData = {
      name: mealName,
      items: foodItems,
      calories: Number(result.totalCalories.toFixed(1)),
      protein: Number(result.totalProtein.toFixed(1)),
      carbs: Number(result.totalCarbs.toFixed(1)),
      fat: Number(result.totalFat.toFixed(1)),
      weight: Number(result.totalWeight.toFixed(1))
    };

    console.log('🍽️ Dados da refeição:', mealData);

    try {
      if (saveAsSavedMeal) {
        console.log('💾 Salvando como refeição favorita - user.id:', user.id);
        await db.savedMeals.add(user.id, mealData);
        onShowToast("Refeição salva nos favoritos!", 'success');
      } else {
        console.log('✅ Adicionando à meta diária');
        onAdd(mealData);
        onShowToast("Adicionado à meta diária! ✅", 'success');
        onBack();
      }
    } catch (error) {
      console.error('❌ Erro em confirmAdd:', error);
      onShowToast('Erro ao salvar: ' + (error as Error).message, 'error');
    }
  };

  // Logic to show lock state if user is free and used limit
  const isFreeLocked = mode === 'ai' && user.plan === 'free' && (user.freeScansUsed || 0) >= 1 && !result;

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 md:pt-14 pb-24 text-black dark:text-white min-h-screen flex flex-col relative">

      {showLimitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-8 border-2 border-emerald-500/50 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500"></div>
            <div className="text-4xl mb-4">
              {limitModalType === 'daily' ? '🛑' : '🔒'}
            </div>
            <h3 className="text-xl font-black mb-4">
              {limitModalType === 'daily' ? 'Limite diário atingido' : 'Limite Gratuito Atingido'}
            </h3>
            <p className="text-gray-600 dark:text-zinc-300 mb-6 font-medium text-sm leading-relaxed">
              {limitModalType === 'daily'
                ? (
                  <>
                    Você utilizou todas as análises disponíveis hoje no Plano Standard. Novas análises serão liberadas após a meia-noite.
                    <br /><br />
                    <span className="font-bold">Precisa de mais?</span> O Plano Pro oferece o dobro de scanners para acompanhar sua evolução com mais liberdade.
                  </>
                )
                : "Você já utilizou sua análise gratuita. Escolha um plano para continuar usando o Scanner Inteligente."
              }
            </p>
            <button
              onClick={() => {
                setShowLimitModal(false);
                if (limitModalType === 'daily') onUpgradePro(); else onUpgrade();
              }}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs mb-3 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
            >
              {limitModalType === 'daily' ? "Fazer Upgrade para Pro" : "Desbloquear mais análises"}
            </button>
            <button onClick={() => { setShowLimitModal(false); onBack(); }} className="w-full py-4 bg-transparent text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:text-gray-600 dark:hover:text-zinc-200">
              Voltar
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-zinc-900 flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="absolute inset-0 grid-bg opacity-10 animate-pulse"></div>
          <div className="relative w-64 h-80 md:w-80 md:h-96 flex items-center justify-center mb-12">
            {previewImage && (
              <div className="absolute inset-2 rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)] z-10">
                <img src={previewImage} alt="Scanning" className="w-full h-full object-cover opacity-70" />
                <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-400 shadow-[0_0_30px_rgba(52,211,153,1)] animate-[scan-line_2.5s_ease-in-out_infinite] z-20"></div>
              </div>
            )}
          </div>
          <div className="z-10 text-center space-y-4 px-6">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight animate-pulse">{scanMessages[scanStep]}</h2>
            <div className="w-48 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mx-auto border border-emerald-500/20">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${((scanStep + 1) / scanMessages.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-black dark:text-white">
        <span className="text-lg pb-0.5">←</span>
      </button>

      <div className="flex items-center justify-between mb-2 gap-4">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter">{mode === 'manual' ? 'Registro Manual' : 'Scanner de Prato'}</h1>
        {mode === 'ai' && <span className="flex-shrink-0 text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full font-black tracking-widest shadow-sm">AI PREMIUM</span>}
      </div>

      {!result ? (
        <div className="space-y-6 md:space-y-8 flex-1 flex flex-col">
          {mode === 'manual' ? (
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] border-2 border-emerald-600 shadow-sm transition-colors flex flex-col gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">O que você comeu?</label>
                <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium mb-3">
                  Inclua o tipo específico e a quantidade na descrição.
                </p>
                <textarea
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: 150g Arroz Branco, 1 concha Feijão Carioca, 2 Ovos Fritos..."
                  className="w-full p-5 rounded-2xl border-2 border-emerald-500 bg-gray-50 dark:bg-zinc-950 font-bold text-black dark:text-white outline-none focus:border-emerald-600 shadow-inner text-base md:text-lg min-h-[120px] resize-none"
                />
              </div>
              <button onClick={handleManualAdd} disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95">CALCULAR MACROS</button>
              {error && <p className="text-red-500 font-black text-xs text-center">{error}</p>}
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8 flex-1 flex flex-col">
              <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-emerald-600 shadow-sm space-y-4 transition-colors">
                <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-2">Descreva sua refeição (Opcional)</h3>
                <textarea
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  placeholder="Ex: Arroz, feijão e um bife de frango grelhado..."
                  className="w-full p-4 rounded-xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 font-bold text-black dark:text-white outline-none focus:border-emerald-600 text-sm min-h-[80px] resize-none"
                />
                <p className="text-[9px] text-gray-500 font-bold italic">* Isso ajuda a IA a ser ainda mais precisa!</p>
              </div>

              <div className={`bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border-2 ${isFreeLocked ? 'border-gray-300 dark:border-zinc-800 opacity-80' : 'border-emerald-600'} shadow-sm text-center flex-1 flex flex-col justify-center items-center relative overflow-hidden`}>

                {/* Free Plan Lock Overlay */}
                {isFreeLocked && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-zinc-900 text-white p-4 rounded-full mb-4 shadow-xl">🔒</div>
                    <h3 className="text-xl font-black text-black dark:text-white mb-2">Scanner Bloqueado</h3>
                    <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 mb-6">Você já utilizou sua análise gratuita.</p>
                    <button onClick={onUpgrade} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-emerald-500 transition-all">Desbloquear Agora</button>
                  </div>
                )}

                <div className="text-7xl md:text-8xl mb-6 md:mb-8">🥗</div>

                <div className="flex flex-col gap-4 w-full md:w-auto">
                  <label className={`inline-flex items-center justify-center gap-3 cursor-pointer bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl active:scale-95 text-base md:text-lg w-full ${isFreeLocked ? 'cursor-not-allowed opacity-50' : ''}`}>
                    <span className="text-2xl">📸</span>
                    {isFreeLocked ? 'CÂMERA BLOQUEADA' : 'ABRIR CÂMERA'}
                    {!isFreeLocked && <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} disabled={loading} />}
                  </label>

                  <label className={`inline-flex items-center justify-center gap-3 cursor-pointer bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-600 px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-zinc-700 shadow-lg active:scale-95 text-base md:text-lg w-full ${isFreeLocked ? 'cursor-not-allowed opacity-50' : ''}`}>
                    <span className="text-2xl">🖼️</span>
                    {isFreeLocked ? 'GALERIA BLOQUEADA' : 'ESCOLHER DA GALERIA'}
                    {!isFreeLocked && <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />}
                  </label>
                </div>
                {error && <p className="mt-6 text-red-500 font-black text-xs bg-red-50 dark:bg-red-900/30 p-4 rounded-xl border-2 border-red-100 dark:border-red-900/50 w-full">{error}</p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 pb-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-zinc-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border-4 border-emerald-600 shadow-2xl relative transition-colors">
            <div className="flex justify-between items-start mb-6 md:mb-10">
              <div>
                <p className="text-emerald-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2">Total Calórico</p>
                <p className="text-4xl md:text-8xl font-black italic tracking-tighter leading-none text-black dark:text-white">{result.totalCalories.toFixed(1)}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-3">
                {previewImage && (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg">
                    <img src={previewImage} alt="Analisado" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4 border-t-2 border-emerald-50 dark:border-zinc-800 pt-6">
              <MacroRow label="Proteínas" value={result.totalProtein.toFixed(1)} unit="g" color="text-emerald-500" />
              <MacroRow label="Carboidratos" value={result.totalCarbs.toFixed(1)} unit="g" color="text-blue-500" />
              <MacroRow label="Gorduras" value={result.totalFat.toFixed(1)} unit="g" color="text-yellow-500" />
            </div>

            <div className="mt-6 pt-6 border-t-2 border-emerald-50 dark:border-zinc-800">
              <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Itens Identificados</p>
              <div className="space-y-2">
                {result.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl border border-gray-100 dark:border-zinc-700">
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight capitalize">{item.name}</p>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 mt-0.5">{item.weight}g</p>
                    </div>
                    <p className="font-black text-emerald-600 text-xs">{item.calories} kcal</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-black text-white p-6 rounded-3xl border-4 border-emerald-500 shadow-xl shadow-emerald-100 dark:shadow-none">
              <p className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.3em] mb-3">Coach IA Diz:</p>
              <p className="text-sm md:text-base font-bold italic leading-relaxed">"{result.reasoning}"</p>
            </div>
          </div>

          <div className="fixed md:static bottom-0 left-0 right-0 p-6 pt-8 pb-10 md:p-0 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 z-50 md:bg-none">
            <div className="max-w-3xl mx-auto flex flex-col gap-3">
              {/* Unlock Button for Free Users after they use their scan */}
              {user.plan === 'free' && mode === 'ai' && (
                <button onClick={onUpgrade} className="w-full py-5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:brightness-110 shadow-2xl active:scale-95 animate-pulse">
                  🔓 Desbloquear mais análises
                </button>
              )}

              <button onClick={() => confirmAdd(false)} className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-2xl active:scale-95 text-lg">Adicionar ao Dia ✅</button>
              {mode === 'manual' && (
                <button onClick={() => confirmAdd(true)} className="w-full py-5 bg-cyan-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-cyan-700 shadow-2xl active:scale-95">Salvar Refeição 💾</button>
              )}
              <button onClick={() => { setResult(null); setPreviewImage(null); }} className="w-full py-4 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 text-black dark:text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all text-xs">Refazer Análise</button>
            </div>
          </div>
          <div className="h-40 md:h-0"></div>
        </div>
      )}
    </div>
  );
};

const MacroRow = ({ label, value, unit, color, goal = 100 }: { label: string, value: number | string, unit: string, color: string, goal?: number }) => {
  const percentage = Math.min(100, (Number(value) / goal) * 100);
  const colorMap: Record<string, string> = {
    'text-emerald-500': 'from-emerald-600 to-emerald-400',
    'text-blue-500': 'from-blue-600 to-blue-400',
    'text-yellow-500': 'from-yellow-600 to-yellow-400'
  };
  const gradientClass = colorMap[color] || 'from-emerald-500 to-cyan-500';

  return (
    <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-emerald-500/10 mb-3 transition-colors shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h4 className={`font-black uppercase tracking-tight text-xs md:text-sm ${color}`}>{label}</h4>
        <p className={`font-black text-lg md:text-2xl ${color}`}>{value} <span className="text-gray-400 dark:text-zinc-600 text-[10px]">{unit}</span></p>
      </div>
      <div className="w-full h-3 md:h-4 bg-gray-100 dark:bg-zinc-800 rounded-full border-2 border-emerald-500/20 overflow-hidden relative">
        <div
          className={`h-full transition-all duration-1000 ease-out bg-gradient-to-r ${gradientClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default FoodAnalyzer;
