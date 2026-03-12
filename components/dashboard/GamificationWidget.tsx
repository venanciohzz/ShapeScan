import React, { useMemo } from 'react';
import { UserStats } from '../../types';
import { Flame, Star, Trophy, Target, Award, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface GamificationWidgetProps {
    stats: UserStats | null;
    loading?: boolean;
}

const GamificationWidget: React.FC<GamificationWidgetProps> = ({ stats, loading }) => {
    if (loading || !stats) {
        return (
            <div className="bg-zinc-950/40 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 animate-pulse">
                <div className="h-6 w-32 bg-white/10 rounded-full mb-6" />
                <div className="h-20 w-full bg-white/5 rounded-3xl mb-6" />
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-12 w-12 bg-white/5 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    const { currentStreak, level, experience, badges } = stats;
    const expInLevel = experience % 500;
    const progress = (expInLevel / 500) * 100;

    const availableBadges = [
        { id: 'first_step', icon: <Target className="w-5 h-5" />, label: 'Primeiro Passo', description: 'Iniciou sua jornada' },
        { id: 'seven_days', icon: <Zap className="w-5 h-5" />, label: 'Semana Focada', description: '7 dias de constância' },
        { id: 'thirty_days', icon: <Trophy className="w-5 h-5" />, label: 'Imparável', description: '30 dias de foco' },
        { id: 'food_master', icon: <Award className="w-5 h-5" />, label: 'Master Chef', description: '50 registros de comida' },
    ];

    return (
        <div className="relative group">
            {/* Glow Effect */}
            <div className={`absolute -inset-4 rounded-[3rem] blur-3xl opacity-0 transition-all duration-1000 group-hover:opacity-20 pointer-events-none bg-amber-500`}></div>

            <div className="relative bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] p-6 border border-white/5 shadow-xl overflow-hidden group-hover:border-white/10 transition-all duration-500">
                
                <div className="relative z-10">
                    <header className="flex justify-between items-center mb-6">
                        <div>
                            <span className="text-zinc-400 text-[9px] font-black uppercase tracking-[0.4em] mb-1 block opacity-60">Rank</span>
                            <div className="flex items-center gap-2">
                                <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                    <span className="text-[8px] font-black text-amber-500 tracking-tighter uppercase">NÍVEL {level}</span>
                                </div>
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">RANK {(level || 1) < 5 ? 'BRONZE' : (level || 1) < 15 ? 'PRATA' : 'OURO'}</span>
                            </div>
                        </div>
                        
                        <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                            <Flame className={`w-4 h-4 ${currentStreak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-zinc-600'}`} />
                            <span className="text-lg font-serif-premium font-bold text-white leading-none">{currentStreak}</span>
                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-tighter">DIAS</span>
                        </div>
                    </header>

                    {/* XP Progress Bar */}
                    <div className="mb-6 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                        <div className="flex justify-between items-end mb-2 px-1">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Experiência</span>
                            <span className="text-[9px] font-bold text-white">{expInLevel} / 500 <span className="text-amber-500/60 uppercase text-[7px] ml-1">XP</span></span>
                        </div>
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                            />
                        </div>
                    </div>

                    {/* Badges Grid */}
                    <div>
                        <span className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.4em] mb-3 block opacity-40">Conquistas</span>
                        <div className="grid grid-cols-4 gap-2">
                            {availableBadges.map((badge) => {
                                const isUnlocked = badges.includes(badge.id);
                                return (
                                    <div 
                                        key={badge.id}
                                        className={`group/badge relative aspect-square rounded-xl border flex items-center justify-center transition-all duration-300 ${
                                            isUnlocked 
                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-lg shadow-amber-500/5 cursor-help' 
                                            : 'bg-white/5 border-white/5 text-zinc-800 grayscale'
                                        }`}
                                    >
                                        <div className="scale-75 md:scale-100">{badge.icon}</div>
                                        
                                        {/* Tooltip on hover */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-32 p-3 bg-zinc-900 border border-white/10 rounded-2xl opacity-0 translate-y-2 group-hover/badge:opacity-100 group-hover/badge:translate-y-0 transition-all z-50 pointer-events-none shadow-2xl">
                                            <p className="text-[9px] font-black text-amber-500 uppercase mb-1 tracking-wider">{badge.label}</p>
                                            <p className="text-[8px] text-zinc-400 leading-tight font-medium">{badge.description}</p>
                                            {isUnlocked && <div className="mt-2 text-[7px] font-bold text-emerald-400 uppercase">✓ Conquistado</div>}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900"></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamificationWidget;
