import React, { useState, useEffect } from 'react';
import { User, ShapeAnalysisResult } from '../types';
import { analyzeShape } from '../services/openaiService';
import { compressImage } from '../utils/security';
import { db } from '../services/db';
import { Camera, Image as ImageIcon, TrendingUp, RefreshCw, Focus, Scale, Target, BicepsFlexed, AlertTriangle } from 'lucide-react';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { motion, AnimatePresence } from 'framer-motion';

interface ShapeAnalyzerProps {
  user: User;
  onBack: () => void;
  onSaveToEvolution: (data: any) => void;
  onUpgrade: () => void;
  onUpgradePro: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ShapeAnalyzer: React.FC<ShapeAnalyzerProps> = ({ user, onBack, onSaveToEvolution, onUpgrade, onUpgradePro, onShowToast }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShapeAnalysisResult | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [user]);

  if (user.plan === 'free' && !user.isAdmin) {
    return (
      <PremiumBackground className="flex items-center justify-center p-6" dim={true} intensity={1.5}>
        <div className="w-full max-w-lg bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] p-10 md:p-14 border border-emerald-500/20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <Focus className="w-10 h-10 text-emerald-500" />
          </div>

          <h2 className="text-4xl font-serif-premium font-bold text-white mb-4 tracking-tight">
            <LetterPuller text="Acesso Exclusivo" />
          </h2>
          <p className="text-zinc-400 font-medium text-base mb-12 leading-relaxed max-w-xs mx-auto">
            Descubra sua arquitetura corporal com o Scanner Neural de Proporção Estética. Disponível apenas no plano Pro.
          </p>

          <button
            onClick={onUpgrade}
            className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:bg-zinc-200 active:scale-95 transition-all text-xs mb-6"
          >
            Desbloquear Scanner
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
      case 'pro_annual': return 4;
      case 'monthly':
      case 'annual':
      case 'lifetime': return 2;
      default: return 0;
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
    const bfMatch = data.body_fat_range.match(/(\d+(?:\.\d+)?)/g);
    let bfValue = 20;
    if (bfMatch) {
      const nums = bfMatch.map(Number);
      bfValue = nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
    }

    const leanMassTarget = currentWeight * (1 - bfValue / 100);
    let targets: { label: string, bf: number }[] = [];
    if (bfValue > 12) {
      targets = [
        { label: "Atlético", bf: 15 },
        { label: "Elite", bf: 12 },
        { label: "Competição", bf: 10 }
      ];
    } else {
      targets = [
        { label: "Elite", bf: 10 },
        { label: "Pró", bf: 8 },
        { label: "Competição", bf: 6 }
      ];
    }

    data.target_projections = targets.map(t => ({
      label: t.label,
      bf: t.bf,
      weight: bfValue <= t.bf ? currentWeight : leanMassTarget / (1 - t.bf / 100)
    }));

    if (!data.bf_timeline || data.bf_timeline.length < 2) {
      data.bf_timeline = [
        { day: 0, bf: bfValue },
        { day: 60, bf: Math.max(bfValue - 2, 8) }
      ];
    }

    const startBF = data.bf_timeline[0].bf;
    const endBF = data.bf_timeline[1].bf;
    const diff = startBF - endBF;

    if (bfValue <= 12 && diff > 2) {
      data.bf_timeline[1].bf = Math.max(startBF - 2, 8);
    } else if (diff > 5) {
      data.bf_timeline[1].bf = startBF - 5;
    }
    return data;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
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
          const w = (weight ? parseFloat(weight.replace(',', '.')) : user.weight) || 75;
          const h = (height ? parseFloat(height.replace(',', '.')) : user.height) || 1.75;
          const metrics = { weight: w, height: h, goal: user.goal };
          const analysis = await analyzeShape(apiBase64, metrics);
          const validAnalysis = validateAndCoherenceResult(analysis, w);
          setResult(validAnalysis);
          await incrementUsage();
        } catch (err: any) {
          onShowToast(err.message || "Falha na análise", 'error');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      onShowToast("Erro ao processar arquivo.", 'error');
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    const w = weight ? parseFloat(weight.replace(',', '.')) : user.weight;
    const h = height ? parseFloat(height.replace(',', '.')) : user.height;
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

  if (user.plan === 'free' && !user.isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div>
      </div>
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
                <div className="text-4xl mb-4">🛑</div>
                <h3 className="text-2xl font-serif-premium font-bold text-white mb-4">Limite Diário</h3>
                <p className="text-zinc-500 mb-8 text-sm leading-relaxed tracking-wide">
                  Você utilizou todas as análises de físico do seu plano hoje. O scanner neural requer alto processamento e volta a ficar disponível amanhã.
                </p>
                <button
                  onClick={() => { setShowLimitModal(false); onUpgradePro(); }}
                  className="w-full py-5 bg-white text-zinc-950 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] mb-4 hover:bg-zinc-200 transition-all"
                >
                  Upgrade para Pro
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
                {currentPhoto && (
                  <div className="absolute inset-0 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl z-10">
                    <img src={currentPhoto} alt="Scanning" className="w-full h-full object-cover opacity-40 brightness-50" />
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_30px_rgba(52,211,153,1)] animate-[scan-line_2.5s_ease-in-out_infinite] z-20"></div>
                  </div>
                )}
                <div className="absolute animate-spin w-full h-full border-t-2 border-emerald-500/30 rounded-full"></div>
              </div>
              <div className="z-10 text-center space-y-6">
                <LetterPuller text="Mapeando geometria corporal..." className="text-white text-xl md:text-2xl tracking-[0.2em] uppercase" />
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
                <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] leading-none opacity-70">Análise de Bioimpedância Visual</span>
                <LetterPuller text="Neural Shape Scan" className="text-4xl md:text-6xl text-white tracking-tighter" />
              </div>

              <div className="bg-zinc-950/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Peso Atual (kg)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="80,0"
                      className="w-full bg-white/5 p-5 rounded-2xl border border-white/5 font-serif-premium text-2xl text-white outline-none focus:border-emerald-500/30 text-center transition-colors"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Altura (m)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder="1,75"
                      className="w-full bg-white/5 p-5 rounded-2xl border border-white/5 font-serif-premium text-2xl text-white outline-none focus:border-emerald-500/30 text-center transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="relative group bg-zinc-950/40 backdrop-blur-2xl p-12 rounded-[3.5rem] border-2 border-dashed border-emerald-500/20 flex flex-col items-center justify-center min-h-[400px] transition-all duration-500 hover:border-emerald-500/40">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3.5rem]"></div>

                <Focus className="w-32 h-32 text-emerald-500/20 mb-10 transform group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg z-10">
                  <label className="cursor-pointer bg-white text-zinc-950 p-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5">
                    <Camera className="w-5 h-5" /> Iniciar Scanner
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} disabled={loading} />
                  </label>
                  <label className="cursor-pointer bg-zinc-900 text-white p-6 rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 border border-white/10 hover:bg-zinc-800 transition-all active:scale-95">
                    <ImageIcon className="w-5 h-5" /> Importar Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
                  </label>
                </div>

