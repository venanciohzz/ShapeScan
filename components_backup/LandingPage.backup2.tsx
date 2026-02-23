
import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  onStart: () => void; // Register
  onLogin: () => void; // Login
  onHowItWorks: () => void;
  onAbout: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin, onHowItWorks, onAbout }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; box-shadow: 0 0 15px #10b981; }
          90% { opacity: 1; box-shadow: 0 0 15px #10b981; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px -5px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 0 40px -5px rgba(16, 185, 129, 0.6); }
        }
        .glass-panel {
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .animate-blob { animation: blob 10s infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-scan { animation: scan-line 2.5s linear infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s infinite; }
        
        .grid-bg {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
      `}</style>

      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[100px] animate-blob delay-2000" />
      </div>

      {/* Navbar - Dynamic Island Style */}
      <nav
        className={`fixed z-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex justify-between items-center left-1/2 -translate-x-1/2
          ${scrolled
            ? 'top-2 w-[95%] md:top-6 md:w-full md:max-w-7xl rounded-2xl bg-[#0a0a0ab3] backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] py-3 px-6 md:px-8'
            : 'top-0 w-full max-w-none rounded-none bg-transparent py-6 px-6 md:px-8 border-transparent'
          }
        `}
      >
        <div className={`flex justify-between items-center w-full ${scrolled ? '' : 'max-w-7xl mx-auto'}`}>
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-sm italic transform group-hover:rotate-12 transition-transform shadow-lg shadow-emerald-500/20">S</div>
            <span className="font-bold text-xl tracking-tight text-white">ShapeScan</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors" onClick={onHowItWorks}>Como funciona?</button>
            <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors" onClick={onAbout}>Quem somos?</button>
            <button
              onClick={onLogin}
              className="bg-white text-zinc-950 px-5 py-2 rounded-full font-bold text-sm hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
            >
              Entrar
            </button>
          </div>

          {/* Mobile Navigation Toggle (Hamburger) */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={onLogin}
              className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all shadow-lg ${scrolled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-zinc-950 hover:bg-emerald-400'}`}
            >
              Entrar
            </button>
            <button
              onClick={toggleMenu}
              className="text-white p-2 focus:outline-none relative w-8 h-8 flex flex-col justify-center items-center gap-1.5"
              aria-label="Menu"
            >
              <span className="block w-6 h-0.5 bg-white rounded-full"></span>
              <span className="block w-6 h-0.5 bg-white rounded-full"></span>
              <span className="block w-6 h-0.5 bg-white rounded-full"></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Full Screen Menu Overlay */}
      <div className={`fixed inset-0 bg-zinc-950 z-[60] flex flex-col items-center justify-center transition-all duration-300 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-600/20 rounded-full blur-[100px]"></div>

        <button
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"
          aria-label="Fechar Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="flex flex-col gap-8 text-center relative z-10 w-full px-8 max-w-md">
          <button
            onClick={() => handleMobileNav(onHowItWorks)}
            className="text-3xl font-black text-white hover:text-emerald-400 transition-colors tracking-tight py-4 border-b border-white/5 w-full flex items-center justify-between group"
          >
            <span>Como funciona?</span>
            <span className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity text-xl">→</span>
          </button>
          <button
            onClick={() => handleMobileNav(onAbout)}
            className="text-3xl font-black text-white hover:text-emerald-400 transition-colors tracking-tight py-4 border-b border-white/5 w-full flex items-center justify-between group"
          >
            <span>Quem somos?</span>
            <span className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity text-xl">→</span>
          </button>

          <div className="h-4"></div>

          <button
            onClick={() => handleMobileNav(onLogin)}
            className="bg-emerald-600 text-white w-full py-5 rounded-2xl font-black text-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            Fazer Login
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-48 lg:pb-32 px-6 max-w-7xl mx-auto z-10 w-full overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6 lg:space-y-8 relative z-20">

            <h1 className="text-4xl leading-[1.1] sm:text-5xl lg:text-7xl font-black tracking-tighter text-white sm:leading-[1.1]">
              O Futuro da sua <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Evolução Física.</span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 font-medium max-w-md leading-relaxed">
              Transforme fotos em dados. Nutrição precisa e análise corporal via processamento avançado para quem busca resultados reais.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={onStart}
                className="bg-emerald-600 text-white px-8 py-4 lg:px-10 lg:py-5 rounded-2xl font-black text-lg lg:text-xl hover:bg-emerald-500 transition-all shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_50px_-10px_rgba(16,185,129,0.6)] hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
              >
                Começar Agora
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </button>
            </div>
          </div>

          {/* Hero Visual - Premium Dashboard Mockup */}
          <div className="relative group lg:perspective-[2000px] z-10 max-w-full mx-auto lg:max-w-none px-0 sm:px-0">
            {/* Glow Behind */}
            <div className="absolute inset-0 bg-emerald-500/20 rounded-[3rem] blur-[80px] animate-pulse-glow" />

            {/* Main Interface Card - Minimized rotation on mobile to fix overflow */}
            <div className="relative bg-zinc-900 border border-white/10 rounded-[2.5rem] p-2 shadow-2xl animate-float transform transition-transform duration-700 ease-out rotate-0 lg:rotate-y-[-5deg] lg:rotate-x-[5deg] group-hover:rotate-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent rounded-[2.5rem] pointer-events-none" />

              {/* Screen Content */}
              <div className="bg-zinc-950 rounded-[2rem] overflow-hidden relative flex flex-col p-4 sm:p-6 h-auto min-h-[400px] sm:min-h-[500px]">

                {/* Header Mockup */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-white/5">👤</div>
                    <div className="flex flex-col justify-center gap-1.5">
                      <div className="w-24 h-2.5 bg-zinc-800 rounded-full"></div>
                      <div className="w-16 h-2 bg-zinc-800/50 rounded-full"></div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-800/50 border border-white/5"></div>
                </div>

                {/* GREEN CARD */}
                <div className="bg-zinc-900 rounded-3xl p-6 shadow-lg shadow-emerald-500/20 mb-6 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 border border-emerald-500">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Meta Diária</p>
                      <span className="text-white font-black text-2xl">36%</span>
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-5">
                      <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter">710</span>
                      <span className="text-zinc-500 font-bold text-sm tracking-wide">/ 2000 kcal</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden backdrop-blur-sm border border-emerald-500/20">
                      <div className="bg-emerald-500 h-full w-[36%] rounded-full shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>
                    </div>
                  </div>
                </div>

                {/* MACROS */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 pb-8">
                  {/* Protein */}
                  <div className="bg-zinc-900 rounded-2xl p-3 sm:p-4 flex flex-col items-center shadow-md relative overflow-hidden border border-emerald-500">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-[3px] sm:border-[4px] border-emerald-500 flex items-center justify-center mb-2 shadow-inner bg-emerald-500/10">
                      <span className="text-white font-black text-xs sm:text-sm">58.5</span>
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-wider mb-0.5">Proteínas</p>
                    <p className="text-emerald-500 font-black text-[10px] sm:text-xs">g</p>
                  </div>
                  {/* Carbs */}
                  <div className="bg-zinc-900 rounded-2xl p-3 sm:p-4 flex flex-col items-center shadow-md relative overflow-hidden border border-emerald-500">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-[3px] sm:border-[4px] border-emerald-500 flex items-center justify-center mb-2 shadow-inner bg-emerald-500/10">
                      <span className="text-white font-black text-xs sm:text-sm">89</span>
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-wider mb-0.5">Carbo</p>
                    <p className="text-emerald-500 font-black text-[10px] sm:text-xs">g</p>
                  </div>
                  {/* Fat */}
                  <div className="bg-zinc-900 rounded-2xl p-3 sm:p-4 flex flex-col items-center shadow-md relative overflow-hidden border border-emerald-500">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-[3px] sm:border-[4px] border-emerald-500 flex items-center justify-center mb-2 shadow-inner bg-emerald-500/10">
                      <span className="text-white font-black text-xs sm:text-sm">11.1</span>
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-wider mb-0.5">Gorduras</p>
                    <p className="text-emerald-500 font-black text-[10px] sm:text-xs">g</p>
                  </div>
                </div>

                {/* Floating Notification */}
                <div className="absolute bottom-6 left-6 right-6 glass-panel p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-1000 border-l-4 border-emerald-500 shadow-xl">
                  <div className="h-8 w-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 shrink-0">🔥</div>
                  <div>
                    <p className="text-[9px] text-zinc-400 uppercase font-bold">Status</p>
                    <p className="text-xs font-bold text-white">Faltam 1290 kcal</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Food Scan */}
      <section className="py-20 lg:py-32 px-6 relative overflow-hidden bg-black/30 backdrop-blur-sm border-t border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          <div className="order-2 lg:order-1 relative">
            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 group flex flex-col">
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"
                  alt="Food Scanning"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-x-0 h-[2px] bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-scan z-10" />
              </div>

              <div className="p-6 sm:p-8 bg-zinc-900 border-t border-white/5">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-1">Detectado</p>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-none">Bowl Proteico</h3>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-500/20">98% Precisão</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <MacroPill label="Proteína" value="42g" color="bg-emerald-500" />
                  <MacroPill label="Carbo" value="35g" color="bg-blue-500" />
                  <MacroPill label="Gordura" value="12g" color="bg-yellow-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter text-white mb-6">
              Adeus, <br />
              <span className="text-emerald-500">Tabelas Chatas.</span>
            </h2>
            <p className="text-lg text-zinc-400 font-medium mb-8 leading-relaxed">
              Não perca tempo pesando cada grama. Aponte a câmera e deixe nosso scanner inteligente identificar ingredientes, porções e calcular seus macros instantaneamente.
            </p>
            <ul className="space-y-4">
              <FeatureList text="Reconhecimento instantâneo de alimentos" />
              <FeatureList text="Estimativa de peso via análise visual" />
              <FeatureList text="Registro automático no seu diário" />
            </ul>
          </div>
        </div>
      </section>

      {/* Feature 2: Shape Analysis */}
      <section className="py-20 lg:py-32 px-6 bg-zinc-900/50 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <div className="inline-block px-4 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
              Exclusivo ShapeScan
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter text-white mb-6">
              Bioimpedância <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white">Visual.</span>
            </h2>
            <p className="text-lg text-zinc-400 font-medium mb-10 leading-relaxed">
              Esqueça o "olhômetro". Nossa tecnologia analisa proporções, simetria muscular e estima seu percentual de gordura com base em algorítmos comparativos de milhares de físicos.
            </p>

            <div className="grid grid-cols-2 gap-6">
              <StatCard value="95%" label="Precisão Estimada" />
              <StatCard value="< 10s" label="Tempo de Análise" />
              <StatCard value="AUTO" label="Análise de Simetria" />
              <StatCard value="24/7" label="Coach Disponível" />
            </div>
          </div>

          <div className="relative group">
            <div className="relative z-10 mx-auto max-w-sm">
              <div className="glass-panel p-2 rounded-[3rem] border border-white/10 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?q=80&w=800&auto=format&fit=crop"
                  alt="Shape Analysis"
                  className="rounded-[2.5rem] w-full object-cover transition-all duration-700"
                />

                <div className="absolute top-8 -right-1 sm:right-[-20px] glass-panel p-3 sm:p-4 rounded-xl border-l-2 border-emerald-500 animate-float delay-200">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">BF Estimado</p>
                  <p className="text-xl sm:text-2xl font-black text-white">12.4%</p>
                </div>

                <div className="absolute bottom-20 -left-1 sm:left-[-20px] glass-panel p-3 sm:p-4 rounded-xl border-r-2 border-emerald-500 animate-float">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Maturidade Muscular</p>
                  <div className="w-20 sm:w-24 h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[80%]"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500/10 blur-[100px] rounded-full -z-0" />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-32 px-6 relative border-t border-white/5 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter text-white mb-6">
              Resultados <span className="text-emerald-500">Reais.</span>
            </h2>
            <p className="text-lg text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
              Junte-se a milhares de usuários que já transformaram seus físicos com a inteligência do ShapeScan.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              name="Gabriel Costa"
              role="Atleta Natural"
              image="https://randomuser.me/api/portraits/men/32.jpg"
              text="O scanner de alimentos é bizarro de bom. Economizo uns 20 minutos por dia não tendo que pesar tudo milimetricamente."
            />
            <TestimonialCard
              name="Fernanda Lima"
              role="Nutricionista Esportiva"
              image="https://randomuser.me/api/portraits/women/44.jpg"
              text="Comecei a usar para validar as fotos que meus pacientes mandam. A estimativa de macros bate muito com a realidade."
            />
            <TestimonialCard
              name="Lucas Martins"
              role="Iniciante"
              image="https://randomuser.me/api/portraits/men/86.jpg"
              text="A análise de shape foi um choque de realidade. O coach IA me ajudou a montar um plano que eu realmente consigo seguir."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-6 relative overflow-hidden text-center border-t border-white/10 bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900 via-zinc-900/50 to-transparent pointer-events-none" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter mb-8 text-white">
            Sua melhor versão <br />começa agora.
          </h2>
          <p className="text-zinc-400 text-lg mb-12 font-medium">
            Acesso imediato a todas as ferramentas. Sem cartão para testar a versão gratuita.
          </p>
          <button
            onClick={onStart}
            className="bg-emerald-500 text-white px-12 py-6 rounded-2xl font-black text-xl hover:bg-emerald-400 hover:scale-105 transition-all shadow-[0_0_60px_-15px_rgba(16,185,129,0.5)]"
          >
            Criar Conta Gratuita
          </button>

          <div className="mt-16 flex flex-col md:flex-row justify-center items-center gap-8 text-xs font-black uppercase tracking-widest">
            <button onClick={onHowItWorks} className="text-zinc-300 hover:text-white transition-colors border-b-2 border-transparent hover:border-emerald-500 pb-1">Como funciona</button>
            <button onClick={onAbout} className="text-zinc-300 hover:text-white transition-colors border-b-2 border-transparent hover:border-emerald-500 pb-1">Quem somos</button>
            <span className="hidden md:inline text-zinc-700">•</span>
            <span className="text-emerald-600">ShapeScan © 2026</span>
          </div>
        </div>
      </section>
    </div>
  );
};

// Subcomponents for cleaner code
const FeatureList = ({ text }: { text: string }) => (
  <li className="flex items-center gap-3 text-zinc-300 font-medium">
    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
    </div>
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
  <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-all duration-300 relative group">
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
        <svg key={i} className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
      ))}
    </div>
    <p className="text-zinc-400 font-medium leading-relaxed group-hover:text-zinc-300 transition-colors">
      {text}
    </p>
  </div>
);

export default LandingPage;
