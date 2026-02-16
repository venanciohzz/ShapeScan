
import React, { useState, useRef, useEffect } from 'react';
import { User, FoodLog, ChatMessage, EvolutionRecord } from '../types';
import { chatWithCoach } from '../services/openaiService';

interface CoachChatProps {
  user: User;
  logs: FoodLog[];
  evolution: EvolutionRecord[];
  onBack: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onUpgrade: () => void;
}

const CoachChat: React.FC<CoachChatProps> = ({ user, logs, evolution, onBack, messages, setMessages, onUpgrade }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // PREMIUM LOCK
  if (!user.isPremium && user.plan !== 'lifetime') {
    return (
      <div className="fixed inset-0 z-50 bg-[#F3F6F8] dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-emerald-500/20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600"></div>

          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">💎</span>
          </div>

          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter">Personal AI</h2>
          <p className="text-gray-500 dark:text-zinc-400 font-medium mb-8">
            Converse com sua inteligência artificial personalizada para tirar dúvidas sobre dieta, treino e receber motivação diária.
          </p>

          <button onClick={onUpgrade} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 hover:-translate-y-1 transition-all mb-4">
            Desbloquear Agora
          </button>

          <button onClick={onBack} className="text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Initial Message with Context Logic
  useEffect(() => {
    // Only add welcome message if chat is completely empty
    if (messages.length === 0) {
      let welcome = `Fala ${user.name.split(' ')[0]}! Bora pra cima? 🚀`;

      // Check for latest evolution context
      if (evolution.length > 0) {
        const lastEvo = evolution[0];
        if (lastEvo.detailedAnalysis) {
          welcome += ` Vi sua última análise do shape. Vamos focar em melhorar esses pontos! 💪`;
        }
      }

      setMessages([{ role: 'assistant', content: welcome + " Manda a braba, no que posso ajudar hoje?" }]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Pass the last evolution record as context
      const lastEvolution = evolution.length > 0 ? evolution[0] : null;

      const response = await chatWithCoach(userMsg, newHistory, {
        user,
        logsSummary: logs.slice(0, 5),
        lastEvolution
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response || "Puts, me perdi aqui. Manda de novo? 🙏" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Erro na conexão. Tenta de novo já já! 🔥" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // We do NOT clear messages here anymore, so state persists in App.tsx while navigating
    onBack();
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#F3F6F8] dark:bg-zinc-950 flex justify-center h-[100dvh] w-full">
      <div className="w-full max-w-2xl h-full flex flex-col relative">

        {/* Header - Fixed Top with Safe Area Padding */}
        <div className="flex-none px-6 pt-12 pb-2 z-10 bg-gradient-to-b from-[#F3F6F8] via-[#F3F6F8] to-transparent dark:from-zinc-950 dark:via-zinc-950">
          <div className="glass-panel rounded-2xl p-4 flex justify-between items-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5 backdrop-blur-xl">
            <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 text-black dark:text-white">
              <span className="text-lg pb-0.5">←</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="font-black text-gray-900 dark:text-white tracking-tight text-sm">Personal AI</span>
            </div>
            <div className="w-10" />
          </div>
        </div>

        {/* Messages List - Flexible Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide overscroll-contain">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] p-5 rounded-3xl shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 rounded-tl-none font-medium'}`}>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 p-4 rounded-3xl rounded-tl-none flex items-center gap-3 shadow-sm">
                <div className="w-5 h-5 relative flex items-center justify-center"><div className="absolute inset-0 border border-emerald-500/30 rounded-full animate-spin"></div></div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">Digitando...</span>
              </div>
            </div>
          )}
          {/* Spacer to ensure scroll goes to bottom */}
          <div ref={scrollRef} className="h-4" />
        </div>

        {/* Input Area - Fixed Bottom */}
        <div className="flex-none px-6 pt-4 pb-8 bg-gradient-to-t from-[#F3F6F8] via-[#F3F6F8] to-transparent dark:from-zinc-950 dark:via-zinc-950">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Mande sua dúvida aqui... 💪"
              className="flex-1 px-6 py-5 rounded-[2rem] border-2 border-emerald-600 bg-white dark:bg-zinc-900 focus:border-emerald-700 outline-none shadow-lg font-bold text-black dark:text-white placeholder:text-gray-400 text-sm md:text-base"
            />
            <button onClick={handleSend} disabled={!input.trim() || loading} className="bg-emerald-600 text-white w-16 h-16 rounded-[2rem] flex items-center justify-center font-black shadow-xl hover:bg-emerald-700 transition-all group shrink-0">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CoachChat;
