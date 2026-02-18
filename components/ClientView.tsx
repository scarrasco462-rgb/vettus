
import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Phone, UserPlus, X, User, Users, DollarSign, History, Plus, Tag, ShieldCheck, Check, Sparkles, Zap, Star, UserCheck, CalendarDays, Calendar, MessageCircle, PhoneForwarded, Save, Award, Building2, Pencil, Trash2, Home, Clock, CheckCircle2, RefreshCw, FileUp, UserSearch, Filter } from 'lucide-react';
import { Client, ClientStatus, Broker, Activity, Property, Commission, Reminder } from '../types.ts';

interface ClientViewProps {
  clients: Client[];
  activities: Activity[];
  properties: Property[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onEditClient: (client: Client) => void;
  onAddActivity: (activity: Activity) => void;
  onAddReminder: (reminder: Reminder) => void;
  onAddSale: (sale: Commission) => void;
  onUpdateProperty: (property: Property) => void;
  currentUser: Broker;
  brokers: Broker[]; 
  onOpenAddModal?: () => void;
  onOpenImport?: () => void;
}

type SortType = 'alpha' | 'registration' | 'service';

export const ClientView: React.FC<ClientViewProps> = ({ 
  clients, activities, onUpdateClient, onDeleteClient, onEditClient, onAddActivity, onAddReminder, currentUser, brokers, onOpenAddModal, onOpenImport
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('registration');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('all');
  
  // Estados para Registro de Atendimento Atual
  const [currentAtendimento, setCurrentAtendimento] = useState({ type: 'Call', desc: '' });
  
  // Estados para Agendamento de Próximo Passo
  const [nextStep, setNextStep] = useState({ date: '', time: '10:00', type: 'Call' });

  // Primeiro filtra por corretor (se admin)
  const filteredByBroker = useMemo(() => {
    if (selectedBrokerId === 'all') return clients;
    return clients.filter(c => c.brokerId === selectedBrokerId);
  }, [clients, selectedBrokerId]);

  // Depois ordena
  const sortedClients = useMemo(() => {
    const list = [...filteredByBroker];
    switch (sortBy) {
      case 'alpha': return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'service': return list.sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime());
      default: return list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }
  }, [filteredByBroker, sortBy]);

  const handleOpenHistory = (client: Client) => {
    setSelectedClient(client);
    setCurrentAtendimento({ type: 'Call', desc: '' });
    setNextStep({ 
      date: client.nextActivityDate || '', 
      time: client.nextActivityTime || '10:00', 
      type: client.nextActivityType || 'Call' 
    });
    setShowHistoryModal(true);
  };

  const handleSaveAtendimento = () => {
    if (!selectedClient || !currentAtendimento.desc.trim()) return;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    onAddActivity({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: currentAtendimento.type as any,
      clientName: selectedClient.name,
      description: currentAtendimento.desc,
      date: dateStr,
      time: timeStr,
      updatedAt: now.toISOString()
    });
    const updatedClient = { ...selectedClient, lastContact: dateStr, updatedAt: now.toISOString() };
    onUpdateClient(updatedClient);
    setSelectedClient(updatedClient);
    setCurrentAtendimento({ type: 'Call', desc: '' });
  };

  const handleSaveAgendamento = () => {
    if (!selectedClient || !nextStep.date) return;
    
    const updatedClient = { 
      ...selectedClient, 
      nextActivityDate: nextStep.date, 
      nextActivityTime: nextStep.time, 
      nextActivityType: nextStep.type as any,
      updatedAt: new Date().toISOString() 
    };
    onUpdateClient(updatedClient);
    setSelectedClient(updatedClient);

    onAddReminder({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      title: `${nextStep.type === 'Call' ? 'Ligar para' : 'Encontro com'} ${selectedClient.name} às ${nextStep.time}`,
      dueDate: nextStep.date,
      priority: 'High',
      completed: false,
      updatedAt: new Date().toISOString()
    });

    alert("Próxima ação agendada e lembrete criado com sucesso!");
  };

  const getStatusColor = (status: ClientStatus) => {
    switch(status) {
      case ClientStatus.WON: return 'gold-gradient text-white border-transparent';
      case ClientStatus.HOT: return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'Call': return <Phone className="w-4 h-4" />;
      case 'WhatsApp': return <MessageCircle className="w-4 h-4" />;
      case 'Meeting': return <Users className="w-4 h-4" />;
      case 'Viewing': return <Home className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Clientes</h1>
          <p className="text-slate-500">Carteira operacional {selectedBrokerId === 'all' ? 'Vettus Imóveis' : 'do Corretor'}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          {/* SELETOR DE CORRETOR (EXCLUSIVO ADMIN) */}
          {currentUser.role === 'Admin' && (
            <div className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
               <UserSearch className="w-4 h-4 text-[#d4a853]" />
               <select 
                 value={selectedBrokerId}
                 onChange={(e) => setSelectedBrokerId(e.target.value)}
                 className="text-[10px] font-black uppercase tracking-widest bg-transparent outline-none text-slate-600 cursor-pointer"
               >
                  <option value="all">Toda a Rede Vettus</option>
                  {brokers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
               </select>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-sm">
            <button onClick={() => setSortBy('alpha')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'alpha' ? 'gold-gradient text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Alfabética</button>
            <button onClick={() => setSortBy('registration')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'registration' ? 'gold-gradient text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Recentes</button>
          </div>
          <button 
            onClick={onOpenImport} 
            className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors"
          >
            <FileUp className="w-4 h-4 text-emerald-600" />
            <span>Importar</span>
          </button>
          <button onClick={onOpenAddModal} className="gold-gradient text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-lg hover:scale-[1.02] transition-transform">
            <UserPlus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-8 py-4">Cliente</th>
                <th className="px-8 py-4">Status Comercial</th>
                <th className="px-8 py-4">Responsável</th>
                <th className="px-8 py-4">Próximo Passo</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#d4a853] flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">{client.name[0]}</div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{client.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{client.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                        {client.assignedAgent ? client.assignedAgent[0] : '?'}
                      </div>
                      <p className="text-xs font-semibold text-slate-700">{client.assignedAgent || 'Não atribuído'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {client.nextActivityDate ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600">{new Date(client.nextActivityDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        <span className="text-[9px] text-[#d4a853] font-black uppercase">{client.nextActivityType || 'Ação'} às {client.nextActivityTime}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 italic font-medium">Aguardando agendamento</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => onEditClient(client)} className="p-2 bg-slate-50 text-slate-400 hover:text-[#d4a853] rounded-lg border border-slate-100 transition-colors" title="Editar"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleOpenHistory(client)} className="p-2 bg-slate-50 text-slate-600 hover:bg-[#d4a853] hover:text-white rounded-lg border border-slate-100 transition-colors" title="Histórico"><History className="w-4 h-4" /></button>
                      {currentUser.role === 'Admin' && (
                        <button onClick={() => onDeleteClient(client.id)} className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg border border-red-100 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedClients.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Users className="w-12 h-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum cliente encontrado para esta seleção</p>
          </div>
        )}
      </div>

      {showHistoryModal && selectedClient && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md" onClick={() => setShowHistoryModal(false)}></div>
          <div className="bg-white w-full max-w-4xl rounded-[3rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="navy-gradient p-8 text-white flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">{selectedClient.name}</h2>
                <p className="text-[#d4a853] text-[10px] font-bold uppercase tracking-widest">Central de Atendimento e Timeline</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-8 h-8" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto no-scrollbar bg-slate-50 flex-1 space-y-8">
               {/* BLOCO 1: REGISTRO DE ATENDIMENTO REALIZADO */}
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Registrar Contato Efetuado</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <select value={currentAtendimento.type} onChange={e => setCurrentAtendimento({...currentAtendimento, type: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none">
                        <option value="Call">📞 Ligação</option>
                        <option value="WhatsApp">💬 WhatsApp</option>
                        <option value="Meeting">🤝 Reunião</option>
                        <option value="Viewing">🏠 Visita</option>
                     </select>
                     <textarea value={currentAtendimento.desc} onChange={e => setCurrentAtendimento({...currentAtendimento, desc: e.target.value})} placeholder="Resumo da conversa..." className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d4a853]/20 resize-none h-32" />
                  </div>
                  <button onClick={handleSaveAtendimento} className="w-full bg-[#0f172a] text-white py-3.5 rounded-xl font-black uppercase text-xs flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all shadow-lg">
                    <Save className="w-4 h-4" />
                    <span>Salvar na Timeline</span>
                  </button>
               </div>

               {/* BLOCO 2: AGENDAMENTO DE PRÓXIMO PASSO */}
               <div className="bg-[#d4a853]/5 p-6 rounded-3xl border border-[#d4a853]/20 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-[#d4a853]/20 pb-2">
                    <Calendar className="w-4 h-4 text-[#d4a853]" />
                    <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Agendar Próxima Ação (Gera Lembrete)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <input type="date" value={nextStep.date} onChange={e => setNextStep({...nextStep, date: e.target.value})} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-[#d4a853]" />
                     <input type="time" value={nextStep.time} onChange={e => setNextStep({...nextStep, time: e.target.value})} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-[#d4a853]" />
                     <select value={nextStep.type} onChange={e => setNextStep({...nextStep, type: e.target.value})} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none">
                        <option value="Call">📞 Ligar de volta</option>
                        <option value="WhatsApp">💬 WhatsApp</option>
                        <option value="Meeting">🤝 Reunião</option>
                        <option value="Viewing">🏠 Visita</option>
                     </select>
                  </div>
                  <button onClick={handleSaveAgendamento} className="w-full gold-gradient text-white py-3.5 rounded-xl font-black uppercase text-xs flex items-center justify-center space-x-2 shadow-lg shadow-yellow-900/20 hover:scale-[1.01] transition-all">
                    <Clock className="w-4 h-4" />
                    <span>Confirmar Agendamento</span>
                  </button>
               </div>

               {/* LISTA DE HISTÓRICO - DESIGN REFINADO */}
               <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between px-2">
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Linha do Tempo de Atendimento</h5>
                    <span className="text-[9px] font-bold text-slate-400 px-3 py-1 bg-white border border-slate-100 rounded-full">Exibindo registros de execução</span>
                  </div>
                  
                  <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
                    {activities.filter(a => a.clientName === selectedClient.name).map(act => (
                      <div key={act.id} className="relative flex items-start group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-[#0f172a] text-[#d4a853] shadow-lg z-10 group-hover:scale-110 transition-transform">
                          {getActivityIcon(act.type)}
                        </div>
                        <div className="ml-6 flex-1 bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm group-hover:shadow-md transition-shadow relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                              {getActivityIcon(act.type)}
                           </div>
                           <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                              <div className="flex items-center space-x-2">
                                 <span className="text-[9px] font-black text-[#d4a853] uppercase bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                                   {act.type}
                                 </span>
                                 <span className="text-[10px] font-bold text-slate-400">Efetuado por {act.brokerName}</span>
                              </div>
                              <div className="flex items-center text-slate-900 font-mono text-[10px] font-black space-x-3">
                                 <span className="flex items-center"><Calendar className="w-3 h-3 mr-1 text-[#d4a853]" /> {new Date(act.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                 <span className="flex items-center"><Clock className="w-3 h-3 mr-1 text-[#d4a853]" /> {act.time}</span>
                              </div>
                           </div>
                           <p className="text-sm font-bold text-slate-900 leading-relaxed">
                             {act.description}
                           </p>
                        </div>
                      </div>
                    ))}
                    {activities.filter(a => a.clientName === selectedClient.name).length === 0 && (
                      <div className="py-20 text-center text-slate-400 italic font-medium ml-10">
                        Nenhum histórico registrado para este cliente.
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
