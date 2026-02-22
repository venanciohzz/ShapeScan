
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
    <div className="max-w-3xl mx-auto px-6 py-6 md:pt-14 pb-24 text-black dark:text-white min-h-screen flex flex-col relative bg-black">

      {showLimitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 w-full max-w-sm rounded-[2rem] p-8 border-2 border-emerald-500/50 shadow-2xl text-center relative overflow-hidden">
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
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
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
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight animate-pulse">{scanMessages[scanStep]}</h2>
            <div className="w-48 h-1.5 bg-zinc-900 rounded-full overflow-hidden mx-auto border border-white/5">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${((scanStep + 1) / scanMessages.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-white">
        <span className="text-lg pb-0.5">←</span>
      </button>

      {!result && (
        <div className="flex items-center justify-between mb-2 gap-4">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white">{mode === 'manual' ? 'Registro Manual' : 'Scanner de Prato'}</h1>
          {mode === 'ai' && <span className="flex-shrink-0 text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full font-black tracking-widest shadow-sm">AI PREMIUM</span>}
        </div>
      )}

      {!result ? (
        <div className="space-y-6 md:space-y-8 flex-1 flex flex-col">
          {mode === 'manual' ? (
            <div className="bg-zinc-900 p-6 md:p-8 rounded-[2rem] border-2 border-emerald-600 shadow-sm transition-colors flex flex-col gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">O que você comeu?</label>
                <p className="text-xs text-zinc-500 font-medium mb-3">
                  Inclua o tipo específico e a quantidade na descrição.
                </p>
                <textarea
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: 150g Arroz Branco, 1 concha Feijão Carioca, 2 Ovos Fritos..."
                  className="w-full p-5 rounded-2xl border-2 border-emerald-500 bg-zinc-950 font-bold text-white outline-none focus:border-emerald-600 shadow-inner text-base md:text-lg min-h-[120px] resize-none"
                />
              </div>
              <button onClick={handleManualAdd} disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95">CALCULAR MACROS</button>
              {error && <p className="text-red-500 font-black text-xs text-center">{error}</p>}
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8 flex-1 flex flex-col">
              <div className="bg-zinc-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-emerald-600 shadow-sm space-y-4 transition-colors">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Descreva sua refeição (Opcional)</h3>
                <textarea
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  placeholder="Ex: Arroz, feijão e um bife de frango grelhado..."
                  className="w-full p-4 rounded-xl border-2 border-emerald-500 bg-zinc-800 font-bold text-white outline-none focus:border-emerald-600 text-sm min-h-[80px] resize-none"
                />
                <p className="text-[9px] text-gray-500 font-bold italic">* Isso ajuda a IA a ser ainda mais precisa!</p>
              </div>

              <div className={`bg-zinc-900 p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border-2 ${isFreeLocked ? 'border-zinc-800 opacity-80' : 'border-emerald-600'} shadow-sm text-center flex-1 flex flex-col justify-center items-center relative overflow-hidden`}>

                {/* Free Plan Lock Overlay */}
                {isFreeLocked && (
                  <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-zinc-900 text-white p-4 rounded-full mb-4 shadow-xl">🔒</div>
                    <h3 className="text-xl font-black text-white mb-2">Scanner Bloqueado</h3>
                    <p className="text-sm font-medium text-zinc-400 mb-6">Você já utilizou sua análise gratuita.</p>
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

                  <label className={`inline-flex items-center justify-center gap-3 cursor-pointer bg-zinc-800 text-emerald-400 border-2 border-emerald-600 px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-700 shadow-lg active:scale-95 text-base md:text-lg w-full ${isFreeLocked ? 'cursor-not-allowed opacity-50' : ''}`}>
                    <span className="text-2xl">🖼️</span>
                    {isFreeLocked ? 'GALERIA BLOQUEADA' : 'ESCOLHER DA GALERIA'}
                    {!isFreeLocked && <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />}
                  </label>
                </div>
                {error && <p className="mt-6 text-red-500 font-black text-xs bg-red-900/30 p-4 rounded-xl border-2 border-red-900/50 w-full">{error}</p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500 pb-20">
          {/* 1️⃣ FOTO NO TOPO */}
          {previewImage && (
            <div className="w-full aspect-square md:aspect-video rounded-[2rem] overflow-hidden border-2 border-zinc-800 shadow-2xl">
              <img src={previewImage} alt="Refeição Analisada" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-6">
            <div className="text-center md:text-left">
              {/* 2️⃣ NOME DO PRATO */}
              <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white leading-tight mb-2 uppercase">
                {result.mealName}
              </h2>

              <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4">
                {/* 3️⃣ CALORIAS TOTAIS */}
                <span className="text-5xl md:text-7xl font-black text-emerald-500 italic tracking-tighter leading-none">
                  {result.totalCalories.toFixed(0)} <span className="text-2xl md:text-3xl text-zinc-500 not-italic">kcal</span>
                </span>
              </div>
            </div>

            {/* 4️⃣ MACROS TOTAIS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Proteína</p>
                <p className="text-2xl font-black text-white">{result.totalProtein.toFixed(1)}g</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Carbos</p>
                <p className="text-2xl font-black text-white">{result.totalCarbs.toFixed(1)}g</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Gorduras</p>
                <p className="text-2xl font-black text-white">{result.totalFat.toFixed(1)}g</p>
              </div>
            </div>

            {/* 5️⃣ INDICADOR DE QUALIDADE NUTRICIONAL */}
            <div className="bg-zinc-900 border-2 border-zinc-800 p-6 rounded-[2rem] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Índice Shape</span>
                <span className="text-xl font-black text-emerald-500">{result.score}/10</span>
              </div>
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-1000 ease-out"
                  style={{ width: `${(result.score / 10) * 100}%` }}
                />
              </div>
              {/* 🤖 SOBRE O COACH AI */}
              <div className="pt-2">
                <p className="text-sm font-bold text-zinc-300 italic leading-relaxed">
                  <span className="text-emerald-500">Coach:</span> "{result.reasoning}"
                </p>
              </div>
            </div>

            {/* 6️⃣ LISTA DE INGREDIENTES DETALHADA */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">Análise de Ingredientes</h3>
              <div className="space-y-3">
                {result.items.map((item, idx) => (
                  <div key={idx} className="bg-zinc-900/80 backdrop-blur-sm p-5 rounded-2xl border border-zinc-800/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="font-bold text-white text-base capitalize block">{item.name}</span>
                        {item.confidence && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${item.confidence.toLowerCase().includes('alta') ? 'bg-emerald-500/10 text-emerald-500' :
                            item.confidence.toLowerCase().includes('moderada') ? 'bg-amber-500/10 text-amber-500' :
                              'bg-zinc-500/10 text-zinc-400'
                            }`}>
                            Confiança {item.confidence}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-black text-white text-lg leading-none">{item.weight.toFixed(0)}<span className="text-[10px] text-zinc-500 not-italic ml-0.5">g</span></p>
                        <p className="font-black text-emerald-500 text-[10px] mt-1">{item.calories.toFixed(0)} kcal</p>
                      </div>
                    </div>
                    {item.observation && (
                      <p className="text-[10px] text-zinc-400 font-medium leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5">
                        <span className="text-zinc-500">Nota visual:</span> {item.observation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 7️⃣ AVISO DE MARGEM DE ERRO */}
            <div className="bg-zinc-900/40 p-4 rounded-2xl border border-dashed border-zinc-800 text-center">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                ⚠️ Aviso: Estimativa com margem de erro de ±20% devido à ausência de balança.
              </p>
            </div>

            {/* 8️⃣ BOTÃO FINAL */}
            <div className="pt-6 space-y-3">
              <button
                onClick={() => confirmAdd(false)}
                className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest hover:bg-emerald-500 shadow-[0_10px_40px_rgba(16,185,129,0.2)] active:scale-95 transition-all text-lg"
              >
                Adicionar ao meu dia ✅
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => confirmAdd(true)}
                  className="py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-700 active:scale-95 transition-all text-[10px]"
                >
                  Salvar Favorito 💾
                </button>
                <button
                  onClick={() => { setResult(null); setPreviewImage(null); }}
                  className="py-4 bg-transparent border-2 border-zinc-800 text-zinc-500 rounded-2xl font-black uppercase tracking-widest hover:text-white hover:border-zinc-600 active:scale-95 transition-all text-[10px]"
                >
                  Refazer Scan 🔄
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodAnalyzer;

