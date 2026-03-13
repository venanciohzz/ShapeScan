
import React from 'react';

interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
    const progress = (currentStep / totalSteps) * 100;

    return (
        <div className="w-full mb-8">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em]">
                    Etapa {currentStep} de {totalSteps}
                </span>
                <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase">
                    {Math.round(progress)}%
                </span>
            </div>
            <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
