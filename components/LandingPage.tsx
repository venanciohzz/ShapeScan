import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Star, Play } from 'lucide-react';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/400.css';
import { motion, useScroll, useTransform, AnimatePresence, Variants } from 'framer-motion';
import { LiquidShaderBackground } from './ui/LiquidShaderBackground';
import { NeonFlow } from './ui/NeonFlow';
import SimulatedAnalysisModal from './landing/SimulatedAnalysisModal';
import { useIsMobile } from '../src/utils/useIsMobile';

// --- Utility Components for God Mode UI ---

const LetterPuller = React.memo(({ text, className = "", delay = 0, isMobile = false }: { text: string; className?: string; delay?: number; isMobile?: boolean }) => {
  // Mobile: texto simples, sem framer-motion por letra (JS thread livre)
  if (isMobile) {
    return <span className={`inline ${className}`}>{text}</span>;
  }

  const words = text.split(" ");
  let letterCounter = 0;

  const container = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: delay,
      },
    },
  };

  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      } as any,
    },
    hidden: {
      opacity: 0,
      y: 8,
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      style={{ display: 'inline', whiteSpace: 'normal' }}
    >
      {words.map((word, wordIndex) => {
        const letters = Array.from(word);
        return (
          <span
            key={wordIndex}
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              position: 'relative'
            }}
          >
            {letters.map((letter, charIndex) => {
              const globalIndex = letterCounter++;
              return (
                <motion.span
                  key={charIndex}
                  variants={child}
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    verticalAlign: 'baseline',
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  <motion.span
                    className={`${className} animate-smooth-float`}
                    style={{
                      display: 'inline-block',
                      padding: '0.35em',
                      margin: '-0.35em',
                      WebkitBoxDecorationBreak: 'clone',
                      overflow: 'visible',
                      animationDelay: `${globalIndex * 0.1}s`,
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {letter}
                  </motion.span>
                </motion.span>
              );
            })}
            {wordIndex < words.length - 1 && <span style={{ display: 'inline-block', width: '0.25em' }}>&nbsp;</span>}
          </span>
        );
      })}
    </motion.span>
  );
});

LetterPuller.displayName = 'LetterPuller';

