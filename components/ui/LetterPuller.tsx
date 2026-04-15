import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useIsMobile } from '../../src/utils/useIsMobile';

const LetterPuller: React.FC<{ text: string; className?: string; delay?: number }> = ({ text, className = "", delay = 0 }) => {
    const isMobile = useIsMobile();

    // Em mobile: renderiza texto plano sem animação por letra (economiza JS thread)
    if (isMobile) {
        return <span className={`inline break-words ${className}`}>{text}</span>;
    }

    const words = text.split(' ');
    let globalIndex = 0;

    const container = {
        hidden: { opacity: 1 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.03,
                delayChildren: delay,
            },
        },
    };

    const child: Variants = {
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
            } as any,
        },
        hidden: {
            opacity: 0,
            y: 8,
        },
    };

    return (
        <motion.span
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className={`inline break-words ${className}`}
        >
            {words.map((word, wordIndex) => {
                const letters = Array.from(word);
                return (
                    <span key={wordIndex} className="inline-block">
                        {letters.map((letter, letterIndex) => {
                            const index = globalIndex++;
                            return (
                                <motion.span
                                    key={index}
                                    variants={child}
                                    style={{
                                        display: 'inline-block',
                                        whiteSpace: 'pre',
                                        verticalAlign: 'baseline',
                                        position: 'relative',
                                        overflow: 'visible'
                                    }}
                                >
                                    <motion.span
                                        className="animate-smooth-float"
                                        style={{
                                            display: 'inline-block',
                                            padding: '0.1em 0',
                                            overflow: 'visible',
                                            animationDelay: `${index * 0.15}s`,
                                            transform: 'translateZ(0)',
                                            backfaceVisibility: 'hidden'
                                        }}
                                    >
                                        {letter}
                                    </motion.span>
                                </motion.span>
                            );
                        })}
                        {wordIndex < words.length - 1 && <span className="inline-block">&nbsp;</span>}
                    </span>
                );
            })}
        </motion.span>
    );
};

export default LetterPuller;
