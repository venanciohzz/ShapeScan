import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { AdminUserDetails } from '../services/supabaseService';
import { ArrowLeft, Search, TrendingUp, Users, DollarSign, Check, X, Edit, ShieldX, Ban, ChevronDown, Calendar, Clock, AlertTriangle, Crown, Zap, UserCheck, UserX, Activity, MessageSquare, Scan, Star, Flame, BarChart2, RefreshCw } from 'lucide-react';
import PremiumBackground from './ui/PremiumBackground';
import LetterPuller from './ui/LetterPuller';

interface AdminDashboardProps {
    user: User;
    onBack: () => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const planLabel: Record<string, string> = {
    free: 'Gratuito', monthly: 'Padrão Mensal', annual: 'Padrão Anual',
    lifetime: 'Vitalício', pro_monthly: 'PRO Mensal', pro_annual: 'PRO Anual',
};

const goalLabel: Record<string, string> = {
    lose: 'Perder Peso', maintain: 'Manter', gain: 'Ganhar Massa', recomp: 'Recomp',
};

const reasonLabel: Record<string, string> = {
    expensive: 'Caro', low_usage: 'Pouco uso', alternative: 'Alternativa',
    technical: 'Problema técnico', other: 'Outro', admin: 'Cancelado pelo Admin',
};

const fmtDate = (ts: number | null | undefined) => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateStr = (str: string | null | undefined) => {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onBack, onShowToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState({ totalRevenue: 0, totalUsers: 0, activeSubs: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>('free');
    const [cancellingUser, setCancellingUser] = useState<string | null>(null);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [userDetails, setUserDetails] = useState<Record<string, AdminUserDetails>>({});
    const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
    const [detailPeriod, setDetailPeriod] = useState<'7d' | '30d' | '12m'>('30d');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // @ts-ignore
            const [usersList, statsData] = await Promise.all([db.admin.getAllUsers(), db.admin.getStats()]);
            setUsers(usersList);
            setStats(statsData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            onShowToast('Erro ao carregar dados do admin', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadUserDetails = useCallback(async (userId: string) => {
        if (userDetails[userId]) return; // já carregado
        setLoadingDetails(userId);
        try {
            // @ts-ignore
            const details = await db.admin.getUserDetails(userId);
            setUserDetails(prev => ({ ...prev, [userId]: details }));
        } catch (e) {
            console.error('Erro ao carregar detalhes:', e);
        } finally {
            setLoadingDetails(null);
        }
    }, [userDetails]);

    const toggleExpand = (userId: string) => {
        if (expandedUser === userId) {
            setExpandedUser(null);
        } else {
            setExpandedUser(userId);
            loadUserDetails(userId);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.username?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchPlan = filterPlan === 'all' || u.plan === filterPlan ||
            (filterPlan === 'premium' && u.isPremium) ||
            (filterPlan === 'free' && !u.isPremium) ||
            (filterPlan === 'cancelling' && u.cancelAtPeriodEnd);
        return matchSearch && matchPlan;
    });

    const handleCancelSubscription = async (userId: string) => {
        if (!window.confirm('Cancelar assinatura no fim do período atual? O usuário não será cobrado no próximo ciclo, mas mantém acesso até o vencimento.')) return;
        setCancellingUser(userId);
        try {
            // @ts-ignore
            const result = await db.admin.cancelUserSubscription(userId);
            loadData();
            onShowToast(`Assinatura cancelada — acesso até ${result.expiry_date}`, 'success');
        } catch (error: any) {
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
            loadData();
            onShowToast('Plano atualizado com sucesso!', 'success');
        } catch (error) {
            onShowToast('Erro ao atualizar plano', 'error');
        }
    };

    const cancellingCount = users.filter(u => u.cancelAtPeriodEnd).length;
    const freeCount = users.filter(u => !u.isPremium).length;

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
        <PremiumBackground className="min-h-screen p-4 md:p-10 pt-20 pb-32 overflow-x-hidden" dim={true} intensity={1.2}>
            <div className="max-w-7xl mx-auto space-y-10 relative z-10">

                {/* Header */}
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-white group shrink-0">
                        <ArrowLeft className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                    </button>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-serif-premium font-bold tracking-tight text-white mb-1">
                            <LetterPuller text="Painel Administrativo" />
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 opacity-80">Controle de Autoridade Master</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Usuários', value: stats.totalUsers, icon: <Users className="w-5 h-5 text-blue-500" />, color: 'blue' },
                        { label: 'Receita Total', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.totalRevenue / 100), icon: <DollarSign className="w-5 h-5 text-emerald-500" />, color: 'emerald' },
                        { label: 'Assinaturas Ativas', value: stats.activeSubs, icon: <TrendingUp className="w-5 h-5 text-purple-500" />, color: 'purple' },
                        { label: 'Cancelamentos', value: cancellingCount, icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, color: 'amber' },
                    ].map(s => (
                        <div key={s.label} className="bg-zinc-950/40 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-${s.color}-500/10 rounded-full blur-[40px] -mr-12 -mt-12 opacity-50 group-hover:opacity-100 transition-opacity duration-700`}></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">{s.label}</p>
                                    <p className="text-2xl md:text-3xl font-serif-premium font-bold text-white tracking-tighter">{s.value}</p>
                                </div>
                                <div className={`w-11 h-11 rounded-xl bg-${s.color}-500/10 flex items-center justify-center border border-${s.color}-500/20`}>
                                    {s.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-zinc-950/40 backdrop-blur-3xl p-5 rounded-[2rem] border border-white/5 shadow-2xl flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, email ou @username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 outline-none transition-all font-bold text-white placeholder:text-zinc-600 text-sm"
                        />
                    </div>
                    <select
                        value={filterPlan}
                        onChange={(e) => setFilterPlan(e.target.value)}
                        className="px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-emerald-500/50 outline-none text-zinc-300 font-bold text-sm"
                    >
                        <option value="all">Todos os planos</option>
                        <option value="premium">Somente premium</option>
                        <option value="free">Somente gratuito</option>
                        <option value="cancelling">Cancelamento agendado</option>
                        <option value="pro_monthly">PRO Mensal</option>
                        <option value="pro_annual">PRO Anual</option>
                        <option value="monthly">Padrão Mensal</option>
                        <option value="annual">Padrão Anual</option>
                    </select>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest shrink-0">
                        <Activity className="w-4 h-4" />
                        {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Users List */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="bg-zinc-950/40 backdrop-blur-3xl p-16 rounded-[2.5rem] border border-white/5 text-center">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">Acessando Banco de Dados...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="bg-zinc-950/40 p-16 rounded-[2.5rem] border border-white/5 text-center">
                            <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">Nenhum usuário encontrado</p>
                        </div>
                    ) : (
                        filteredUsers.map(u => {
                            const isExpanded = expandedUser === u.id;
                            const isEditing = editingUser === u.id;
                            const isCancelling = cancellingUser === u.id;

                            return (
                                <div key={u.id} className="bg-zinc-950/40 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-xl overflow-hidden">
                                    {/* Main Row */}
                                    <div
                                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                        onClick={() => toggleExpand(u.id)}
                                    >
                                        {/* Avatar + Name */}
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="relative shrink-0">
                                                {u.photo ? (
                                                    <img src={u.photo} alt={u.name} className="w-12 h-12 rounded-2xl object-cover" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center text-white font-bold text-lg border border-white/10">
                                                        {u.name?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                                {u.isAdmin && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                                                        <Crown className="w-2.5 h-2.5 text-zinc-950" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-white text-sm tracking-tight truncate">{u.name || 'Sem nome'}</p>
                                                    {u.emailConfirmed ? (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[7px] font-black uppercase tracking-widest border border-emerald-500/20 shrink-0">
                                                            <UserCheck className="w-2 h-2" /> Verificado
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[7px] font-black uppercase tracking-widest border border-amber-500/20 shrink-0">
                                                            <UserX className="w-2 h-2" /> Pendente
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                                                <p className="text-[10px] text-zinc-600 font-medium">@{u.username}</p>
                                            </div>
                                        </div>

                                        {/* Plan Badge */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                                        u.plan === 'free'
                                                            ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50'
                                                            : u.cancelAtPeriodEnd
                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                        {planLabel[u.plan || 'free'] || u.plan}
                                                    </span>
                                                    {u.cancelAtPeriodEnd && (
                                                        <span className="px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
                                                            Encerrando
                                                        </span>
                                                    )}
                                                </div>
                                                {u.cancelAtPeriodEnd && u.subscriptionEnd && (
                                                    <p className="text-[9px] text-red-400/70 font-bold mt-1 text-right">
                                                        Fim: {fmtDate(u.subscriptionEnd)}
                                                    </p>
                                                )}
                                                {!u.cancelAtPeriodEnd && u.subscriptionEnd && u.isPremium && (
                                                    <p className="text-[9px] text-zinc-500 font-bold mt-1 text-right">
                                                        Renova: {fmtDate(u.subscriptionEnd)}
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (() => {
                                        const det = userDetails[u.id];
                                        const isLoadingDet = loadingDetails === u.id;

                                        // Period data for chart
                                        const periodData = detailPeriod === '7d' ? det?.usageLast7Days
                                            : detailPeriod === '30d' ? det?.usageLast30Days
                                            : det?.usageByMonth;
                                        const maxVal = Math.max(1, ...(periodData?.map(d => d.food + d.shape + d.chat) ?? []));

                                        return (
                                        <div className="border-t border-white/5 p-5 space-y-6">

                                            {/* Profile Info Grid */}
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-3">Perfil & Assinatura</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                    {[
                                                        { label: 'Cadastro', value: fmtDateStr(u.createdAt ? new Date(u.createdAt).toISOString() : undefined), icon: <Calendar className="w-3 h-3" /> },
                                                        { label: 'Assinatura Desde', value: fmtDate(u.subscriptionStart), icon: <Clock className="w-3 h-3" /> },
                                                        { label: u.cancelAtPeriodEnd ? 'Acesso até' : 'Próxima Cobrança', value: fmtDate(u.subscriptionEnd), icon: <Zap className="w-3 h-3" />, highlight: u.cancelAtPeriodEnd ? 'red' : undefined },
                                                        { label: 'Cancelado em', value: fmtDate(u.cancelledAt), icon: <Ban className="w-3 h-3" />, highlight: u.cancelledAt ? 'red' : undefined },
                                                        { label: 'Motivo Cancel.', value: u.cancellationReason ? (reasonLabel[u.cancellationReason] || u.cancellationReason) : '—', icon: <AlertTriangle className="w-3 h-3" /> },
                                                        { label: 'Objetivo', value: u.goal ? (goalLabel[u.goal] || u.goal) : '—', icon: <TrendingUp className="w-3 h-3" /> },
                                                        { label: 'Peso / Altura', value: u.weight && u.height ? `${u.weight}kg / ${u.height}m` : '—', icon: <Users className="w-3 h-3" /> },
                                                        { label: 'Telefone', value: u.phone || '—', icon: <Activity className="w-3 h-3" /> },
                                                    ].map(item => (
                                                        <div key={item.label} className="bg-white/[0.02] rounded-2xl p-3.5 border border-white/5">
                                                            <div className={`flex items-center gap-1.5 mb-1.5 ${item.highlight === 'red' && item.value !== '—' ? 'text-red-400' : 'text-zinc-500'}`}>
                                                                {item.icon}
                                                                <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                                                            </div>
                                                            <p className={`text-sm font-bold ${item.highlight === 'red' && item.value !== '—' ? 'text-red-300' : 'text-white'}`}>{item.value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Usage Stats */}
                                            {isLoadingDet ? (
                                                <div className="flex items-center gap-3 py-6">
                                                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Carregando dados de uso...</p>
                                                </div>
                                            ) : det ? (
                                                <>
                                                    {/* Totals */}
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-3">Uso Total (desde o início)</p>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                                            {[
                                                                { label: 'Scans Refeição', value: det.totalFoodScans, icon: <Scan className="w-4 h-4 text-emerald-500" />, color: 'emerald' },
                                                                { label: 'Logs Salvos', value: det.totalFoodLogs, icon: <Activity className="w-4 h-4 text-blue-500" />, color: 'blue' },
                                                                { label: 'Scans Físicos', value: det.totalShapeScans, icon: <BarChart2 className="w-4 h-4 text-purple-500" />, color: 'purple' },
                                                                { label: 'Msgs ao Personal', value: det.totalChatMessages, icon: <MessageSquare className="w-4 h-4 text-amber-500" />, color: 'amber' },
                                                            ].map(s => (
                                                                <div key={s.label} className="bg-white/[0.02] rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                                                                    <div className={`w-9 h-9 rounded-xl bg-${s.color}-500/10 flex items-center justify-center shrink-0`}>{s.icon}</div>
                                                                    <div>
                                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">{s.label}</p>
                                                                        <p className="text-xl font-serif-premium font-bold text-white">{s.value}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Gamification */}
                                                    {det.userStats && (
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-3">Gamificação</p>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                                <div className="bg-amber-500/5 rounded-2xl p-3.5 border border-amber-500/10">
                                                                    <div className="flex items-center gap-1.5 mb-1 text-amber-500"><Crown className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-widest">Nível</span></div>
                                                                    <p className="text-xl font-serif-premium font-bold text-amber-400">{det.userStats.level}</p>
                                                                    <p className="text-[8px] text-zinc-500">{det.userStats.experience} XP</p>
                                                                </div>
                                                                <div className="bg-orange-500/5 rounded-2xl p-3.5 border border-orange-500/10">
                                                                    <div className="flex items-center gap-1.5 mb-1 text-orange-400"><Flame className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-widest">Sequência</span></div>
                                                                    <p className="text-xl font-serif-premium font-bold text-orange-400">{det.userStats.currentStreak} dias</p>
                                                                    <p className="text-[8px] text-zinc-500">Recorde: {det.userStats.longestStreak} dias</p>
                                                                </div>
                                                                <div className="bg-blue-500/5 rounded-2xl p-3.5 border border-blue-500/10">
                                                                    <div className="flex items-center gap-1.5 mb-1 text-blue-400"><Activity className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-widest">Total Logs</span></div>
                                                                    <p className="text-xl font-serif-premium font-bold text-blue-400">{det.userStats.totalLogs}</p>
                                                                </div>
                                                                <div className="bg-emerald-500/5 rounded-2xl p-3.5 border border-emerald-500/10">
                                                                    <div className="flex items-center gap-1.5 mb-1 text-emerald-400"><Star className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-widest">Badges</span></div>
                                                                    <p className="text-xl font-serif-premium font-bold text-emerald-400">{det.userStats.badges.length}</p>
                                                                    <p className="text-[8px] text-zinc-500 truncate">{det.userStats.badges.slice(0, 2).join(', ') || '—'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Usage Chart */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Atividade por Período</p>
                                                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                                {(['7d', '30d', '12m'] as const).map(p => (
                                                                    <button key={p} onClick={() => setDetailPeriod(p)}
                                                                        className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${detailPeriod === p ? 'bg-emerald-500 text-zinc-950' : 'bg-white/5 text-zinc-500 hover:text-white'}`}>
                                                                        {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '12 meses'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {!periodData || periodData.length === 0 ? (
                                                            <p className="text-zinc-600 text-xs font-bold py-4 text-center">Nenhuma atividade neste período</p>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                {periodData.map((d, i) => {
                                                                    const label = detailPeriod === '12m'
                                                                        ? new Date(d.date + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                                                                        : new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                                                                    const total = d.food + d.shape + d.chat;
                                                                    return (
                                                                        <div key={i} className="flex items-center gap-3">
                                                                            <span className="text-[9px] font-bold text-zinc-600 w-14 shrink-0 text-right">{label}</span>
                                                                            <div className="flex-1 h-5 bg-white/[0.02] rounded-full overflow-hidden flex">
                                                                                {d.food > 0 && <div className="h-full bg-emerald-500/60 transition-all" style={{ width: `${(d.food / maxVal) * 100}%` }} title={`Food: ${d.food}`} />}
                                                                                {d.shape > 0 && <div className="h-full bg-purple-500/60 transition-all" style={{ width: `${(d.shape / maxVal) * 100}%` }} title={`Shape: ${d.shape}`} />}
                                                                                {d.chat > 0 && <div className="h-full bg-amber-500/60 transition-all" style={{ width: `${(d.chat / maxVal) * 100}%` }} title={`Chat: ${d.chat}`} />}
                                                                            </div>
                                                                            <span className="text-[9px] font-black text-zinc-500 w-6 shrink-0">{total}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <div className="flex items-center gap-4 pt-2">
                                                                    {[['emerald', 'Refeição'], ['purple', 'Físico'], ['amber', 'Chat']].map(([c, l]) => (
                                                                        <div key={c} className="flex items-center gap-1.5">
                                                                            <div className={`w-2.5 h-2.5 rounded-sm bg-${c}-500/60`} />
                                                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{l}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            ) : null}

                                            {/* Actions Row */}
                                            <div className="flex flex-wrap gap-3 pt-1 border-t border-white/5">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-3">
                                                        <select
                                                            value={selectedPlan}
                                                            onChange={(e) => setSelectedPlan(e.target.value)}
                                                            className="px-4 py-2 rounded-xl bg-zinc-900 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider outline-none"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="free">Gratuito</option>
                                                            <option value="monthly">Mensal</option>
                                                            <option value="annual">Anual</option>
                                                            <option value="lifetime">Vitalício</option>
                                                            <option value="pro_monthly">Pro Mensal</option>
                                                            <option value="pro_annual">Pro Anual</option>
                                                        </select>
                                                        <button onClick={(e) => { e.stopPropagation(); handleUpdatePlan(u.id); }}
                                                            className="px-4 py-2 bg-emerald-500 text-zinc-950 rounded-xl hover:bg-emerald-400 transition-colors font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                                            <Check className="w-3.5 h-3.5" /> Salvar
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingUser(null); }}
                                                            className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-colors font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                                            <X className="w-3.5 h-3.5" /> Cancelar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingUser(u.id); setSelectedPlan(u.plan || 'free'); }}
                                                            className="px-4 py-2 bg-white/5 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 rounded-xl transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 border border-transparent hover:border-emerald-500/20"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" /> Alterar Plano
                                                        </button>
                                                        {u.isPremium && u.plan !== 'lifetime' && !u.cancelAtPeriodEnd && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleCancelSubscription(u.id); }}
                                                                disabled={isCancelling}
                                                                className="px-4 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 rounded-xl transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 border border-transparent hover:border-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                                            >
                                                                {isCancelling
                                                                    ? <><div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> Cancelando...</>
                                                                    : <><Ban className="w-3.5 h-3.5" /> Cancelar Assinatura</>
                                                                }
                                                            </button>
                                                        )}
                                                        {u.cancelAtPeriodEnd && (
                                                            <span className="px-4 py-2 bg-amber-500/5 text-amber-400/60 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 border border-amber-500/10">
                                                                <AlertTriangle className="w-3.5 h-3.5" /> Cancelamento agendado
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setUserDetails(prev => { const n = {...prev}; delete n[u.id]; return n; }); loadUserDetails(u.id); }}
                                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2"
                                                        >
                                                            <RefreshCw className="w-3.5 h-3.5" /> Atualizar Dados
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })()}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </PremiumBackground>
    );
};

export default AdminDashboard;
