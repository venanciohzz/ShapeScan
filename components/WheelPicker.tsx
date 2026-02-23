
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
            {/* Centro / Overlay de Seleção */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-[50px] bg-emerald-500/10 dark:bg-emerald-500/20 border-y border-emerald-500/30"></div>
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
                        className={`h-[50px] flex items-center justify-center snap-center transition-all duration-200 ${value === option ? 'text-emerald-600 dark:text-emerald-400 font-black text-2xl scale-110' : 'text-gray-400 dark:text-zinc-600 font-bold text-lg'
                            }`}
                    >
                        {option}{unit && value === option ? unit : ''}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WheelPicker;
