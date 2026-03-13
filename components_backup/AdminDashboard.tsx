
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { ArrowLeft, Search, TrendingUp, Users, DollarSign, Check, X, Edit } from 'lucide-react';

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

    if (!user.isAdmin && user.email !== 'contatobielaz@gmail.com') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <h1 className="text-2xl font-bold text-red-500 mb-2">Acesso Negado</h1>
                <p className="text-gray-400">Você não tem permissão para ver esta página.</p>
                <button onClick={onBack} className="mt-4 px-4 py-2 bg-zinc-800 rounded-lg text-white">Voltar</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 hover:scale-105 transition-all"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                    Painel Administrativo
                </h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Usuários</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Receita Total</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue / 100)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Assinaturas Ativas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeSubs}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800/50">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar usuário por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-zinc-950 border-none focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-gray-100 dark:border-zinc-800/50 overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-zinc-950/50 border-b border-gray-100 dark:border-zinc-800">
                                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Usuário</th>
                                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Plano</th>
                                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                                <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Carregando usuários...</td></tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">
                                                    {user.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{user.name || 'Sem nome'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {editingUser === user.id ? (
                                                <select
                                                    value={selectedPlan}
                                                    onChange={(e) => setSelectedPlan(e.target.value)}
                                                    className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-sm border-none outline-none"
                                                >
                                                    <option value="free">Free</option>
                                                    <option value="monthly">Mensal</option>
                                                    <option value="annual">Anual</option>
                                                    <option value="lifetime">Vitalício</option>
                                                    <option value="pro_monthly">Pro Mensal</option>
                                                    <option value="pro_annual">Pro Anual</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.plan === 'free' ? 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400' :
                                                    'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-500 border border-emerald-500/20'
                                                    }`}>
                                                    {user.plan === 'free' ? 'Gratuito' :
                                                        user.plan === 'monthly' ? 'Padrão Mensal' :
                                                            user.plan === 'annual' ? 'Padrão Anual' :
                                                                user.plan === 'pro_monthly' ? 'PRO Mensal' :
                                                                    user.plan === 'pro_annual' ? 'PRO Anual' : 'Vitalício'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`flex items-center gap-1 text-sm ${user.isPremium ? 'text-emerald-500' : 'text-gray-500'}`}>
                                                {user.isPremium ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                {user.isPremium ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {editingUser === user.id ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdatePlan(user.id)}
                                                        className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingUser(null)}
                                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(user.id);
                                                        setSelectedPlan(user.plan || 'free');
                                                    }}
                                                    className="p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                    title="Editar Plano"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
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
    );
};

export default AdminDashboard;