interface LandingPageProps {
  onStart: () => void; // Register
  onLogin: () => void;
  onHowItWorks: () => void;
  onAbout: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin, onHowItWorks, onAbout }) => {
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [modalAnalysisType, setModalAnalysisType] = useState<'body' | 'food'>('body');

  const openModal = (type: 'body' | 'food') => {
    setModalAnalysisType(type);
    setShowSimModal(true);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bloqueia o scroll quando o menu mobile está aberto
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleMobileNav = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <div className="bg-zinc-950 min-h-screen text-white overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-white w-full">

      {/* Modal de Pré-Análise Simulada */}
      <AnimatePresence>
        {showSimModal && (
          <SimulatedAnalysisModal
            type={modalAnalysisType}
            onClose={() => setShowSimModal(false)}
            onSignup={() => { setShowSimModal(false); onStart(); }}
          />
        )}
      </AnimatePresence>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-flare { animation: glow-pulse 8s ease-in-out infinite; }
        .animate-float  { animation: float 6s ease-in-out infinite; }

        @keyframes smooth-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-smooth-float {
          animation: smooth-float 4s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan { animation: scan 3s linear infinite; }

        @keyframes sweep {
          0% { left: -100%; top: -100%; }
          50% { left: 100%; top: 100%; }
          100% { left: 100%; top: 100%; }
        }
        .animate-sweep { animation: sweep 2.5s ease-in-out infinite; }

        /* Typography overrides for Premium V2 */
        .font-serif-premium {
          font-family: 'Playfair Display', serif;
          letter-spacing: -0.02em;
        }
        .glass-nav {
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Mobile: desabilita todas as animações decorativas */
        @media (max-width: 768px) {
          .animate-flare, .animate-float, .animate-smooth-float,
          .animate-scan, .animate-sweep { animation: none !important; }
          .glass-nav {
            background: rgba(5, 5, 5, 0.97) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-0 bg-[#020202] overflow-hidden pointer-events-none">
        {/* WebGL desabilitado em mobile — causa heating/travamento */}
        {!isMobile && <LiquidShaderBackground />}
        {!isMobile && <NeonFlow className="opacity-60" />}

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]" />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/40 to-[#020202]" />
      </div>

      {/* Navbar V3 - Ultra Premium Floating Pill */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 flex justify-center ${scrolled ? 'pt-4 sm:pt-6 px-4' : 'pt-8 px-6'}`}
      >
        <div className={`w-full transition-all duration-700 flex items-center justify-between ${scrolled
          ? 'max-w-5xl bg-zinc-950/70 backdrop-blur-2xl border border-white/10 rounded-full px-4 sm:px-6 py-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.1)]'
          : 'max-w-7xl bg-transparent px-2 py-2'
          }`}>

          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer z-50" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative flex items-center justify-center w-10 h-10">
              <div className="relative w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 overflow-hidden">
                <span className="text-white font-black text-sm font-serif-premium tracking-tighter relative z-10">S</span>
              </div>
            </div>
            <span className="font-serif-premium font-bold text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors duration-300 leading-none">
              ShapeScan<span className="text-emerald-500">.</span>
            </span>
          </div>

          {/* Nav Links - Desktop (Centered) */}
          <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <button onClick={onHowItWorks} className="px-5 py-2 rounded-full text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-300">Como funciona?</button>
            <button onClick={onAbout} className="px-5 py-2 rounded-full text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-300">Quem somos?</button>
          </div>

          {/* Action Button - Premium (Always Visible) */}
          <div className="flex items-center gap-2 sm:gap-4 relative z-50">
            <button
              onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-full border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-zinc-300 hover:text-white transition-all active:scale-95 group"
            >
              <div className="w-4 h-4 rounded-full bg-white/10 group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                <svg className="w-2.5 h-2.5 text-zinc-400 group-hover:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em]">Entrar</span>
            </button>
            <div className="w-[1px] h-4 bg-white/10 hidden sm:block"></div>
            <button
              onClick={onStart}
              className="hidden sm:flex group relative px-4 sm:px-6 py-2 sm:py-2.5 rounded-full overflow-hidden items-center gap-2 sm:gap-3 font-black tracking-[0.2em] uppercase transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] border border-white/10 hover:border-emerald-500/50 bg-zinc-950"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 -left-[100%] w-[150%] h-[200%] bg-gradient-to-br from-transparent via-emerald-500/10 to-transparent rotate-45 animate-sweep"></div>
              <span className="relative z-10 text-[10px] text-white group-hover:text-emerald-50 transition-colors">Começar Agora</span>
              <div className="relative z-10 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50 text-emerald-500 transition-all shadow-sm">
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
              </div>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden z-50 relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors ml-1"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <div className="w-4 h-3 flex flex-col justify-between items-end">
                <span className={`h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? 'w-4 rotate-45 translate-y-1.5' : 'w-4'}`} />
                <span className={`h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'w-3'}`} />
                <span className={`h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? 'w-4 -rotate-45 -translate-y-1' : 'w-2'}`} />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Full Screen Menu Overlay V2 */}
      <div className={`fixed inset-0 bg-zinc-950/98 backdrop-blur-3xl z-[60] flex flex-col items-center justify-center transition-all duration-500 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <button
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-8 right-8 p-3 w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-full text-white transition-colors"
          aria-label="Fechar Menu"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="flex flex-col gap-10 text-center w-full px-8 max-sm">
          <button onClick={() => handleMobileNav(onHowItWorks)} className="text-4xl font-serif-premium font-medium text-white hover:text-emerald-400 transition-colors">Como funciona?</button>
          <button onClick={() => handleMobileNav(onAbout)} className="text-4xl font-serif-premium font-medium text-white hover:text-emerald-400 transition-colors">Quem somos?</button>
        </div>
      </div>

      {/* Hero Section V2 - Omi Premium Style with Framer Motion */}
      <section className="relative pt-40 pb-24 lg:pt-36 lg:pb-20 px-6 max-w-7xl mx-auto z-10 w-full min-h-screen flex flex-col justify-center items-center text-center">

        {/* Glow Element Behind Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-4xl h-[400px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none z-0" />

        <div className="w-full max-w-5xl mx-auto relative z-20">
          <div className="flex flex-col items-center space-y-8 pt-8 relative z-30">

            <h1 className="flex flex-col items-center text-[clamp(1.6rem,6.5vw,3.75rem)] lg:text-6xl font-serif-premium tracking-tight text-white leading-[1.1] sm:leading-[1.1] drop-shadow-2xl px-4 z-20 overflow-visible text-balance">
              <span className="block w-full">
                <LetterPuller text="Descubra seu % de gordura" isMobile={isMobile} />
              </span>
              <span className="block w-full">
                <LetterPuller
                  text="por foto em segundos."
                  className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 italic font-medium drop-shadow-[0_0_30px_rgba(52,211,153,0.4)]"
                  delay={0.5}
                  isMobile={isMobile}
                />
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="text-lg sm:text-xl lg:text-2xl text-zinc-300 font-medium max-w-3xl mx-auto leading-relaxed px-4 z-20 text-pretty"
            >
              Analise seu físico ou suas refeições com inteligência artificial e acompanhe sua evolução de forma simples, rápida e sem esforço.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center gap-3 pt-8"
            >
              {/* CTA primário → cadastro direto */}
              <button
                onClick={onStart}
                className="group relative px-8 py-4 rounded-full overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 bg-emerald-500 text-zinc-950 font-black tracking-[0.15em] text-sm uppercase shadow-[0_0_35px_-5px_rgba(16,185,129,0.5)] hover:shadow-[0_0_55px_-5px_rgba(16,185,129,0.7)] w-full sm:w-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 -left-[100%] w-[150%] h-[200%] bg-gradient-to-br from-transparent via-white/40 to-transparent rotate-45 animate-sweep" />
                <span className="relative z-10">Começar agora</span>
                <div className="relative z-10 w-7 h-7 rounded-full bg-zinc-950/20 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-950 group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
                </div>
              </button>

              {/* CTA secundário → modal */}
              <button
                onClick={() => openModal('body')}
                className="group flex items-center gap-2.5 px-6 py-4 rounded-full border border-white/10 hover:border-emerald-500/40 bg-white/[0.03] hover:bg-emerald-500/8 transition-all duration-300 text-zinc-300 hover:text-white font-bold text-sm w-full sm:w-auto justify-center"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                Testar minha análise
              </button>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Main Container Wrapper */}
      <div className="relative w-full overflow-hidden">
        {/* Feature 1: Food Scan */}
        <motion.section
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="py-20 lg:py-32 px-6 relative overflow-hidden bg-transparent"
        >
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              whileHover={isMobile ? undefined : { rotateY: 5, rotateX: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-white/[0.01] group flex flex-col hover:border-emerald-500/50 transition-colors duration-500"
            >
              <div className="relative h-64 sm:h-72 overflow-hidden bg-transparent flex items-center justify-center">
                <img
                  src="/feijoada.jpg"
                  alt="Análise de Refeição"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80"
                />
                {!isMobile && (
                  <motion.div
                    initial={{ top: "0%", opacity: 0 }}
                    animate={{ top: ["5%", "95%", "5%"], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-x-8 h-[2px] bg-emerald-400 shadow-[0_0_25px_rgba(52,211,153,1)] z-10"
                  />
                )}
              </div>

              <div className="p-6 sm:p-8 bg-transparent border-t border-white/10 relative z-10">
                <div className="flex justify-between items-end mb-6">
                  <div className="flex-1">
                    <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-1">Detectado</p>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2">Prato Feito: Feijoada</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-400 font-medium">
                      <span className="bg-white/5 px-2 py-1 rounded-md border border-white/10 text-emerald-400 backdrop-blur-md">150g Feijoada</span>
                      <span className="bg-white/5 px-2 py-1 rounded-md border border-white/10 text-emerald-400 backdrop-blur-md">200g Arroz</span>
                      <span className="bg-white/5 px-2 py-1 rounded-md border border-white/10 text-emerald-400 backdrop-blur-md">50g Farofa</span>
                      <span className="bg-white/5 px-2 py-1 rounded-md border border-white/10 text-emerald-400 backdrop-blur-md">Couve Fresca</span>
                    </div>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">98% Precisão</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <MacroPill label="Proteína" value="38g" color="bg-emerald-500" />
                  <MacroPill label="Carbo" value="92g" color="bg-blue-500" />
                  <MacroPill label="Gordura" value="26g" color="bg-yellow-500" />
                </div>
              </div>
            </motion.div>


            <div className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-premium font-bold tracking-tighter text-white mb-6 leading-tight">
                <LetterPuller text="Sua alimentação," /> <br />
                <LetterPuller text="analisada em segundos." className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 drop-shadow-[0_0_30px_rgba(52,211,153,0.4)] italic pb-2" delay={0.3} />
              </h2>
              <p className="text-lg text-zinc-400 font-medium mb-8 leading-relaxed max-w-xl">
                Esqueça planilhas e aplicativos complicados. Envie uma foto da refeição e receba uma análise completa com estimativa de calorias, macros e composição nutricional.
              </p>
              <ul className="space-y-5">
                <FeatureList text="Identificação automática dos alimentos" />
                <FeatureList text="Cálculo estimado de porções e macros" />
                <FeatureList text="Integração com seu histórico de evolução" />
              </ul>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => openModal('food')}
                className="mt-8 group flex items-center gap-3 px-7 py-3.5 rounded-full bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300 text-white font-black text-xs uppercase tracking-widest"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Analisar minha refeição agora
                <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* Feature 2: Visual Bioimpedance */}
        <motion.section
          initial={{ opacity: 0, scale: 0.98, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="py-20 lg:py-32 px-6 bg-transparent relative"
        >
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif-premium font-bold tracking-tighter text-white mb-6 leading-tight">
                <LetterPuller text="Bioimpedância" /> <br />
                <LetterPuller text="Visual." className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 drop-shadow-[0_0_30px_rgba(52,211,153,0.4)] italic pb-2" delay={0.3} />
              </h2>
              <p className="text-lg text-zinc-400 font-medium mb-10 leading-relaxed max-w-xl">
                Esqueça o "olhômetro". Nossa tecnologia analisa proporções, simetria muscular e estima seu percentual de gordura através de comparação avançada com milhares de físicos.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
                  <p className="text-2xl font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">95%</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Precisão comparativa estimada</p>
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
                  <p className="text-2xl font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">&lt; 10s</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Tempo médio de análise</p>
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
                  <p className="text-sm font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">Análise Automática</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Simetria e proporções musculares</p>
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
                  <p className="text-sm font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">Disponível 24/7</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Acesso contínuo ao seu acompanhamento</p>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => openModal('body')}
                className="mt-8 group flex items-center gap-3 px-7 py-3.5 rounded-full bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300 text-white font-black text-xs uppercase tracking-widest"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Analisar meu físico agora
                <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
              </motion.button>
            </div>

            <div className="order-1 lg:order-2 relative group h-[550px] sm:h-[650px]">
              <div className="relative z-10 w-full h-full p-2 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-2xl backdrop-blur-sm overflow-hidden flex items-center justify-center">

                {/* Area da Imagem Restrita (Area de Scan) */}
                <div className="relative w-[96%] h-[96%] overflow-hidden rounded-3xl bg-zinc-950">
                  {/* Imagem "Antes" (Fundo Fixo) */}
                  <img
                    src="/before.png"
                    alt="Antes"
                    className="absolute inset-0 w-full h-full object-cover scale-105"
                  />

                  {/* Imagem "Depois" (Revelada) */}
                  <motion.div
                    initial={{ clipPath: 'inset(0 100% 0 0)' }}
                    animate={{ clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)', 'inset(0 100% 0 0)'] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 z-10"
                  >
                    <img
                      src="/after.png"
                      alt="Depois"
                      className="w-full h-full object-cover scale-105"
                    />
                  </motion.div>

                  {/* Linha de Varredura (Sincronização Absoluta) */}
                  <motion.div
                    initial={{ left: "0%" }}
                    animate={{ left: ["0%", "100%", "0%"] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 shadow-[0_0_50px_rgba(52,211,153,1)] z-20"
                  />
                </div>
              </div>

              {/* Floating Badge (BF Data) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -right-6 top-1/2 -translate-y-1/2 glass-panel p-4 rounded-2xl border-l-4 border-emerald-500 z-40 shadow-2xl hidden md:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Análise de Evolução</p>
                    <p className="text-lg font-black text-white">-8.5% Gordura</p>
                  </div>
                </div>
              </motion.div>


            </div>
          </div>
        </motion.section>

        {/* Testimonials Section */}
        <motion.section
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="py-20 lg:py-32 px-6 relative bg-transparent"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 lg:mb-24">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif-premium font-bold tracking-tighter text-white mb-6">
                <LetterPuller text="Resultados" /> <LetterPuller text="Reais." className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 italic" delay={0.3} />
              </h2>
              <p className="text-lg lg:text-xl text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
                Junte-se a milhares de usuários que já transformaram seus físicos com a inteligência do ShapeScan.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}>
                <TestimonialCard
                  name="Gabriel Costa"
                  role="Atleta Natural"
                  image="https://randomuser.me/api/portraits/men/32.jpg"
                  text="Perdi 6kg em 7 semanas sem pesar comida. Só foto, análise e ajuste. O scanner de refeições mudou completamente minha relação com a dieta."
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.3 }}>
                <TestimonialCard
                  name="Fernanda Lima"
                  role="Personal Trainer"
                  image="https://randomuser.me/api/portraits/women/44.jpg"
                  text="Uso com todos os meus alunos. A análise de shape identificou assimetrias que eu não vinha percebendo. Em 2 meses, 3 alunos bateram seu melhor shape."
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.5 }}>
                <TestimonialCard
                  name="Lucas Martins"
                  role="Iniciante"
                  image="https://randomuser.me/api/portraits/men/86.jpg"
                  text="Baixei de 28% para 21% de gordura em 3 meses. A análise por foto me mostrou exatamente onde eu estava e o que precisava mudar."
                />
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Footer CTA */}
        <motion.section
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="py-24 px-6 relative overflow-hidden text-center bg-transparent"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900 via-zinc-900/50 to-transparent pointer-events-none" />
          <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-serif-premium font-bold tracking-tighter mb-8 text-white leading-tight drop-shadow-2xl">
              <LetterPuller text="Sua melhor versão" /> <br />
              <LetterPuller text="começa agora." className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 italic" delay={0.3} />
            </h2>
            <p className="text-zinc-400 text-lg lg:text-xl mb-12 font-medium">
              Descubra seu percentual de gordura em segundos. Sem cartão para começar.
            </p>
            <button
              onClick={onStart}
              className="group relative px-8 py-4 sm:px-12 sm:py-5 rounded-full overflow-hidden font-black tracking-[0.15em] text-base md:text-lg uppercase transition-all duration-500 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 shadow-[0_0_40px_-5px_rgba(16,185,129,0.4)] mx-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
            >
              <div className="absolute top-0 -left-[100%] w-[150%] h-[200%] bg-gradient-to-br from-transparent via-white/30 to-transparent rotate-45 animate-sweep"></div>
              <span className="relative z-10">Criar minha conta agora</span>
              <div className="relative z-10 w-8 h-8 rounded-full bg-zinc-950/20 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-zinc-950 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={3} />
              </div>
            </button>

            <div className="mt-16 flex flex-col md:flex-row justify-center items-center gap-8 text-xs font-black uppercase tracking-widest">
              <button onClick={onHowItWorks} className="text-zinc-300 hover:text-white transition-colors border-b-2 border-transparent hover:border-emerald-500 pb-1">Como funciona?</button>
              <button onClick={onAbout} className="text-zinc-300 hover:text-white transition-colors border-b-2 border-transparent hover:border-emerald-500 pb-1">Quem somos?</button>
              <span className="hidden md:inline text-zinc-700">•</span>
              <span className="text-emerald-600">ShapeScan © 2026</span>
            </div>
          </div>
        </motion.section>
      </div>  {/* Closing of main wrapper */}
    </div>
  );
};

// Subcomponents for cleaner code
const FeatureList = ({ text }: { text: string }) => (
  <li className="flex items-center gap-3 text-zinc-300 font-medium group">
    <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity" />
    {text}
  </li>
);

const MacroPill = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className="bg-zinc-950 p-2 rounded-xl text-center border border-white/5">
    <div className={`w-full h-1 ${color} rounded-full mb-2 opacity-80`} />
    <p className="text-[10px] text-zinc-400 uppercase font-bold">{label}</p>
    <p className="text-white font-bold text-sm">{value}</p>
  </div>
);

const StatCard = ({ value, label }: { value: string, label: string }) => (
  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
    <p className="text-2xl font-black text-white mb-1">{value}</p>
    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wide">{label}</p>
  </div>
);

const TestimonialCard = ({ name, role, image, text }: { name: string, role: string, image: string, text: string }) => (
  <div className="bg-zinc-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-emerald-500/30 shadow-xl transition-all duration-300 relative group glow-hover">
    <div className="absolute top-8 right-8 text-emerald-500 text-4xl opacity-20 font-serif">"</div>
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/20">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      <div>
        <p className="text-white font-bold text-lg leading-none mb-1">{name}</p>
        <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest">{role}</p>
      </div>
    </div>
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className="w-4 h-4 text-emerald-500 fill-emerald-500" />
      ))}
    </div>
    <p className="text-zinc-400 font-medium leading-relaxed group-hover:text-zinc-300 transition-colors">
      {text}
    </p>
  </div>
);

export default LandingPage;
