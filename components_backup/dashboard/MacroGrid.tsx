import React from 'react';
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
        <div className="flex flex-col md:grid md:grid-cols-3 gap-3 md:gap-6">
            <MacroCard
                label="Prot"
                value={formatValue(protein)}
                unit="g"
                fullLabel="Proteínas"
                goal={user.dailyProtein}
                color="emerald"
            />
            <MacroCard
                label="Carb"
                value={formatValue(carbs)}
                unit="g"
                fullLabel="Carboidratos"
                goal={user.dailyCarbs}
                color="blue"
            />
            <MacroCard
                label="Gord"
                value={formatValue(fat)}
                unit="g"
                fullLabel="Gorduras"
                goal={user.dailyFat}
                color="yellow"
            />
        </div>
    );
};

export default MacroGrid;
