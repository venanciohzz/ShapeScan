import React from 'react';
import { motion } from 'framer-motion';
import MacroCard from './MacroCard';

interface UserMacros {
    dailyProtein?: number;
    dailyCarbs?: number;
    dailyFat?: number;
}

interface MacroGridProps {
    protein: number;
    carbs: number;
    fat: number;
    user: UserMacros;
    formatValue: (val: number) => number;
}

const MacroGrid: React.FC<MacroGridProps> = ({ protein, carbs, fat, user, formatValue }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="grid grid-cols-3 gap-3"
        >
            <MacroCard
                label="Prot"
                value={formatValue(protein)}
                unit="g"
                fullLabel="Proteína"
                goal={user.dailyProtein}
                color="emerald"
            />
            <MacroCard
                label="Carb"
                value={formatValue(carbs)}
                unit="g"
                fullLabel="Carbs"
                goal={user.dailyCarbs}
                color="blue"
            />
            <MacroCard
                label="Gord"
                value={formatValue(fat)}
                unit="g"
                fullLabel="Gordura"
                goal={user.dailyFat}
                color="yellow"
            />
        </motion.div>
    );
};

export default MacroGrid;
