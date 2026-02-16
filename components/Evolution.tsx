
import React, { useState, useMemo } from 'react';
import { User, EvolutionRecord } from '../types';

interface EvolutionProps {
  user: User;
  records: EvolutionRecord[];
  onBack: () => void;
  onAdd: (record: Omit<EvolutionRecord, 'id'>) => void;
  onDelete: (id: string) => void;
  onEdit: (record: EvolutionRecord) => void;
}

const WeightChart = ({ records }: { records: EvolutionRecord[] }) => {
  // 1. Filtrar apenas registros com peso e ordenar por data (Antigo -> Novo)
  const dataPoints = useMemo(() => {
    return [...records]
      .filter(r => r.weight !== undefined && r.weight !== null && !isNaN(r.weight))
      .sort((a, b) => a.date - b.date)
      .map(r => ({ date: r.date, val: r.weight! }));
  }, [records]);

  // Se tiver menos de 2 pontos DE PESO, mostra aviso
  if (dataPoints.length < 2) {
      const hasRecordsButNoWeight = records.length >= 2 && dataPoints.length < 2;
      
      return (
        <div className="w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 mb-8 border-2 border-emerald-600/20 shadow-lg text-center border-dashed flex flex-col items-center justify-center min-h-[200px]">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-900 dark:text-white font-black text-sm uppercase tracking-wide mb-1">
                {hasRecordsButNoWeight ? "Adicione PESO aos registros" : "Gráfico em construção"}
            </p>
            <p className="text-gray-500 dark:text-zinc-500 font-medium text-xs max-w-xs">
                {hasRecordsButNoWeight 
                    ? "Você tem registros salvos, mas precisamos do seu peso em pelo menos 2 deles para montar o gráfico." 
                    : "Salve pelo menos 2 evoluções com peso para visualizar seu progresso."}
            </p>
        </div>
      );
  }

  // Cálculos de Escala (Y Axis)
  let minVal = Math.min(...dataPoints.map(d => d.val));
  let maxVal = Math.max(...dataPoints.map(d => d.val));
  
  // Adicionar margem de respiro (Padding) no topo e em baixo para a linha não encostar na borda
  const paddingY = (maxVal - minVal) === 0 ? 2 : (maxVal - minVal) * 0.2; 
  minVal = minVal - paddingY;
  maxVal = maxVal + paddingY;
  const range = maxVal - minVal;

  // Dimensões SVG
  const width = 800;
  const height = 300;
  const paddingX = 40; // Espaço lateral
  const paddingTopBottom = 40;

  // Gerar coordenadas X,Y
  const coordinates = dataPoints.map((pt, i) => {
    // X: Distribuído uniformemente
    const x = paddingX + (i / (dataPoints.length - 1)) * (width - (paddingX * 2));
    
    // Y: Invertido (SVG y=0 é o topo)
    // Fórmula: AlturaDisponivel - ( (Valor - Min) / Range * AlturaUtilizavel )
    const y = height - paddingTopBottom - ((pt.val - minVal) / range) * (height - (paddingTopBottom * 2));
    
    return { x, y, val: pt.val, date: pt.date };
  });

  // String do Caminho da Linha (Polyline)
  const pointsString = coordinates.map(c => `${c.x},${c.y}`).join(' ');
  
  // String da Área (Gradiente abaixo da linha)
  const areaString = `${pointsString} ${coordinates[coordinates.length-1].x},${height} ${coordinates[0].x},${height}`;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 mb-8 border-2 border-emerald-600/20 shadow-lg relative overflow-hidden">
       <div className="flex justify-between items-center mb-6 pl-2">
           <h3 className="text-emerald-600 font-black uppercase text-xs tracking-widest">Progresso de Peso</h3>
           {dataPoints.length > 0 && (
             <div className="bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
               <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                 {dataPoints[0].val}kg ➝ {dataPoints[dataPoints.length-1].val}kg
               </span>
             </div>
           )}
       </div>
       
       <div className="w-full relative" style={{ aspectRatio: '16/7' }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
             <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10B981" floodOpacity="0.3"/>
                </filter>
             </defs>
             
             {/* Área Preenchida */}
             <polygon points={areaString} fill="url(#chartGradient)" />
             
             {/* Linha do Gráfico */}
             <polyline 
                points={pointsString} 
                fill="none" 
                stroke="#10B981" 
                strokeWidth="5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                filter="url(#shadow)"
             />
             
             {/* Pontos e Rótulos */}
             {coordinates.map((coord, i) => (
                <g key={i}>
                    {/* Linha vertical tracejada (Opcional, estilo 'grid') */}
                    <line x1={coord.x} y1={coord.y} x2={coord.x} y2={height} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" opacity="0.3" />

                    {/* Círculo do Ponto */}
                    <circle cx={coord.x} cy={coord.y} r="8" fill="white" stroke="#10B981" strokeWidth="4" className="dark:fill-zinc-900" />
                    
                    {/* Rótulo de Valor (Peso) acima do ponto */}
                    <text 
                        x={coord.x} 
                        y={coord.y - 20} 
                        textAnchor="middle" 
                        fill="#10B981" 
                        fontSize="14" 
                        fontWeight="900" 
                        className="dark:fill-white drop-shadow-sm"
                    >
                        {coord.val}
                    </text>

                    {/* Rótulo de Data abaixo do gráfico */}
                    <text 
                        x={coord.x} 
                        y={height + 25} 
                        textAnchor="middle" 
                        fill="#9CA3AF" 
                        fontSize="12" 
                        fontWeight="bold"
                    >
                        {new Date(coord.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                    </text>
                </g>
             ))}
          </svg>
       </div>
    </div>
  );
};

const Evolution: React.FC<EvolutionProps> = ({ user, records, onBack, onAdd, onDelete, onEdit }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<EvolutionRecord>>({ date: Date.now(), weight: undefined, height: undefined, bf: undefined, notes: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData as Omit<EvolutionRecord, 'id'>);
    setIsAdding(false);
    setFormData({ date: Date.now(), weight: undefined, height: undefined, bf: undefined, notes: '' });
  };

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.date - a.date), [records]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 md:pt-14 pb-24 text-black dark:text-white">
      {recordToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-8 border-2 border-emerald-600 shadow-2xl animate-in zoom-in">
            <h3 className="text-xl font-black text-center mb-4 uppercase tracking-tighter">Excluir Registro?</h3>
            <div className="flex gap-4">
              <button onClick={() => setRecordToDelete(null)} className="flex-1 py-4 bg-gray-100 dark:bg-zinc-800 text-black dark:text-white rounded-xl font-black uppercase tracking-widest text-[10px]">Cancelar</button>
              <button onClick={() => { onDelete(recordToDelete); setRecordToDelete(null); }} className="flex-1 py-4 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px]">Excluir</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 transition-all active:scale-95 mb-6 text-black dark:text-white">
        <span className="text-lg pb-0.5">←</span>
      </button>

      <h1 className="text-2xl font-black text-black dark:text-white italic tracking-tight mb-8">📈 Evolução Física</h1>

      {!isAdding ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <WeightChart records={records} />
          <button onClick={() => setIsAdding(true)} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95">➕ Novo Registro</button>
          <div className="space-y-6">
            {sortedRecords.length > 0 ? (
              sortedRecords.map((rec) => (
                <div key={rec.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border-2 border-emerald-500/10 dark:border-zinc-800 shadow-sm hover:border-emerald-500 transition-all relative group">
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{new Date(rec.date).toLocaleDateString('pt-BR')}</p>
                        
                        {/* Modified Table Display: Only Weight and BF% */}
                        <div className="flex items-center gap-6 mt-4">
                           {rec.weight && (
                             <div>
                               <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">Peso</p>
                               <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{rec.weight} <span className="text-xs text-zinc-500">kg</span></p>
                             </div>
                           )}
                           
                           {rec.bf && (
                             <div className="pl-6 border-l-2 border-zinc-100 dark:border-zinc-800">
                               <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">Gordura (BF)</p>
                               <p className="text-2xl font-black text-emerald-500 tracking-tighter">{rec.bf}<span className="text-xs">%</span></p>
                             </div>
                           )}
                        </div>

                      </div>
                      <button onClick={() => setRecordToDelete(rec.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full hover:bg-red-100 transition-colors shadow-sm">🗑️</button>
                   </div>
                   
                   {/* Text Analysis instead of Photo */}
                   {rec.detailedAnalysis && (
                      <div className="mt-4 bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-500/20">
                          <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Análise do Shape</h4>
                          <p className="text-xs text-gray-800 dark:text-gray-300 leading-relaxed font-medium">{rec.detailedAnalysis.substring(0, 300)}...</p>
                          {rec.pointsToImprove && (
                              <div className="mt-3 pt-3 border-t border-emerald-500/10">
                                  <h5 className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Pontos de Atenção</h5>
                                  <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">{rec.pointsToImprove}</p>
                              </div>
                          )}
                      </div>
                   )}

                   {rec.notes && <div className="mt-4 bg-gray-50/50 dark:bg-zinc-800/50 p-4 rounded-2xl border-l-4 border-emerald-500"><p className="text-xs font-black text-black dark:text-white leading-relaxed italic">"{rec.notes}"</p></div>}
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border-2 border-dashed border-emerald-500/20"><p className="text-7xl mb-6">📉</p><p className="font-black text-black dark:text-white uppercase text-[10px] tracking-widest">Ainda nenhum registro.</p></div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border-4 border-emerald-600 shadow-2xl space-y-6 animate-in zoom-in duration-300">
           <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-widest mb-4 text-center italic">Novo Registro</h2>
           <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Peso (kg)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={formData.weight || ''} 
                    onChange={e => setFormData({...formData, weight: e.target.value ? parseFloat(e.target.value) : undefined})} 
                    className="w-full p-4 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 font-black text-black dark:text-white outline-none focus:border-emerald-600"
                    placeholder="Ex: 75.5"
                    required
                  />
              </div>
              <div>
                  <label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Altura (m)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.height || ''} 
                    onChange={e => setFormData({...formData, height: e.target.value ? parseFloat(e.target.value) : undefined})} 
                    className="w-full p-4 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 font-black text-black dark:text-white outline-none focus:border-emerald-600" 
                    placeholder="Ex: 1.75"
                  />
              </div>
           </div>
           <div>
               <label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Gordura (BF %)</label>
               <input 
                 type="text" 
                 inputMode="decimal" 
                 value={formData.bf || ''} 
                 onChange={e => setFormData({...formData, bf: e.target.value})} 
                 className="w-full p-4 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 font-black text-black dark:text-white outline-none focus:border-emerald-600" 
                 placeholder="Opcional"
                />
           </div>
           <div>
               <label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest mb-2">Observações</label>
               <textarea 
                 value={formData.notes} 
                 onChange={e => setFormData({...formData, notes: e.target.value})} 
                 className="w-full p-4 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-800 font-black text-black dark:text-white outline-none focus:border-emerald-600 min-h-[80px]" 
                 placeholder="Como você está se sentindo?"
                />
           </div>
           <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-600 text-black dark:text-white rounded-2xl font-black uppercase tracking-widest">Cancelar</button>
              <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">Salvar 💪</button>
           </div>
        </form>
      )}
    </div>
  );
};
export default Evolution;
