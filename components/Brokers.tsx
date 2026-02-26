import React, { useState, useEffect } from 'react';
import { 
  Shield, User, Plus, Trash2, Key, Globe, Download, Square, 
  Calendar, ShieldCheck as ShieldIcon, Lock, Unlock, X, CheckSquare, 
  Pencil, Save, Copy, CheckCircle2, Wifi, Zap, UserX, UserCheck, 
  AlertTriangle, History, Star, ArrowRight, ShieldAlert
} from 'lucide-react';
import { Broker, UserRole, AppView, Activity } from '../types.ts';

interface BrokersViewProps {
  brokers: Broker[];
  onAddBroker: (broker: Broker) => void;
  onUpdateBroker: (broker: Broker) => void;
  onDeleteBroker: (id: string) => void;
  onAddActivity: (activity: Activity) => void;
  currentUser: Broker;
}

const MODULES: { id: AppView; label: string }[] = [
  { id: 'dashboard', label: 'PAINEL' },
  { id: 'cash_flow', label: 'FLUXO PAGAMENTO' },
  { id: 'client_payment_flow', label: 'FLUXO DE OBRA' },
  { id: 'tasks', label: 'FUNIL' },
  { id: 'properties', label: 'IMÓVEIS' },
  { id: 'launches', label: 'LANÇAMENTOS' },
  { id: 'clients', label: 'CLIENTES' },
  { id: 'reminders', label: 'LEMBRETES' },
  { id: 'construction_companies', label: 'CONSTRUTORAS' },
  { id: 'ads', label: 'ANÚNCIOS' },
  { id: 'documents', label: 'ARQUIVOS' },
  { id: 'spreadsheets', label: 'PLANILHAS' },
  { id: 'marketing', label: 'MARKETING' },
  { id: 'activities', label: 'AGENDA' },
  { id: 'password_update', label: 'SEGURANÇA (SENHA)' },
  { id: 'lead_import', label: 'IMPORTAÇÃO LEADS' },
  { id: 'sales', label: 'EXTRATO VENDAS' }
];

