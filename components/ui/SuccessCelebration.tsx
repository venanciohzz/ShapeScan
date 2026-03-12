import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star } from 'lucide-react';

interface SuccessCelebrationProps {
    show: boolean;
    onComplete: () => void;
    message?: string;
    subMessage?: string;
}

const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({ show, onComplete, message = "Meta Batida!", subMessage = "+50 XP Adicionado" }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onComplete, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
                    {/* Overlay sutil */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm"
                    />

                    {/* Conteúdo Central */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -20 }}
                        className="relative bg-zinc-900 border border-amber-500/30 rounded-[3rem] p-12 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col items-center gap-6"
                    >
                        {/* Partículas de Brilho */}
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ 
                                    opacity: [0, 1, 0], 
                                    scale: [0, 1, 0],
                                    x: Math.cos(i * 30 * Math.PI / 180) * 150,
                                    y: Math.sin(i * 30 * Math.PI / 180) * 150
                                }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                                className="absolute"
                            >
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            </motion.div>
                        ))}

                        <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                            <Trophy className="w-12 h-12 text-zinc-900" />
                        </div>

                        <div className="text-center">
                            <h2 className="text-4xl font-serif-premium font-bold text-white mb-2">{message}</h2>
                            <p className="text-amber-500 font-black uppercase tracking-[0.3em] text-xs">{subMessage}</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SuccessCelebration;
