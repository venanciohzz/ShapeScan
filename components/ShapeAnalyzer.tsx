
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

// Remoção de Thermometer não utilizado (substituído por PremiumScoreBar)

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

  // Scroll Lock during loading
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

  const validateAndCoherenceResult = (data: ShapeAnalysisResult, currentWeight: number): ShapeAnalysisResult => {
    // Extrair BF numérico médio para cálculos (ex: "14-16%" -> 15)
    const bfMatch = data.body_fat_range.match(/(\d+)/g);
    let bfValue = 20;
    if (bfMatch) {
      const nums = bfMatch.map(Number);
      bfValue = nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
    }

    const leanMass = currentWeight * (1 - bfValue / 100);

    // 1. Bloqueio de Contradição de BF & Fórmulas de Peso Alvo
    if (data.target_projections) {
      if (bfValue < 15) data.target_projections.weight_at_15_bf = currentWeight;
      else data.target_projections.weight_at_15_bf = leanMass / 0.85;

      if (bfValue < 12) data.target_projections.weight_at_12_bf = currentWeight;
      else data.target_projections.weight_at_12_bf = leanMass / 0.88;

      if (bfValue < 10) data.target_projections.weight_at_10_bf = currentWeight;
      else data.target_projections.weight_at_10_bf = leanMass / 0.90;
    }

    // 2. Linha do Tempo Realista (Cap 1-2% BF em 60 dias se BF < 12%)
    if (data.bf_timeline && data.bf_timeline.length >= 2) {
      const startBF = data.bf_timeline[0].bf;
      const endBF = data.bf_timeline[1].bf;
      const diff = startBF - endBF;

      if (bfValue <= 12 && diff > 2) {
        data.bf_timeline[1].bf = Math.max(startBF - 2, 8); // Não passa de 2% de queda
      } else if (diff > 6) {
        data.bf_timeline[1].bf = startBF - 5; // Proteção contra quedas absurdas
      }
    }

    return data;
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
          const w = (weight ? parseFloat(weight.replace(',', '.')) : user.weight) || 75;
          const h = (height ? parseFloat(height.replace(',', '.')) : user.height) || 1.75;
          const metrics = { weight: w, height: h, goal: user.goal };
          const analysis = await analyzeShape(apiBase64, metrics);

          // Validação de Coerência Final (Camada de Segurança)
          const validAnalysis = validateAndCoherenceResult(analysis, w);
          setResult(validAnalysis);

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
    const w = weight ? parseFloat(weight.replace(',', '.')) : user.weight;
    const h = height ? parseFloat(height.replace(',', '.')) : user.height;

    // Map new result structure to evolution record
    onSaveToEvolution({
      bf: result.body_fat_range,
      photo: undefined,
      notes: `${result.coach_comment}\n\nANÁLISE REGIONAL:\nTronco: ${result.regional_analysis.trunk.strength} | ${result.regional_analysis.trunk.improvement}\nBraços: ${result.regional_analysis.arms.strength} | ${result.regional_analysis.arms.improvement}\nAbdômen: ${result.regional_analysis.abs_waist.strength} | ${result.regional_analysis.abs_waist.improvement}\nPernas: ${result.regional_analysis.legs.strength} | ${result.regional_analysis.legs.improvement}`,
      detailedAnalysis: `${result.structural_analysis.name} | ${result.bf_classification}\n\nSignificado: ${result.structural_analysis.meaning}\n\nVantagem: ${result.structural_analysis.strength}\n\nDesafio: ${result.structural_analysis.improvement}\n\nFoco 60 Dias: ${result.execution_strategy.primary_focus_next_60_days}\n\nEstratégia: ${result.execution_strategy.training_focus.join(', ')}\n\nNutrição: ${result.nutritional_protocol.caloric_strategy} | ${result.nutritional_protocol.protein_target}`,
      pointsToImprove: result.execution_strategy.common_mistakes.join('\n'),
      macroSuggestions: result.execution_strategy.nutrition_focus,
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 w-full max-w-sm rounded-[2rem] p-8 border-2 border-emerald-500/50 shadow-2xl text-center relative overflow-hidden">
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
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500 touch-none overscroll-none">
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
          <div className="bg-zinc-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-emerald-500/20 shadow-sm space-y-4 transition-colors">
            <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-2">Dados Adicionais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[8px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-1">Peso (kg)</label><input type="text" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Ex: 82,5" className="w-full p-3 md:p-4 rounded-xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 font-black text-black dark:text-white outline-none focus:border-emerald-600 text-base" /></div>
              <div><label className="block text-[8px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-1">Altura (m)</label><input type="text" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} placeholder="Ex: 1,80" className="w-full p-3 md:p-4 rounded-xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 font-black text-black dark:text-white outline-none focus:border-emerald-600 text-base" /></div>
            </div>
          </div>
          <div className="bg-zinc-900 p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border-2 border-emerald-500/20 shadow-sm text-center flex-1 flex flex-col justify-center items-center">
            <div className="text-7xl md:text-8xl mb-6 md:mb-8">🤳</div>
            <div className="flex flex-col gap-4 w-full md:w-auto">
              <label className="inline-flex items-center justify-center gap-3 cursor-pointer bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl active:scale-95 text-base md:text-lg w-full">
                <span className="text-2xl">📸</span>
                TIRAR FOTO
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} disabled={loading} />
              </label>

              <label className="inline-flex items-center justify-center gap-3 cursor-pointer bg-transparent text-emerald-500 border-2 border-emerald-500/30 px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500/10 shadow-lg active:scale-95 text-base md:text-lg w-full">
                <span className="text-2xl">🖼️</span>
                GALERIA DE FOTOS
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
              </label>
            </div>
            {error && <p className="mt-6 text-red-500 font-black text-xs bg-red-50 dark:bg-red-900/30 p-4 rounded-xl border-2 border-red-100 dark:border-red-900/50 w-full">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-8 pb-32 animate-in slide-in-from-bottom-6 duration-700">
          {/* 1️⃣ DIAGNÓSTICO: BANNER E BIOTIPO */}
          <div className="bg-zinc-900 border-2 border-emerald-500/30 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px] rounded-full"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-2 text-center md:text-left">
                <div className="flex items-baseline gap-1 justify-center md:justify-start">
                  <h2 className="text-7xl md:text-9xl font-black italic tracking-tighter text-white leading-none">
                    {result.shape_score.toFixed(1)}
                  </h2>
                  <span className="text-2xl md:text-4xl text-zinc-500 font-black italic tracking-tighter">/10</span>
                </div>
                <p className="text-[9px] text-zinc-500 font-bold max-w-[200px] leading-tight mt-1">Este score considera proporção estrutural, definição e desenvolvimento muscular atual.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 text-center flex-1 md:max-w-xs">
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1">Biotipo Predominante</p>
                <p className="text-lg md:text-xl font-black text-emerald-500 italic tracking-tighter mb-2">{result.structural_analysis.name}</p>
                <div className="flex flex-col gap-2">
                  <span className="inline-block px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                    {result.bf_classification} • BF de {result.body_fat_range}
                  </span>
                  {result.bf_confidence && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${result.bf_confidence.toLowerCase().includes('alta') ? 'bg-emerald-500 animate-pulse' :
                          result.bf_confidence.toLowerCase().includes('moderada') ? 'bg-amber-500' :
                            'bg-zinc-500'
                          }`}></span>
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Confiança {result.bf_confidence}</span>
                      </div>
                      {result.bf_visual_justification && (
                        <p className="text-[8px] text-zinc-500 font-bold leading-tight italic px-2">
                          "{result.bf_visual_justification}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 📊 PERFORMANCE GERAL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PremiumScoreBar label="Musculatura" score={result.muscle_score} />
            <PremiumScoreBar label="Definição" score={result.definition_score} />
            <PremiumScoreBar label="Nível Gordura" score={result.fat_score} isFatScore />
          </div>

          {/* 🧬 COMPOSIÇÃO E PROJEÇÃO (SE HOUVER DADOS) */}
          {result.weight_metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2.5rem] space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚖️</span>
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Composição Corporal Estimada</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Massa Magra</p>
                    <p className="text-2xl font-black text-white italic">{result.weight_metrics.lean_mass_kg.toFixed(1)}kg</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Massa Gorda</p>
                    <p className="text-2xl font-black text-emerald-500 italic">{result.weight_metrics.fat_mass_kg.toFixed(1)}kg</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Peso Atual</p>
                    <p className="text-2xl font-black text-white opacity-50 italic">{result.weight_metrics.current_weight}kg</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">IMC</p>
                    <p className="text-2xl font-black text-white italic">{result.weight_metrics.bmi.toFixed(1)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2.5rem] space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎯</span>
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Pesos Alvo por BF (%)</h3>
                </div>
                <div className="space-y-3">
                  <TargetWeightRow label="Atlético (15%)" target={result.target_projections?.weight_at_15_bf} />
                  <TargetWeightRow label="Elite (12%)" target={result.target_projections?.weight_at_12_bf} />
                  <TargetWeightRow label="Competição (10%)" target={result.target_projections?.weight_at_10_bf} />
                </div>
                <p className="text-[8px] text-zinc-600 font-bold leading-tight">Cálculo baseado na manutenção total da massa magra atual.</p>
              </div>
            </div>
          )}

          {/* 🦴 DIAGNÓSTICO GENÉTICO TÁTICO */}
          <div className="bg-zinc-900 border-2 border-zinc-800 p-8 md:p-10 rounded-[2.5rem] space-y-8">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
              <h3 className="text-xl font-black text-white italic tracking-tight">Análise Genética Tática</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span>🔎</span> O que isso significa
                  </p>
                  <p className="text-sm text-zinc-300 font-medium leading-relaxed">{result.structural_analysis.meaning}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span>🎯</span> Principal vantagem estrutural
                  </p>
                  <p className="text-sm text-zinc-300 font-medium leading-relaxed">{result.structural_analysis.strength}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span>⚠️</span> Principal desafio estrutural
                  </p>
                  <p className="text-sm text-zinc-300 font-medium leading-relaxed">{result.structural_analysis.improvement}</p>
                </div>
              </div>

              <div className="space-y-6 p-6 bg-white/5 rounded-[2rem] border border-white/5">
                <div className="space-y-1">
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Resposta Genética</p>
                  <p className="text-sm text-white font-bold">{result.structural_analysis.genetic_responsiveness}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Tendência de Depósito</p>
                  <p className="text-sm text-white font-bold">{result.structural_analysis.fat_storage_tendency}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-emerald-500/70 text-[8px] font-black uppercase tracking-widest">Estratégia de Contorno</p>
                  <p className="text-sm text-emerald-500 font-bold italic">{result.structural_analysis.structural_limitation_strategy}</p>
                </div>
              </div>
            </div>
          </div>


          {/* 🔬 INSIGHT ESTRATÉGICO (PROFESSIONAL) */}
          <div className="bg-zinc-900 border-2 border-zinc-800 p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden space-y-10">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
            <div className="relative z-10 space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="not-italic text-sm">🔬</span>
                  <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">Diagnóstico Estético</p>
                </div>
                <p className="text-white text-2xl md:text-3xl font-black italic italic leading-tight tracking-tighter">
                  "{result.coach_insight.aesthetic_diagnosis}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="not-italic text-xs">💪</span>
                    <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em]">Vantagem Estrutural</p>
                  </div>
                  <p className="text-white text-sm font-bold leading-snug">{result.structural_analysis.strength}</p>
                </div>

                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="not-italic text-xs">📉</span>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Desafio Estrutural</p>
                  </div>
                  <p className="text-white text-sm font-bold leading-snug">{result.structural_analysis.improvement}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 🎯 PRIORIDADE: FOCO PRINCIPAL 60 DIAS */}
          <div className="bg-zinc-900 border-2 border-emerald-500/20 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full"></div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Prioridade Estratégica: Próximos 60 Dias</p>
            <p className="text-white text-2xl md:text-3xl font-black italic tracking-tighter leading-tight">
              "{result.execution_strategy.primary_focus_next_60_days}"
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span className="w-12 h-1 bg-emerald-500 rounded-full"></span>
              <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">Direcionamento Quantificável</span>
            </div>
          </div>

          {/* 🍽️ PROTOCOLO NUTRICIONAL PROFUNDO */}
          <div className="bg-zinc-900 border-2 border-zinc-800 p-8 md:p-10 rounded-[2.5rem] space-y-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍲</span>
              <h3 className="text-xl font-black text-white italic tracking-tight">Protocolo Nutricional Profundo</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                <p className="text-emerald-500 text-[8px] font-black uppercase tracking-widest">Estratégia Calórica</p>
                <p className="text-sm text-white font-bold">{result.nutritional_protocol.caloric_strategy}</p>
              </div>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                <p className="text-emerald-500 text-[8px] font-black uppercase tracking-widest">Proteína (Alvo)</p>
                <p className="text-sm text-white font-bold">{result.nutritional_protocol.protein_target}</p>
              </div>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                <p className="text-emerald-500 text-[8px] font-black uppercase tracking-widest">Distribuição</p>
                <p className="text-sm text-white font-bold">{result.nutritional_protocol.distribution}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Diretrizes de Controle Prático</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.nutritional_protocol.practical_guidelines.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="text-emerald-500 text-xs">✓</span>
                    <p className="text-xs text-zinc-300 font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 🏋️‍♂️ PROTOCOLO DE TREINO TÁTICO */}
          <div className="bg-zinc-900 border-2 border-zinc-800 p-8 md:p-10 rounded-[2.5rem] space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏋️‍♂️</span>
              <h3 className="text-xl font-black text-white italic tracking-tight">Protocolo de Treino Tático</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.execution_strategy.training_focus.map((step, idx) => (
                <div key={idx} className="flex gap-4 bg-zinc-800/50 p-5 rounded-2xl border border-white/5 items-start">
                  <span className="text-emerald-500 font-black italic text-xl">{idx + 1}</span>
                  <p className="text-sm text-zinc-200 font-bold leading-snug">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 📍 ANÁLISE POR REGIÃO (DETALHADA) */}
          <div className="bg-zinc-900 border-2 border-zinc-800 p-8 md:p-10 rounded-[2.5rem] space-y-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📍</span>
              <h3 className="text-xl font-black text-white italic tracking-tight">Análise por Região</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Tronco / Peitoral', data: result.regional_analysis.trunk },
                { label: 'Braços / Ombros', data: result.regional_analysis.arms },
                { label: 'Abdômen / Cintura', data: result.regional_analysis.abs_waist },
                { label: 'Pernas / Membros Inferiores', data: result.regional_analysis.legs }
              ].map((region, idx) => (
                <div key={idx} className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                  <p className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">{region.label}</p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">📌 Ponto Forte</p>
                      <p className="text-xs text-white font-medium leading-relaxed">{region.data.strength}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">📌 Ponto de Melhoria</p>
                      <p className="text-xs text-zinc-300 font-medium leading-relaxed">{region.data.improvement}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">📌 Potencial Estratégico</p>
                      <p className="text-xs text-emerald-500/80 font-bold leading-relaxed italic">{region.data.strategy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ⏳ CRONOGRAMA E GRÁFICO DE BF */}
          <div className="bg-zinc-900 border-2 border-zinc-800 p-8 md:p-10 rounded-[2.5rem] space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⏳</span>
                <h3 className="text-xl font-black text-white italic tracking-tight">Linha do Tempo Realista</h3>
              </div>
              <p className="text-2xl font-black text-emerald-500 italic tracking-tighter">{result.execution_strategy.time_expectation}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                  A perda tende a ser mais rápida nas primeiras semanas devido à redução de retenção hídrica inicial e adaptação metabólica.
                </p>
                <div className="flex gap-8">
                  <div>
                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Dia 0</p>
                    <p className="text-3xl font-black text-white">{result.bf_timeline[0].bf}%</p>
                  </div>
                  <div className="flex items-center text-zinc-700">
                    <span className="text-xl">→</span>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Dia 60</p>
                    <p className="text-3xl font-black text-emerald-500">{result.bf_timeline[1].bf}%</p>
                  </div>
                </div>
              </div>

              {/* GRÁFICO SVG SIMPLES */}
              <div className="h-32 w-full relative">
                <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  {[0, 10, 20, 30, 40].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                  ))}
                  {/* Curve - Simple Bezier for Day 0 to Day 60 */}
                  <path
                    d={`M 0 10 Q 30 35 100 38`} // Simple illustrative curve
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Points */}
                  <circle cx="0" cy="10" r="1.5" fill="#10b981" />
                  <circle cx="100" cy="38" r="1.5" fill="#10b981" />
                  {/* Labels */}
                  <text x="0" y="5" fontSize="3" fill="#6b7280" fontWeight="bold">Dia 0</text>
                  <text x="90" y="33" fontSize="3" fill="#10b981" fontWeight="bold">Dia 60</text>
                </svg>
              </div>
            </div>
          </div>

          {/* ⚠️ ALERTAS INTELIGENTES */}
          <div className="bg-red-500/5 border-2 border-red-500/20 p-8 md:p-10 rounded-[2.5rem] space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Alertas de Platô e Riscos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.execution_strategy.common_mistakes.map((error, idx) => (
                <div key={idx} className="flex gap-3 bg-black/40 p-4 rounded-xl border border-red-500/10 items-start">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <p className="text-[11px] text-zinc-400 font-bold leading-snug">{error}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FINAL COACH COMMENT */}
          <div className="pt-8 border-t border-zinc-800 text-center">
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest italic">{result.coach_comment}</p>
          </div>

          {/* 🔘 BOTÕES DE DESFECHO */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-[80] md:static md:bg-none md:p-0">
            <div className="max-w-2xl mx-auto flex flex-col gap-3">
              {!savedSuccess ? (
                <button
                  onClick={handleSave}
                  className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest hover:bg-emerald-500 shadow-[0_10px_40px_rgba(16,185,129,0.3)] active:scale-95 transition-all text-lg"
                >
                  Salvar na Evolução 📈
                </button>
              ) : (
                <div className="bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 py-6 rounded-[2rem] font-black text-center text-sm uppercase tracking-widest animate-in zoom-in">
                  Registro Salvo com Sucesso! ✅
                </div>
              )}
              <button
                onClick={() => { setResult(null); setSavedSuccess(false); setCurrentPhoto(null); window.scrollTo(0, 0); }}
                className="w-full py-4 bg-transparent border-2 border-zinc-800 text-zinc-500 rounded-2xl font-black uppercase tracking-widest hover:text-white hover:border-zinc-600 active:scale-95 transition-all text-xs"
              >
                Nova Análise 🔄
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTES AUXILIARES PREMIUM ---

const TargetWeightRow = ({ label, target }: { label: string, target?: number }) => (
  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-black text-white italic">{target ? `${target.toFixed(1)}kg` : '---'}</p>
  </div>
);

const SimplePropCard = ({ label, value }: { label: string, value: string }) => (
  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
    <p className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">{label}</p>
    <p className="text-[11px] text-white font-black italic leading-tight">{value}</p>
  </div>
);

const PremiumScoreBar = ({ label, score, isFatScore = false }: { label: string, score: number, isFatScore?: boolean }) => {
  const percentage = Math.min(Math.max(score * 10, 0), 100);

  // Logic for colors based on score direction
  let colorClass = 'bg-zinc-500';
  let isPositive = false;

  if (isFatScore) {
    // Fat: Lower is better (Green 0-3.5, Yellow 3.6-6.5, Red 6.6-10)
    if (score <= 3.5) colorClass = 'bg-emerald-500';
    else if (score <= 6.5) colorClass = 'bg-amber-500';
    else colorClass = 'bg-red-500';
    isPositive = score <= 3.5;
  } else {
    // Muscle/Definition: Higher is better (Green 7-10, Yellow 4-6.9, Red 0-3.9)
    if (score >= 7) colorClass = 'bg-emerald-500';
    else if (score >= 4) colorClass = 'bg-amber-500';
    else colorClass = 'bg-red-500';
    isPositive = score >= 7;
  }

  return (
    <div className="space-y-2 p-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
        <span className={`text-lg font-black italic ${isPositive ? 'text-emerald-500' : (colorClass === 'bg-red-500' ? 'text-red-500' : 'text-white')}`}>
          {score.toFixed(1)}
          <span className="text-[8px] opacity-30 italic ml-0.5">/10</span>
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full ${colorClass} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ShapeAnalyzer;
