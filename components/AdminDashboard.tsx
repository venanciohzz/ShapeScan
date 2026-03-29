import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { ArrowLeft, Search, TrendingUp, Users, DollarSign, Check, X, Edit, ShieldX, Ban } from 'lucide-react';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';

interface AdminDashboardProps {
    user: User;
    onBack: () => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onBack, onShowToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState({ totalRevenue: 0, totalUsers: 0, activeSubs: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>('free');
    const [cancellingUser, setCancellingUser] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // @ts-ignore - admin functions are dynamically added to db object
            const [usersList, statsData] = await Promise.all([
                db.admin.getAllUsers(),
                db.admin.getStats()
            ]);
            setUsers(usersList);
            setStats(statsData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            onShowToast('Erro ao carregar dados do admin', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCancelSubscription = async (userId: string) => {
        if (!window.confirm('Cancelar assinatura no fim do período atual? O usuário não será cobrado no próximo ciclo, mas mantém acesso até o vencimento.')) return;
        setCancellingUser(userId);
        try {
            // @ts-ignore
            const result = await db.admin.cancelUserSubscription(userId);
            loadData();
            onShowToast(`Assinatura cancelada — acesso até ${result.expiry_date}`, 'success');
        } catch (error: any) {
            console.error('Erro ao cancelar assinatura:', error);
            onShowToast(error.message || 'Erro ao cancelar assinatura', 'error');
        } finally {
            setCancellingUser(null);
        }
    };

    const handleUpdatePlan = async (userId: string) => {
        try {
            // @ts-ignore
            await db.admin.updateUserPlan(userId, selectedPlan);
            setEditingUser(null);
            loadData(); // Reload to show updates
            onShowToast('Plano atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar plano:', error);
            onShowToast('Erro ao atualizar plano', 'error');
        }
    };

    if (!user.isAdmin) {
        return (
            <PremiumBackground className="flex items-center justify-center min-h-screen p-4" dim={true} intensity={1.5}>
                <div className="bg-zinc-950/40 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-red-500/20 shadow-2xl text-center max-w-lg w-full">
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/30">
                        <ShieldX className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white px-2 tracking-tighter mb-4"><LetterPuller text="Acesso Negado" /></h1>
                    <p className="text-zinc-500 text-sm font-medium mb-10 leading-relaxed uppercase tracking-widest text-[10px]">Protocolo de segurança acionado. Nível de permissão insuficiente.</p>
                    <button onClick={onBack} className="w-full px-8 py-5 bg-white/5 hover:bg-white hover:text-zinc-950 text-white border border-white/10 transition-all font-black text-xs uppercase tracking-widest rounded-[2rem]">Retornar</button>
                </div>
            </PremiumBackground>
        );
    }

    return (
        <PremiumBackground className="min-h-screen p-6 md:p-10 pt-20 pb-32 overflow-x-hidden" dim={true} intensity={1.2}>
            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={onBack}
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-white group shrink-0"
                        >
                            <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-serif-premium font-bold tracking-tight text-white mb-2">
                                <LetterPuller text="Painel Administrativo" />
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 opacity-80">
                                Controle de Autoridade Master
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-zinc-950/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] -mr-16 -mt-16 transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Total Usuários</p>
                                <p className="text-4xl font-serif-premium font-bold text-white tracking-tighter">{stats.totalUsers}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Users className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-950/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] -mr-16 -mt-16 transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Receita Total</p>
                                <p className="text-4xl font-serif-premium font-bold text-white tracking-tighter">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.totalRevenue / 100)}
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <DollarSign className="w-6 h-6 text-emerald-500" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-950/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] -mr-16 -mt-16 transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Assinaturas Ativas</p>
                                <p className="text-4xl font-serif-premium font-bold text-white tracking-tighter">{stats.activeSubs}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <TrendingUp className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions & Filters */}
                <div className="bg-zinc-950/40 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5 shadow-2xl">
                    <div className="relative w-full max-w-lg">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar usuário por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 rounded-xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 outline-none transition-all font-bold text-white placeholder:text-zinc-600"
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-zinc-950/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden pointer-events-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02]">
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Usuário</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Plano</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="p-12 text-center text-sm font-bold uppercase tracking-widest text-zinc-500">Acessando Banco de Dados...</td></tr>
                                ) : (
                                    filteredUsers.map(u => (
                                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 font-bold text-lg border border-white/10 shadow-lg">
                                                        {u.name?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-white text-base tracking-tight">{u.name || 'Usuário Não Identificado'}</p>
                                                            {u.emailConfirmed ? (
                                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                                    <Check className="w-2.5 h-2.5" /> Verificado
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
                                                                    <X className="w-2.5 h-2.5" /> Pendente
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-semibold text-zinc-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {editingUser === u.id ? (
                                                    <select
                                                        value={selectedPlan}
                                                        onChange={(e) => setSelectedPlan(e.target.value)}
                                                        className="px-4 py-2 rounded-xl bg-zinc-900 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider outline-none"
                                                    >
                                                        <option value="free">Gratuito</option>
                                                        <option value="monthly">Mensal</option>
                                                        <option value="annual">Anual</option>
                                                        <option value="lifetime">Vitalício</option>
                                                        <option value="pro_monthly">Pro Mensal</option>
                                                        <option value="pro_annual">Pro Anual</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-lg ${u.plan === 'free' ? 'bg-white/5 text-zinc-400 border-white/10' :
                                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        }`}>
                                                        {u.plan === 'free' ? 'Gratuito' :
                                                            u.plan === 'monthly' ? 'Padrão Mensal' :
                                                                u.plan === 'annual' ? 'Padrão Anual' :
                                                                    u.plan === 'pro_monthly' ? 'PRO Mensal' :
                                                                        u.plan === 'pro_annual' ? 'PRO Anual' : 'Vitalício'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${u.isPremium ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-zinc-500 border-zinc-700/50 bg-zinc-800/50'}`}>
                                                    {u.isPremium ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                    {u.isPremium ? 'Autorizado' : 'Restrito'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                {editingUser === u.id ? (
                                                    <div className="flex gap-3 justify-end">
                                                        <button
                                                            onClick={() => handleUpdatePlan(u.id)}
                                                            className="p-2 bg-emerald-500 text-zinc-950 rounded-xl hover:bg-emerald-400 transition-colors shadow-lg"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingUser(null)}
                                                            className="p-2 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => {
                                                                setEditingUser(u.id);
                                                                setSelectedPlan(u.plan || 'free');
                                                            }}
                                                            className="p-3 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/20 hover:scale-105 active:scale-95"
                                                            title="Editar Plano"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        {u.isPremium && u.plan !== 'lifetime' && (
                                                            <button
                                                                onClick={() => handleCancelSubscription(u.id)}
                                                                disabled={cancellingUser === u.id}
                                                                className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                title="Cancelar assinatura no fim do período"
                                                            >
                                                                {cancellingUser === u.id
                                                                    ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                                    : <Ban className="w-4 h-4" />
                                                                }
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PremiumBackground>
    );
};

export default AdminDashboard;
