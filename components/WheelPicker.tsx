
import React, { useRef, useEffect, useState } from 'react';

interface WheelPickerProps {
    options: (string | number)[];
    value: string | number;
    onChange: (value: string | number) => void;
    unit?: string;
    className?: string;
}

const WheelPicker: React.FC<WheelPickerProps> = ({ options, value, onChange, unit, className = "" }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const itemHeight = 50; // pixels

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const selectedIndex = options.indexOf(value);
        if (selectedIndex !== -1) {
            container.scrollTop = selectedIndex * itemHeight;
        }
    }, []);

    const handleScroll = () => {
        const container = containerRef.current;
        if (!container) return;

        setIsScrolling(true);

        // Timer para detectar parada do scroll (simples debounce)
        const timer = setTimeout(() => {
            const index = Math.round(container.scrollTop / itemHeight);
            const newValue = options[index];
            if (newValue !== undefined && newValue !== value) {
                onChange(newValue);
            }

            // Snap no scroll
            container.scrollTo({
                top: index * itemHeight,
                behavior: 'smooth'
            });

            setIsScrolling(false);
        }, 150);

        return () => clearTimeout(timer);
    };

    return (
        <div className={`relative h-[150px] overflow-hidden flex items-center justify-center ${className}`}>
            {/* Máscaras de Gradiente para efeito de profundidade */}
            <div className="absolute inset-0 pointer-events-none z-20">
                <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-zinc-950 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-[30%] bg-gradient-to-t from-zinc-950 to-transparent"></div>
            </div>

            {/* Centro / Overlay de Seleção */}
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-full h-[50px] bg-emerald-500/5 border-y border-white/5 shadow-[0_0_30px_rgba(16,185,129,0.05)]"></div>
            </div>

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scrollbar-hide py-[50px] touch-pan-y overscroll-contain"
                style={{ scrollSnapType: 'y mandatory' }}
            >
                {options.map((option, i) => (
                    <div
                        key={i}
                        className={`h-[50px] flex items-center justify-center snap-center transition-all duration-300 ${value === option 
                            ? 'text-white font-serif-premium font-bold text-3xl scale-110' 
                            : 'text-zinc-600 font-medium text-lg scale-90 opacity-40'
                        }`}
                    >
                        {option}
                        {unit && value === option && (
                            <span className="text-xs text-emerald-500 font-black ml-1 uppercase tracking-widest">{unit}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WheelPicker;
