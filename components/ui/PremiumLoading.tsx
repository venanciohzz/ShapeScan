import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumBackground from './PremiumBackground';
import LetterPuller from './LetterPuller';

interface PremiumLoadingProps {
    loading: boolean;
    messages: string[];
    previewImage?: string | null;
    className?: string;
}

const PremiumLoading: React.FC<PremiumLoadingProps> = ({
    loading,
    messages,
    previewImage,
    className = ""
}) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        let interval: any;
        if (loading) {
            setStep(0);
            interval = setInterval(() => {
                setStep(prev => (prev < messages.length - 1 ? prev + 1 : prev));
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading, messages]);

    useEffect(() => {
        if (loading) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [loading]);

    return (
        <AnimatePresence>
            {loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 z-[500] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center overscroll-none ${className}`}
                >
                    {/* Subtle Background Glow */}
                    <div className="absolute inset-0 z-0 opacity-30">
                        <PremiumBackground dim={true} intensity={1.5}>
                            <div />
                        </PremiumBackground>
                    </div>

                    <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center">
                        {/* Scanner Visualizer */}
                        <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mb-16 group">
                            {previewImage ? (
                                <div className="absolute inset-0 rounded-[3.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 bg-zinc-900">
                                    <img
                                        src={previewImage}
                                        alt="Scanning"
                                        className="w-full h-full object-cover opacity-60 brightness-75 scale-110 transition-transform duration-[10s] ease-linear repeat-infinite"
                                        style={{ animation: 'slow-zoom 20s infinite alternate' }}
                                    />
                                    {/* Laser Line */}
                                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(52,211,153,1)] animate-[scan-line_3s_ease-in-out_infinite] z-20"></div>

                                    {/* Grid Overlay */}
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 rounded-[3.5rem] border border-emerald-500/10 bg-emerald-500/5 animate-pulse flex items-center justify-center">
                                    <div className="w-32 h-32 rounded-full border border-emerald-500/20 animate-ping opacity-20" />
                                </div>
                            )}

                            {/* External Rotating Rings */}
                            <div className="absolute -inset-4 border-t-2 border-emerald-500/20 rounded-full animate-[spin_8s_linear_infinite]"></div>
                            <div className="absolute -inset-8 border-b-2 border-emerald-500/10 rounded-full animate-[spin_12s_linear_infinite_reverse]"></div>
                        </div>

                        {/* Dynamic Messages */}
                        <div className="text-center space-y-8 w-full">
                            <div className="h-8 flex items-center justify-center">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={step}
                                        initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <LetterPuller
                                            text={messages[step]}
                                            className="text-white text-lg md:text-xl font-serif-premium tracking-[0.2em] uppercase font-bold"
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-64 h-[2px] bg-white/5 mx-auto rounded-full overflow-hidden relative">
                                <motion.div
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '100%' }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                    className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
                                />
                            </div>

                            <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-[0.5em] animate-pulse">
                                Sincronizando com a ShapeScan IA
                            </p>
                        </div>
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
            @keyframes scan-line {
              0% { transform: translateY(0); opacity: 0.2; }
              50% { transform: translateY(400px); opacity: 1; }
              100% { transform: translateY(0); opacity: 0.2; }
            }
            @keyframes slow-zoom {
              0% { transform: scale(1); }
              100% { transform: scale(1.3); }
            }
          `}} />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PremiumLoading;
