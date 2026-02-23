
import React, { useEffect } from 'react';

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
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>

      {/* Background Ambience */}
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
      <div className="relative z-10 pt-32 px-6 max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-block px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-6 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]">
              Institucional
            </div>
            <h1 className="text-4xl lg:text-7xl font-black tracking-tighter text-white mb-8 leading-[1.1]">
              Redefinindo a performance <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">através da tecnologia.</span>
            </h1>
            <p className="text-xl text-zinc-400 font-medium max-w-3xl mx-auto leading-relaxed">
              O ShapeScan não é apenas um aplicativo. É uma plataforma de inteligência de dados biológicos desenhada para eliminar a incerteza da nutrição e do treinamento físico.
            </p>
        </div>

        {/* Mission Block */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-32">
           <div className="relative">
              <div className="absolute inset-0 bg-emerald-600/20 blur-[60px] rounded-full"></div>
              <div className="glass-card p-10 rounded-[2.5rem] relative z-10 border border-white/10">
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
                 icon="🧬" 
                 title="DNA Tecnológico" 
                 desc="Nossa infraestrutura é nativa em IA. Não adaptamos soluções antigas; construímos o futuro do fitness do zero."
              />
              <FeatureRow 
                 icon="👁️" 
                 title="Visão Computacional" 
                 desc="Transformamos pixels em macronutrientes. Nossos algoritmos 'enxergam' sua alimentação e seu progresso físico."
              />
              <FeatureRow 
                 icon="🎯" 
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
        <div className="glass-card p-12 md:p-20 rounded-[3rem] text-center relative overflow-hidden mb-20 border border-emerald-500/20">
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
            className="bg-emerald-500 text-white px-12 py-6 rounded-2xl font-black text-xl hover:bg-emerald-400 hover:scale-105 transition-all shadow-[0_0_60px_-15px_rgba(16,185,129,0.5)] group"
          >
            Cadastre-se Gratuitamente
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

      </div>
    </div>
  );
};

const FeatureRow = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
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
    className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all duration-500 group animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="w-10 h-1 rounded-full bg-emerald-600 mb-6 group-hover:w-16 transition-all duration-300"></div>
    <h3 className="text-xl font-black text-white mb-4 tracking-tight">{title}</h3>
    <p className="text-zinc-500 text-sm leading-relaxed font-medium group-hover:text-zinc-400 transition-colors">
      {desc}
    </p>
  </div>
);

export default About;
