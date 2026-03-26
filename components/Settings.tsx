import React, { useState, useEffect } from 'react';
import { User as UserType, UserStats } from '../types';
import { compressImage } from '../utils/security';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';
import { ArrowLeft, User, Camera, CheckCircle2, ShieldAlert, Trash2, Flame, Calendar, AlertTriangle, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../services/db';
import type { SubscriptionInfo } from '../services/supabaseService';
import GamificationWidget from './dashboard/GamificationWidget';
import { PAYMENT_CONFIG } from '../services/paymentConfig';

interface SettingsProps {
  user: UserType;
  onUpdateProfile: (data: Partial<UserType>) => void;
  onBack: () => void;
  darkMode: boolean;
  toggleTheme: () => void;
  onGoToAdmin: () => void;
}

const formatDate = (unixTs: number) =>
  new Date(unixTs * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const Settings: React.FC<SettingsProps> = ({ user, onUpdateProfile, onBack, darkMode, toggleTheme, onGoToAdmin }) => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [cancelStep, setCancelStep] = useState<'survey' | 'retention' | 'confirm' | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [reactivateLoading, setReactivateLoading] = useState(false);

  const CANCEL_REASONS = [
    { id: 'expensive', label: 'Muito caro' },
    { id: 'low_usage', label: 'Não uso o suficiente' },
    { id: 'alternative', label: 'Encontrei uma alternativa' },
    { id: 'technical', label: 'Problemas técnicos' },
    { id: 'other', label: 'Outro motivo' },
  ];

  const getRetentionContent = (reason: string) => {
    const expiryDate = subscriptionInfo?.current_period_end ? formatDate(subscriptionInfo.current_period_end) : 'o fim do período';
    if (reason === 'expensive') return {
      title: 'Antes de ir...',
      body: `Por menos de R$1 por dia você tem análises ilimitadas de shape e alimentação, Personal 24h disponível a qualquer hora e acompanhamento real dos seus resultados. Você mantém acesso até ${expiryDate} — pense bem antes de cancelar.`,
    };
    if (reason === 'low_usage') return {
      title: 'Você ainda tem muito para explorar',
      body: `Seu acesso vai até ${expiryDate}. Análise de shape, plano nutricional personalizado e seu Personal 24h estão te esperando. Às vezes tudo que falta são 5 minutos para começar.`,
    };
    return null;
  };

  const closeCancelModal = () => {
    setCancelStep(null);
    setSelectedReason('');
    setFeedbackText('');
    setCancelError('');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await db.gamification.getStats(user.id);
        setUserStats(stats);
      } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [user.id]);

  useEffect(() => {
    if (!user.isPremium) return;
    const fetchSubscription = async () => {
      try {
        const info = await db.subscription.getInfo(user.id);
        setSubscriptionInfo(info);
      } catch (err) {
        console.error('Erro ao buscar dados da assinatura:', err);
      }
    };
    fetchSubscription();
  }, [user.id, user.isPremium]);

  const handleReactivateSubscription = async () => {
    setReactivateLoading(true);
    try {
      const result = await db.subscription.reactivate();
      setSubscriptionInfo(prev => prev ? {
        ...prev,
        cancel_at_period_end: result.cancel_at_period_end,
        current_period_end: result.current_period_end,
      } : null);
      setSuccessMsg('Sua assinatura foi reativada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setCancelError(err.message || 'Erro ao reativar assinatura. Tente novamente.');
      setTimeout(() => setCancelError(''), 5000);
    } finally {
      setReactivateLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError('');
    try {
      const result = await db.subscription.cancel(selectedReason, feedbackText);
      setSubscriptionInfo(prev => prev ? {
        ...prev,
        cancel_at_period_end: result.cancel_at_period_end,
        current_period_end: result.current_period_end,
      } : null);
      closeCancelModal();
      setSuccessMsg('Sua assinatura será encerrada ao final do período atual.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setCancelError(err.message || 'Erro ao cancelar assinatura. Tente novamente.');
    } finally {
      setCancelLoading(false);
    }
  };

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
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onBack} 
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all mb-10 text-white group"
        >
          <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
        </motion.button>

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

                {/* Rank Indicator Badge */}
                {userStats && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-2 -right-12 z-30 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-2xl shadow-2xl"
                  >
                    <div className="flex items-center gap-1">
                      <Flame className={`w-3 h-3 ${userStats.currentStreak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-zinc-600'}`} />
                      <span className="text-[10px] font-black text-white">{userStats.currentStreak}</span>
                    </div>
                    <div className="w-[1px] h-3 bg-white/10"></div>
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">LVL {userStats.level}</span>
                  </motion.div>
                )}

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

            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={handleSave} 
              className="w-full py-6 bg-white text-zinc-950 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] transition-all"
            >
              Atualizar Biometria
            </motion.button>

            {/* Seção de Gamificação / Rank */}
            <div className="pt-8 border-t border-white/5">
              <GamificationWidget stats={userStats} loading={loadingStats} />
            </div>

            {/* Subscription Section */}
            {user.isPremium && subscriptionInfo && subscriptionInfo.subscription_id && (
              <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-5 ml-2 flex items-center gap-2">
                  <CreditCard className="w-3 h-3" />
                  Assinatura
                </p>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Plano atual</span>
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      {(PAYMENT_CONFIG as any)[subscriptionInfo.plan_id]?.name || subscriptionInfo.plan_id}
                    </span>
                  </div>

                  {subscriptionInfo.subscription_start && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        Início
                      </span>
                      <span className="text-xs text-zinc-300">{formatDate(subscriptionInfo.subscription_start)}</span>
                    </div>
                  )}

                  {subscriptionInfo.current_period_end && !subscriptionInfo.cancel_at_period_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        Próxima cobrança
                      </span>
                      <span className="text-xs text-zinc-300">{formatDate(subscriptionInfo.current_period_end)}</span>
                    </div>
                  )}

                  {subscriptionInfo.cancel_at_period_end ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-400 leading-relaxed">
                          Seu plano está programado para cancelamento em{' '}
                          <span className="font-black">
                            {subscriptionInfo.current_period_end ? formatDate(subscriptionInfo.current_period_end) : 'breve'}
                          </span>
                          . Você mantém acesso completo até lá.
                        </p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleReactivateSubscription}
                        disabled={reactivateLoading}
                        className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reactivateLoading ? 'Processando...' : 'Continuar com o plano'}
                      </motion.button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCancelStep('survey')}
                      className="w-full py-3 text-zinc-500 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                      Cancelar assinatura
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Admin Area */}
            {user.isAdmin && (
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
      {/* Cancel Subscription Multi-step Modal */}
      {cancelStep && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            key={cancelStep}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl"
          >

            {/* STEP 1: Survey */}
            {cancelStep === 'survey' && (
              <>
                <div className="mb-6">
                  <h3 className="text-base font-black text-white mb-1">Por que você quer cancelar?</h3>
                  <p className="text-xs text-zinc-500">Sua resposta nos ajuda a melhorar.</p>
                </div>
                <div className="space-y-2 mb-5">
                  {CANCEL_REASONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReason(r.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                        selectedReason === r.id
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Comentário adicional (opcional)"
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/30 resize-none mb-5"
                />
                <div className="space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (!selectedReason) return;
                      const retention = getRetentionContent(selectedReason);
                      setCancelStep(retention ? 'retention' : 'confirm');
                    }}
                    disabled={!selectedReason}
                    className="w-full py-4 bg-white text-zinc-950 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Continuar
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={closeCancelModal} className="w-full py-3 text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all">
                    Voltar
                  </motion.button>
                </div>
              </>
            )}

            {/* STEP 2: Retention */}
            {cancelStep === 'retention' && (() => {
              const content = getRetentionContent(selectedReason);
              return content ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">💪</span>
                    </div>
                    <h3 className="text-base font-black text-white mb-3">{content.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{content.body}</p>
                  </div>
                  <div className="space-y-3">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={closeCancelModal}
                      className="w-full py-4 bg-emerald-500 text-zinc-950 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                      Manter minha assinatura
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCancelStep('confirm')}
                      className="w-full py-3 text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                      Cancelar mesmo assim
                    </motion.button>
                  </div>
                </>
              ) : null;
            })()}

            {/* STEP 3: Confirm */}
            {cancelStep === 'confirm' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-base font-black text-white mb-3">Confirmar cancelamento</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Você continuará com acesso completo até o final do período atual. Após isso, sua assinatura será encerrada automaticamente e você não será mais cobrado.
                  </p>
                </div>
                {cancelError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs text-red-400 text-center">{cancelError}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelLoading ? 'Processando...' : 'Confirmar cancelamento'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCancelStep('survey')}
                    disabled={cancelLoading}
                    className="w-full py-3 text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    Voltar
                  </motion.button>
                </div>
              </>
            )}

          </motion.div>
        </div>
      )}
    </PremiumBackground>
  );
};

export default Settings;
