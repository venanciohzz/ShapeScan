import React from 'react';
import { LiquidShaderBackground } from './LiquidShaderBackground';
import { NeonFlow } from './NeonFlow';

interface PremiumBackgroundProps {
    children: React.ReactNode;
    className?: string;
    showShaders?: boolean;
    intensity?: number;
    dim?: boolean;
}

const PremiumBackground: React.FC<PremiumBackgroundProps> = ({
    children,
    className = "",
    showShaders = true,
    intensity = 2.2,
    dim = false
}) => {
    return (
        <div className={`relative min-h-screen w-full bg-[#020202] text-white selection:bg-emerald-500 selection:text-white ${className}`}>
            {showShaders && (
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <LiquidShaderBackground intensity={intensity} />
                    <NeonFlow className="opacity-40" />
                    <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/40 to-[#020202] transition-opacity duration-700 ${dim ? 'opacity-100' : 'opacity-60'}`} />
                    {dim && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 transition-all duration-700" />
                    )}
                </div>
            )}
            <div className="relative z-10 w-full min-h-screen">
                {children}
            </div>
        </div>
    );
};

export default PremiumBackground;
