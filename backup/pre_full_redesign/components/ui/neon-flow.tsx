import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const TubesBackground = () => {
    const [paths, setPaths] = useState<string[]>([]);

    useEffect(() => {
        const newPaths = Array.from({ length: 15 }).map(() => {
            const startX = Math.random() * 100;
            const startY = Math.random() * 100;
            const ctrl1X = Math.random() * 100;
            const ctrl1Y = Math.random() * 100;
            const ctrl2X = Math.random() * 100;
            const ctrl2Y = Math.random() * 100;
            const endX = Math.random() * 100;
            const endY = Math.random() * 100;
            return `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`;
        });
        setPaths(newPaths);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 mix-blend-screen bg-transparent z-0">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {paths.map((path, i) => (
                    <motion.path
                        key={i}
                        d={path}
                        stroke={`hsl(${140 + Math.random() * 40}, 100%, 50%)`} // Emerald to Cyan
                        strokeWidth="0.8"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: [0, 1, 0, 1],
                            opacity: [0, 0.8, 1, 0],
                            pathOffset: [0, 1, 2, 3]
                        }}
                        transition={{
                            duration: 15 + Math.random() * 15,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 5
                        }}
                        style={{ filter: "blur(4px)" }}
                    />
                ))}
                {paths.map((path, i) => (
                    <motion.path
                        key={`glow-${i}`}
                        d={path}
                        stroke={`hsl(${140 + Math.random() * 40}, 100%, 70%)`}
                        strokeWidth="0.2"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: [0, 1, 0],
                            opacity: [0, 0.5, 0]
                        }}
                        transition={{
                            duration: 15 + Math.random() * 15,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 5
                        }}
                    />
                ))}
            </svg>
        </div>
    );
};
