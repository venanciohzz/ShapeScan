
import React, { useState } from 'react';
import { User } from '../types';
import { compressImage } from '../utils/security';

interface SettingsProps {
  user: User;
  onUpdateProfile: (data: Partial<User>) => void;
  onBack: () => void;
  darkMode: boolean;
  toggleTheme: () => void;
  onGoToAdmin: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateProfile, onBack, darkMode, toggleTheme, onGoToAdmin }) => {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username.startsWith('@') ? user.username : `@${user.username}`);
  const [photo, setPhoto] = useState(user.photo || '');
  const [successMsg, setSuccessMsg] = useState('');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        const compressed = await compressImage(rawBase64);
        setPhoto(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onUpdateProfile({ name, username, photo });
    setSuccessMsg('Perfil atualizado com sucesso! ✅');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 md:pt-14 pb-24 text-gray-900 dark:text-white">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-black dark:text-white">
        <span className="text-lg pb-0.5">←</span>
      </button>

      <h1 className="text-3xl font-black italic tracking-tighter mb-2">Configurações</h1>
      <div className="glass-panel p-8 rounded-[2.5rem] shadow-xl space-y-8">
        <div className="flex items-center justify-between bg-white dark:bg-black/20 p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-3"><span className="text-2xl">{darkMode ? '🌙' : '☀️'}</span><div><p className="font-black uppercase text-xs tracking-widest">Tema {darkMode ? 'Escuro' : 'Claro'}</p></div></div>
          <button onClick={toggleTheme} className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${darkMode ? 'bg-emerald-600' : 'bg-gray-200'}`}><div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-[10px] ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}>{darkMode ? '🌙' : '☀️'}</div></button>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-emerald-500 overflow-hidden shadow-lg bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
              {photo ? <img src={photo} alt="Perfil" className="w-full h-full object-cover" /> : <span className="text-4xl">👤</span>}
            </div>
            <label className="absolute -bottom-2 -right-2 bg-emerald-600 text-white w-12 h-12 flex items-center justify-center rounded-full cursor-pointer shadow-lg hover:bg-emerald-500 transition-colors border-4 border-white dark:border-zinc-900 z-10 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        <div className="space-y-6">
          <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Nome</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-4 rounded-2xl input-premium outline-none font-bold text-gray-900 dark:text-white" /></div>
          <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Username</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-5 py-4 rounded-2xl input-premium outline-none font-bold text-gray-900 dark:text-white" /></div>
        </div>

        {successMsg && <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl font-black text-xs text-center border border-emerald-500/20">{successMsg}</div>}

        <button onClick={handleSave} className="w-full py-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl hover:bg-emerald-500 transition-all">Salvar Alterações</button>

        {(user.isAdmin || user.email === 'contatobielaz@gmail.com') && (
          <button
            onClick={onGoToAdmin}
            className="w-full py-4 mt-6 bg-zinc-800 text-zinc-400 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition-all"
          >
            Acessar Painel Admin
          </button>
        )}
      </div>
    </div>
  );
};
export default Settings;
