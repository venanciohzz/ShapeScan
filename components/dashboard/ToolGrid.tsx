import React from 'react';
import { View, User as UserType } from '../../types';
import { Scan, User, LineChart, NotebookPen, Save, Droplets, Scale, Flame, Target, MessageSquare, Zap, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    highlight?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, title, subtitle, highlight }) => (
    <motion.button
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        onClick={onClick}
        className={`relative overflow-hidden group backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] transition-all duration-500 shadow-xl flex flex-col items-center md:items-start text-center md:text-left h-full ${
            highlight
                ? 'bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-zinc-900/50 border border-white/5 hover:bg-zinc-800/60'
        }`}
    >
        <div className="absolute -inset-20 bg-emerald-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-1000"></div>
        <div className="relative z-10 w-full flex flex-col items-center md:items-start">
            <div className="flex justify-center md:justify-between items-start mb-6 md:mb-10 w-full">
                <div className={`transition-all duration-500 transform group-hover:scale-110 drop-shadow-md ${highlight ? 'text-emerald-400' : 'text-zinc-300 group-hover:text-emerald-400'}`}>
                    {icon}
                </div>
            </div>
            <div className="flex flex-col items-center md:items-start">
                <h3 className="font-serif-premium font-bold text-lg md:text-xl text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors drop-shadow-md">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest leading-relaxed opacity-80 drop-shadow-sm">
                        {subtitle}
                    </p>
                )}
            </div>
            <div className="mt-6 w-8 h-0.5 bg-white/10 group-hover:w-full group-hover:bg-emerald-500/30 transition-all duration-700"></div>
        </div>
    </motion.button>
);

interface PremiumButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
}

const PremiumButton: React.FC<PremiumButtonProps> = ({ onClick, icon, title, subtitle }) => (
    <motion.button
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        onClick={onClick}
        className="relative overflow-hidden group bg-zinc-900/40 border border-white/5 backdrop-blur-2xl p-5 md:p-6 rounded-[2rem] hover:bg-zinc-800/50 hover:border-emerald-500/20 transition-all duration-500 shadow-xl flex flex-col items-center md:items-start text-center md:text-left h-full"
    >
        <div className="absolute -inset-20 bg-emerald-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-30 transition-opacity duration-1000"></div>
        <div className="relative z-10 w-full flex flex-col items-center md:items-start">
            <div className="flex justify-between items-start mb-4 w-full">
                <div className="text-zinc-500 group-hover:text-emerald-400/70 transition-all duration-500 transform group-hover:scale-110">
                    {icon}
                </div>
                <div className="bg-emerald-500/10 text-emerald-400/70 px-2 py-0.5 rounded-md border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest">
                    Pro
                </div>
            </div>
            <div className="flex flex-col items-center md:items-start">
                <h3 className="font-serif-premium font-bold text-base md:text-lg text-zinc-400 group-hover:text-zinc-200 mb-1 tracking-tight transition-colors">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    </motion.button>
);

interface ToolGridProps {
    user: UserType;
    onNavigate: (view: View) => void;
    onUpgrade: () => void;
}

