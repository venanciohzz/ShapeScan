
import React, { useRef, useEffect, useState, useCallback } from 'react';

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
    itemHeight = 56
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [localValue, setLocalValue] = useState(value);
    const isSnapping = useRef(false);
    const snapTimer = useRef<any>(null);

    // Sync scroll position when value prop changes externally
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const index = options.indexOf(value);
        if (index !== -1) {
            isSnapping.current = true;
            container.scrollTop = index * itemHeight;
            setTimeout(() => { isSnapping.current = false; }, 50);
        }
        setLocalValue(value);
    }, [value, itemHeight, options]);

    const handleScroll = useCallback(() => {
        if (isSnapping.current) return;

        const container = containerRef.current;
        if (!container) return;

        // Live update local value during scroll for immediate visual feedback
        const rawIndex = container.scrollTop / itemHeight;
        const nearestIndex = Math.round(rawIndex);
        const nearest = options[Math.max(0, Math.min(nearestIndex, options.length - 1))];
        if (nearest !== undefined) {
            setLocalValue(nearest);
        }

        // Debounced commit: snap and fire onChange
        if (snapTimer.current) clearTimeout(snapTimer.current);
        snapTimer.current = setTimeout(() => {
            const finalIndex = Math.round(container.scrollTop / itemHeight);
            const clamped = Math.max(0, Math.min(finalIndex, options.length - 1));
            const finalValue = options[clamped];
            if (finalValue !== undefined) {
                setLocalValue(finalValue);
                onChange(finalValue);
                // Snap without triggering another scroll event
                isSnapping.current = true;
                container.scrollTo({ top: clamped * itemHeight, behavior: 'smooth' });
                setTimeout(() => { isSnapping.current = false; }, 400);
            }
        }, 120);
    }, [options, onChange, itemHeight]);

    const handleClick = useCallback((index: number) => {
        const container = containerRef.current;
        if (!container) return;
        const val = options[index];
        setLocalValue(val);
        onChange(val);
        isSnapping.current = true;
        container.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
        setTimeout(() => { isSnapping.current = false; }, 400);
    }, [options, onChange, itemHeight]);

    const visibleItems = 5;
    const containerHeight = itemHeight * visibleItems;
    const centerIndex = options.indexOf(localValue);

    return (
        <div className="relative w-full select-none overflow-hidden" style={{ height: containerHeight }}>

            {/* Selection highlight lines */}
            <div
                className="absolute inset-x-4 pointer-events-none z-20"
                style={{ top: itemHeight * 2, height: itemHeight }}
            >
                <div className="w-full h-full border-y border-emerald-500/60 bg-emerald-500/5 rounded-2xl" />
            </div>

            {/* Scrollable list */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-y-scroll overflow-x-hidden scrollbar-hide touch-pan-y"
                style={{
                    scrollSnapType: 'y mandatory',
                    paddingTop: itemHeight * 2,
                    paddingBottom: itemHeight * 2,
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {options.map((option, i) => {
                    const diff = Math.abs(i - centerIndex);
                    const isSelected = i === centerIndex;
                    const opacity = isSelected ? 1 : diff === 1 ? 0.35 : diff === 2 ? 0.15 : 0.05;
                    const scale = isSelected ? 1 : diff === 1 ? 0.82 : 0.65;

                    return (
                        <div
                            key={i}
                            onClick={() => handleClick(i)}
                            className="flex items-center justify-center cursor-pointer will-change-transform"
                            style={{
                                height: itemHeight,
                                scrollSnapAlign: 'center',
                                opacity,
                                transform: `scale(${scale})`,
                                transition: 'opacity 0.25s ease, transform 0.25s ease',
                            }}
                        >
                            <span className={`tracking-tighter ${isSelected
                                ? 'text-4xl md:text-5xl font-black italic text-gray-900 dark:text-white'
                                : 'text-lg md:text-2xl font-bold text-gray-500 dark:text-zinc-500'
                                }`}>
                                {option}
                            </span>
                            {isSelected && unit && (
                                <span className="ml-1 text-base md:text-lg font-black italic text-emerald-500">{unit}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Top fade */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#F3F6F8] dark:from-zinc-950 to-transparent pointer-events-none z-10" />
            {/* Bottom fade */}
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#F3F6F8] dark:from-zinc-950 to-transparent pointer-events-none z-10" />
        </div>
    );
};

export default PremiumPicker;
