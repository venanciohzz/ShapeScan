import React, { useState } from 'react';
import { User } from '../types';
import { updateProfile } from '../services/supabaseService';
import { sanitizeInput } from '../utils/security';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';

interface CompleteProfileProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ user, onComplete }) => {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`;
    else if (value.length > 6) value = `${value.slice(0, 9)}-${value.slice(9)}`;
    setPhone(value);
  };

  // true = usuário Google (sem username); false = cadastro por e-mail (já tem username, precisa só do telefone)
  const needsUsername = !user.username;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = needsUsername ? sanitizeInput(username).trim() : user.username;
    const cleanPhone = sanitizeInput(phone).trim();

    if (needsUsername && !cleanUsername) {
      setError('Escolha um nome de usuário.');
      return;
    }
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 10) {
      setError('Informe um número de WhatsApp válido.');
      return;
    }

    setIsLoading(true);
    try {
      const updates: Partial<User> = { phone: cleanPhone };
      if (needsUsername) updates.username = cleanUsername;
      const updatedUser = await updateProfile(user.id, updates);
      onComplete(updatedUser);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PremiumBackground className="flex items-center justify-center p-6 min-h-screen" dim={true} intensity={1.0}>
      <div className="w-full max-w-md relative z-20">
        <div className="glass-card w-full p-8 md:p-12 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          {/* Avatar do Google */}
          {user.photo && (
            <div className="flex justify-center mb-8">
              <img
                src={user.photo}
                alt={user.name}
                className="w-20 h-20 rounded-full border-2 border-emerald-500/40 shadow-lg"
              />
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-serif-premium font-bold text-white tracking-tight mb-2">
              <LetterPuller text="Quase lá!" />
            </h2>
            <p className="text-zinc-400 font-medium text-sm">
              {needsUsername
                ? <>Olá, <span className="text-white font-bold">{user.name}</span>! Só faltam dois dados para completar seu perfil.</>
                : <>Olá, <span className="text-white font-bold">{user.name}</span>! Informe seu WhatsApp — é pelo que entro em contato com você sobre sua conta e evolução.</>
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl mb-6 text-xs font-bold border border-red-500/20 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {needsUsername && (
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em] ml-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 focus:bg-white/[0.05] outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm"
                  placeholder="@seu_usuario"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em] ml-2">
                WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                className="w-full px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 focus:bg-white/[0.05] outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm"
                placeholder="(00) 00000-0000"
                required
                disabled={isLoading}
                autoComplete="tel"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-zinc-950 py-5 rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-widest text-xs"
            >
              {isLoading ? 'Salvando...' : 'Continuar →'}
            </button>
          </form>
        </div>
      </div>
    </PremiumBackground>
  );
};

export default CompleteProfile;
