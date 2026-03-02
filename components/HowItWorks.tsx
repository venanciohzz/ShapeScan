import React, { useEffect } from 'react';
import { User, Camera, BrainCircuit, BarChart3, Rocket, ArrowRight } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { LiquidShaderBackground } from './ui/LiquidShaderBackground';
import { NeonFlow } from './ui/NeonFlow';

const LetterPuller: React.FC<{ text: string; className?: string; delay?: number }> = ({ text, className = "", delay = 0 }) => {
  const letters = Array.from(text);
  const container = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: delay } },
  };
  const child: Variants = {
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    hidden: { opacity: 0, y: 8 },
  };
  return (
    <motion.span variants={container} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ display: 'inline', whiteSpace: 'pre-wrap' }}>
      {letters.map((letter, index) => (
        <motion.span key={index} variants={child} style={{ display: 'inline-block', whiteSpace: 'pre', position: 'relative', verticalAlign: 'baseline' }}>
          <span
            className={`${className} animate-smooth-float`}
            style={{
              display: 'inline-block',
              padding: '0.35em',
              margin: '-0.35em',
              overflow: 'visible',
              animationDelay: `${index * 0.15}s`,
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          >
            {letter}
          </span>
        </motion.span>
      ))}
    </motion.span>
  );
};

interface HowItWorksProps {
  onBack: () => void;
  onRegister: () => void;
}

const HowItWorks: React.FC<HowItWorksProps> = ({ onBack, onRegister }) => {

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-zinc-950 min-h-screen text-white overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-white pb-24">
      <style>{`
        @keyframes smooth-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-smooth-float {
          animation: smooth-float 4s ease-in-out infinite;
          will-change: transform;
        }
        .font-serif-premium {
          font-family: 'Playfair Display', serif;
          letter-spacing: -0.01em;
        }
        .glass-step {
          background: rgba(255, 255, 255, 0.01);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .glass-nav {
          background: rgba(10, 10, 10, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>

      {/* Background Ambience (Synched with Landing) */}
      <div className="fixed inset-0 z-0 bg-[#020202] overflow-hidden pointer-events-none">
        <LiquidShaderBackground />
        <NeonFlow className="opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/40 to-[#020202]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 h-20">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:scale-105 transition-transform">
              <span className="text-xl">←</span>
            </div>
            <span className="text-sm font-medium">Voltar</span>
          </button>

          <button
            onClick={onRegister}
            className="bg-white text-zinc-950 px-6 py-2.5 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            Cadastre-se Grátis
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 pt-32 px-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-28">
          <div className="inline-block px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            Tecnologia ShapeScan
          </div>
          <h1 className="text-4xl lg:text-7xl font-serif-premium font-bold tracking-tight text-white mb-8 leading-[1.1]">
            <LetterPuller text="Inteligência Artificial" /> <br />
            <LetterPuller
              text="aplicada à sua biologia."
              className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 italic font-medium drop-shadow-[0_0_30px_rgba(52,211,153,0.4)]"
              delay={0.5}
            />
          </h1>
          <p className="text-lg text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Entenda como nossos algoritmos transformam imagens em dados estratégicos para sua evolução física através de visão computacional de ponta.
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-emerald-500/30 before:to-transparent">

          <StepItem
            number="01"
            title="Cadastro e Perfilamento"
            description="Crie sua conta gratuita em segundos. Nosso sistema coleta seus dados básicos para calibrar as fórmulas de metabolismo basal e gasto energético específico."
            icon={<User className="w-5 h-5" />}
            align="right"
          />

          <StepItem
            number="02"
            title="Captura de Dados Visuais"
            description="Envie fotos das suas refeições ou do seu físico. Não precisamos de balanças de precisão: basta uma foto clara. Nossa tecnologia de Visão Computacional mapeia volumes, texturas e padrões."
            icon={<Camera className="w-5 h-5" />}
            align="left"
          />

          <StepItem
            number="03"
            title="Processamento por IA"
            description="A IA analisa a imagem pixel a pixel. Para alimentos, identificamos ingredientes e estimamos densidade calórica. Para o corpo, analisamos simetria, definição muscular e estimamos a composição corporal."
            icon={<BrainCircuit className="w-5 h-5" />}
            align="right"
          />

          <StepItem
            number="04"
            title="Dashboard de Inteligência"
            description="Receba instantaneamente um relatório detalhado. Visualize calorias, macronutrientes, percentual de gordura estimado e feedback do coach virtual sobre como melhorar."
            icon={<BarChart3 className="w-5 h-5" />}
            align="left"
          />

          <StepItem
            number="05"
            title="Evolução Contínua"
            description="O sistema aprende com você. Acompanhe gráficos de progresso e receba ajustes dinâmicos nas suas metas conforme seu corpo responde aos estímulos."
            icon={<Rocket className="w-5 h-5" />}
            align="right"
          />

        </div>

        {/* Disclaimer Block */}
        <div className="mt-24 p-8 glass-step glow-hover rounded-3xl border border-white/10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-4">Nota sobre Tecnologia</h3>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl mx-auto font-medium">
            Nossos algoritmos utilizam modelos avançados de inteligência artificial para gerar
            <span className="text-white font-bold"> estimativas inteligentes</span> de alta precisão.
            Embora nossa tecnologia seja treinada em vastos bancos de dados, os resultados (como pesagem de alimentos e bioimpedância visual)
            são ferramentas de orientação estratégica e não substituem equipamentos laboratoriais ou exames clínicos médicos.
          </p>
        </div>

        {/* Final CTA */}
        <div className="py-24 text-center">
          <h2 className="text-4xl lg:text-6xl font-serif-premium font-bold tracking-tight mb-10 text-white">
            <LetterPuller text="Pronto para evoluir?" />
          </h2>
          <button
            onClick={onRegister}
            className="bg-white text-zinc-950 px-12 py-5 rounded-full font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] group flex items-center justify-center gap-3 mx-auto"
          >
            Iniciar Agora Grátis
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
          </button>
          <p className="mt-8 text-xs text-zinc-500 font-bold uppercase tracking-widest">
            Sem cartão de crédito • Acesso Imediato
          </p>
        </div>

      </div>
    </div>
  );
};

// Step Component
const StepItem = ({ number, title, description, icon, align }: { number: string, title: string, description: string, icon: React.ReactNode, align: 'left' | 'right' }) => {
  const isRight = align === 'right';

  return (
    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${isRight ? '' : ''}`}>

      {/* Icon Circle (Center) */}
      <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-[#020202] bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] z-10 shrink-0 md:order-1 md:group-odd:translate-x-1/2 md:group-even:-translate-x-1/2 md:absolute md:left-1/2 text-white">
        {icon}
      </div>

      {/* Content Card */}
      <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-8 glass-step rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-all duration-500 shadow-2xl relative group-hover:bg-white/[0.02] ${isRight ? 'ml-auto' : 'mr-auto'}`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-5xl font-serif-premium font-black text-white/[0.03] absolute top-4 right-6 select-none group-hover:text-emerald-500/5 transition-colors">{number}</span>
          <h3 className="text-2xl font-serif-premium font-bold text-white relative z-10 group-hover:text-emerald-400 transition-colors">{title}</h3>
        </div>
        <p className="text-zinc-400 text-base leading-relaxed font-medium relative z-10">
          {description}
        </p>
      </div>

    </div>
  );
};

export default HowItWorks;
