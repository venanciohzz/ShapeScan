import React from 'react';
import { DailyFeedback } from '../../types';
import { Brain, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface DailyFeedbackCardProps {
  feedback: DailyFeedback | null;
  loading: boolean;
}

const DailyFeedbackCard: React.FC<DailyFeedbackCardProps> = ({ feedback, loading }) => {
  if (loading) {
    return (
      <div className="bg-zinc-950/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 animate-pulse min-h-[200px] flex flex-col justify-center items-center gap-4">
        <Brain className="w-8 h-8 text-white/10 animate-bounce" />
        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center">A Personal 24h está analisando o seu dia...</p>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="bg-zinc-950/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 flex flex-col items-center text-center gap-4 group hover:border-emerald-500/20 transition-all duration-700">
        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
          <Brain className="w-6 h-6 text-white/20 group-hover:text-emerald-500 transition-colors" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">PERSONAL 24h ATIVA</h3>
          <p className="text-[11px] text-white/40 leading-relaxed italic px-4">"Registre sua primeira refeição do dia para que eu possa analisar seu progresso e dar dicas personalizadas!"</p>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'excellent': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Sparkles };
      case 'good': return { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: TrendingUp };
      case 'bad': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle };
      default: return { color: 'text-zinc-400', bg: 'bg-white/5', border: 'border-white/10', icon: Brain };
    }
  };

  const config = getStatusConfig(feedback.status);
  const Icon = config.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-zinc-950/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group hover:border-emerald-500/20"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full -mr-24 -mt-24 group-hover:bg-emerald-500/10 transition-all duration-700" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 ${config.bg} ${config.border} border rounded-[1.2rem]`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">PERSONAL 24h • FEEDBACK</p>
              <h3 className="text-xl font-serif-premium font-bold text-white uppercase tracking-tight">Análise do Dia</h3>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-3xl md:text-4xl font-serif-premium font-bold ${config.color} tracking-tighter`}>{feedback.score}%</span>
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Aderência</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group/item">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 italic group-hover/item:text-white/60">Proteína</p>
            <p className="text-sm text-white/80 leading-relaxed">"{feedback.protein_feedback}"</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group/item">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 italic group-hover/item:text-white/60">Energia & Meta</p>
            <p className="text-sm text-white/80 leading-relaxed">"{feedback.energy_feedback}"</p>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <p className="text-emerald-400 text-xs font-serif-premium italic leading-relaxed text-center">
            ✨ {feedback.general_advice}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default DailyFeedbackCard;
