
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EvolutionRecord, FoodLog, User } from '../types';
import { TrendingUp, Activity, Flame, Ruler } from 'lucide-react';

interface EvolutionChartsProps {
  records: EvolutionRecord[];
  logs: FoodLog[];
  user: User;
}

const EvolutionCharts: React.FC<EvolutionChartsProps> = ({ records, logs, user }) => {
  const [activeTab, setActiveTab] = useState<'weight' | 'bmi' | 'calories'>('weight');

  // Prepare Weight Data
  const weightData = useMemo(() => {
    return [...records]
      .filter(r => r.weight !== undefined && r.weight !== null && !isNaN(r.weight))
      .sort((a, b) => a.date - b.date)
      .map(r => ({ date: r.date, val: r.weight! }));
  }, [records]);

  // Prepare BMI Data
  const bmiData = useMemo(() => {
    return [...records]
      .filter(r => r.weight !== undefined && !isNaN(r.weight))
      .sort((a, b) => a.date - b.date)
      .map(r => {
        const height = r.height || user.height || 0;
        const bmi = height > 0 ? (r.weight! / ((height / 100) ** 2)) : 0;
        return { date: r.date, val: Number(bmi.toFixed(1)) };
      })
      .filter(d => d.val > 0);
  }, [records, user.height]);

  // Prepare Calories Data (Daily Averages)
  const caloriesData = useMemo(() => {
    const dailyMap = new Map<string, number>();
    logs.forEach(log => {
      const dateKey = new Date(log.timestamp).toLocaleDateString();
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + log.calories);
    });

    return Array.from(dailyMap.entries())
      .map(([date, val]) => ({ date: new Date(date).getTime(), val }))
      .sort((a, b) => a.date - b.date)
      .slice(-14); // Last 14 days
  }, [logs]);

  const currentData = activeTab === 'weight' ? weightData : activeTab === 'bmi' ? bmiData : caloriesData;
  const unit = activeTab === 'weight' ? 'kg' : activeTab === 'bmi' ? '' : 'kcal';
  const color = activeTab === 'weight' ? '#10B981' : activeTab === 'bmi' ? '#3B82F6' : '#EF4444';
  const activeIcon = activeTab === 'weight' ? <TrendingUp /> : activeTab === 'bmi' ? <Ruler /> : <Flame />;

  return (
    <div className="w-full space-y-6">
      {/* Tabs */}
      <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
        {[
          { id: 'weight', label: 'Peso', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'bmi', label: 'IMC', icon: <Activity className="w-4 h-4" /> },
          { id: 'calories', label: 'Calorias', icon: <Flame className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id ? 'bg-white text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-white'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Chart Canvas */}
      <div className="bg-zinc-950/40 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {currentData.length >= 2 ? (
              <ChartSVG data={currentData} color={color} unit={unit} />
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-12 h-12 mb-4">
                  {activeIcon}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Dados insuficientes</p>
                <p className="text-[9px] text-zinc-500 mt-2 uppercase tracking-widest leading-relaxed">
                  Adicione pelo menos 2 registros para gerar a matriz visual
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mini Stats Card */}
      <div className="grid grid-cols-3 gap-4">
         <StatCard label="Início" value={currentData.length > 0 ? currentData[0].val : '-'} unit={unit} />
         <StatCard label="Atual" value={currentData.length > 0 ? currentData[currentData.length - 1].val : '-'} unit={unit} highlight color={color} />
         <StatCard label="Variação" value={getVariation(currentData)} unit={unit} />
      </div>
    </div>
  );
};

const getVariation = (data: { val: number }[]) => {
  if (data.length < 2) return '-';
  const diff = data[data.length - 1].val - data[0].val;
  return (diff > 0 ? '+' : '') + diff.toFixed(1);
}

const StatCard = ({ label, value, unit, highlight, color }: any) => (
  <div className={`p-4 rounded-3xl border ${highlight ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5'} flex flex-col items-center text-center`}>
    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className={`text-lg font-serif-premium font-bold ${highlight ? '' : 'text-zinc-300'}`} style={{ color: highlight ? color : undefined }}>{value}</span>
      <span className="text-[8px] font-bold text-zinc-700 uppercase">{unit}</span>
    </div>
  </div>
);

const ChartSVG = ({ data, color, unit }: { data: { val: number, date: number }[], color: string, unit: string }) => {
  const width = 800;
  const height = 300;
  const paddingX = 50;
  const paddingTop = 40;
  const paddingBottom = 40;

  const vals = data.map(d => d.val);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const range = maxVal - minVal || 10;
  const paddingY = range * 0.2;
  
  const yMin = minVal - paddingY;
  const yMax = maxVal + paddingY;
  const yRange = yMax - yMin;

  const coords = data.map((d, i) => ({
    x: paddingX + (i / (data.length - 1)) * (width - (paddingX * 2)),
    y: (height - paddingBottom) - ((d.val - yMin) / yRange) * (height - paddingTop - paddingBottom),
    val: d.val,
    date: d.date
  }));

  const pointsString = coords.map(c => `${c.x},${c.y}`).join(' ');
  const areaString = `${pointsString} ${coords[coords.length - 1].x},${height} ${coords[0].x},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.polygon
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        points={areaString}
        fill={`url(#grad-${color})`}
      />

      {/* Grid Lines */}
      {[0, 0.5, 1].map((p, i) => (
        <line
          key={i}
          x1={paddingX}
          y1={paddingTop + p * (height - paddingTop - paddingBottom)}
          x2={width - paddingX}
          y2={paddingTop + p * (height - paddingTop - paddingBottom)}
          stroke="white"
          strokeOpacity="0.03"
          strokeDasharray="4 4"
        />
      ))}

      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="6" fill={color} filter="blur(8px)" />

      <motion.polyline
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        points={pointsString}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {coords.map((c, i) => (
        <React.Fragment key={i}>
          <circle cx={c.x} cy={c.y} r="8" fill="#09090b" stroke={color} strokeWidth="3" />
          {i === coords.length - 1 && (
            <g>
              <text x={c.x} y={c.y - 25} textAnchor="middle" fill="white" fontSize="16" fontWeight="900" className="font-serif-premium tracking-tighter">
                {c.val}{unit}
              </text>
            </g>
          )}
          { (i === 0 || i === coords.length - 1 || i === Math.floor(coords.length / 2)) && (
            <text x={c.x} y={height + 25} textAnchor="middle" fill="#3f3f46" fontSize="11" fontWeight="900" className="uppercase tracking-widest">
                {new Date(c.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
            </text>
          )}
        </React.Fragment>
      ))}
    </svg>
  );
};

export default EvolutionCharts;
