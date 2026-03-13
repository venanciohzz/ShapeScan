import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const LiquidBackground: React.FC = () => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Mola suave para o movimento do mouse
    const springConfig = { damping: 30, stiffness: 120 };
    const sx = useSpring(mouseX, springConfig);
    const sy = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#020504]">
            {/* Filtro SVG Metaball (O Segredo da Fusão Líquida) */}
            <svg className="hidden">
                <defs>
                    <filter id="liquid-merge">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="25" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="liquid" />
                        <feComposite in="SourceGraphic" in2="liquid" operator="atop" />
                    </filter>
                </defs>
            </svg>

            {/* Camada de Textura (Dithering/Noise) */}
            <div
                className="absolute inset-0 opacity-[0.05] mix-blend-overlay z-40 pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3BaseFilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            {/* Container Filtrado para os Blobs */}
            <div className="absolute inset-0" style={{ filter: 'url(#liquid-merge)' }}>

                {/* Cursor Blob (O "Imã" Líquido) */}
                <motion.div
                    style={{
                        left: sx,
                        top: sy,
                        x: '-50%',
                        y: '-50%',
                    }}
                    className="absolute w-[350px] h-[350px] rounded-full z-30"
                >
                    <div
                        className="w-full h-full rounded-full"
                        style={{
                            background: 'radial-gradient(circle at 35% 35%, rgba(52, 211, 153, 1) 0%, rgba(16, 185, 129, 0.6) 45%, rgba(6, 78, 59, 0.2) 75%, transparent 100%)',
                            boxShadow: 'inset -20px -20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(16, 185, 129, 0.2)'
                        }}
                    />
                </motion.div>

                {/* Blobs de Fundo Ambientais */}
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: Math.random() * 100 + '%',
                            y: Math.random() * 100 + '%',
                            scale: Math.random() * 0.5 + 0.5
                        }}
                        animate={{
                            x: [
                                `${Math.random() * 100}%`,
                                `${Math.random() * 100}%`,
                                `${Math.random() * 100}%`
                            ],
                            y: [
                                `${Math.random() * 100}%`,
                                `${Math.random() * 100}%`,
                                `${Math.random() * 100}%`
                            ],
                        }}
                        transition={{
                            duration: 25 + i * 5,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        className="absolute w-[300px] h-[300px] rounded-full"
                        style={{
                            background: `radial-gradient(circle at 30% 30%, rgba(${16 + i * 15}, 185, 129, 0.4) 0%, transparent 75%)`,
                            opacity: 0.6
                        }}
                    />
                ))}
            </div>

            {/* Overlay de Brilho e Profundidade */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-zinc-950/40 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.4)_100%)] pointer-events-none" />
        </div>
    );
};
