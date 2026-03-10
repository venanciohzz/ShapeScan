import React, { useState } from 'react';
import { User as UserType } from '../types';
import { compressImage } from '../utils/security';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { ArrowLeft, User, Camera, CheckCircle2, ShieldAlert, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsProps {
  user: UserType;
  onUpdateProfile: (data: Partial<UserType>) => void;
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
    setSuccessMsg('Perfil atualizado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <PremiumBackground className="flex flex-col p-6 overflow-y-auto" dim={true} intensity={1.0}>
      <div className="w-full max-w-2xl mx-auto py-12 md:py-20 relative z-10">
        <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 mb-10 text-white group">
          <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
        </button>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif-premium font-bold text-white tracking-tight mb-3">
            <LetterPuller text="Painel de Controle" />
          </h1>
          <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] opacity-80">
            Ajustes e Personalização
          </p>
        </div>

        <div className="bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

          <div className="space-y-10 relative z-10">



            {/* Profile Avatar */}
            <div className="flex flex-col items-center justify-center pt-4">
              <div className="relative group">
                <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="w-32 h-32 rounded-full border border-white/10 overflow-hidden shadow-2xl bg-zinc-900 flex items-center justify-center relative z-10 group-hover:border-emerald-500/50 transition-colors duration-500">
                  {photo ? <img src={photo} alt="Perfil" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-zinc-600" />}
                </div>
                <label className="absolute bottom-0 right-0 bg-white text-zinc-950 w-10 h-10 flex items-center justify-center rounded-full cursor-pointer shadow-lg hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all z-20 active:scale-95">
                  <Camera className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
                {photo && (
                  <button 
                    onClick={() => setPhoto('')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg hover:scale-110 hover:bg-red-600 transition-all z-20 active:scale-95 border-2 border-zinc-950"
                    title="Remover foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">Identidade (Nome)</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all font-bold text-lg text-white placeholder:text-zinc-600" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 drop-shadow-sm ml-2">Username (@)</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all font-bold text-lg text-white placeholder:text-zinc-600" />
              </div>
            </div>

            {successMsg && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center gap-3 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-black text-[10px] uppercase tracking-widest">{successMsg}</span>
              </motion.div>
            )}

            <button onClick={handleSave} className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              Atualizar Biometria
            </button>

            {/* Admin Area */}
            {(user.isAdmin || user.email === 'contatobielaz@gmail.com') && (
              <div className="pt-8 mt-8 border-t border-white/5">
                <button
                  onClick={onGoToAdmin}
                  className="w-full py-5 bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 group/admin"
                >
                  <ShieldAlert className="w-4 h-4 group-hover/admin:animate-pulse" />
                  Acessar Painel Master
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PremiumBackground>
  );
};

export default Settings;
