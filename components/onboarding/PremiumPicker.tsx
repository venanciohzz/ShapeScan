
import React, { useRef, useEffect, useState } from 'react';

interface PremiumPickerProps {
    options: (number | string)[];
    value: number | string;
    onChange: (value: number | string) => void;
    unit?: string;
    itemHeight?: number;
}

const PremiumPicker: React.FC<PremiumPickerProps> = ({
    options,
    value,
    onChange,
    unit = "",
    itemHeight = 70
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [localValue, setLocalValue] = useState(value);
    const scrollTimeout = useRef<any>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const index = options.indexOf(value);
        if (index !== -1) {
            container.scrollTop = index * itemHeight;
        }
    }, [value, itemHeight]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;

        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

        scrollTimeout.current = setTimeout(() => {
            const index = Math.round(container.scrollTop / itemHeight);
            const newValue = options[index];
            if (newValue !== undefined && newValue !== localValue) {
                setLocalValue(newValue);
                onChange(newValue);
            }

            // Force snap
            container.scrollTo({
                top: index * itemHeight,
                behavior: 'smooth'
            });
        }, 150);
    };

    const handleOptionClick = (index: number) => {
        const container = containerRef.current;
        if (container) {
            container.scrollTo({
                top: index * itemHeight,
                behavior: 'smooth'
            });
            const newValue = options[index];
            setLocalValue(newValue);
            onChange(newValue);
        }
    };

    return (
        <div className="relative w-full overflow-hidden select-none bg-black/5 dark:bg-white/5 rounded-3xl group">
            {/* Target Highlight */}
            <div
                className="absolute left-0 right-0 pointer-events-none border-y-2 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 z-20"
                style={{ height: itemHeight, top: itemHeight }}
            />

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full overflow-y-scroll overflow-x-hidden scrollbar-hide relative z-10 py-[70px] touch-pan-y overscroll-contain"
                style={{
                    height: itemHeight * 3,
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {options.map((option, i) => {
                    const isSelected = option === localValue;
                    return (
                        <div
                            key={i}
                            onClick={() => handleOptionClick(i)}
                            className="flex items-center justify-center snap-center cursor-pointer transition-all duration-300 ease-out"
                            style={{
                                height: itemHeight,
                                opacity: isSelected ? 1 : 0.2,
                                transform: isSelected ? 'scale(1.2)' : 'scale(0.85)',
                            }}
                        >
                            <span className={`tracking-tighter select-none ${isSelected ? 'text-4xl font-black text-gray-900 dark:text-white' : 'text-xl font-bold text-gray-400 dark:text-zinc-600'}`}>
                                {option}
                                {isSelected && unit && <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500 ml-1">{unit}</span>}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Fading Overlays */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#F3F6F8] dark:from-[#09090b] to-transparent z-30 pointer-events-none transition-colors duration-500" />
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#F3F6F8] dark:from-[#09090b] to-transparent z-30 pointer-events-none transition-colors duration-500" />
        </div>
    );
};

export default PremiumPicker;
