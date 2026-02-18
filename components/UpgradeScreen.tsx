
import React from 'react';
import { getCheckoutUrl } from '../services/paymentConfig';
import { User } from '../types';

interface UpgradeScreenProps {
  user?: User | null;
  onBack: () => void;
}

const UpgradeScreen: React.FC<UpgradeScreenProps> = ({ user, onBack }) => {
  const handleSubscribe = () => {
    if (!user) return;
    const checkoutUrl = getCheckoutUrl('monthly', user.email, user.id);
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl mb-8 animate-bounce">💎</div>
      <h2 className="text-3xl font-black text-gray-900 mb-4">Seja ShapeScan Premium</h2>
      <p className="text-gray-500 max-w-sm mb-12">
        Desbloqueie o Scanner de Refeições por IA, Análise de Shape Corporal e o Coach Inteligente 24/7.
      </p>

      <div className="w-full max-w-sm space-y-4 mb-12">
        <Benefit item="Scanner de Refeições por Foto" />
        <Benefit item="Análise de Shape e Percentual de Gordura" />
        <Benefit item="Coach IA para Treino e Dieta" />
        <Benefit item="Suporte Prioritário" />
      </div>

      <button
        onClick={handleSubscribe}
        className="w-full max-w-sm bg-emerald-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-100 mb-4"
      >
        Assinar agora (R$ 29,90/mês)
      </button>
      <button onClick={onBack} className="text-gray-400 font-medium hover:text-gray-600">Talvez mais tarde</button>
    </div>
  );
};

const Benefit = ({ item }: { item: string }) => (
  <div className="flex items-center gap-3 text-left">
    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] text-white">✓</div>
    <span className="text-gray-700 font-medium">{item}</span>
  </div>
);

export default UpgradeScreen;
