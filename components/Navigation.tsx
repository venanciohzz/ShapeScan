import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ScanLine, UserSquare2, TrendingUp, MessageSquare, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavigationProps {
  currentView: string;
}

const Navigation: React.FC<NavigationProps> = ({ currentView }) => {
  const tabs = [
    { id: 'dashboard',    path: '/dashboard',    label: 'Início',    icon: Home },
    { id: 'analise-refeicao', path: '/analise-refeicao', label: 'Refeição', icon: ScanLine },
    { id: 'analise-fisica',   path: '/analise-fisica',   label: 'Shape',   icon: UserSquare2 },
    { id: 'evolucao',     path: '/evolucao',     label: 'Evolução',  icon: TrendingUp },
    { id: 'personal-24h', path: '/personal-24h', label: 'Personal',  icon: MessageSquare },
    { id: 'perfil',       path: '/perfil',       label: 'Perfil',    icon: Settings },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm md:hidden z-50">
        <div className="bg-zinc-950/85 backdrop-blur-3xl px-3 py-2.5 rounded-[2rem] flex justify-between items-center shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/8 relative overflow-hidden">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none rounded-[2rem]" />

          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className="relative flex flex-col items-center justify-center flex-1 py-1.5 active:scale-90 transition-transform"
              >
                {({ isActive }) => (
                  <>
                    {/* Active pill background */}
                    {isActive && (
                      <motion.div
                        layoutId="mobileActivePill"
                        className="absolute inset-x-1 inset-y-0 bg-white/8 rounded-[1.2rem]"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                      />
                    )}

                    <div className={`relative z-10 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-zinc-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, y: -2 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -2 }}
                          className="relative z-10 text-[8px] font-black text-white uppercase tracking-wider mt-0.5"
                        >
                          {tab.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Active dot */}
                    {isActive && (
                      <motion.div
                        layoutId="mobileActiveDot"
                        className="absolute -bottom-0.5 w-1 h-1 bg-emerald-500 rounded-full"
                        transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 px-8 py-5 justify-between items-center pointer-events-none">
        {/* Logo */}
        <div className="pointer-events-auto bg-zinc-950/80 backdrop-blur-2xl px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/8 group">
          <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center font-serif-premium font-bold italic text-white text-sm rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-md">S</div>
          <span className="font-serif-premium font-bold text-xl tracking-tight text-white">ShapeScan</span>
        </div>

        {/* Tab bar */}
        <div className="pointer-events-auto bg-zinc-950/80 backdrop-blur-2xl px-2 py-2 rounded-2xl flex items-center gap-1 shadow-2xl border border-white/8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className="relative px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 group overflow-hidden"
              >
                {({ isActive }) => (
                  <>
                    <div className={`relative z-10 flex items-center gap-2 transition-all duration-300 ${isActive ? 'text-zinc-950' : 'text-zinc-500 group-hover:text-white'}`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                    </div>

                    {isActive && (
                      <motion.div
                        layoutId="desktopActivePill"
                        className="absolute inset-0 bg-white rounded-xl z-0"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
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
