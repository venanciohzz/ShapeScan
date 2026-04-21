import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ScanLine, UserSquare2, TrendingUp, MessageSquare, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavigationProps {
  currentView: string;
}

const Navigation: React.FC<NavigationProps> = ({ currentView }) => {
  const tabs = [
    { id: 'dashboard', path: '/dashboard', label: 'Início', icon: <Home className="w-5 h-5" /> },
    { id: 'analise-refeicao', path: '/analise-refeicao', label: 'Refeição', icon: <ScanLine className="w-5 h-5" /> },
    { id: 'analise-fisica', path: '/analise-fisica', label: 'Shape', icon: <UserSquare2 className="w-5 h-5" /> },
    { id: 'evolucao', path: '/evolucao', label: 'Evolução', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'personal-24h', path: '/personal-24h', label: 'Personal 24H', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'perfil', path: '/perfil', label: 'Perfil', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation - Floating Island Design */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 px-3 pb-3 pt-0">
        <div className="bg-zinc-950 px-1 py-2 rounded-[1.5rem] flex justify-between items-center shadow-[0_-4px_30px_rgba(0,0,0,0.4)] border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-50 pointer-events-none"></div>

          {tabs.map((tab) => {
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={({ isActive }) => `
                  relative flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 min-w-0 flex-1 transition-all duration-300 active:scale-90
                `}
              >
                {({ isActive }) => (
                  <>
                    <div className={`
                        relative z-10 transition-all duration-500 flex items-center justify-center
                        ${isActive ? 'text-white scale-110' : 'text-zinc-500 hover:text-zinc-300'}
                      `}>
                      {tab.icon}
                    </div>
                    <span className={`relative z-10 text-[9px] font-black uppercase tracking-tight leading-none truncate transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                      {tab.label === 'Personal 24H' ? 'Personal' : tab.label}
                    </span>

                    {isActive && (
                      <motion.div
                        layoutId="activeTabMobile"
                        className="absolute inset-0 bg-emerald-500/20 rounded-2xl z-0"
                        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Desktop Top Navigation - Premium Top Bar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 px-10 py-6 justify-between items-center pointer-events-none">
        <div className="pointer-events-auto bg-zinc-950/80 backdrop-blur-2xl px-8 py-4 rounded-full flex items-center gap-4 shadow-2xl border border-white/10 group">
          <div className="relative">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-serif-premium font-bold italic rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-lg">S</div>
          </div>
          <span className="font-serif-premium font-bold text-2xl tracking-tight text-white group-hover:tracking-widest transition-all duration-500">ShapeScan</span>
        </div>

        <div className="pointer-events-auto bg-zinc-950/80 backdrop-blur-2xl px-3 py-3 rounded-full flex items-center gap-1 shadow-2xl border border-white/10">
          {tabs.map((tab) => {
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={({ isActive }) => `relative px-6 py-3 rounded-full flex items-center gap-3 transition-all duration-500 active:scale-95 group overflow-hidden`}
              >
                {({ isActive }) => (
                  <>
                    <div className={`relative z-10 flex items-center gap-2 ${isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-white'}`}>
                      <div className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{tab.icon}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                    </div>

                    {isActive && (
                      <motion.div
                        layoutId="activeTabDesktop"
                        className="absolute inset-0 bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)] z-0 rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default React.memo(Navigation);
