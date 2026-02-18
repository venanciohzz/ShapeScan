
import React, { useState, useEffect } from 'react';
import { User, ShapeAnalysisResult } from '../types';
import { analyzeShape } from '../services/openaiService';
import { compressImage } from '../utils/security';
import { db } from '../services/db';

interface ShapeAnalyzerProps {
  user: User;
  onBack: () => void;
  onSaveToEvolution: (data: any) => void;
  onUpgrade: () => void;
  onUpgradePro: () => void;
}

const Thermometer = ({ label, score, context, invertColors }: { label: string, score: number, context: string, invertColors?: boolean }) => {
  const percentage = (score / 10) * 100;
  const gradientClass = invertColors
    ? "bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500"
    : "bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500";
  return (
    <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-emerald-500/10 mb-3 transition-colors">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-black text-black dark:text-white text-xs md:text-sm uppercase tracking-tight">{label}</h4>
        <p className="font-black text-black dark:text-white text-base md:text-lg">{score} <span className="text-gray-400 dark:text-zinc-600 text-[10px]">/ 10</span></p>
      </div>
      <div className="w-full h-3 md:h-4 bg-gray-100 dark:bg-zinc-800 rounded-full border-2 border-emerald-600 overflow-hidden relative">
        <div className={`h-full transition-all duration-1000 ease-out ${gradientClass}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-[10px] md:text-[11px] font-black text-gray-600 dark:text-zinc-400 italic leading-snug">{context}</p>
    </div>
  );
};

const ShapeAnalyzer: React.FC<ShapeAnalyzerProps> = ({ user, onBack, onSaveToEvolution, onUpgrade, onUpgradePro }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShapeAnalysisResult | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Reforce scroll to top when entering this view
  useEffect(() => {
    window.scrollTo(0, 0);
    if (user.plan === 'free' && !user.isAdmin) {
      onUpgrade();
    }
  }, [user]);

  const getDailyLimit = () => {
    if (user.isAdmin) return 999;
    switch (user.plan) {
      case 'pro_monthly':
      case 'pro_annual': return 4; // Pro Plan Limit
      case 'monthly':
      case 'annual':
      case 'lifetime': return 2; // Standard Plan Limit
      default: return 0; // Should be handled by useEffect
    }
  };

  const checkUsageLimit = async () => {
    if (user.isAdmin) return true;

    if (user.plan === 'free') {
      onUpgrade();
      return false;
    }

    const limit = getDailyLimit();
    const currentUsage = await db.usage.getDaily(user.id, 'shape');

    if (currentUsage >= limit) {
      setShowLimitModal(true);
      return false;
    }
    return true;
  };

  const incrementUsage = async () => {
    if (user.isAdmin) return;
    await db.usage.incrementDaily(user.id, 'shape');
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

    setSavedSuccess(false);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const rawBase64 = reader.result as string;
          const compressedBase64 = await compressImage(rawBase64);
          setCurrentPhoto(compressedBase64);
          const apiBase64 = compressedBase64.split(',')[1];
          // FIX: Comma handling
          const w = weight ? parseFloat(weight.replace(',', '.')) : undefined;
          const h = height ? parseFloat(height.replace(',', '.')) : undefined;
          const metrics = { weight: w, height: h };
          const data = await analyzeShape(apiBase64, metrics);
          setResult(data);

          // Increment usage after success
          await incrementUsage();
        } catch (err: any) {
          setError(`Erro: ${err.message || "Falha na análise"}`);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Erro ao processar arquivo.");
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    // FIX: Comma handling for saving
    const w = weight ? parseFloat(weight.replace(',', '.')) : undefined;
    const h = height ? parseFloat(height.replace(',', '.')) : undefined;

    // Don't save photo to evolution to save space, only analysis text
    onSaveToEvolution({
      bf: result.bfPercentage,
      photo: undefined,
      notes: result.detailedAnalysis,
      detailedAnalysis: result.detailedAnalysis,
      pointsToImprove: result.pointsToImprove,
      macroSuggestions: result.macroSuggestions,
      weight: w,
      height: h
    });
    setSavedSuccess(true);
  };

  // If user is free, they see nothing here because useEffect redirects them.
  // But to avoid flicker of content:
  if (user.plan === 'free' && !user.isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F3F6F8] dark:bg-zinc-950">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 md:pt-14 pb-24 text-black dark:text-white min-h-screen flex flex-col relative">

      {showLimitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-8 border-2 border-emerald-500/50 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500"></div>
            <div className="text-4xl mb-4">🛑</div>
            <h3 className="text-xl font-black mb-4">Limite diário atingido</h3>
            <p className="text-gray-600 dark:text-zinc-300 mb-6 font-medium text-sm leading-relaxed">
              Você utilizou todas as suas análises disponíveis hoje no Plano Standard. Novas análises serão liberadas após a meia-noite.
              <br /><br />
              <span className="font-bold">Precisa de mais análises por dia?</span> O Plano Pro oferece o dobro de scanners para acompanhar sua evolução com mais liberdade.
            </p>
            <button onClick={() => { setShowLimitModal(false); onUpgradePro(); }} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs mb-3 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all">
              Fazer Upgrade para Pro
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
            {currentPhoto && (
              <div className="absolute inset-2 rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)] z-10">
                <img src={currentPhoto} alt="Body Scan" className="w-full h-full object-cover opacity-70" />
                <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-400 shadow-[0_0_30px_rgba(52,211,153,1)] animate-[scan-line_2.5s_ease-in-out_infinite] z-20"></div>
              </div>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-light text-white tracking-wide">Mapeando geometria corporal...</h2>
        </div>
      )}

      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-black dark:text-white"><span className="text-lg pb-0.5">←</span></button>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter">Scanner de Físico</h1>
        <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full font-black tracking-widest shadow-sm">AI PREMIUM</span>
      </div>

      {!result ? (
        <div className="space-y-6 md:space-y-8 flex-1 flex flex-col">
          <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-emerald-600 shadow-sm space-y-4 transition-colors">
            <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-2">Dados Adicionais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[8px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-1">Peso (kg)</label><input type="text" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Ex: 82,5" className="w-full p-3 md:p-4 rounded-xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 font-black text-black dark:text-white outline-none focus:border-emerald-600 text-base" /></div>
              <div><label className="block text-[8px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-1">Altura (m)</label><input type="text" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} placeholder="Ex: 1,80" className="w-full p-3 md:p-4 rounded-xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 font-black text-black dark:text-white outline-none focus:border-emerald-600 text-base" /></div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border-2 border-emerald-600 shadow-sm text-center flex-1 flex flex-col justify-center items-center">
            <div className="text-7xl md:text-8xl mb-6 md:mb-8">🤳</div>
            <label className="inline-block cursor-pointer bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl active:scale-95 text-base md:text-lg w-full md:w-auto">
              ENVIAR FOTO
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
            {error && <p className="mt-6 text-red-500 font-black text-xs bg-red-50 dark:bg-red-900/30 p-4 rounded-xl border-2 border-red-100 dark:border-red-900/50 w-full">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-zinc-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border-4 border-emerald-600 shadow-2xl relative transition-colors">
            <div className="flex justify-between items-start mb-6 md:mb-10">
              <div>
                <p className="text-emerald-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2">Estimativa de BF</p>
                <p className="text-5xl md:text-8xl font-black italic tracking-tighter leading-none text-black dark:text-white">
                  {result.bfPercentage.split('(')[0].trim()}
                </p>
                {result.bfPercentage.includes('(') && (
                  <p className="mt-3 font-black text-emerald-600 uppercase text-[10px] md:text-xs tracking-wide">
                    {result.bfPercentage.match(/\((.*?)\)/)?.[1] || ''}
                  </p>
                )}
              </div>
              {currentPhoto && <div className="w-20 h-24 md:w-24 md:h-28 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg"><img src={currentPhoto} alt="Analisado" className="w-full h-full object-cover" /></div>}
            </div>

            <div className="space-y-4 border-t-2 border-emerald-50 dark:border-zinc-800 pt-6">
              <Thermometer label="Gordura Corporal" score={result.fatScore} context={result.fatContext} invertColors />
              <Thermometer label="Musculatura" score={result.muscleScore} context={result.muscleContext} />
              <Thermometer label="Definição" score={result.definitionScore} context={result.definitionContext} />

              <div className="mt-8 space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl border-l-4 border-red-500">
                  <h3 className="text-red-500 font-black uppercase text-xs tracking-widest mb-2">Pontos de Atenção ⚠️</h3>
                  <p className="text-gray-900 dark:text-white text-sm font-medium leading-relaxed">{result.pointsToImprove}</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border-l-4 border-blue-500">
                  <h3 className="text-blue-500 font-black uppercase text-xs tracking-widest mb-2">Sugestão de Dieta 🍽️</h3>
                  <p className="text-gray-900 dark:text-white text-sm font-medium leading-relaxed">{result.macroSuggestions}</p>
                </div>

                <AnalysisSection title="Análise Detalhada" content={result.detailedAnalysis} />
              </div>

              <div className="bg-black text-white p-6 md:p-8 rounded-3xl border-4 border-emerald-500 shadow-xl shadow-emerald-100 dark:shadow-none">
                <p className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.3em] mb-3">Papo do Coach 💪</p>
                <p className="text-base md:text-lg font-black italic leading-tight italic">"{result.coachAdvice}"</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PropCard label="Tronco" value={result.proportions.chest} />
            <PropCard label="Braços" value={result.proportions.arms} />
            <PropCard label="Abs/Cintura" value={result.proportions.abs} />
            <PropCard label="Pernas" value={result.proportions.legs} />
          </div>

          <div className="fixed md:static bottom-0 left-0 right-0 p-6 pt-8 pb-10 md:p-0 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 z-50 md:bg-none">
            <div className="max-w-3xl mx-auto flex flex-col gap-3">
              {!savedSuccess ? (
                <button onClick={handleSave} className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-2xl transition-all text-lg">Salvar na Evolução 📈</button>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-5 rounded-[2rem] border-2 border-emerald-600 font-black text-center text-sm animate-in zoom-in duration-500">REGISTRO SALVO! (Apenas Texto)</div>
              )}
              <button onClick={() => { setResult(null); setSavedSuccess(false); setCurrentPhoto(null); }} className="w-full py-4 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 text-black dark:text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all text-xs">Refazer Análise</button>
            </div>
          </div>
          <div className="h-32 md:h-0"></div>
        </div>
      )}
    </div>
  );
};

const AnalysisSection = ({ title, content }: { title: string, content: string }) => (
  <div>
    <h3 className="text-[10px] font-black uppercase tracking-widest mb-2 text-black dark:text-white">{title}</h3>
    <p className="text-black dark:text-white text-sm font-medium leading-relaxed">{content}</p>
  </div>
);

const PropCard = ({ label, value }: any) => (
  <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-2xl border-2 border-emerald-600 shadow-sm flex flex-col items-center text-center transition-colors">
    <p className="text-[8px] md:text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
    <p className="font-black leading-tight text-xs md:text-sm text-black dark:text-white">{value}</p>
  </div>
);

export default ShapeAnalyzer;
