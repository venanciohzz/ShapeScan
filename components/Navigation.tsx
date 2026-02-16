
import React from 'react';
import { View } from '../types';

interface NavigationProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: '🏠' },
    { id: 'food_ai', label: 'Scanner', icon: '🍽️' },
    { id: 'shape', label: 'Shape', icon: '🧍' },
    { id: 'evolution', label: 'Evolução', icon: '📈' },
    { id: 'chat', label: 'Coach', icon: '💬' },
    { id: 'settings', label: 'Perfil', icon: '⚙️' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation - Redesigned for Safety */}
      <nav className="fixed bottom-6 left-4 right-4 md:hidden z-50">
        <div className="glass-panel rounded-[2rem] px-2 py-3 flex justify-between items-center shadow-2xl border border-white/20 backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90">
          {tabs.map((tab) => {
             const isActive = (currentView === tab.id || (tab.id === 'food_ai' && currentView === 'food_manual'));
             return (
               <button
                 key={tab.id}
                 onClick={() => onNavigate(tab.id as View)}
                 className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 relative group`}
               >
                 <div className={`
                    relative z-10 w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-300
                    ${isActive 
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 scale-105 shadow-sm' 
                        : 'text-gray-400 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }
                 `}>
                    {tab.icon}
                 </div>
                 
                 {/* Active Dot Indicator */}
                 <div className={`h-1 w-1 rounded-full bg-emerald-500 transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
               </button>
             )
          })}
        </div>
      </nav>

      {/* Desktop Top Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 px-6 py-4 justify-between items-center pointer-events-none">
        <div className="pointer-events-auto glass-panel px-6 py-3 rounded-full flex items-center gap-2 shadow-lg">
           <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center text-white font-black text-xs italic">S</div>
           <span className="font-black text-lg tracking-tight text-gray-900 dark:text-white">ShapeScan</span>
        </div>

        <div className="pointer-events-auto glass-panel px-2 py-2 rounded-full flex items-center gap-1 shadow-lg">
          {tabs.map((tab) => {
            const isActive = (currentView === tab.id || (tab.id === 'food_ai' && currentView === 'food_manual'));
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id as View)}
                className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 active:scale-95 ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-gray-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navigation;