const ToolGrid: React.FC<ToolGridProps> = ({ user, onNavigate, onUpgrade }) => {
    const isPaid = user.isPremium || user.isAdmin;

    return (
        <div className="space-y-8 pb-20">

            {/* ═══ BANNER DE BLOQUEIO — Shape Analysis (somente free) ═══ */}
            {!isPaid && (
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-[2rem] border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-zinc-900/60 to-zinc-950/80 p-6"
            >
                {/* Glow de fundo */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-4">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Sua análise de shape está pronta
                    </div>

                    <h3 className="font-serif-premium font-bold text-xl text-white mb-1 tracking-tight leading-snug">
                        Desbloqueie seu % de gordura
                    </h3>
                    <p className="text-zinc-400 text-xs font-medium mb-5 leading-relaxed">
                        Acesse análises ilimitadas por foto, percentual de gordura em segundos e Personal 24h.
                    </p>

                    {/* Mini features */}
                    <div className="flex flex-col gap-2 mb-5">
                        {[
                            'Análises ilimitadas por foto',
                            'Acesse seu % de gordura em segundos',
                            'Ative o Personal 24h',
                        ].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                {item}
                            </div>
                        ))}
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={onUpgrade}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                    >
                        <Lock className="w-3.5 h-3.5" />
                        Desbloquear análise
                        <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                </div>
            </motion.div>
            )}

            {/* ═══ FERRAMENTAS PREMIUM — destaque ═══ */}
            <section>
                <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em]">
                        Ferramentas Pro
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {isPaid ? (
                        <ActionButton
                            onClick={() => onNavigate('food_ai')}
                            icon={<Scan className="w-8 h-8" />}
                            title="Análise por Foto"
                            subtitle="IA nutricional"
                            highlight={true}
                        />
                    ) : (
                        <PremiumButton
                            onClick={onUpgrade}
                            icon={<Scan className="w-8 h-8" />}
                            title="Análise por Foto"
                            subtitle="IA nutricional"
                        />
                    )}
                    {isPaid ? (
                        <ActionButton
                            onClick={() => onNavigate('shape')}
                            icon={<User className="w-8 h-8" />}
                            title="Análise Física"
                            subtitle="% gordura"
                            highlight={true}
                        />
                    ) : (
                        <PremiumButton
                            onClick={onUpgrade}
                            icon={<User className="w-8 h-8" />}
                            title="Análise Física"
                            subtitle="% gordura"
                        />
                    )}
                    {isPaid ? (
                        <ActionButton
                            onClick={() => onNavigate('chat')}
                            icon={<MessageSquare className="w-8 h-8" />}
                            title="Personal 24h"
                            subtitle="Suporte IA"
                            highlight={true}
                        />
                    ) : (
                        <PremiumButton
                            onClick={onUpgrade}
                            icon={<MessageSquare className="w-8 h-8" />}
                            title="Personal 24h"
                            subtitle="Suporte IA"
                        />
                    )}
                    {isPaid ? (
                        <ActionButton
                            onClick={() => onNavigate('evolution')}
                            icon={<LineChart className="w-8 h-8" />}
                            title="Sua Evolução"
                            subtitle="Analytics"
                            highlight={true}
                        />
                    ) : (
                        <PremiumButton
                            onClick={onUpgrade}
                            icon={<LineChart className="w-8 h-8" />}
                            title="Sua Evolução"
                            subtitle="Analytics"
                        />
                    )}
                </div>
            </section>

            {/* ═══ FERRAMENTAS GRATUITAS ═══ */}
            <section>
                <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                        Disponível agora
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/5 to-transparent" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <ActionButton
                        onClick={() => onNavigate('food_manual')}
                        icon={<NotebookPen className="w-8 h-8" />}
                        title="Adicionar Refeição"
                        subtitle="Registre o que comeu"
                        highlight={true}
                    />
                    <ActionButton onClick={() => onNavigate('water_calc')} icon={<Droplets className="w-8 h-8" />} title="Meta de Água" subtitle="Hidratação diária" />
                    <ActionButton onClick={() => onNavigate('bmi_calc')} icon={<Scale className="w-8 h-8" />} title="Calcular IMC" subtitle="Índice de massa" />
                    <ActionButton onClick={() => onNavigate('calorie_calc')} icon={<Flame className="w-8 h-8" />} title="Gasto Calórico" subtitle="Seu TDEE" />
                    <ActionButton onClick={() => onNavigate('calorie_plan')} icon={<Target className="w-8 h-8" />} title="Minha Meta" subtitle="Meta de calorias" />
                    <ActionButton onClick={() => onNavigate('saved_meals')} icon={<Save className="w-8 h-8" />} title="Refeições Salvas" subtitle="Seus favoritos" />
                </div>
            </section>
        </div>
    );
};

export default ToolGrid;
