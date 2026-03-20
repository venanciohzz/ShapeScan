import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mail, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';

const COOLDOWN_SECONDS = 60;

const PasswordRecovery: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);
  // Cooldown: bloqueia reenvio por 60s para evitar rate limit do Supabase
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Limpar intervalo ao desmontar
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guardar localmente: não permitir envio durante cooldown
    if (cooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      await db.auth.resetPassword(email);
      setIsSent(true);
      startCooldown(); // Iniciar cooldown após envio bem-sucedido
    } catch (err: any) {
      console.error('[PasswordRecovery] Erro:', err);
      setError(err.message || 'Erro ao enviar e-mail de recuperação. Tente novamente em instantes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    setIsSent(false);
    setError('');
  };

  return (
    <PremiumBackground className="flex items-center justify-center p-6" dim={true} intensity={1.0}>
      <div className="w-full max-w-md relative z-20">
        <div className="glass-card w-full p-8 md:p-12 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <button
            onClick={() => navigate('/entrar')}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:scale-105 transition-all active:scale-95 mb-10 text-white group"
          >
            <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
          </button>

          <div className="mb-10">
            <h2 className="text-4xl md:text-5xl font-serif-premium font-bold text-white tracking-tight mb-3">
              <LetterPuller text="Recuperar acesso" />
            </h2>
            <p className="text-zinc-400 font-medium text-sm md:text-base uppercase tracking-widest opacity-70">
              Digite seu e-mail para receber o link
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl mb-8 text-xs font-bold border border-red-500/20 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {isSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              {/* Mensagem neutra — não confirma nem nega existência da conta */}
              {/* Padrão: account enumeration prevention */}
              <div className="space-y-2">
                <p className="text-white font-bold text-lg">Link enviado!</p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Se esse e-mail estiver cadastrado no ShapeScan, você receberá as instruções em instantes.
                </p>
                <p className="text-zinc-500 text-xs">
                  Não encontrou? Verifique a pasta de{' '}
                  <span className="text-zinc-300 font-semibold">spam</span>{' '}
                  ou aguarde até 2 minutos.
                </p>
              </div>

              <div className="space-y-3">
                {/* Botão de reenvio com cooldown */}
                <button
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className={`w-full border py-4 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    cooldown > 0
                      ? 'bg-zinc-900/50 border-zinc-700 text-zinc-500 cursor-not-allowed'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {cooldown > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      Aguarde {cooldown}s para reenviar
                    </>
                  ) : (
                    'Enviar novamente'
                  )}
                </button>

                {/* Barra de progresso do cooldown */}
                {cooldown > 0 && (
                  <div className="w-full h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500/50"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(cooldown / COOLDOWN_SECONDS) * 100}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  </div>
                )}

                <button
                  onClick={() => navigate('/entrar')}
                  className="w-full bg-white text-zinc-950 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Voltar ao Login
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-300 drop-shadow-sm uppercase tracking-[0.2em] ml-2">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm"
                    placeholder="exemplo@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || cooldown > 0}
                className="w-full bg-white text-zinc-950 py-5 rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] mt-6 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
              >
                {isLoading ? 'Enviando...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar link de recuperação'}
              </button>
            </form>
          )}
        </div>
      </div>
    </PremiumBackground>
  );
};

export default PasswordRecovery;
