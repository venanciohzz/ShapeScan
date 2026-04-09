import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Lock, UtensilsCrossed, User } from 'lucide-react';

interface SimulatedAnalysisModalProps {
  onClose: () => void;
  onSignup: () => void;
  type?: 'body' | 'food';
}

const SimulatedAnalysisModal: React.FC<SimulatedAnalysisModalProps> = ({ onClose, onSignup, type = 'body' }) => {
  const [step, setStep] = useState<'select' | 'loading' | 'result'>('select');
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFood = type === 'food';

  const loadingMessages = isFood
    ? ['Identificando alimentos...', 'Calculando macros e calorias...', 'Gerando análise nutricional...']
    : ['Detectando pontos de análise...', 'Calculando composição corporal...', 'Gerando resultado personalizado...'];

  const startLoading = () => {
    setStep('loading');
    setProgress(0);
    setLoadingText(loadingMessages[0]);

    let prog = 0;
    const interval = setInterval(() => {
      prog += 2;
      setProgress(prog);

      if (prog === 30) setLoadingText(loadingMessages[1]);
      if (prog === 65) setLoadingText(loadingMessages[2]);

      if (prog >= 100) {
        clearInterval(interval);
        setTimeout(() => setStep('result'), 300);
      }
    }, 70);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    startLoading();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      startLoading();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const circumference = 2 * Math.PI * 45;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] bg-zinc-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget && step !== 'loading') onClose(); }}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      {step !== 'loading' && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-zinc-400 hover:text-white z-10"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white font-black text-xs font-serif-premium">S</span>
        </div>
        <span className="font-serif-premium font-bold text-sm text-white">
          ShapeScan<span className="text-emerald-500">.</span>
        </span>
      </div>

      <div className="w-full max-w-sm mx-auto relative z-10">
        <AnimatePresence mode="wait">

          {/* ─── STEP 1: SELECIONAR FOTO ─── */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                {isFood
                  ? <UtensilsCrossed className="w-8 h-8 text-emerald-400" />
                  : <User className="w-8 h-8 text-emerald-400" />
                }
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif-premium font-bold text-white mb-3 tracking-tight">
                {isFood ? 'Foto da refeição' : 'Foto do seu corpo'}
              </h2>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                {isFood
                  ? 'Envie uma foto da sua refeição para estimar calorias e macros em segundos.'
                  : 'Tire uma foto do seu corpo para analisar sua composição corporal em segundos.'}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-[2rem] p-10 cursor-pointer transition-all duration-300 hover:bg-emerald-500/5 mb-5 group active:scale-[0.98]"
              >
                <Upload className="w-10 h-10 text-zinc-600 group-hover:text-emerald-400 mx-auto mb-3 transition-colors" />
                <p className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">
                  Toque para selecionar
                </p>
                <p className="text-xs text-zinc-600 mt-1">JPG, PNG ou HEIC</p>
              </div>

              <p className="text-[10px] text-zinc-600 font-medium flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3" />
                Sua imagem não é armazenada nem enviada para nenhum servidor
              </p>
            </motion.div>
          )}

          {/* ─── STEP 2: CARREGANDO ─── */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="relative w-36 h-36 mx-auto mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="6" />
                  <circle
                    cx="50" cy="50" r="45" fill="none"
                    stroke="rgb(16, 185, 129)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress / 100)}
                    className="transition-all duration-75"
                    style={{ filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.9))' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white leading-none">{progress}%</span>
                  <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mt-0.5">Analisando</span>
                </div>
              </div>

              <motion.p
                key={loadingText}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-white font-bold text-lg mb-2 tracking-tight"
              >
                {loadingText}
              </motion.p>
              <p className="text-zinc-500 text-xs">Inteligência artificial em ação...</p>

              <div className="flex justify-center gap-2 mt-8">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-emerald-500"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: RESULTADO BLOQUEADO ─── */}
          {step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-14 h-14 mx-auto mb-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)]"
              >
                <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>

              <h2 className="text-2xl font-serif-premium font-bold text-white mb-1 tracking-tight">
                Análise concluída
              </h2>
              <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-6">
                Resultado pronto para você
              </p>

              {/* Card de resultado borrado — diferente por tipo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="relative rounded-[2rem] overflow-hidden border border-white/10 mb-5"
              >
                <div className="blur-[6px] pointer-events-none p-5 bg-zinc-900/80 select-none">
                  {isFood ? (
                    /* Resultado de REFEIÇÃO */
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white/5 rounded-2xl p-4 text-left col-span-2">
                          <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-1">Total Estimado</p>
                          <p className="text-3xl font-black text-white leading-none">820 <span className="text-lg text-zinc-400">kcal</span></p>
                          <p className="text-[9px] text-zinc-400 mt-1">Feijoada com arroz e farofa</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/5 rounded-xl p-3 text-left">
                          <div className="w-full h-1 bg-emerald-500 rounded-full mb-2" />
                          <p className="text-[9px] text-zinc-400 font-bold uppercase">Proteína</p>
                          <p className="text-white font-black text-sm">38g</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-left">
                          <div className="w-full h-1 bg-blue-500 rounded-full mb-2" />
                          <p className="text-[9px] text-zinc-400 font-bold uppercase">Carbo</p>
                          <p className="text-white font-black text-sm">92g</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-left">
                          <div className="w-full h-1 bg-yellow-500 rounded-full mb-2" />
                          <p className="text-[9px] text-zinc-400 font-bold uppercase">Gordura</p>
                          <p className="text-white font-black text-sm">26g</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Resultado de CORPO */
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white/5 rounded-2xl p-4 text-left">
                          <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-1">% Gordura</p>
                          <p className="text-3xl font-black text-white leading-none">18.4%</p>
                          <p className="text-[9px] text-zinc-400 mt-1">Nível: Fitness</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 text-left">
                          <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest mb-1">Massa Magra</p>
                          <p className="text-3xl font-black text-white leading-none">72.1<span className="text-lg">kg</span></p>
                          <p className="text-[9px] text-zinc-400 mt-1">Resultado ótimo</p>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-bold text-zinc-300">Simetria Muscular</p>
                          <p className="text-emerald-400 font-black text-sm">92%</p>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full w-[92%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Overlay de bloqueio */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-950/20 via-zinc-950/70 to-zinc-950/95 px-6">
                  <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <Lock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-white font-bold text-sm text-center leading-snug">
                    Sua análise está pronta
                  </p>
                  <p className="text-zinc-400 text-[11px] text-center mt-1">
                    Crie uma conta para desbloquear
                  </p>
                </div>
              </motion.div>

              <p className="text-zinc-400 text-sm mb-5 leading-relaxed">
                Crie sua conta para visualizar o resultado completo e acompanhar sua evolução.
              </p>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onSignup}
                className="w-full bg-emerald-500 text-zinc-950 py-4 rounded-full font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_35px_rgba(16,185,129,0.4)] mb-3"
              >
                Criar conta e ver resultado
              </motion.button>

              <p className="text-[10px] text-zinc-600 font-medium">
                Gratuito para começar · Sem cartão necessário
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SimulatedAnalysisModal;