export const BrokersView: React.FC<BrokersViewProps> = ({ brokers, onAddBroker, onUpdateBroker, onDeleteBroker, onAddActivity, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Broker' as UserRole,
    permissions: ['dashboard', 'tasks', 'properties', 'clients', 'activities', 'reminders'] as AppView[]
  });

  const isAdmin = currentUser.role === 'Admin';

  useEffect(() => {
    if (editingBroker) {
      setFormData({
        name: editingBroker.name,
        email: editingBroker.email,
        password: editingBroker.password || '',
        role: editingBroker.role,
        permissions: editingBroker.permissions || []
      });
    }
  }, [editingBroker]);

  const handleCopyNetworkKey = () => {
    const key = currentUser.networkId || 'VETTUS-PRO';
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePermission = (perm: AppView) => {
    if (!isAdmin) return;
    setFormData(prev => {
      const newPerms = prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm];
      return { ...prev, permissions: newPerms };
    });
  };

  const logAudit = (action: string, brokerName: string) => {
    onAddActivity({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: 'Meeting',
      clientName: 'SISTEMA: SEGURANÇA',
      description: `[AUTOGESTÃO] ${action}: Corretor ${brokerName.toUpperCase()}. Operação registrada por ${currentUser.name}.`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR'),
      updatedAt: new Date().toISOString()
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBroker) {
      const updatedData = isAdmin 
        ? { ...editingBroker, ...formData, updatedAt: new Date().toISOString() } 
        : { ...editingBroker, password: formData.password, updatedAt: new Date().toISOString() };
      
      onUpdateBroker(updatedData);
      logAudit(isAdmin ? 'ALTERAÇÃO DE PERMISSÕES/DADOS' : 'ALTERAÇÃO DE SENHA PESSOAL', formData.name);
      alert("Alterações salvas com sucesso!");
    } else if (isAdmin) {
      const newBroker = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        joinDate: new Date().toISOString().split('T')[0],
        performance: 0,
        networkId: currentUser.networkId,
        blocked: false,
        deleted: false,
        updatedAt: new Date().toISOString()
      };
      onAddBroker(newBroker);
      logAudit('CADASTRO DE NOVO MEMBRO', formData.name);
    }
    setShowModal(false);
  };

  const handleApprovePassword = (broker: Broker) => {
    if (!isAdmin || !broker.pendingPassword) return;
    
    if (confirm(`LIBERAR ACESSO: Confirmar a ativação da nova senha solicitada por ${broker.name}?`)) {
       const updatedBroker: Broker = {
          ...broker,
          password: broker.pendingPassword,
          pendingPassword: undefined,
          updatedAt: new Date().toISOString()
       };
       onUpdateBroker(updatedBroker);
       logAudit('LIBERAÇÃO DE NOVA SENHA', broker.name);
       alert("Credencial liberada com sucesso.");
    }
  };

  const handleToggleBlock = (broker: Broker) => {
    if (!isAdmin) return;
    const isSergio = broker.email.toLowerCase() === 'scarrasco462@gmail.com';
    if (isSergio) {
       alert("ERRO DE SEGURANÇA: O Administrador Master não pode ser bloqueado.");
       return;
    }
    const newStatus = !broker.blocked;
    onUpdateBroker({ ...broker, blocked: newStatus, updatedAt: new Date().toISOString() });
    logAudit(newStatus ? 'ACESSO SUSPENSO' : 'ACESSO REESTABELECIDO', broker.name);
  };

  const handleDelete = (broker: Broker) => {
    if (!isAdmin) return;
    const isSergio = broker.email.toLowerCase() === 'scarrasco462@gmail.com';
    if (isSergio) {
       alert("ERRO DE SEGURANÇA: O Administrador Master não pode ser removido.");
       return;
    }
    if (window.confirm(`⚠ EXCLUSÃO DEFINITIVA ⚠\n\nDeseja remover ${broker.name.toUpperCase()} da rede?`)) {
      onDeleteBroker(broker.id);
      logAudit('EXCLUSÃO DE MEMBRO', broker.name);
    }
  };

  const activeBrokers = brokers.filter(b => !b.deleted);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Equipe Vettus</h1>
          <p className="text-slate-500 font-medium italic">Rede de inteligência e colaboração imobiliária.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => { setEditingBroker(null); setFormData({ name: '', email: '', password: '', role: 'Broker', permissions: ['dashboard', 'tasks', 'properties', 'clients', 'activities', 'reminders'] }); setShowModal(true); }}
            className="gold-gradient text-[#0a1120] px-8 py-3.5 rounded-2xl flex items-center space-x-3 text-xs font-black uppercase tracking-[0.1em] shadow-xl hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Membro na Rede</span>
          </button>
        )}
      </div>

      <div className="bg-[#0a1120] rounded-[3.5rem] p-10 text-white border-2 border-white/5 relative overflow-hidden shadow-2xl group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4a853]/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-[#d4a853]/10"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 gold-gradient rounded-[2rem] flex items-center justify-center shadow-2xl transition-transform border-4 border-white/10">
              <Wifi className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Unidade Vettus-Sync</h2>
              <p className="text-slate-400 text-xs font-medium max-w-sm mt-1 leading-relaxed">
                Gestão centralizada de acesso e auditoria de credenciais P2P.
              </p>
            </div>
          </div>
          
          <div className="bg-white/5 border-2 border-white/10 p-5 rounded-3xl flex items-center space-x-6 min-w-[320px] justify-between transition-all hover:bg-white/10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[#d4a853] uppercase tracking-widest mb-1">ID DE REDE ATIVO</span>
              <span className="text-xl font-black tracking-[0.3em] font-mono text-white">
                {currentUser.networkId || 'VETTUS-PRO'}
              </span>
            </div>
            <button 
              onClick={handleCopyNetworkKey}
              className="p-4 bg-white/5 hover:bg-[#d4a853] hover:text-white rounded-2xl transition-all text-[#d4a853]"
            >
              {copied ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {activeBrokers.map(broker => {
          const isMe = broker.id === currentUser.id;
          const hasPendingPassword = !!broker.pendingPassword;
          
          return (
            <div key={broker.id} className={`bg-white rounded-[3rem] border shadow-sm p-8 transition-all group relative overflow-hidden ${broker.blocked ? 'grayscale bg-slate-50' : 'border-slate-100 hover:shadow-2xl'} ${isMe ? 'ring-4 ring-[#d4a853]/10' : ''}`}>
               <div className="flex items-center space-x-5 mb-6">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-lg ${broker.role === 'Admin' ? 'gold-gradient text-white' : 'bg-slate-900 text-[#d4a853]'}`}>
                    {broker.name[0]}
                  </div>
                  <div>
                     <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{broker.name}</h3>
                        {broker.role === 'Admin' && <Shield className="w-4 h-4 text-[#d4a853]" />}
                     </div>
                     <div className="flex items-center space-x-2 mt-1">
                        <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {broker.role}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${broker.blocked ? 'bg-red-50 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                          {broker.blocked ? 'Suspenso' : 'Ativo'}
                        </span>
                     </div>
                  </div>
               </div>

               {/* ALERTA DE SENHA PENDENTE (EXCLUSIVO ADMIN) */}
               {isAdmin && hasPendingPassword && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 animate-pulse">
                     <div className="flex items-center space-x-3 mb-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <span className="text-[10px] font-black text-amber-800 uppercase">Senha Pendente</span>
                     </div>
                     <p className="text-[9px] text-amber-700 font-bold leading-tight mb-3">O corretor solicitou uma nova credencial e aguarda liberação.</p>
                     <button 
                       onClick={() => handleApprovePassword(broker)}
                       className="w-full bg-amber-600 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all flex items-center justify-center space-x-2"
                     >
                        <Key className="w-3 h-3" />
                        <span>Liberar Acesso</span>
                     </button>
                  </div>
               )}

               <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">E-mail Profissional</p>
                  <p className="text-xs font-black text-slate-700 truncate">{broker.email}</p>
               </div>
               
               <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex -space-x-2">
                     {(broker.permissions || []).slice(0, 5).map(p => (
                       <div key={p} className="w-6 h-6 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center shadow-sm" title={p}>
                          <div className="w-1.5 h-1.5 rounded-full bg-[#d4a853]"></div>
                       </div>
                     ))}
                  </div>
                  <div className="flex items-center space-x-2">
                     {isAdmin && broker.email.toLowerCase() !== 'scarrasco462@gmail.com' && (
                        <>
                           <button 
                             onClick={() => handleToggleBlock(broker)}
                             className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                             title="Suspender"
                           >
                             <UserX className="w-4.5 h-4.5" />
                           </button>
                           <button 
                             onClick={() => handleDelete(broker)}
                             className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                             title="Remover"
                           >
                             <Trash2 className="w-4.5 h-4.5" />
                           </button>
                        </>
                     )}
                     {(isAdmin || isMe) && (
                        <button 
                          onClick={() => { setEditingBroker(broker); setShowModal(true); }}
                          className="p-3 bg-[#0a1120] text-[#d4a853] hover:bg-slate-900 rounded-xl transition-all shadow-sm"
                        >
                           <Pencil className="w-4.5 h-4.5" />
                        </button>
                     )}
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-white/20">
            <div className="navy-gradient p-10 text-white flex justify-between items-center border-b border-[#d4a853]/30">
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 gold-gradient rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                  <ShieldIcon className="w-8 h-8 text-[#0a1120]" />
                </div>
                <div>
                   <h2 className="text-2xl font-black uppercase tracking-tight">
                     {editingBroker ? 'Editar Membro' : 'Novo Corretor'}
                   </h2>
                   <p className="text-[#d4a853] text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Rede Vettus</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X className="w-8 h-8" /></button>
            </div>

            <form onSubmit={handleSave} className="p-10 bg-slate-50 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Nome Completo</label>
                      <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-[#d4a853]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">E-mail Profissional</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-[#d4a853]" />
                    </div>
                    {isAdmin && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Nível de Acesso</label>
                        <select 
                          value={formData.role} 
                          onChange={e => {
                            const newRole = e.target.value as UserRole;
                            setFormData({
                              ...formData, 
                              role: newRole,
                              permissions: newRole === 'Admin' 
                                ? MODULES.map(m => m.id) 
                                : ['dashboard', 'tasks', 'properties', 'clients', 'activities', 'reminders']
                            });
                          }} 
                          className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-[#d4a853]"
                        >
                          <option value="Broker">Corretor (Padrão)</option>
                          <option value="Admin">Administrador (Total)</option>
                        </select>
                      </div>
                    )}
                    {isAdmin && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#d4a853] uppercase ml-2 tracking-widest">Senha de Sincronia</label>
                        <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-white border-2 border-[#d4a853] rounded-2xl py-4 px-6 text-sm font-black text-slate-900 outline-none" placeholder="Definir credencial" />
                      </div>
                    )}
                 </div>

                 <div className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-200 shadow-sm flex flex-col h-[350px]">
                    <div className="flex items-center space-x-3 mb-6 border-b pb-4">
                       <Zap className="w-5 h-5 text-[#d4a853]" />
                       <p className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Permissões de Rede</p>
                    </div>
                    <div className="space-y-2 overflow-y-auto pr-2 no-scrollbar flex-1">
                       {MODULES.map(m => (
                         <button 
                           key={m.id} 
                           type="button" 
                           onClick={() => togglePermission(m.id)} 
                           className={`w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                             formData.permissions.includes(m.id) 
                             ? 'bg-[#d4a853]/10 border-[#d4a853] text-[#8a6d3b]' 
                             : 'bg-slate-50 border-slate-100 text-slate-400'
                           } hover:border-slate-300`}
                         >
                           <span>{m.label}</span>
                           {formData.permissions.includes(m.id) && <CheckCircle2 className="w-4 h-4" />}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
              
              <button type="submit" className="w-full gold-gradient text-[#0a1120] py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all">
                <Save className="w-6 h-6" />
                <span>Salvar Membro na Rede</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};