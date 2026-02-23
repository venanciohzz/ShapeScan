
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
    itemHeight = 80
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

            // Force snap smooth
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
        <div className="relative w-full max-w-[280px] mx-auto overflow-hidden select-none py-4 px-2">
            {/* 3D Container with Perspective */}
            <div className="relative h-[240px] perspective-[1000px] flex items-center justify-center">

                {/* Central Glass Highlight */}
                <div className="absolute inset-x-0 h-[80px] bg-emerald-500/10 dark:bg-emerald-500/20 backdrop-blur-xl border-y-2 border-emerald-500/40 rounded-3xl z-20 pointer-events-none shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 opacity-50"></div>
                </div>

                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="w-full h-full overflow-y-scroll overflow-x-hidden scrollbar-hide relative z-10 py-[80px] touch-pan-y overscroll-contain"
                    style={{
                        height: 240,
                        scrollSnapType: 'y mandatory',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {options.map((option, i) => {
                        const index = options.indexOf(localValue);
                        const diff = i - index;
                        const isSelected = option === localValue;

                        // 3D Math for cylinder effect
                        const rotateX = diff * 25; // Degrees
                        const opacity = Math.max(0.1, 1 - Math.abs(diff) * 0.4);
                        const scale = 1 - Math.abs(diff) * 0.15;
                        const translateY = diff * -5; // Compensate for perspectve gap

                        return (
                            <div
                                key={i}
                                onClick={() => handleOptionClick(i)}
                                className="flex items-center justify-center snap-center cursor-pointer transition-all duration-300 ease-out h-[80px]"
                                style={{
                                    height: 80,
                                    transform: `rotateX(${rotateX}deg) scale(${scale}) translateY(${translateY}px)`,
                                    opacity: opacity,
                                    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out'
                                }}
                            >
                                <div className={`flex items-baseline gap-1 ${isSelected ? 'text-gray-900 dark:text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-gray-400 dark:text-zinc-700'}`}>
                                    <span className={`italic uppercase tracking-tighter ${isSelected ? 'text-5xl font-black' : 'text-2xl font-bold'}`}>
                                        {option}
                                    </span>
                                    {isSelected && unit && (
                                        <span className="text-xl font-black text-emerald-500 italic lowercase">{unit}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Top and Bottom Fading Folds */}
                <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#F3F6F8] dark:from-zinc-950 to-transparent z-30 pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#F3F6F8] dark:from-zinc-950 to-transparent z-30 pointer-events-none" />
            </div>
        </div>
    );
};

export default PremiumPicker;
