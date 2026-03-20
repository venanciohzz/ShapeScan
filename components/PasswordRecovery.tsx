import React, { useState } from 'react';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';

const PasswordRecovery: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await db.auth.resetPassword(email);
      setIsSent(true);
    } catch (err: any) {
      console.error('[PasswordRecovery] Erro:', err);
      // Se for timeout, a mensagem já vem amigável do serviço
      setError(err.message || 'Erro ao enviar e-mail de recuperação. Tente novamente em instantes.');
    } finally {
      setIsLoading(false);
    }
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
            <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl mb-8 text-xs font-bold border border-red-500/20">
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
              <p className="text-zinc-300 font-medium leading-relaxed">
                Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setIsSent(false)}
                  className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Enviar novamente
                </button>
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
                disabled={isLoading}
                className="w-full bg-white text-zinc-950 py-5 rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] mt-6 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
              >
                {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}
        </div>
      </div>
    </PremiumBackground>
  );
};

export default PasswordRecovery;
