
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface PremiumPickerProps {
    options: (number | string)[];
    value: number | string;
    onChange: (value: number | string) => void;
    unit?: string;
    itemHeight?: number;
    formatOption?: (value: number | string) => string;
}

const VISIBLE = 5; // must be odd for symmetric centering
const PAD = Math.floor(VISIBLE / 2); // 2 spacer items on each side

const PremiumPicker: React.FC<PremiumPickerProps> = ({
    options,
    value,
    onChange,
    unit = "",
    itemHeight = 52,
    formatOption,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isCommitting = useRef(false);
    const snapTimer = useRef<any>(null);

    // The real selected index (offset by PAD because of spacers)
    const getValueIndex = useCallback(
        (val: number | string) => options.indexOf(val),
        [options]
    );

    const [localIndex, setLocalIndex] = useState(() => getValueIndex(value));

    // Scroll to a given options index (accounting for PAD spacers)
    const scrollToIndex = useCallback(
        (idx: number, smooth = false) => {
            const container = containerRef.current;
            if (!container) return;
            const targetScroll = idx * itemHeight; // spacers handle the padding visually
            if (smooth) {
                container.scrollTo({ top: targetScroll, behavior: 'smooth' });
            } else {
                container.scrollTop = targetScroll;
            }
        },
        [itemHeight]
    );

    // Sync scroll when value changes from parent
    useEffect(() => {
        const idx = getValueIndex(value);
        if (idx === -1) return;
        setLocalIndex(idx);
        isCommitting.current = true;
        scrollToIndex(idx, false);
        // Briefly block scroll handling to avoid feedback loop
        const t = setTimeout(() => { isCommitting.current = false; }, 80);
        return () => clearTimeout(t);
    }, [value, getValueIndex, scrollToIndex]);

    const handleScroll = useCallback(() => {
        if (isCommitting.current) return;
        const container = containerRef.current;
        if (!container) return;

        // Derive which index is at center from scrollTop
        const rawIdx = Math.round(container.scrollTop / itemHeight);
        const idx = Math.max(0, Math.min(rawIdx, options.length - 1));
        setLocalIndex(idx);

        // Debounce: after scroll settles, commit value
        if (snapTimer.current) clearTimeout(snapTimer.current);
        snapTimer.current = setTimeout(() => {
            const finalRaw = Math.round(container.scrollTop / itemHeight);
            const finalIdx = Math.max(0, Math.min(finalRaw, options.length - 1));
            const finalValue = options[finalIdx];
            if (finalValue !== undefined) {
                setLocalIndex(finalIdx);
                onChange(finalValue);
                isCommitting.current = true;
                container.scrollTo({ top: finalIdx * itemHeight, behavior: 'smooth' });
                setTimeout(() => { isCommitting.current = false; }, 400);
            }
        }, 100);
    }, [options, onChange, itemHeight]);

    const handleClick = useCallback(
        (realIdx: number) => {
            const val = options[realIdx];
            if (val === undefined) return;
            setLocalIndex(realIdx);
            onChange(val);
            isCommitting.current = true;
            scrollToIndex(realIdx, true);
            setTimeout(() => { isCommitting.current = false; }, 400);
        },
        [options, onChange, scrollToIndex]
    );

    const containerHeight = itemHeight * VISIBLE;

    // Build row items: PAD empty spacers + real options + PAD empty spacers
    const spacer = (key: string) => (
        <div key={key} style={{ height: itemHeight, flexShrink: 0, scrollSnapAlign: 'center' }} />
    );

    return (
        <div className="relative w-full overflow-hidden select-none" style={{ height: containerHeight }}>

            {/* Selection highlight */}
            <div
                className="absolute inset-x-4 pointer-events-none z-10 rounded-3xl bg-white/[0.07] border border-white/10 shadow-[0_0_30px_-10px_rgba(255,255,255,0.2)]"
                style={{ top: itemHeight * PAD, height: itemHeight }}
            />

            {/* Scrollable list */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-y-scroll overflow-x-hidden scrollbar-hide touch-pan-y"
                style={{
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {/* Top spacers */}
                {Array.from({ length: PAD }).map((_, i) => spacer(`top-${i}`))}

                {options.map((option, i) => {
                    const diff = Math.abs(i - localIndex);
                    const isSelected = i === localIndex;

                    const opacityMap: Record<number, number> = { 0: 1, 1: 0.3, 2: 0.1 };
                    const opacity = opacityMap[diff] ?? 0.03;
                    const scale = isSelected ? 1 : diff === 1 ? 0.9 : 0.8;
                    const label = formatOption ? formatOption(option) : `${option}${unit ? ` ${unit}` : ''}`;

                    return (
                        <div
                            key={i}
                            onClick={() => handleClick(i)}
                            className="flex items-center justify-center cursor-pointer w-full"
                            style={{
                                height: itemHeight,
                                flexShrink: 0,
                                scrollSnapAlign: 'center',
                                opacity,
                                transform: `scale(${scale})`,
                                transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                            }}
                        >
                            <span
                                className={`whitespace-nowrap transition-all duration-500 ${isSelected
                                    ? 'text-2xl font-serif-premium font-bold text-white'
                                    : 'text-lg font-bold text-zinc-500'
                                    }`}
                            >
                                {label}
                            </span>
                        </div>
                    );
                })}

                {/* Bottom spacers */}
                {Array.from({ length: PAD }).map((_, i) => spacer(`bot-${i}`))}
            </div>

            {/* Gradient fades */}
            <div className="absolute top-0 inset-x-0 pointer-events-none z-20 bg-gradient-to-b from-zinc-950 to-transparent opacity-80" style={{ height: itemHeight * PAD }} />
            <div className="absolute bottom-0 inset-x-0 pointer-events-none z-20 bg-gradient-to-t from-zinc-950 to-transparent opacity-80" style={{ height: itemHeight * PAD }} />
        </div>
    );
};

export default PremiumPicker;
