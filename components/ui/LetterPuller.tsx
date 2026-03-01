import React from 'react';
import { motion, Variants } from 'framer-motion';

const LetterPuller: React.FC<{ text: string; className?: string; delay?: number }> = ({ text, className = "", delay = 0 }) => {
    const letters = Array.from(text);

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
            style={{ display: 'inline', whiteSpace: 'pre-wrap' }}
        >
            {letters.map((letter, index) => (
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
                        className={`${className} animate-smooth-float`}
                        style={{
                            display: 'inline-block',
                            padding: '0.35em',
                            margin: '-0.35em',
                            overflow: 'visible',
                            animationDelay: `${index * 0.15}s`,
                            transform: 'translateZ(0)',
                            backfaceVisibility: 'hidden'
                        }}
                    >
                        {letter}
                    </motion.span>
                </motion.span>
            ))}
        </motion.span>
    );
};

export default LetterPuller;
