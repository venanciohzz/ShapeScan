import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { db } from '../services/db';
import { sanitizeInput } from '../utils/security';
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

  const handleGoogleLogin = async () => {
    alert("Botão Google clicado");
    console.log("handleGoogleLogin disparado");
    setIsLoading(true);
    setError('');
    try {
      console.log("Chamando db.auth.signInWithGoogle...");
      await db.auth.signInWithGoogle();
      console.log("signInWithGoogle concluído");
    } catch (err: any) {
      alert("Erro no login Google: " + err.message);
      console.error("Erro capturado no handleGoogleLogin:", err);
      setError(err.message || 'Erro ao entrar com Google');
      setIsLoading(false);
    }
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

        const isAdmin = cleanEmail === 'contatobielaz@gmail.com';

        // Cria o objeto usuário (sem ID ainda, o DB gera)
        const userData: Omit<User, 'id'> = {
          email: cleanEmail,
          name: cleanName,
          username: cleanUser,
          phone: cleanPhone,
          isPremium: isAdmin,
          isAdmin: isAdmin,
          dailyCalorieGoal: 2000,
          plan: isAdmin ? 'lifetime' : 'free',
          dailyWaterGoal: 2500 // Default seguro
        };

        const newUser = await db.auth.signUp(userData, cleanPassword);
        await db.auth.setSession(newUser);
        onLogin(newUser, true);

      } else {
        // Login Logic via Database Service
        const user = await db.auth.signIn(cleanEmail, cleanPassword);
        await db.auth.setSession(user);
        onLogin(user, false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

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

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-zinc-950 px-4 text-zinc-600">ou continue com</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-full font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google
          </button>

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
