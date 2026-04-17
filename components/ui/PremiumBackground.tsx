import React, { Suspense } from 'react';
import { useIsMobile } from '../../src/utils/useIsMobile';

// Lazy: Three.js (725 kB) só baixa em desktop quando necessário
const LiquidShaderBackground = React.lazy(() =>
    import('./LiquidShaderBackground').then(m => ({ default: m.LiquidShaderBackground }))
);
const NeonFlow = React.lazy(() =>
    import('./NeonFlow').then(m => ({ default: m.NeonFlow }))
);

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
    const isMobile = useIsMobile();

    return (
        <div className="relative min-h-screen w-full bg-[#020202] text-white selection:bg-emerald-500 selection:text-white">
            {showShaders && (
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    {!isMobile && (
                        <Suspense fallback={null}>
                            <LiquidShaderBackground intensity={intensity} />
                            <NeonFlow className="opacity-40" />
                        </Suspense>
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/40 to-[#020202] transition-opacity duration-700 ${dim ? 'opacity-100' : 'opacity-60'}`} />
                    {dim && (
                        <div className="absolute inset-0 bg-black/60 z-10" />
                    )}
                </div>
            )}
            <div className={`relative z-10 w-full min-h-screen ${className}`}>
                {children}
            </div>
        </div>
    );
};

export default PremiumBackground;
