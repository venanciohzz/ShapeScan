
import React from 'react';
import PremiumBackground from '../ui/PremiumBackground';
import { ArrowLeft } from 'lucide-react';

interface OnboardingLayoutProps {
    children: React.ReactNode;
    progress: number; // 0 to 1
    onBack?: () => void;
    showBack?: boolean;
    intensity?: number;
    dim?: boolean;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
    children,
    progress,
    onBack,
    showBack = true,
    intensity = 1.0,
    dim = true
}) => {
    return (
        <PremiumBackground intensity={intensity} dim={dim}>
            {/* Progress Bar Container */}
            <div className="fixed top-0 left-0 w-full h-1.5 bg-white/5 z-50">
                <div
                    className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>

            <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col min-h-screen px-6 py-12 md:py-20">
                {showBack && (
                    <button
                        onClick={onBack}
                        className="fixed top-8 left-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all active:scale-95 z-50 group"
                    >
                        <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                    </button>
                )}

                <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="py-8">
                        {children}
                    </div>
                </div>
            </div>
        </PremiumBackground>
    );
};

export default OnboardingLayout;
