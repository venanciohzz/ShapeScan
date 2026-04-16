import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { updateProfile } from '../services/supabaseService';
import { sanitizeInput } from '../utils/security';
import { pixel } from '../utils/pixel';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';

/** Gera um username legível a partir do nome completo.
 * Ex: "Gabriel Venâncio" → "gabriel.v"
 *     "Ana" → "ana"
 */
function generateUsernameFromName(fullName: string): string {
  const cleaned = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z\s]/g, '')     // só letras e espaços
    .trim()
    .toLowerCase();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'usuario';
  if (parts.length === 1) return parts[0];

  // "gabriel venancio" → "gabriel.v"
  return `${parts[0]}.${parts[parts.length - 1][0]}`;
}

interface CompleteProfileProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ user, onComplete }) => {
  const suggested = generateUsernameFromName(user.name || '');
  const [username, setUsername] = useState(suggested);
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ username?: string; phone?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const prevDigits = phone.replace(/\D/g, '');
    let digits = raw.replace(/\D/g, '');

    // Se o usuário tentou deletar um separador, deleta o dígito anterior também
    if (digits === prevDigits && raw.length < phone.length) {
      digits = digits.slice(0, -1);
    }

    if (digits.length > 11) digits = digits.slice(0, 11);

    let formatted = digits;
    if (digits.length > 6) {
      const mid = digits.length === 11 ? 7 : 6;
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, mid)}-${digits.slice(mid)}`;
    } else if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }

    setPhone(formatted);
  };

  // true = usuário Google (sem username); false = cadastro por e-mail (já tem username, precisa só do telefone)
  const needsUsername = !user.username;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = needsUsername ? sanitizeInput(username).trim() : user.username;
    const cleanPhone = sanitizeInput(phone).trim();

    const newErrors: { username?: string; phone?: string } = {};
    if (needsUsername && !cleanUsername) newErrors.username = 'Escolha um nome de usuário para continuar.';
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 10) newErrors.phone = 'Informe um número de WhatsApp válido para continuar.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);
    try {
      const updates: Partial<User> = { phone: cleanPhone };
      if (needsUsername) updates.username = cleanUsername;
      const updatedUser = await updateProfile(user.id, updates);
      pixel.completeRegistration(user.email, user.id);
      onComplete(updatedUser);
    } catch (err: any) {
      setErrors({ phone: err.message || 'Erro ao salvar. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PremiumBackground className="flex items-center justify-center p-6 min-h-screen" dim={true} intensity={1.0}>
      <div className="w-full max-w-md relative z-20">
        <div className="glass-card w-full p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
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
                ? <>Olá, <span className="text-white font-bold">{user.name}</span>! Geramos um usuário para você — pode personalizar abaixo.</>
                : <>Olá, <span className="text-white font-bold">{user.name}</span>! Só falta seu WhatsApp para ativarmos seu acesso completo.</>
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {needsUsername && (
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-2">
                  <label className="block text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">
                    Nome de Usuário
                  </label>
                  <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">
                    Gerado automaticamente · editável
                  </span>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrors(p => ({ ...p, username: undefined })); }}
                  className={`w-full px-6 py-4 rounded-2xl bg-white/[0.03] border focus:bg-white/[0.05] outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm ${errors.username ? 'border-red-500/60 focus:border-red-500/60' : 'border-emerald-500/30 focus:border-emerald-500/60'}`}
                  placeholder="@seu_usuario"
                  disabled={isLoading}
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="text-red-400 text-xs font-bold ml-2 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                    <span>⚠</span> {errors.username}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em] ml-2">
                WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { handlePhoneChange(e); setErrors(p => ({ ...p, phone: undefined })); }}
                className={`w-full px-6 py-4 rounded-2xl bg-white/[0.03] border focus:bg-white/[0.05] outline-none font-bold text-white placeholder:text-zinc-600 transition-all text-sm ${errors.phone ? 'border-red-500/60 focus:border-red-500/60' : 'border-white/5 focus:border-emerald-500/50'}`}
                placeholder="(00) 00000-0000"
                disabled={isLoading}
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="text-red-400 text-xs font-bold ml-2 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                  <span>⚠</span> {errors.phone}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-zinc-950 py-5 rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-widest text-xs"
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
