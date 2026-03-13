
import React, { useEffect } from 'react';

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
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 10s infinite; }
        .grid-bg {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
        .glass-step {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>

      {/* Background Ambience (Same as Landing) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[100px] animate-blob delay-2000" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 py-6 px-6 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 text-white"
          >
            <span className="text-lg pb-0.5">←</span>
          </button>
          
          <button 
            onClick={onRegister}
            className="bg-emerald-600 text-white px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
          >
            Cadastre-se Grátis
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 pt-32 px-6 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-block px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-6 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]">
              Tecnologia ShapeScan
            </div>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
              Inteligência Artificial <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">aplicada à sua biologia.</span>
            </h1>
            <p className="text-lg text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
              Entenda como nossos algoritmos transformam imagens em dados estratégicos para sua evolução física.
            </p>
        </div>

        {/* Steps Timeline */}
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-emerald-500/30 before:to-transparent">

          <StepItem 
            number="01"
            title="Cadastro e Perfilamento"
            description="Crie sua conta gratuita em segundos. Nosso sistema coleta seus dados básicos para calibrar as fórmulas de metabolismo basal e gasto energético específico."
            icon="👤"
            align="right"
          />

          <StepItem 
            number="02"
            title="Captura de Dados Visuais"
            description="Envie fotos das suas refeições ou do seu físico. Não precisamos de balanças de precisão: basta uma foto clara. Nossa tecnologia de Visão Computacional mapeia volumes, texturas e padrões."
            icon="📸"
            align="left"
          />

          <StepItem 
            number="03"
            title="Processamento Neural"
            description="A IA analisa a imagem pixel a pixel. Para alimentos, identificamos ingredientes e estimamos densidade calórica. Para o corpo, analisamos simetria, definição muscular e estimamos a composição corporal."
            icon="🧠"
            align="right"
          />

          <StepItem 
            number="04"
            title="Dashboard de Inteligência"
            description="Receba instantaneamente um relatório detalhado. Visualize calorias, macronutrientes, percentual de gordura estimado e feedback do coach virtual sobre como melhorar."
            icon="📊"
            align="left"
          />

          <StepItem 
            number="05"
            title="Evolução Contínua"
            description="O sistema aprende com você. Acompanhe gráficos de progresso e receba ajustes dinâmicos nas suas metas conforme seu corpo responde aos estímulos."
            icon="🚀"
            align="right"
          />

        </div>

        {/* Disclaimer Block */}
        <div className="mt-24 p-8 glass-step rounded-3xl border border-white/10 text-center relative overflow-hidden">
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
        <div className="py-20 text-center">
          <h2 className="text-3xl lg:text-5xl font-black tracking-tighter mb-8 text-white">
            Pronto para evoluir com dados?
          </h2>
          <button 
            onClick={onRegister}
            className="bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-emerald-400 hover:scale-105 transition-all shadow-[0_0_50px_-10px_rgba(16,185,129,0.5)] group"
          >
            Cadastre-se Gratuitamente
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
          <p className="mt-6 text-xs text-zinc-500 font-bold uppercase tracking-widest">
            Sem cartão de crédito • Acesso Imediato
          </p>
        </div>

      </div>
    </div>
  );
};

// Step Component
const StepItem = ({ number, title, description, icon, align }: { number: string, title: string, description: string, icon: string, align: 'left' | 'right' }) => {
  const isRight = align === 'right';
  
  return (
    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${isRight ? '' : ''}`}>
      
      {/* Icon Circle (Center) */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-950 bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)] z-10 shrink-0 md:order-1 md:group-odd:translate-x-1/2 md:group-even:-translate-x-1/2 md:absolute md:left-1/2">
        <span className="text-sm">{icon}</span>
      </div>
      
      {/* Content Card */}
      <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 glass-step rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors duration-500 shadow-lg ${isRight ? 'ml-auto' : 'mr-auto'}`}>
        <div className="flex items-center justify-between mb-3">
           <span className="text-4xl font-black text-white/5 absolute top-2 right-4 select-none">{number}</span>
           <h3 className="text-xl font-bold text-white relative z-10">{title}</h3>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed font-medium relative z-10">
          {description}
        </p>
      </div>

    </div>
  );
};

export default HowItWorks;
