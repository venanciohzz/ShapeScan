"use client";
import React, { useEffect, useRef, useState } from 'react';
import { cn } from "@/lib/utils";

interface NeonFlowProps {
    children?: React.ReactNode;
    className?: string;
    enableClickInteraction?: boolean;
}

export function NeonFlow({
    children,
    className,
    enableClickInteraction = true
}: NeonFlowProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const tubesRef = useRef<any>(null);

    useEffect(() => {
        let mounted = true;
        let cleanup: (() => void) | undefined;

        const initTubes = async () => {
            if (!canvasRef.current) return;

            try {
                // @ts-ignore
                const module = await import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js');
                const TubesCursor = module.default;

                if (!mounted) return;

                // Customizando para Tons de Verde Esmeralda e Teal
                const app = TubesCursor(canvasRef.current, {
                    tubes: {
                        colors: ["#10b981", "#34d399", "#064e3b"], // Emerald 500, 400, Deep Teal
                        lights: {
                            intensity: 200,
                            colors: ["#34d399", "#10b981", "#059669", "#111827"]
                        }
                    }
                });

                tubesRef.current = app;
                setIsLoaded(true);

                cleanup = () => {
                    // A biblioteca pode não exportar um destroy limpo, mas gerenciamos o mount
                    if (canvasRef.current) {
                        // Tentativa de limpeza se exposta
                    }
                };

            } catch (error) {
                console.error("Failed to load TubesCursor:", error);
            }
        };

        initTubes();

        return () => {
            mounted = false;
            if (cleanup) cleanup();
        };
    }, []);

    const handleClick = () => {
        if (!enableClickInteraction || !tubesRef.current) return;

        // Randomizar dentro da paleta verde
        const greenColors = ["#10b981", "#34d399", "#059669", "#064e3b", "#065f46", "#34d399"];
        const colors = Array.from({ length: 3 }, () => greenColors[Math.floor(Math.random() * greenColors.length)]);
        const lightsColors = Array.from({ length: 4 }, () => greenColors[Math.floor(Math.random() * greenColors.length)]);

        tubesRef.current.tubes.setColors(colors);
        tubesRef.current.tubes.setLightsColors(lightsColors);
    };

    useEffect(() => {
        const handleInteraction = () => {
            setHasInteracted(true);
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };

        window.addEventListener('mousemove', handleInteraction, { passive: true });
        window.addEventListener('touchstart', handleInteraction, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    return (
        <div
            className={cn("absolute inset-0 w-full h-full overflow-hidden bg-transparent pointer-events-none", className)}
            style={{ 
                opacity: hasInteracted ? undefined : 0, 
                visibility: hasInteracted ? 'visible' : 'hidden',
                transition: 'opacity 1s ease-in-out'
            }}
            onClick={handleClick}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full block pointer-events-auto"
                style={{ touchAction: 'none' }}
            />

            {/* Content Overlay */}
            <div className="relative z-10 w-full h-full pointer-events-none">
                {children}
            </div>
        </div>
    );
}

export default NeonFlow;
