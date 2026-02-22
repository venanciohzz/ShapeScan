
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { sanitizeInput } from '../utils/security';

interface AuthProps {
  onLogin: (user: User, isNew: boolean) => void;
  onBack: () => void;
  initialMode?: 'login' | 'register';
}

const Auth: React.FC<AuthProps> = ({ onLogin, onBack, initialMode = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(initialMode === 'register');
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
    <div className="min-h-[100dvh] flex flex-col items-center py-12 px-6 md:p-12 overflow-y-auto scrollbar-hide">
      {/* Wrapper with margin auto to ensure it doesn't stick to top on small screens */}
      <div className="w-full max-w-md my-auto relative">

        <div className="glass-panel w-full p-6 md:p-10 rounded-[2.5rem] animate-in zoom-in-95 duration-500 relative border border-white/10 shadow-2xl">

          {/* Glow Effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-8 text-black dark:text-white">
            <span className="text-lg pb-0.5">←</span>
          </button>

          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-2 leading-tight">
              {isRegistering ? 'Crie sua conta' : 'Login'}
            </h2>
            <p className="text-gray-500 dark:text-zinc-400 font-medium text-sm md:text-base">
              ShapeScan: Evolução sem milagres.
            </p>
          </div>

          {error && <p className="bg-red-500/10 text-red-500 p-4 rounded-xl mb-6 text-xs font-bold border border-red-500/20">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-2">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-3.5 md:py-4 rounded-2xl input-premium outline-none font-bold text-base md:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:bg-zinc-800/50 dark:border-zinc-700 dark:focus:border-emerald-500 dark:focus:bg-zinc-900 transition-all"
                    placeholder="Seu nome"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-2">Usuário</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-5 py-3.5 md:py-4 rounded-2xl input-premium outline-none font-bold text-base md:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:bg-zinc-800/50 dark:border-zinc-700 dark:focus:border-emerald-500 dark:focus:bg-zinc-900 transition-all"
                      placeholder="@usuario"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full px-5 py-3.5 md:py-4 rounded-2xl input-premium outline-none font-bold text-base md:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:bg-zinc-800/50 dark:border-zinc-700 dark:focus:border-emerald-500 dark:focus:bg-zinc-900 transition-all"
                      placeholder="(00) 00000-0000"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 md:py-4 rounded-2xl input-premium outline-none font-bold text-base md:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:bg-zinc-800/50 dark:border-zinc-700 dark:focus:border-emerald-500 dark:focus:bg-zinc-900 transition-all"
                placeholder="exemplo@email.com"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 md:py-4 rounded-2xl input-premium outline-none font-bold text-base md:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:bg-zinc-800/50 dark:border-zinc-700 dark:focus:border-emerald-500 dark:focus:bg-zinc-900 transition-all"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white py-4 md:py-5 rounded-2xl font-black text-base md:text-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all uppercase tracking-tight hover:-translate-y-1 active:translate-y-0 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Conectando...' : (isRegistering ? 'Iniciar minha análise' : 'Acessar App')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              disabled={isLoading}
              className="text-emerald-600 font-bold text-xs uppercase tracking-widest hover:text-emerald-500 transition-colors"
            >
              {isRegistering ? 'Já tem conta? Faça login' : 'Novo por aqui? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
