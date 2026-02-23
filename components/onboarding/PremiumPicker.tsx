
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface PremiumPickerProps {
    options: (number | string)[];
    value: number | string;
    onChange: (value: number | string) => void;
    unit?: string;
    itemHeight?: number;
    formatOption?: (value: number | string) => string;
}

const VISIBLE = 5; // number of visible items

const PremiumPicker: React.FC<PremiumPickerProps> = ({
    options,
    value,
    onChange,
    unit = "",
    itemHeight = 52,
    formatOption,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [localIndex, setLocalIndex] = useState(() => Math.max(0, options.indexOf(value)));
    const isSnapping = useRef(false);
    const snapTimer = useRef<any>(null);

    // Sync when `value` prop changes from outside
    useEffect(() => {
        const idx = options.indexOf(value);
        if (idx === -1) return;
        // Always update localIndex, even when idx=0 (January bug fix)
        setLocalIndex(idx);
        const container = containerRef.current;
        if (!container) return;
        isSnapping.current = true;
        // Force scroll even if already at 0
        container.scrollTop = idx * itemHeight + 0.001;
        requestAnimationFrame(() => {
            if (container) container.scrollTop = idx * itemHeight;
            setTimeout(() => { isSnapping.current = false; }, 60);
        });
    }, [value, options, itemHeight]);

    const handleScroll = useCallback(() => {
        if (isSnapping.current) return;
        const container = containerRef.current;
        if (!container) return;

        // Live visual index update
        const rawIdx = Math.round(container.scrollTop / itemHeight);
        const clampedIdx = Math.max(0, Math.min(rawIdx, options.length - 1));
        setLocalIndex(clampedIdx);

        // Debounced commit
        if (snapTimer.current) clearTimeout(snapTimer.current);
        snapTimer.current = setTimeout(() => {
            const finalIdx = Math.round(container.scrollTop / itemHeight);
            const clamped = Math.max(0, Math.min(finalIdx, options.length - 1));
            const finalValue = options[clamped];
            if (finalValue !== undefined) {
                setLocalIndex(clamped);
                onChange(finalValue);
                isSnapping.current = true;
                container.scrollTo({ top: clamped * itemHeight, behavior: 'smooth' });
                setTimeout(() => { isSnapping.current = false; }, 400);
            }
        }, 120);
    }, [options, onChange, itemHeight]);

    const handleClick = useCallback((idx: number) => {
        const container = containerRef.current;
        if (!container) return;
        setLocalIndex(idx);
        onChange(options[idx]);
        isSnapping.current = true;
        container.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
        setTimeout(() => { isSnapping.current = false; }, 400);
    }, [options, onChange, itemHeight]);

    const pad = Math.floor(VISIBLE / 2); // padding items on each side

    return (
        <div className="relative w-full overflow-hidden" style={{ height: itemHeight * VISIBLE }}>

            {/* Selected item pill highlight */}
            <div
                className="absolute inset-x-0 pointer-events-none z-10 rounded-2xl mx-2 bg-black/[0.06] dark:bg-white/[0.08]"
                style={{ top: itemHeight * pad, height: itemHeight }}
            />

            {/* Scroll container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-y-scroll overflow-x-hidden scrollbar-hide touch-pan-y"
                style={{
                    scrollSnapType: 'y mandatory',
                    paddingTop: itemHeight * pad,
                    paddingBottom: itemHeight * pad,
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {options.map((option, i) => {
                    const diff = Math.abs(i - localIndex);
                    const isSelected = i === localIndex;

                    // Opacity ladder: selected=1, ±1=0.5, ±2=0.25, beyond=0.1
                    const opacityMap: Record<number, number> = { 0: 1, 1: 0.45, 2: 0.22 };
                    const opacity = opacityMap[diff] ?? 0.08;

                    return (
                        <div
                            key={i}
                            onClick={() => handleClick(i)}
                            className="flex items-center justify-center cursor-pointer select-none transition-opacity duration-200"
                            style={{
                                height: itemHeight,
                                scrollSnapAlign: 'start',
                                opacity,
                            }}
                        >
                            <span
                                className={`transition-all duration-200 ${isSelected
                                    ? 'text-[22px] font-bold text-gray-900 dark:text-white'
                                    : 'text-[17px] font-medium text-gray-500 dark:text-zinc-400'
                                    }`}
                            >
                                {formatOption ? formatOption(option) : option}{!formatOption && unit ? ` ${unit}` : ''}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Top fade */}
            <div className="absolute top-0 inset-x-0 pointer-events-none z-20 bg-gradient-to-b from-[#F3F6F8] dark:from-zinc-950 to-transparent" style={{ height: itemHeight * pad }} />
            {/* Bottom fade */}
            <div className="absolute bottom-0 inset-x-0 pointer-events-none z-20 bg-gradient-to-t from-[#F3F6F8] dark:from-zinc-950 to-transparent" style={{ height: itemHeight * pad }} />
        </div>
    );
};

export default PremiumPicker;
