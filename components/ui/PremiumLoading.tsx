import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../../src/utils/useIsMobile';

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
    const isMobile = useIsMobile();

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
                    /* backdrop-blur removido em mobile — muito pesado na GPU */
                    className={`fixed inset-0 z-[500] bg-black/80 flex flex-col items-center justify-center overscroll-none ${className}`}
                >
                    <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center">
                        {/* Scanner Visualizer */}
                        <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center mb-12 md:mb-16">
                            {previewImage ? (
                                <div className="absolute inset-0 rounded-[3rem] overflow-hidden border border-white/10 z-10 bg-zinc-900">
                                    <img
                                        src={previewImage}
                                        alt="Scanning"
                                        className="w-full h-full object-cover opacity-60 brightness-75"
                                        /* slow-zoom removido em mobile */
                                        style={isMobile ? undefined : { animation: 'slow-zoom 20s infinite alternate' }}
                                    />
                                    {/* Laser Line — só desktop */}
                                    {!isMobile && (
                                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(52,211,153,1)] animate-[scan-line_3s_ease-in-out_infinite] z-20" />
                                    )}
                                    {/* Grid Overlay */}
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 rounded-[3rem] border border-emerald-500/10 bg-emerald-500/5 flex items-center justify-center">
                                    <div className="w-24 h-24 rounded-full border border-emerald-500/30 animate-pulse" />
                                </div>
                            )}

                            {/* Rings rotativos — apenas desktop */}
                            {!isMobile && (
                                <>
                                    <div className="absolute -inset-4 border-t-2 border-emerald-500/20 rounded-full animate-[spin_8s_linear_infinite]" />
                                    <div className="absolute -inset-8 border-b-2 border-emerald-500/10 rounded-full animate-[spin_12s_linear_infinite_reverse]" />
                                </>
                            )}
                        </div>

                        {/* Dynamic Messages */}
                        <div className="text-center space-y-6 w-full">
                            <div className="h-8 flex items-center justify-center">
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={step}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-white text-base md:text-xl font-bold tracking-[0.15em] uppercase"
                                    >
                                        {messages[step]}
                                    </motion.p>
                                </AnimatePresence>
                            </div>

                            {/* Progress Bar — CSS puro em mobile, framer-motion no desktop */}
                            <div className="w-56 h-[2px] bg-white/10 mx-auto rounded-full overflow-hidden relative">
                                {isMobile ? (
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                                ) : (
                                    <motion.div
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                        className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
                                    />
                                )}
                            </div>

                            <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-[0.4em]">
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
