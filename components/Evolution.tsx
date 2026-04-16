import React, { useState, useMemo } from 'react';
import { User, EvolutionRecord, FoodLog } from '../types';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import {
  ArrowLeft,
  TrendingUp,
  Plus,
  Trash2,
  Target,
  Scale,
  Calendar,
  ChevronRight,
  AlertCircle,
  Activity,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EvolutionCharts from './EvolutionCharts';


interface EvolutionProps {
  user: User;
  records: EvolutionRecord[];
  logs: FoodLog[];
  onBack: () => void;
  onAdd: (record: Omit<EvolutionRecord, 'id'>) => void;
  onDelete: (id: string) => void;
  onEdit: (record: EvolutionRecord) => void;
  onUpgrade: () => void;
}



const Evolution: React.FC<EvolutionProps> = ({ user, records, logs, onBack, onAdd, onDelete, onEdit, onUpgrade }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<EvolutionRecord>>({ date: Date.now(), weight: undefined, height: undefined, bf: undefined, notes: '' });

  if (!user.isPremium && user.plan !== 'lifetime') {
    return (
      <PremiumBackground className="flex items-center justify-center p-6" dim={true} intensity={1.5}>
        <div className="w-full max-w-lg bg-zinc-950/40 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-14 border border-emerald-500/20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <Award className="w-10 h-10 text-emerald-500" />
          </div>

          <h2 className="text-4xl font-serif-premium font-bold text-white mb-4 tracking-tight">
            <LetterPuller text="Evolução Elite" />
          </h2>
          <p className="text-zinc-400 font-medium text-base mb-12 leading-relaxed max-w-xs mx-auto">
            Projete sua jornada com gráficos de precisão, análises de BF e um diário de progresso ininterrupto.
          </p>

          <button
            onClick={onUpgrade}
            className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:bg-zinc-200 active:scale-95 transition-all text-xs mb-6"
          >
            Ativar Evolução Pro
          </button>

          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 mx-auto text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Voltar ao Painel
          </button>
        </div>
      </PremiumBackground>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData as Omit<EvolutionRecord, 'id'>);
    setIsAdding(false);
    setFormData({ date: Date.now(), weight: undefined, height: undefined, bf: undefined, notes: '' });
  };

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.date - a.date), [records]);

  return (
    <PremiumBackground className="flex flex-col p-6 overflow-y-auto" dim={true} intensity={1.0}>
      <div className="w-full max-w-2xl mx-auto py-12 md:py-20 relative z-10">

        {/* Delete Confirmation Overlay */}
        <AnimatePresence>
          {recordToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-900 w-full max-w-sm rounded-[3rem] p-10 border border-white/5 shadow-2xl"
              >
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-white text-center mb-2 font-serif-premium">Remover Registro?</h3>
                <p className="text-zinc-500 text-sm text-center mb-10 font-medium">Esta ação não poderá ser desfeita na sua matriz de dados.</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { onDelete(recordToDelete); setRecordToDelete(null); }}
                    className="w-full py-5 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Confirmar Exclusão
                  </button>
                  <button
                    onClick={() => setRecordToDelete(null)}
                    className="w-full py-5 bg-white/5 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                  >
                    Manter Registro
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="flex justify-between items-center mb-8 relative z-20">
          <button
            onClick={onBack}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>

        {/* Title Section */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-5xl font-serif-premium font-bold text-white tracking-tight mb-3">
            <LetterPuller text="Histórico" />
          </h1>
          <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.2em] md:tracking-[0.4em] opacity-80">
            Progressão de Performance
          </p>
        </div>

        {!isAdding ? (
          <div className="space-y-10">
            <EvolutionCharts records={records} logs={logs} user={user} />

            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-7 bg-white text-zinc-950 rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.05)] hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-3 text-xs"
            >
              <Plus className="w-4 h-4" /> Novo Marco de Peso
            </button>

            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {sortedRecords.length > 0 ? (
                  sortedRecords.map((rec, idx) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-zinc-950/40 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/5 shadow-2xl hover:border-emerald-500/30 transition-all relative group overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-3 h-3 text-emerald-500" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                              {new Date(rec.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          </div>

                          <div className="flex items-center gap-10 mt-6">
                            {rec.weight && (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                  <Scale className="w-3 h-3" /> Peso
                                </span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-serif-premium font-bold text-white tracking-tighter">{rec.weight}</span>
                                  <span className="text-xs font-bold text-zinc-600 uppercase">kg</span>
                                </div>
                              </div>
                            )}

                            {rec.bf && (
                              <div className="flex flex-col pl-10 border-l border-white/5">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                  <Activity className="w-3 h-3 text-emerald-500" /> Gordura
                                </span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-serif-premium font-bold text-emerald-500 tracking-tighter">{rec.bf}</span>
                                  <span className="text-xs font-bold text-emerald-900 uppercase">%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setRecordToDelete(rec.id)}
                          className="w-12 h-12 flex items-center justify-center bg-white/[0.03] border border-white/5 text-zinc-600 rounded-2xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {rec.detailedAnalysis && (
                        <div className="mt-8 bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 relative group/analysis">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                              <Target className="w-3 h-3" /> Análise de Performance
                            </h4>
                            <ChevronRight className="w-4 h-4 text-zinc-700 group-hover/analysis:text-emerald-500 transition-colors" />
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed font-medium line-clamp-3">
                            {rec.detailedAnalysis}
                          </p>
                          {rec.pointsToImprove && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                              <h5 className="text-[9px] font-black text-red-500/80 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3 text-red-500" /> Foco de Ajuste
                              </h5>
                              <p className="text-xs text-zinc-500 font-medium italic">{rec.pointsToImprove}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {rec.notes && (
                        <div className="mt-4 px-6 border-l-2 border-emerald-500/50">
                          <p className="text-[11px] font-medium text-zinc-500 leading-relaxed italic">
                            "{rec.notes}"
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-24 bg-zinc-950/40 rounded-[3rem] border border-white/5 shadow-xl">
                    <TrendingUp className="w-16 h-16 text-zinc-800 mx-auto mb-6 opacity-20" />
                    <p className="font-black text-zinc-700 uppercase text-[10px] tracking-[0.2em] md:tracking-[0.4em]">Inicie sua Jornada Pro</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleSubmit}
            className="bg-zinc-950/40 backdrop-blur-3xl p-6 md:p-14 rounded-[2rem] md:rounded-[3.5rem] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>

            <div className="text-center mb-10">
              <h2 className="text-2xl font-serif-premium font-bold text-white tracking-tight mb-2">Novo Marco</h2>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] md:tracking-[0.4em]">Sincronização de Matriz</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Scale className="w-3 h-3 text-emerald-500" /> Peso (KG)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight || ''}
                  onChange={e => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-xl text-white placeholder:text-zinc-800"
                  placeholder="00.0"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Activity className="w-3 h-3 text-emerald-500" /> BF (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.bf || ''}
                  onChange={e => setFormData({ ...formData, bf: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-xl text-white placeholder:text-zinc-800"
                  placeholder="12.5"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <Calendar className="w-3 h-3 text-emerald-500" /> Notas de Campo
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-base text-white placeholder:text-zinc-800 min-h-[120px] resize-none"
                placeholder="Como está sua força e disposição hoje?"
              />
            </div>

            <div className="flex flex-col gap-4 pt-6">
              <button
                type="submit"
                className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
              >
                Registrar Evolução
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="w-full py-4 text-zinc-600 font-black uppercase tracking-[0.3em] hover:text-white transition-colors text-[10px]"
              >
                Cancelar Operação
              </button>
            </div>
          </motion.form>
        )}

        <p className="text-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] md:tracking-[0.5em] mt-10 opacity-40 px-6">
          ShapeScan Elite Analytics Module
        </p>
      </div>
    </PremiumBackground>
  );
};

export default Evolution;
