import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, MapPin, Calendar, Users, ChevronRight, Star, 
  Sparkles, HardHat, CheckCircle2, Clock, Plus, X, UploadCloud, 
  RefreshCw, Save, UserCheck, MessageSquare, Phone, Map, 
  ChevronDown, ChevronUp, UserPlus, Zap, Pencil, Trash2, Repeat,
  ArrowRightLeft, Briefcase, UserSearch
} from 'lucide-react';
import { LaunchProject, Broker, Client, ClientStatus } from '../types';

interface LaunchesViewProps {
  launches: LaunchProject[];
  clients: Client[];
  brokers: Broker[];
  currentUser: Broker;
  onAddLaunch: (launch: LaunchProject) => void;
  onUpdateLaunch: (launch: LaunchProject) => void;
}

export const LaunchesView: React.FC<LaunchesViewProps> = ({ launches, clients, brokers, currentUser, onAddLaunch, onUpdateLaunch }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLaunch, setEditingLaunch] = useState<LaunchProject | null>(null);
  const [expandedLaunchId, setExpandedLaunchId] = useState<string | null>(null);
  const [isAllocating, setIsAllocating] = useState<string | null>(null);
  const [isMovingLead, setIsMovingLead] = useState<{ clientId: string, sourceLaunchId: string } | null>(null);
  const [journeyBrokerFilter, setJourneyBrokerFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState<Partial<LaunchProject>>({
    name: '',
    builder: '',
    city: '',
    deliveryDate: '',
    progress: 0,
    status: 'Pre-Launch',
    unitsAvailable: 0,
    description: ''
  });

  useEffect(() => {
    if (editingLaunch) {
      setFormData({
        name: editingLaunch.name,
        builder: editingLaunch.builder,
        city: editingLaunch.city,
        deliveryDate: editingLaunch.deliveryDate,
        progress: editingLaunch.progress,
        status: editingLaunch.status,
        unitsAvailable: editingLaunch.unitsAvailable,
        description: editingLaunch.description
      });
    } else {
      setFormData({ name: '', builder: '', city: '', deliveryDate: '', progress: 0, status: 'Pre-Launch', unitsAvailable: 0, description: '' });
    }
  }, [editingLaunch]);

  const handleOpenEdit = (launch: LaunchProject) => {
    setEditingLaunch(launch);
    setIsModalOpen(true);
  };

  const handleSaveLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLaunch) {
      const updatedLaunch: LaunchProject = {
        ...editingLaunch,
        ...formData as any,
        updatedAt: new Date().toISOString()
      };
      onUpdateLaunch(updatedLaunch);
    } else {
      const newLaunch: LaunchProject = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name || '',
        builder: formData.builder || '',
        city: formData.city || 'Londrina/PR',
        deliveryDate: formData.deliveryDate || '',
        progress: formData.progress || 0,
        status: formData.status as any,
        unitsAvailable: formData.unitsAvailable || 0,
        description: formData.description || '',
        allocatedClientIds: [],
        updatedAt: new Date().toISOString()
      };
      onAddLaunch(newLaunch);
    }
    setIsModalOpen(false);
    setEditingLaunch(null);
  };

  const handleAllocateClient = (launch: LaunchProject, clientId: string) => {
    if (launch.allocatedClientIds.includes(clientId)) {
      alert("Este cliente já está alocado para este lançamento.");
      return;
    }
    const updatedLaunch = {
      ...launch,
      allocatedClientIds: [...launch.allocatedClientIds, clientId],
      updatedAt: new Date().toISOString()
    };
    onUpdateLaunch(updatedLaunch);
    setIsAllocating(null);
  };

  const handleRemoveLead = (e: React.MouseEvent, launch: LaunchProject, clientId: string) => {
    // CRITICAL FIX: Isolamento total do evento para evitar bugs de cliques em cards aninhados
    e.preventDefault();
    e.stopPropagation();

    if (currentUser.role !== 'Admin') {
      alert("Acesso negado: Somente Administradores podem gerenciar a exclusão estratégica de leads.");
      return;
    }
    
    const client = clients.find(c => String(c.id) === String(clientId));
    const clientName = client?.name || 'Lead Selecionado';
    const brokerName = client?.assignedAgent || 'gestão';
    
    if (window.confirm(`VETTUS CONFIRMAÇÃO DE EXCLUSÃO:\n\nDeseja remover ${clientName.toUpperCase()} deste lançamento?\n\nO Lead continuará na base central vinculado ao corretor: ${brokerName.toUpperCase()}.`)) {
      const updatedLaunch = {
        ...launch,
        allocatedClientIds: launch.allocatedClientIds.filter(id => String(id) !== String(clientId)),
        updatedAt: new Date().toISOString()
      };
      
      onUpdateLaunch(updatedLaunch);
      // O React atualizará o componente via props após a chamada de onUpdateLaunch no App.tsx
    }
  };

  const handleReallocateLead = (e: React.MouseEvent, destLaunch: LaunchProject) => {
    e.stopPropagation();
    if (!isMovingLead || currentUser.role !== 'Admin') return;
    
    const sourceLaunch = launches.find(l => l.id === isMovingLead.sourceLaunchId);
    if (!sourceLaunch) return;

    // 1. Remover da origem
    const updatedSource = {
      ...sourceLaunch,
      allocatedClientIds: sourceLaunch.allocatedClientIds.filter(id => String(id) !== String(isMovingLead.clientId)),
      updatedAt: new Date().toISOString()
    };
    onUpdateLaunch(updatedSource);

    // 2. Adicionar ao destino
    if (!destLaunch.allocatedClientIds.includes(isMovingLead.clientId)) {
      const updatedDest = {
        ...destLaunch,
        allocatedClientIds: [...destLaunch.allocatedClientIds, isMovingLead.clientId],
        updatedAt: new Date().toISOString()
      };
      onUpdateLaunch(updatedDest);
    }

    setIsMovingLead(null);
    alert("Lead realocado com sucesso na rede Vettus.");
  };

  const getStatusBadge = (status: LaunchProject['status']) => {
    switch(status) {
      case 'Pre-Launch': return { label: 'Pré-Lançamento', color: 'bg-purple-50 text-purple-600 border-purple-100' };
      case 'Under-Construction': return { label: 'Em Obras', color: 'bg-amber-50 text-amber-600 border-amber-100' };
      case 'Finished': return { label: 'Pronto para Morar', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      default: return { label: 'Status Indefinido', color: 'bg-slate-50 text-slate-400 border-slate-100' };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Timeline de Lançamentos VIP</h1>
          <p className="text-slate-500 font-medium">Gestão de empreendimentos e jornada de compra individualizada.</p>
        </div>
        <button 
          onClick={() => { setEditingLaunch(null); setIsModalOpen(true); }}
          className="gold-gradient text-[#0f172a] px-8 py-3 rounded-2xl flex items-center space-x-3 text-xs font-black uppercase tracking-[0.1em] shadow-xl hover:scale-105 transition-all"
        >
           <Star className="w-5 h-5 fill-[#0f172a]" />
           <span>Cadastrar Novo Lançamento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {launches.map(project => {
          const badge = getStatusBadge(project.status);
          const isExpanded = expandedLaunchId === project.id;
          
          const allAllocatedInLaunch = clients.filter(c => project.allocatedClientIds.includes(c.id));
          const journeyFilteredClients = allAllocatedInLaunch.filter(c => 
             journeyBrokerFilter === 'all' || c.brokerId === journeyBrokerFilter
          );

          return (
            <div key={project.id} className={`bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden ${isExpanded ? 'ring-2 ring-[#d4a853]/20' : ''}`}>
               <div className="p-8 flex flex-col lg:flex-row lg:items-center gap-8 relative">
                  <div className="w-full lg:w-48 h-48 rounded-3xl bg-slate-900 overflow-hidden shrink-0 relative flex items-center justify-center border-4 border-white shadow-2xl">
                     <div className="absolute top-3 left-3 z-10">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${badge.color} backdrop-blur-md`}>
                           {badge.label}
                        </span>
                     </div>
                     <Building2 className="w-16 h-16 text-[#d4a853]/40" />
                  </div>

                  <div className="flex-1 space-y-4">
                     <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">{project.name}</h3>
                           <div className="flex items-center text-slate-400">
                              <MapPin className="w-3.5 h-3.5 mr-1.5 text-[#d4a853]" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{project.builder} • {project.city}</span>
                           </div>
                        </div>
                        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 text-right">
                           <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Entrega em</p>
                           <p className="text-xs font-black text-slate-900 uppercase">{project.deliveryDate ? new Date(project.deliveryDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'À Definir'}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-slate-50">
                        <div className="md:col-span-2 space-y-2">
                           <div className="flex justify-between items-center px-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Evolução Estrutural</span>
                              <span className="text-[10px] font-black text-[#d4a853]">{project.progress}%</span>
                           </div>
                           <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                              <div className="h-full gold-gradient shadow-[0_0_15px_rgba(212,168,83,0.3)] transition-all duration-1000" style={{ width: `${project.progress}%` }}></div>
                           </div>
                        </div>
                        <div className="text-center px-4 border-x border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Unidades VIP</p>
                           <p className="text-lg font-black text-slate-900">{project.unitsAvailable} <span className="text-[10px] text-slate-400">Disponíveis</span></p>
                        </div>
                        <div className="flex items-center justify-end space-x-2">
                           <button 
                             onClick={() => handleOpenEdit(project)}
                             className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-[#d4a853] transition-all shadow-sm"
                             title="Editar Lançamento"
                           >
                              <Pencil className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setIsAllocating(project.id)}
                             className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                             title="Alocar Cliente"
                           >
                              <UserPlus className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => {
                                setExpandedLaunchId(isExpanded ? null : project.id);
                                setJourneyBrokerFilter('all'); 
                             }}
                             className={`flex items-center space-x-2 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                               isExpanded ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                             }`}
                           >
                              <span>{isExpanded ? 'Fechar' : `Timeline (${allAllocatedInLaunch.length})`}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               {isExpanded && (
                 <div className="border-t border-slate-100 bg-slate-50/50 p-10 space-y-10 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <h4 className="text-xs font-black uppercase text-slate-500 tracking-[0.3em] flex items-center">
                          <Users className="w-4 h-4 mr-3 text-[#d4a853]" />
                          Jornada de Compra por Cliente
                       </h4>
                       
                       {currentUser.role === 'Admin' && (
                         <div className="flex items-center space-x-3 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
                            <UserSearch className="w-4 h-4 text-[#d4a853] ml-2" />
                            <select 
                              value={journeyBrokerFilter}
                              onChange={e => setJourneyBrokerFilter(e.target.value)}
                              className="text-[10px] font-black uppercase tracking-widest bg-transparent outline-none text-slate-600 cursor-pointer pr-4"
                            >
                               <option value="all">Ver Todos os Corretores</option>
                               {brokers.map(b => (
                                 <option key={b.id} value={b.id}>Eq: {b.name.split(' ')[0]}</option>
                               ))}
                            </select>
                         </div>
                       )}
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                       {journeyFilteredClients.map(client => (
                          <div key={client.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-8 relative group/client overflow-visible">
                             <div className="flex items-center space-x-4 shrink-0 min-w-[280px]">
                                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-[#d4a853] flex items-center justify-center font-black text-xl shadow-lg border-2 border-white">
                                   {client.name[0]}
                                </div>
                                <div>
                                   <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{client.name}</p>
                                   <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                                         client.status === ClientStatus.HOT ? 'bg-red-50 text-red-500 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                      }`}>
                                         {client.status}
                                      </span>
                                      
                                      {currentUser.role === 'Admin' && (
                                        <span className="px-2 py-0.5 bg-[#d4a853]/10 text-[#d4a853] border border-[#d4a853]/20 rounded-md text-[8px] font-black uppercase flex items-center">
                                           <Briefcase className="w-2.5 h-2.5 mr-1" />
                                           {client.assignedAgent?.split(' ')[0] || 'Gestão'}
                                        </span>
                                      )}
                                      
                                      <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}`} target="_blank" className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                                         <Phone className="w-3 h-3" />
                                      </a>
                                   </div>
                                </div>
                             </div>

                             <div className="flex-1 flex items-center justify-between relative px-10">
                                <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100 -translate-y-1/2 -z-0"></div>
                                {[
                                   { label: 'Briefing', icon: MessageSquare },
                                   { label: 'Tour Decorado', icon: Map },
                                   { label: 'Proposta', icon: Save },
                                   { label: 'Aprovado', icon: CheckCircle2 }
                                ].map((step, i) => (
                                   <div key={i} className="relative z-10 flex flex-col items-center">
                                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all bg-white ${
                                         i === 0 ? 'border-[#d4a853] shadow-[0_0_10px_rgba(212,168,83,0.3)]' : 'border-slate-100'
                                      }`}>
                                         <step.icon className={`w-4 h-4 ${i === 0 ? 'text-[#d4a853]' : 'text-slate-300'}`} />
                                      </div>
                                   </div>
                                ))}
                             </div>

                             {/* BOTÕES DE AÇÃO: SEMPRE VISÍVEIS PARA ADMIN E COM ISOLAMENTO DE CLIQUE REFORÇADO */}
                             <div className="flex items-center space-x-2 shrink-0">
                                {currentUser.role === 'Admin' && (
                                   <>
                                      <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMovingLead({ clientId: client.id, sourceLaunchId: project.id }); }}
                                        className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100 relative z-[25] min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
                                        title="Realocar para outro Lançamento"
                                      >
                                         <Repeat className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={(e) => handleRemoveLead(e, project, client.id)}
                                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100 relative z-[25] min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
                                        title="Remover deste Lançamento"
                                      >
                                         <Trash2 className="w-4 h-4" />
                                      </button>
                                   </>
                                )}
                                <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-[#d4a853] transition-all">
                                   <ChevronRight className="w-5 h-5" />
                                </button>
                             </div>
                          </div>
                       ))}
                       
                       {journeyFilteredClients.length === 0 && (
                          <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white">
                             <UserSearch className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Nenhum lead encontrado para este filtro de corretor.</p>
                          </div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          );
        })}
      </div>

      {/* MODAL NOVO/EDITAR LANÇAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => { setIsModalOpen(false); setEditingLaunch(null); }}></div>
           <div className="bg-white w-full max-w-2xl rounded-[3rem] relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col border border-white/20">
              <div className="gold-gradient p-10 text-[#0f172a] shrink-0">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black uppercase tracking-tight">{editingLaunch ? 'Alterar Lançamento' : 'Novo Lançamento VIP'}</h2>
                    <button onClick={() => { setIsModalOpen(false); setEditingLaunch(null); }} className="p-2 hover:bg-black/5 rounded-full"><X className="w-8 h-8" /></button>
                 </div>
              </div>
              <form onSubmit={handleSaveLaunch} className="p-10 bg-slate-50 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nome do Projeto *</label>
                       <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-[#d4a853]" placeholder="Ex: Maison Vettus" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Construtora *</label>
                       <input required value={formData.builder} onChange={e => setFormData({...formData, builder: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-[#d4a853]" placeholder="Ex: A.Yoshii" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Entrega</label>
                       <input type="date" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-[#d4a853]" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Status</label>
                       <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none">
                          <option value="Pre-Launch">Pré-Lançamento</option>
                          <option value="Under-Construction">Em Obras</option>
                          <option value="Finished">Pronto para Morar</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Progresso (%)</label>
                       <input type="number" min="0" max="100" value={formData.progress} onChange={e => setFormData({...formData, progress: parseInt(e.target.value)})} className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Unidades VIP</label>
                       <input type="number" min="0" value={formData.unitsAvailable} onChange={e => setFormData({...formData, unitsAvailable: parseInt(e.target.value)})} className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none" />
                    </div>
                 </div>
                 <button type="submit" className="w-full gold-gradient text-[#0f172a] py-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all">
                    <Save className="w-5 h-5 inline mr-2" />
                    {editingLaunch ? 'Atualizar Lançamento' : 'Consolidar Lançamento'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL ALOCAR CLIENTE */}
      {isAllocating && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setIsAllocating(null)}></div>
           <div className="bg-white w-full max-w-lg rounded-[3rem] relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col border border-white/20">
              <div className="navy-gradient p-8 text-white shrink-0">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-tight">Alocar Interessado</h2>
                    <button onClick={() => setIsAllocating(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-7 h-7" /></button>
                 </div>
              </div>
              <div className="p-8 bg-slate-50 space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
                 {clients.map(client => (
                    <button 
                      key={client.id}
                      onClick={() => handleAllocateClient(launches.find(l => l.id === isAllocating)!, client.id)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#d4a853] transition-all text-left"
                    >
                       <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#d4a853] flex items-center justify-center font-black">{client.name[0]}</div>
                          <div><p className="font-bold text-slate-900 text-xs uppercase">{client.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase">{client.status}</p></div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* MODAL REALOCAR LEAD */}
      {isMovingLead && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setIsMovingLead(null)}></div>
           <div className="bg-white w-full max-w-lg rounded-[3rem] relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col border border-[#d4a853]/20">
              <div className="gold-gradient p-8 text-[#0f172a] shrink-0">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                       <div className="w-12 h-12 bg-[#0f172a] rounded-2xl flex items-center justify-center shadow-lg"><ArrowRightLeft className="w-6 h-6 text-[#d4a853]" /></div>
                       <div>
                          <h2 className="text-xl font-black uppercase tracking-tight">Realocar Lead</h2>
                          <p className="text-[10px] font-black uppercase opacity-60">Selecione o destino estratégico</p>
                       </div>
                    </div>
                    <button onClick={() => setIsMovingLead(null)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-7 h-7" /></button>
                 </div>
              </div>
              <div className="p-8 bg-slate-50 space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Empreendimentos Disponíveis</p>
                 {launches.filter(l => l.id !== isMovingLead.sourceLaunchId).map(dest => (
                    <button 
                      key={dest.id}
                      onClick={(e) => handleReallocateLead(e, dest)}
                      className="w-full flex items-center justify-between p-5 rounded-[2rem] bg-white border border-slate-200 hover:border-[#d4a853] hover:shadow-xl transition-all text-left group"
                    >
                       <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-400 group-hover:bg-[#0f172a] group-hover:text-[#d4a853] flex items-center justify-center transition-all"><Building2 className="w-6 h-6" /></div>
                          <div>
                             <p className="font-black text-slate-900 text-sm uppercase">{dest.name}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase">{dest.builder} • {dest.city}</p>
                          </div>
                       </div>
                       <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Zap className="w-4 h-4" /></div>
                    </button>
                 ))}
                 {launches.length <= 1 && <p className="text-center py-10 text-xs text-slate-400 italic">Cadastre outros lançamentos para habilitar a realocação.</p>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};