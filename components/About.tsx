import React, { useEffect } from 'react';
import { Dna, Eye, Target, ArrowRight } from 'lucide-react';
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

interface AboutProps {
  onBack: () => void;
  onRegister: () => void;
}

const About: React.FC<AboutProps> = ({ onBack, onRegister }) => {

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
        .glass-card {
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

      {/* Background Ambience */}
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
      <div className="relative z-10 pt-32 px-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-28">
          <div className="inline-block px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            Institucional
          </div>
          <h1 className="text-4xl lg:text-7xl font-serif-premium font-bold tracking-tight text-white mb-8 leading-[1.1]">
            <LetterPuller text="Redefinindo a performance" /> <br />
            <LetterPuller
              text="através da tecnologia."
              className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 italic font-medium drop-shadow-[0_0_30px_rgba(52,211,153,0.4)]"
              delay={0.5}
            />
          </h1>
          <p className="text-xl text-zinc-400 font-medium max-w-3xl mx-auto leading-relaxed">
            O ShapeScan não é apenas um aplicativo. É uma plataforma de inteligência de dados biológicos desenhada para eliminar a incerteza da nutrição e do treinamento físico.
          </p>
        </div>

        {/* Mission Block */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-32">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-600/20 blur-[60px] rounded-full"></div>
            <div className="glass-card glow-hover p-10 rounded-[2.5rem] relative z-10 border border-white/10">
              <h2 className="text-2xl font-black text-white mb-6">Nossa Missão</h2>
              <p className="text-zinc-400 leading-relaxed font-medium mb-6">
                Nascemos com um propósito claro: democratizar o acesso à análise corporal de alta precisão.
                Antes restrita a atletas de elite em laboratórios, hoje trazemos a tecnologia de visão computacional
                e análise preditiva para a palma da sua mão.
              </p>
              <p className="text-zinc-400 leading-relaxed font-medium">
                Acreditamos que o controle da saúde e da estética corporal deve ser baseado em dados concretos,
                não em "achismos" ou dietas genéricas.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <FeatureRow
              icon={<Dna className="w-6 h-6" />}
              title="DNA Tecnológico"
              desc="Nossa infraestrutura é nativa em IA. Não adaptamos soluções antigas; construímos o futuro do fitness do zero."
            />
            <FeatureRow
              icon={<Eye className="w-6 h-6" />}
              title="Visão Computacional"
              desc="Transformamos pixels em macronutrientes. Nossos algoritmos 'enxergam' sua alimentação e seu progresso físico."
            />
            <FeatureRow
              icon={<Target className="w-6 h-6" />}
              title="Foco em Resultados"
              desc="Eliminamos a complexidade para que você foque apenas no que importa: sua evolução diária."
            />
          </div>
        </div>

        {/* Values Grid */}
        <div className="mb-32">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-16 tracking-tight">Nossos Pilares</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <ValueCard
              title="Inovação"
              desc="Desafiamos os padrões da indústria fitness com engenharia de software de ponta."
              delay="0"
            />
            <ValueCard
              title="Precisão"
              desc="Apostamos na ciência de dados para entregar estimativas confiáveis e acionáveis."
              delay="100"
            />
            <ValueCard
              title="Simplicidade"
              desc="Tecnologia complexa, uso simples. O usuário não precisa ser um expert para evoluir."
              delay="200"
            />
            <ValueCard
              title="Evolução"
              desc="Assim como seu corpo, nosso produto está em constante estado de aprimoramento."
              delay="300"
            />
          </div>
        </div>

        {/* Vision Section */}
        <div className="glass-card glow-hover p-12 md:p-20 rounded-[3rem] text-center relative overflow-hidden mb-20 border border-emerald-500/20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <h2 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tighter">O Futuro é <span className="text-emerald-500">Personalizado.</span></h2>
          <p className="text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Imaginamos um mundo onde cada pessoa tem um assistente de saúde inteligente, capaz de adaptar
            recomendações em tempo real baseadas em feedback biológico visual. Estamos construindo esse futuro hoje.
          </p>
        </div>

        {/* Footer CTA */}
        <div className="py-10 text-center">
          <h2 className="text-2xl font-bold text-zinc-400 mb-8 uppercase tracking-widest text-xs">
            Faça parte da revolução
          </h2>
          <button
            onClick={onRegister}
            className="bg-emerald-500 text-white px-12 py-6 rounded-2xl font-black text-xl hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_60px_-15px_rgba(16,185,129,0.5)] group"
          >
            Cadastre-se Gratuitamente
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

      </div>
    </div>
  );
};

const FeatureRow = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="flex gap-6 group">
    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-2xl shadow-lg shrink-0 group-hover:border-emerald-500/30 transition-colors">
      {icon}
    </div>
    <div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  </div>
);

const ValueCard = ({ title, desc, delay }: { title: string, desc: string, delay: string }) => (
  <div
    className="glass-card p-10 rounded-3xl border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.02] transition-all duration-500 group"
  >
    <div className="w-12 h-1 rounded-full bg-emerald-500 mb-8 group-hover:w-20 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
    <h3 className="text-2xl font-serif-premium font-bold text-white mb-4 tracking-tight group-hover:text-emerald-400 transition-colors uppercase">{title}</h3>
    <p className="text-zinc-400 text-base leading-relaxed font-medium group-hover:text-zinc-300 transition-colors">
      {desc}
    </p>
  </div>
);

export default About;
