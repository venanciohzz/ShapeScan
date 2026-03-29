import React, { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabaseService';
import { sanitizeInput } from '../utils/security';
import { pixel } from '../utils/pixel';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';

interface AuthProps {
  onLogin: (user: User, isNew: boolean) => void;
  onBack: () => void;
  initialMode?: 'entrar' | 'registrar';
}

const Auth: React.FC<AuthProps> = ({ onLogin, onBack, initialMode = 'entrar' }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(initialMode === 'registrar');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setError(oauthError.message || 'Erro ao conectar com o Google.');
      setGoogleLoading(false);
    }
    // Se não der erro, o redirect acontece automaticamente — sem setar loading false
  };

  // Máscara de telefone (BR)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 10) { // Formato (XX) XXXXX-XXXX
      value = `${value.slice(0, 10)}-${value.slice(10)}`;
    } else if (value.length > 6) { // Formato durante digitação (XX) XXXX-XXXX
      value = `${value.slice(0, 9)}-${value.slice(9)}`;
    }

    setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const cleanEmail = sanitizeInput(email);
      const cleanPassword = sanitizeInput(password);

      if (!cleanEmail || !cleanPassword) {
        throw new Error('Preencha email e senha.');
      }

      if (isRegistering) {
        const cleanName = sanitizeInput(name);
        const cleanUser = sanitizeInput(username);
        const cleanPhone = sanitizeInput(phone);

        if (!cleanName || !cleanUser || !cleanPhone) {
          throw new Error('Preencha todos os campos.');
        }

        // isAdmin é determinado pelo trigger handle_new_user no banco (via tabela admin_users).
        // Nunca assumir admin pelo email no cliente — o banco é a fonte de verdade.
        const userData: Omit<User, 'id'> = {
          email: cleanEmail,
          name: cleanName,
          username: cleanUser,
          phone: cleanPhone,
          isPremium: false,
          isAdmin: false,
          dailyCalorieGoal: 2000,
          plan: 'free',
          dailyWaterGoal: 2500 // Default seguro
        };

        const newUser = await db.auth.signUp(userData, cleanPassword);
        await db.auth.setSession(newUser);
        pixel.completeRegistration();
        onLogin(newUser, true);

      } else {
        // Login Logic via Database Service
        const user = await db.auth.signIn(cleanEmail, cleanPassword);
        await db.auth.setSession(user);
        pixel.lead();
        onLogin(user, false);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'auth/confirmation-required') {
        setNeedsConfirmation(true);
      } else {
        setError(err.message || 'Erro ao conectar com o servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlreadyConfirmed = async () => {
    setIsLoading(true);
    setError('');
    try {
      const user = await db.auth.signIn(sanitizeInput(email), sanitizeInput(password));
      await db.auth.setSession(user);
      onLogin(user, false);
    } catch (err: any) {
      if (err.message === 'auth/confirmation-required') {
        setError('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
      } else {
        setError(err.message || 'Erro ao verificar confirmação.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setError('');
    try {
      await db.auth.resendConfirmationEmail(email);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar e-mail.');
    } finally {
      setResendLoading(false);
    }
  };

  if (needsConfirmation) {
    return (
      <PremiumBackground className="flex items-center justify-center min-h-screen p-4" dim={true} intensity={1.5}>
        <div className="bg-zinc-950/40 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-emerald-500/20 shadow-2xl text-center max-w-lg w-full">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
            <Mail className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-white px-2 tracking-tighter mb-4"><LetterPuller text="Verifique seu E-mail" /></h1>
          <p className="text-zinc-400 font-medium mb-10 leading-relaxed text-sm">
            Sua conta foi criada com sucesso! Enviamos um link de confirmação para <strong className="text-white">{email}</strong>.
            <br /><br />
            Por favor, verifique sua caixa de entrada (e a pasta de spam) para ativar sua conta antes de continuar.
          </p>
          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl mb-6 text-xs font-bold border border-red-500/20 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <button
              onClick={handleAlreadyConfirmed}
              disabled={isLoading}
              className="w-full px-8 py-5 transition-all font-black text-xs uppercase tracking-widest rounded-[2rem] border bg-emerald-500 text-zinc-950 border-emerald-500 hover:bg-emerald-400 disabled:opacity-50"
            >
              {isLoading ? 'Verificando...' : 'Já Confirmei o E-mail'}
            </button>

            <button
              onClick={handleResendEmail}
              disabled={resendLoading || resendSuccess}
              className={`w-full px-8 py-5 transition-all font-black text-xs uppercase tracking-widest rounded-[2rem] border ${
                resendSuccess
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
              }`}
            >
              {resendLoading ? 'Enviando...' : resendSuccess ? 'E-mail Enviado! ✨' : 'Reenviar E-mail de Confirmação'}
            </button>

            <button
              onClick={() => {
                setNeedsConfirmation(false);
                setIsRegistering(false); // Switch to login mode
              }}
              className="w-full px-8 py-4 text-zinc-500 hover:text-zinc-300 transition-all font-bold text-[10px] uppercase tracking-widest"
            >
              Voltar para o Login
            </button>
          </div>
        </div>
      </PremiumBackground>
    );
  }

  return (
    <PremiumBackground className="flex items-center justify-center p-6" dim={true} intensity={1.0}>
      <div className="w-full max-w-md relative z-20">
        <div className="glass-card w-full p-8 md:p-12 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <button
            onClick={onBack}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:scale-105 transition-all active:scale-95 mb-10 text-white group"
          >
            <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
          </button>

          <div className="mb-10">
            <h2 className="text-4xl md:text-5xl font-serif-premium font-bold text-white tracking-tight mb-3">
              <LetterPuller text={isRegistering ? 'Crie sua conta' : 'Acessar Conta'} />
            </h2>
            <p className="text-zinc-400 font-medium text-sm md:text-base uppercase tracking-widest opacity-70">
              Evolução Física Inteligente
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl mb-8 text-xs font-bold border border-red-500/20 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/10 transition-all font-bold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {googleLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Redirecionando...' : 'Continuar com Google'}
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegistering && (
              <>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-300 drop-shadow-sm uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 focus:bg-white/[0.05] outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm"
                    placeholder="Seu nome completo"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-300 drop-shadow-sm uppercase tracking-[0.2em] ml-2">Usuário</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 focus:bg-white/[0.05] outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm"
                      placeholder="@usuario"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-300 drop-shadow-sm uppercase tracking-[0.2em] ml-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 focus:bg-white/[0.05] outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm"
                      placeholder="(00) 00000-0000"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-zinc-300 drop-shadow-sm uppercase tracking-[0.2em] ml-2">E-mail Corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 focus:bg-white/[0.05] outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm"
                placeholder="exemplo@email.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-zinc-300 drop-shadow-sm uppercase tracking-[0.2em] ml-2">Senha Segura</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 focus:bg-white/[0.05] outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-zinc-950 py-5 rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-widest text-xs"
            >
              {isLoading ? 'Autenticando...' : (isRegistering ? 'Iniciar Minha Evolução' : 'Entrar no Sistema')}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <button
              onClick={() => navigate('/recuperar-senha')}
              disabled={isLoading}
              className="block w-full text-emerald-500/70 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-emerald-400 transition-colors"
            >
              Esqueci minha senha
            </button>
            
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              disabled={isLoading}
              className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-emerald-400 transition-colors"
            >
              {isRegistering ? 'Já possui acesso? Clique aqui' : 'Não tem conta? Cadastre-se agora'}
            </button>
          </div>
        </div>
      </div>
    </PremiumBackground>
  );
};

export default Auth;
