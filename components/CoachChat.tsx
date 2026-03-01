import React, { useState, useRef, useEffect } from 'react';
import { User, FoodLog, ChatMessage, EvolutionRecord } from '../types';
import { chatWithCoach } from '../services/openaiService';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { ChevronLeft, Sparkles, Diamond, Mic, Send, Bot, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoachChatProps {
  user: User;
  logs: FoodLog[];
  evolution: EvolutionRecord[];
  onBack: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onUpgrade: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CoachChat: React.FC<CoachChatProps> = ({ user, logs, evolution, onBack, messages, setMessages, onUpgrade, onShowToast }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // PREMIUM LOCK
  if (!user.isPremium && user.plan !== 'lifetime') {
    return (
      <PremiumBackground className="flex items-center justify-center p-6" dim={true} intensity={1.5}>
        <div className="w-full max-w-lg bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] p-10 md:p-14 border border-emerald-500/20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <Diamond className="w-10 h-10 text-emerald-500" />
          </div>

          <h2 className="text-4xl font-serif-premium font-bold text-white mb-4 tracking-tight">
            <LetterPuller text="Acesso Exclusivo" />
          </h2>
          <p className="text-zinc-400 font-medium text-base mb-12 leading-relaxed max-w-xs mx-auto">
            Sincronize sua rotina com uma inteligência artificial de elite. Dúvidas, treinos e motivação em tempo real.
          </p>

          <button
            onClick={onUpgrade}
            className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:bg-zinc-200 active:scale-95 transition-all text-xs mb-6"
          >
            Desbloquear Coach AI
          </button>

          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 mx-auto text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3 h-3" /> Voltar ao Painel
          </button>
        </div>
      </PremiumBackground>
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

  // Speech Recognition Setup
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Basic markdown/asterisk cleanup function for displayed messages
    // This runs when messages change to ensure we clean up incoming AI responses
  }, [messages]);

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => (prev ? prev + ' ' + transcript : transcript));
      };

      recognitionRef.current.start();
    } else {
      onShowToast('Seu navegador não suporta reconhecimento de voz.', 'error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

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

      // Clean up markdown asterisks from response immediately
      const cleanResponse = response ? response.replace(/\*\*/g, '').replace(/__/g, '') : "Puts, me perdi aqui. Manda de novo? 🙏";

      setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Erro na conexão. Tenta de novo já já! 🔥" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    onBack();
  }

  // Helper to render message content without asterisks (double check)
  const renderMessageContent = (content: string) => {
    return content.replace(/\*\*/g, '').replace(/__/g, '');
  };

  return (
    <PremiumBackground className="h-[100dvh] w-full" dim={true} intensity={1.2}>
      <div className="w-full max-w-2xl h-full flex flex-col relative mx-auto">

        {/* Header - Glass Aesthetic */}
        <div className="flex-none px-6 pt-12 pb-6 z-30">
          <div className="bg-zinc-950/40 backdrop-blur-2xl rounded-[2.5rem] p-5 flex justify-between items-center border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

            <button
              onClick={handleBack}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                <h1 className="text-xl font-serif-premium font-bold text-white tracking-tight">
                  <LetterPuller text="Coach AI" />
                </h1>
              </div>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] opacity-70">Sincronizado</p>
            </div>

            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Messages List - Immersive Scroll Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scrollbar-hide overscroll-contain">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                  {/* Avatar / Role Indicator */}
                  <div className="flex items-center gap-2 px-3">
                    {msg.role === 'assistant' ? (
                      <>
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                          <Bot className="w-3 h-3 text-emerald-500" />
                        </div>
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">ShapeScan AI</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Você</span>
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                          <UserIcon className="w-3 h-3 text-zinc-400" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`p-6 rounded-[2rem] shadow-2xl relative overflow-hidden ${msg.role === 'user'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-white rounded-tr-none'
                    : 'bg-zinc-900/40 backdrop-blur-3xl border border-white/5 text-zinc-200 rounded-tl-none font-medium'
                    }`}>
                    {msg.role === 'user' && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
                    )}
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap relative z-10">{renderMessageContent(msg.content)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start pl-3"
            >
              <div className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 px-6 py-4 rounded-3xl rounded-tl-none flex items-center gap-4 shadow-xl">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                </div>
                <span className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.3em]">Processando...</span>
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} className="h-10" />
        </div>

        {/* Input Area - Floating Glass Bar */}
        <div className="flex-none px-6 pb-12 pt-2 z-30">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="bg-zinc-950/40 backdrop-blur-3xl rounded-[2.5rem] p-2 flex items-center gap-2 border border-white/5 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>

            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500'
                }`}
            >
              <Mic className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao seu Coach..."
              className="flex-1 bg-transparent py-4 px-2 outline-none text-white font-medium placeholder:text-zinc-600 text-[15px]"
              disabled={loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${input.trim()
                  ? 'bg-white text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  : 'bg-white/5 text-zinc-600 border border-white/5'
                }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          <p className="text-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-4 opacity-50">
            Inteligência Artificial por ShapeScan
          </p>
        </div>

      </div>
    </PremiumBackground>
  );
};

export default CoachChat;