                <p className="mt-8 text-[9px] font-black text-zinc-500 uppercase tracking-widest opacity-50 text-center max-w-xs">
                  Para precisão máxima, use iluminação frontal e roupas de treino.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              {/* 1️⃣ DIAGNÓSTICO: BANNER E BIOTIPO */}
              <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[120px] rounded-full -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
                  <div className="space-y-4 text-center md:text-left">
                    <div className="flex items-baseline gap-2 justify-center md:justify-start">
                      <h2 className="text-8xl md:text-[10rem] font-serif-premium font-bold text-white leading-none tracking-tighter">
                        {result.shape_score.toFixed(1)}
                      </h2>
                      <span className="text-3xl font-serif-premium text-zinc-600 font-bold tracking-tighter">/10</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] max-w-[240px] leading-relaxed mx-auto md:mx-0">
                      ÍNDICE NEURAL DE COMPOSIÇÃO E PROPORÇÃO ESTÉTICA.
                    </p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 text-center flex-1 md:max-w-sm space-y-6">
                    <div>
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Biotipo Predominante</p>
                      <p className="text-3xl font-serif-premium font-bold text-emerald-500 tracking-tight">{result.structural_analysis.name}</p>
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <span className="inline-block px-6 py-2 bg-emerald-500/5 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                        {result.bf_classification} • {result.body_fat_range}
                      </span>

                      {result.bf_confidence && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${result.bf_confidence.toLowerCase().includes('alta') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'}`}></div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Confiança {result.bf_confidence}</span>
                          </div>
                          {result.bf_visual_justification && (
                            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic max-w-[200px]">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PremiumScoreBar label="Musculatura" score={result.muscle_score} />
                <PremiumScoreBar label="Definição" score={result.definition_score} />
                <PremiumScoreBar label="Gordura" score={result.fat_score} isFatScore />
              </div>

              {/* 🧬 COMPOSIÇÃO E PROJEÇÃO */}
              {result.weight_metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Scale className="w-6 h-6 text-emerald-500" />
                      </div>
                      <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Métricas de Composição</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2 hover:bg-white/[0.05] transition-colors">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Massa Magra</p>
                        <p className="text-3xl font-serif-premium font-bold text-white">{result.weight_metrics.lean_mass_kg.toFixed(1)}<span className="text-xs ml-1 opacity-40">kg</span></p>
                      </div>
                      <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2 hover:bg-white/[0.05] transition-colors">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Massa Gorda</p>
                        <p className="text-3xl font-serif-premium font-bold text-emerald-500">{result.weight_metrics.fat_mass_kg.toFixed(1)}<span className="text-xs ml-1 opacity-40">kg</span></p>
                      </div>
                      <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2 hover:bg-white/[0.05] transition-colors">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Peso Total</p>
                        <p className="text-3xl font-serif-premium font-bold text-white">{result.weight_metrics.current_weight}<span className="text-xs ml-1 opacity-40">kg</span></p>
                      </div>
                      <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2 hover:bg-white/[0.05] transition-colors">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">IMC Neural</p>
                        <p className="text-3xl font-serif-premium font-bold text-white">{result.weight_metrics.bmi.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Target className="w-6 h-6 text-emerald-500" />
                      </div>
                      <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Alvos de Performance</h3>
                    </div>

                    <div className="space-y-3">
                      {result.target_projections && Array.isArray(result.target_projections) ? (
                        result.target_projections.map((proj, idx) => (
                          <TargetWeightRow
                            key={idx}
                            label={`${proj.label} (${proj.bf}%)`}
                            target={proj.weight}
                          />
                        ))
                      ) : (
                        <div className="p-8 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                          Gerando trajetórias...
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-zinc-600 font-bold leading-relaxed tracking-tight px-2 border-l border-white/10 uppercase">
                      Cálculo algorítmico baseado na preservação de massa miositária.
                    </p>
                  </div>
                </div>
              )}

              {/* 🦴 DIAGNÓSTICO GENÉTICO TÁTICO */}
              <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                  <h3 className="text-2xl font-serif-premium font-bold text-white tracking-tight">Arquitetura Genética</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> MAPEAMENTO ESTRUTURAL
                      </p>
                      <p className="text-base text-zinc-300 font-medium leading-relaxed">{result.structural_analysis.meaning}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> VANTAGEM BIOMÊTRICA
                      </p>
                      <p className="text-base text-zinc-300 font-medium leading-relaxed">{result.structural_analysis.strength}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> DESAFIO TÉCNICO
                      </p>
                      <p className="text-base text-zinc-300 font-medium leading-relaxed">{result.structural_analysis.improvement}</p>
                    </div>
                  </div>

                  <div className="space-y-6 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5">
                    <div className="space-y-1">
                      <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Responsividade Neural</p>
                      <p className="text-lg text-white font-serif-premium font-bold">{result.structural_analysis.genetic_responsiveness}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Tendência de Depósito</p>
                      <p className="text-lg text-white font-serif-premium font-bold">{result.structural_analysis.fat_storage_tendency}</p>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-emerald-500/70 text-[9px] font-black uppercase tracking-widest mb-1">Estratégia de Contorno</p>
                      <p className="text-lg text-emerald-400 font-serif-premium font-bold italic">"{result.structural_analysis.structural_limitation_strategy}"</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🔬 INSIGHT ESTRATÉGICO */}
              <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/10 p-12 rounded-[3.5rem] relative overflow-hidden space-y-10">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-500 via-emerald-600 to-transparent shadow-[4px_0_20px_rgba(16,185,129,0.2)]"></div>
                <div className="relative z-10 space-y-10">
                  <div className="space-y-4">
                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em]">Veredito do Analista AI</p>
                    <p className="text-white text-3xl md:text-5xl font-serif-premium font-bold leading-tight tracking-tighter italic">
                      "{result.coach_insight.aesthetic_diagnosis}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 bg-white/[0.03] rounded-[2rem] border border-white/5 space-y-3">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Ponto Focal de Estímulo</p>
                      <p className="text-white text-base font-bold leading-relaxed">{result.structural_analysis.strength}</p>
                    </div>
                    <div className="p-8 bg-white/[0.03] rounded-[2rem] border border-white/5 space-y-3">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Prioridade de Correção</p>
                      <p className="text-white text-base font-bold leading-relaxed">{result.structural_analysis.improvement}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🎯 PRIORIDADE: 60 DIAS */}
              <div className="bg-emerald-500/10 backdrop-blur-2xl border border-emerald-500/20 p-12 rounded-[3.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em] mb-6 opacity-70">Diretriz Crítica: Ciclo de 60 Dias</p>
                <p className="text-white text-3xl md:text-4xl font-serif-premium font-bold tracking-tight leading-tight">
                  "{result.execution_strategy.primary_focus_next_60_days}"
                </p>
              </div>

              {/* 🍽️ PROTOCOLO NUTRICIONAL */}
              <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-2xl">🍲</div>
                  <h3 className="text-2xl font-serif-premium font-bold text-white tracking-tight">Suporte Nutricional Neural</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-2">
                    <p className="text-emerald-500 text-[9px] font-black uppercase tracking-widest opacity-60">Estratégia Calórica</p>
                    <p className="text-lg text-white font-bold">{result.nutritional_protocol.caloric_strategy}</p>
                  </div>
                  <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-2">
                    <p className="text-emerald-500 text-[9px] font-black uppercase tracking-widest opacity-60">Densidade Proteica</p>
                    <p className="text-lg text-white font-bold">{result.nutritional_protocol.protein_target}</p>
                  </div>
                  <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-2">
                    <p className="text-emerald-500 text-[9px] font-black uppercase tracking-widest opacity-60">Janela Metabólica</p>
                    <p className="text-lg text-white font-bold">{result.nutritional_protocol.distribution}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] px-2">Comandos de Controle Prático</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.nutritional_protocol.practical_guidelines.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-white/[0.03] p-5 rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                          <span className="text-emerald-400 text-[10px] font-black">✓</span>
                        </div>
                        <p className="text-sm text-zinc-300 font-medium leading-snug">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 🏋️‍♂️ PROTOCOLO DE TREINO */}
              <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <BicepsFlexed className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-serif-premium font-bold text-white tracking-tight">Microciclo de Estímulo Tático</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.execution_strategy.training_focus.map((step, idx) => (
                    <div key={idx} className="flex gap-6 bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 items-start group hover:bg-white/[0.06] transition-all">
                      <span className="text-3xl font-serif-premium font-bold text-emerald-500/30 group-hover:text-emerald-500 transition-colors">{String(idx + 1).padStart(2, '0')}</span>
                      <p className="text-base text-zinc-200 font-bold leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 📍 ANÁLISE POR REGIÃO */}
              <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-2xl">📍</div>
                  <h3 className="text-2xl font-serif-premium font-bold text-white tracking-tight">Mapeamento Regional Neural</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { label: 'Cadeia Superior / Tronco', data: result.regional_analysis.trunk },
                    { label: 'Extremidades Superiores', data: result.regional_analysis.arms },
                    { label: 'Núcleo e Seção Média', data: result.regional_analysis.abs_waist },
                    { label: 'Cadeia Inferior / Pernas', data: result.regional_analysis.legs }
                  ].map((region, idx) => (
                    <div key={idx} className="bg-white/[0.03] rounded-[2.5rem] p-8 border border-white/5 space-y-6 group hover:bg-white/[0.06] transition-all">
                      <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] pb-4 border-b border-white/5 opacity-70">{region.label}</p>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> Ponto Estável
                          </p>
                          <p className="text-sm text-white font-medium leading-relaxed">{region.data.strength}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Oportunidade
                          </p>
                          <p className="text-sm text-zinc-300 font-medium leading-relaxed">{region.data.improvement}</p>
                        </div>
                        <div className="pt-4 border-t border-white/5">
                          <p className="text-emerald-500 text-[9px] font-black uppercase tracking-widest mb-1 italic">Estratégia Direcionada</p>
                          <p className="text-sm text-emerald-400 font-bold italic leading-relaxed">"{region.data.strategy}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ⏳ CRONOGRAMA E GRÁFICO DE BF */}
              <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-2xl">⏳</div>
                    <h3 className="text-2xl font-serif-premium font-bold text-white tracking-tight">Trajetória Realista</h3>
                  </div>
                  <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                    <p className="text-xl font-serif-premium font-bold text-emerald-400 italic tracking-tighter">{result.execution_strategy.time_expectation}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                  <div className="space-y-8">
                    <p className="text-base text-zinc-400 font-medium leading-relaxed">
                      A curva de evolução neural projeta uma otimização metabólica progressiva, com maior eficiência lipolítica nas janelas de estímulo inicial.
                    </p>
                    <div className="flex items-center gap-10">
                      <div className="space-y-1">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Estado Inicial</p>
                        <p className="text-4xl font-serif-premium font-bold text-white">{result.bf_timeline[0].bf}%</p>
                      </div>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 via-emerald-500 to-white/10 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Meta 60 Dias</p>
                        <p className="text-4xl font-serif-premium font-bold text-emerald-400">{result.bf_timeline[1].bf}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-40 w-full relative group">
                    <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible relative z-10">
                      <defs>
                        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                        </linearGradient>
                      </defs>
                      {[0, 10, 20, 30, 40].map(y => (
                        <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="white" strokeOpacity="0.03" strokeWidth="0.5" />
                      ))}
                      <path
                        d={`M 0 10 Q 40 35 100 38`}
                        fill="none"
                        stroke="url(#curveGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      />
                      <circle cx="0" cy="10" r="2" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                      <circle cx="100" cy="38" r="3" fill="#10b981" className="animate-pulse" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* ⚠️ ALERTAS INTELIGENTES */}
              <div className="bg-red-500/5 backdrop-blur-2xl border border-red-500/20 p-10 rounded-[3rem] space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.3em]">Protocolo de Risco e Platô</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.execution_strategy.common_mistakes.map((error, idx) => (
                    <div key={idx} className="flex gap-4 bg-black/40 p-6 rounded-2xl border border-red-500/10 items-start group hover:border-red-500/30 transition-colors">
                      <span className="text-red-500 font-serif-premium font-bold text-xl pt-0.5">✕</span>
                      <p className="text-sm text-zinc-400 font-bold leading-relaxed">{error}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-12 border-t border-white/5 text-center">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em] italic opacity-60">
                  "{result.coach_comment}"
                </p>
              </div>

              {/* 🔘 BOTÕES DE DESFECHO */}
              <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent z-[80] md:static md:bg-none md:p-0 md:mt-12">
                <div className="max-w-xl mx-auto flex flex-col gap-4">
                  {!savedSuccess ? (
                    <button
                      onClick={handleSave}
                      className="w-full bg-white text-zinc-950 flex items-center justify-center gap-3 py-6 rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-zinc-200 shadow-2xl shadow-white/5 active:scale-[0.98] transition-all text-xs"
                    >
                      Confirmar Relatório <TrendingUp className="w-4 h-4" />
                    </button>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-6 rounded-3xl font-black text-center text-[10px] uppercase tracking-[0.3em]"
                    >
                      Sincronizado com a Evolução Neural ✅
                    </motion.div>
                  )}
                  <button
                    onClick={() => { setResult(null); setSavedSuccess(false); setCurrentPhoto(null); setWeight(''); setHeight(''); window.scrollTo(0, 0); }}
                    className="w-full flex items-center justify-center gap-3 py-5 bg-white/5 border border-white/10 text-zinc-400 rounded-3xl font-black uppercase tracking-[0.2em] hover:text-white hover:bg-white/10 active:scale-[0.98] transition-all text-[9px]"
                  >
                    Nova Análise <RefreshCw className="w-3 h-3" />
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

// --- COMPONENTES AUXILIARES ---

const TargetWeightRow = ({ label, target }: { label: string, target?: number }) => (
  <div className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5 group hover:bg-white/[0.05] transition-all">
    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">{label}</p>
    <p className="text-xl font-serif-premium font-bold text-white italic">{target ? `${target.toFixed(1)}kg` : '---'}</p>
  </div>
);

const PremiumScoreBar = ({ label, score, isFatScore = false }: { label: string, score: number, isFatScore?: boolean }) => {
  const percentage = Math.min(Math.max(score * 10, 0), 100);
  let colorClass = 'bg-zinc-500';
  let isPositive = false;

  if (isFatScore) {
    if (score <= 3.5) colorClass = 'bg-emerald-500';
    else if (score <= 6.5) colorClass = 'bg-amber-500';
    else colorClass = 'bg-red-500';
    isPositive = score <= 3.5;
  } else {
    if (score >= 7) colorClass = 'bg-emerald-500';
    else if (score >= 4) colorClass = 'bg-amber-500';
    else colorClass = 'bg-red-500';
    isPositive = score >= 7;
  }

  return (
    <div className="space-y-4 p-8 bg-zinc-950/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] group hover:border-white/10 transition-all">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-zinc-400 transition-colors">{label}</span>
        <span className={`text-2xl font-serif-premium font-bold ${isPositive ? 'text-emerald-400' : (colorClass === 'bg-red-500' ? 'text-red-500' : 'text-white')}`}>
          {score.toFixed(1)}
          <span className="text-[10px] opacity-20 ml-1">/10</span>
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`h-full ${colorClass} shadow-[0_0_15px_rgba(16,185,129,0.3)]`}
        />
      </div>
    </div>
  );
};

export default ShapeAnalyzer;
