import React, { useState, useRef, useEffect } from 'react';
import { User, FoodLog, ChatMessage, EvolutionRecord } from '../types';
import { chatWithPersonalIA } from '../services/openaiService';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { ChevronLeft, Sparkles, Diamond, Mic, Send, Bot, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PersonalIAProps {
  user: User;
  logs: FoodLog[];
  evolution: EvolutionRecord[];
  onBack: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onUpgrade: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PersonalIA: React.FC<PersonalIAProps> = ({ user, logs, evolution, onBack, messages, setMessages, onUpgrade, onShowToast }) => {
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
            Desbloquear Personal IA
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

      const response = await chatWithPersonalIA(userMsg, newHistory, {
        user,
        logsSummary: logs.slice(0, 5),
        lastEvolution
      });

      // Clean up markdown asterisks from response immediately
      const cleanResponse = response ? response.replace(/\*\*/g, '').replace(/__/g, '') : "Puts, me perdi aqui. Manda de novo? 🙏";

      setMessages((prev: ChatMessage[]) => [...prev, { role: 'assistant', content: cleanResponse }]);
    } catch (err) {
      setMessages((prev: ChatMessage[]) => [...prev, { role: 'assistant', content: "Erro na conexão. Tenta de novo já já! 🔥" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    onBack();
  }

  // Helper to render message content without asterisks
  const renderMessageContent = (content: string) => {
    return content.replace(/\*\*/g, '').replace(/__/g, '');
  };

  return (
    <PremiumBackground className="h-[100dvh] w-full" dim={true} intensity={1.2}>
      <div className="w-full max-w-2xl h-full flex flex-col relative mx-auto overflow-hidden">

        {/* Header - Glass Aesthetic */}
        <div className="flex-none px-6 pt-10 pb-6 z-30">
          <div className="bg-zinc-950/60 backdrop-blur-3xl rounded-[2.5rem] p-4 flex justify-between items-center border border-white/10 shadow-2xl relative overflow-hidden group/header">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
            <div className="absolute inset-0 bg-emerald-500/[0.02] opacity-0 group-hover/header:opacity-100 transition-opacity duration-700"></div>

            <button
              onClick={handleBack}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-90 text-white shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center flex-1 mx-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981]" />
                  <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-40" />
                </div>
                <h1 className="text-2xl font-serif-premium font-bold text-white tracking-tight leading-none">
                  Personal IA
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-emerald-500/80 uppercase tracking-[0.4em]">Sincronizado</span>
                <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Live</span>
              </div>
            </div>

            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg group-hover/header:scale-110 transition-transform duration-500">
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Messages List - Immersive Scroll Area */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-32 space-y-8 scrollbar-hide overscroll-contain">
          <AnimatePresence initial={false}>
            {messages.map((msg: ChatMessage, i: number) => (
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

        {/* Input Area - Fixed at bottom of viewport */}
        <div className="fixed bottom-0 left-0 w-full px-4 pb-6 pt-10 z-50 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none select-none touch-none">
          <div className="max-w-2xl mx-auto w-full pointer-events-auto">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="bg-zinc-950/90 backdrop-blur-3xl rounded-[2rem] p-1.5 flex items-center gap-2 border border-white/10 shadow-2xl relative overflow-hidden group/input"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`w-11 h-11 flex-none flex items-center justify-center rounded-2xl transition-all active:scale-95 shadow-lg ${isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-white/5 border border-white/10 text-zinc-400'
                  }`}
              >
                <Mic className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte à Personal IA..."
                className="flex-1 bg-transparent py-3.5 px-2 outline-none text-white font-medium placeholder:text-zinc-600 text-[16px] min-w-0"
                disabled={loading}
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={`w-11 h-11 flex-none flex items-center justify-center rounded-2xl transition-all active:scale-95 ${input.trim()
                  ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-white/5 text-zinc-600 border border-white/5'
                  }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </PremiumBackground>
  );
};

export default PersonalIA;
