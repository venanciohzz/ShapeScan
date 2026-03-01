
import React from 'react';

interface OnboardingLayoutProps {
    children: React.ReactNode;
    progress: number; // 0 to 1
    onBack?: () => void;
    showBack?: boolean;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children, progress, onBack, showBack = true }) => {
    return (
        <div className="min-h-[100dvh] w-full bg-[#F3F6F8] dark:bg-zinc-950 text-gray-900 dark:text-white relative flex flex-col items-center overflow-x-hidden transition-colors duration-500">
            {/* Background Elements - Consistent with Site */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/50 to-emerald-50/20 dark:from-zinc-950 dark:via-zinc-900 dark:to-black opacity-40 transition-colors duration-500" />
            </div>

            {/* Minimalist Progress Bar - Emerald */}
            <div className="fixed top-0 left-0 w-full h-1 bg-black/5 dark:bg-white/5 z-50">
                <div
                    className="h-full bg-emerald-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>

            <div className="relative z-10 w-full max-w-lg flex flex-col min-h-[100dvh] px-6 py-12 md:py-20 lg:py-24">
                {showBack && (
                    <button
                        onClick={onBack}
                        className="fixed top-8 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-md hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95 z-50"
                    >
                        <span className="text-xl pb-0.5">←</span>
                    </button>
                )}

                <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default OnboardingLayout;
