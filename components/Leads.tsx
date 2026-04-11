import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { Lead, LeadInsert } from '../services/supabaseService';
import {
    ArrowLeft, Plus, Search, MessageCircle, Phone, Mail, Edit2, Trash2,
    Check, X, User as UserIcon, Filter, Download, RefreshCw
} from 'lucide-react';
import PremiumBackground from './ui/PremiumBackground';

interface LeadsProps {
    user: User;
    onBack: () => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const STATUS_CONFIG = {
    novo:       { label: 'Novo',       color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    contatado:  { label: 'Contatado',  color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
    convertido: { label: 'Convertido', color: 'bg-green-500/15 text-green-400 border-green-500/20' },
    perdido:    { label: 'Perdido',    color: 'bg-red-500/15 text-red-400 border-red-500/20' },
};

const SOURCE_OPTIONS = ['manual', 'Instagram', 'Facebook', 'Google', 'Indicação', 'WhatsApp', 'Site', 'Outro'];

const WHATSAPP_TEMPLATE = `Olá! Tudo bem? 😊\n\nSou da equipe do ShapeScan — o app de nutrição com IA que analisa suas refeições por foto!\n\nGostaria de te apresentar nossa plataforma e ver como podemos te ajudar a atingir seus objetivos. Tem um minutinho? 🚀`;

const buildWhatsAppUrl = (phone: string, name?: string) => {
    const digits = phone.replace(/\D/g, '');
    const fullNumber = digits.length >= 12 ? digits : '55' + digits;
    const msg = name
        ? WHATSAPP_TEMPLATE.replace('Olá!', `Olá, ${name.split(' ')[0]}!`)
        : WHATSAPP_TEMPLATE;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(msg)}`;
};

const EMPTY_FORM: LeadInsert = {
    name: '',
    phone: '',
    email: '',
    source: 'manual',
    status: 'novo',
    notes: '',
};

const Leads: React.FC<LeadsProps> = ({ user, onBack, onShowToast }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Modal de criação/edição
    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<LeadInsert>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => { loadLeads(); }, []);

    const loadLeads = async () => {
        setLoading(true);
        try {
            const data = await db.leads.getAll();
            setLeads(data);
        } catch {
            onShowToast('Erro ao carregar leads', 'error');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setModal('create');
    };

    const openEdit = (lead: Lead) => {
        setForm({
            name: lead.name,
            phone: lead.phone,
            email: lead.email ?? '',
            source: lead.source ?? 'manual',
            status: lead.status,
            notes: lead.notes ?? '',
        });
        setEditingId(lead.id);
        setModal('edit');
    };

    const closeModal = () => {
        setModal(null);
        setEditingId(null);
        setForm(EMPTY_FORM);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.phone.trim()) {
            onShowToast('Nome e WhatsApp são obrigatórios', 'error');
            return;
        }
        setSaving(true);
        try {
            if (modal === 'edit' && editingId) {
                const updated = await db.leads.update(editingId, form);
                setLeads(prev => prev.map(l => l.id === editingId ? updated : l));
                onShowToast('Lead atualizado!', 'success');
            } else {
                const created = await db.leads.create(form);
                setLeads(prev => [created, ...prev]);
                onShowToast('Lead adicionado!', 'success');
            }
            closeModal();
        } catch (e: any) {
            onShowToast(e.message || 'Erro ao salvar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Excluir o lead "${name}"?`)) return;
        setDeletingId(id);
        try {
            await db.leads.remove(id);
            setLeads(prev => prev.filter(l => l.id !== id));
            onShowToast('Lead excluído', 'success');
        } catch {
            onShowToast('Erro ao excluir', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleStatusChange = async (lead: Lead, newStatus: Lead['status']) => {
        try {
            const updated = await db.leads.update(lead.id, { status: newStatus });
            setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
        } catch {
            onShowToast('Erro ao atualizar status', 'error');
        }
    };

    const handleExportCSV = () => {
        const header = ['Nome', 'WhatsApp', 'E-mail', 'Origem', 'Status', 'Observações', 'Cadastrado em'];
        const rows = filtered.map(l => [
            l.name,
            l.phone,
            l.email ?? '',
            l.source ?? '',
            STATUS_CONFIG[l.status]?.label ?? l.status,
            l.notes ?? '',
            new Date(l.created_at).toLocaleDateString('pt-BR'),
        ]);
        const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads_shapescan_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filtered = leads.filter(l => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !q ||
            l.name.toLowerCase().includes(q) ||
            l.phone.includes(q) ||
            (l.email ?? '').toLowerCase().includes(q);
        const matchStatus = filterStatus === 'all' || l.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const counts = {
        all: leads.length,
        novo: leads.filter(l => l.status === 'novo').length,
        contatado: leads.filter(l => l.status === 'contatado').length,
        convertido: leads.filter(l => l.status === 'convertido').length,
        perdido: leads.filter(l => l.status === 'perdido').length,
    };

    const fmtDate = (str: string) =>
        new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <PremiumBackground>
            <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all text-zinc-400"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-white font-black text-2xl tracking-tight">Leads</h1>
                            <p className="text-zinc-500 text-xs font-bold mt-0.5">{leads.length} possíveis clientes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadLeads}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all text-zinc-400"
                            title="Recarregar"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {filtered.length > 0 && (
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-zinc-300 text-xs font-black uppercase tracking-widest"
                            >
                                <Download className="w-3.5 h-3.5" /> Exportar CSV
                            </button>
                        )}
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 transition-all text-white text-xs font-black uppercase tracking-widest"
                        >
                            <Plus className="w-4 h-4" /> Novo Lead
                        </button>
                    </div>
                </div>

                {/* Status tabs */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
                    {[
                        { key: 'all', label: 'Todos', count: counts.all },
                        { key: 'novo', label: 'Novos', count: counts.novo },
                        { key: 'contatado', label: 'Contatados', count: counts.contatado },
                        { key: 'convertido', label: 'Convertidos', count: counts.convertido },
                        { key: 'perdido', label: 'Perdidos', count: counts.perdido },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilterStatus(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                                filterStatus === tab.key
                                    ? 'bg-white/10 text-white border-white/20'
                                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                filterStatus === tab.key ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-500'
                            }`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, WhatsApp ou e-mail..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-white/15 outline-none text-white font-bold text-sm placeholder:text-zinc-600"
                    />
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center">
                            <UserIcon className="w-8 h-8 text-zinc-600" />
                        </div>
                        <p className="text-zinc-500 font-bold text-sm">
                            {searchTerm || filterStatus !== 'all' ? 'Nenhum lead encontrado' : 'Nenhum lead cadastrado ainda'}
                        </p>
                        {!searchTerm && filterStatus === 'all' && (
                            <button
                                onClick={openCreate}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 transition-all text-white text-xs font-black uppercase tracking-widest"
                            >
                                <Plus className="w-4 h-4" /> Adicionar primeiro lead
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(lead => (
                            <div
                                key={lead.id}
                                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] transition-all"
                            >
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    {/* Info */}
                                    <div className="flex items-start gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <UserIcon className="w-5 h-5 text-zinc-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-white font-black text-sm truncate">{lead.name}</h3>
                                                {/* Status badge + select */}
                                                <select
                                                    value={lead.status}
                                                    onChange={e => handleStatusChange(lead, e.target.value as Lead['status'])}
                                                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border cursor-pointer outline-none ${STATUS_CONFIG[lead.status].color} bg-transparent`}
                                                >
                                                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                                                        <option key={val} value={val} className="bg-zinc-900 text-white normal-case tracking-normal">{cfg.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                <span className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold">
                                                    <Phone className="w-3 h-3" /> {lead.phone}
                                                </span>
                                                {lead.email && (
                                                    <span className="flex items-center gap-1.5 text-zinc-500 text-xs font-bold">
                                                        <Mail className="w-3 h-3" /> {lead.email}
                                                    </span>
                                                )}
                                                {lead.source && lead.source !== 'manual' && (
                                                    <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                                                        via {lead.source}
                                                    </span>
                                                )}
                                            </div>
                                            {lead.notes && (
                                                <p className="text-zinc-600 text-xs font-bold mt-1.5 line-clamp-2">{lead.notes}</p>
                                            )}
                                            <p className="text-zinc-700 text-[10px] font-bold mt-1.5">{fmtDate(lead.created_at)}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* WhatsApp button */}
                                        <a
                                            href={buildWhatsAppUrl(lead.phone, lead.name)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 hover:border-[#25D366]/40 text-[#25D366] text-xs font-black uppercase tracking-widest transition-all"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            WhatsApp
                                        </a>
                                        <button
                                            onClick={() => openEdit(lead)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all text-zinc-400 hover:text-white"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(lead.id, lead.name)}
                                            disabled={deletingId === lead.id}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/5 hover:bg-red-500/15 transition-all text-red-500/40 hover:text-red-400 disabled:opacity-40"
                                            title="Excluir"
                                        >
                                            {deletingId === lead.id
                                                ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                : <Trash2 className="w-3.5 h-3.5" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal criar/editar */}
            {modal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={closeModal}
                >
                    <div
                        className="bg-zinc-950 border border-white/10 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-white font-black text-lg tracking-tight">
                                    {modal === 'edit' ? 'Editar Lead' : 'Novo Lead'}
                                </h3>
                                <p className="text-zinc-500 text-xs font-bold mt-0.5">
                                    {modal === 'edit' ? 'Atualize os dados do lead' : 'Cadastre um possível cliente'}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all text-zinc-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Nome completo"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-blue-500/50 outline-none text-white font-bold text-sm placeholder:text-zinc-600"
                                />
                            </div>

                            {/* WhatsApp */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                                    WhatsApp *
                                </label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    placeholder="(11) 99999-9999"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-blue-500/50 outline-none text-white font-bold text-sm placeholder:text-zinc-600"
                                />
                            </div>

                            {/* E-mail */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                                    E-mail
                                </label>
                                <input
                                    type="email"
                                    value={form.email ?? ''}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="email@exemplo.com"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-blue-500/50 outline-none text-white font-bold text-sm placeholder:text-zinc-600"
                                />
                            </div>

                            {/* Origem + Status em linha */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                                        Origem
                                    </label>
                                    <select
                                        value={form.source ?? 'manual'}
                                        onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-blue-500/50 outline-none text-white font-bold text-sm"
                                    >
                                        {SOURCE_OPTIONS.map(s => (
                                            <option key={s} value={s} className="bg-zinc-900">{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                                        Status
                                    </label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm(f => ({ ...f, status: e.target.value as Lead['status'] }))}
                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-blue-500/50 outline-none text-white font-bold text-sm"
                                    >
                                        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                                            <option key={val} value={val} className="bg-zinc-900">{cfg.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Observações */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                                    Observações
                                </label>
                                <textarea
                                    value={form.notes ?? ''}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Anotações sobre o lead..."
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-blue-500/50 outline-none text-white font-bold text-sm placeholder:text-zinc-600 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving || !form.name.trim() || !form.phone.trim()}
                                className="w-full py-4 bg-green-500 hover:bg-green-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving
                                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                                    : <><Check className="w-4 h-4" /> {modal === 'edit' ? 'Salvar alterações' : 'Adicionar lead'}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PremiumBackground>
    );
};

export default Leads;
