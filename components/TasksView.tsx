
import React, { useState } from 'react';
import { Client, ClientStatus, Activity, Broker } from '../types.ts';
import { MoreHorizontal, Clock, User, DollarSign, Plus, X, Phone, Mail, MapPin, Users, CheckCircle, MessageSquare, ChevronLeft, ChevronRight, LayoutGrid, Hash, Star, Save } from 'lucide-react';

const STAGES_CONFIG: { stage: string; status: ClientStatus }[] = [
  { stage: 'Lead', status: ClientStatus.LEAD },
  { stage: 'Frio', status: ClientStatus.COLD },
  { stage: 'Morno', status: ClientStatus.WARM },
  { stage: 'Quente', status: ClientStatus.HOT },
  { stage: 'Ganho', status: ClientStatus.WON }
];

interface TasksViewProps {
  clients: Client[];
  currentUser: Broker;
  onUpdateClient: (client: Client) => void;
  onAddActivity: (activity: Activity) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ clients, currentUser, onUpdateClient, onAddActivity }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState<Partial<Activity>>({
    type: 'Call',
    description: ''
  });

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setIsActivityModalOpen(true);
  };

  const handleMoveStage = (e: React.MouseEvent, client: Client, direction: 'left' | 'right') => {
    e.stopPropagation();
    const currentIndex = STAGES_CONFIG.findIndex(s => s.status === client.status);
    let newIndex = currentIndex;

    if (direction === 'left' && currentIndex > 0) newIndex = currentIndex - 1;
    if (direction === 'right' && currentIndex < STAGES_CONFIG.length - 1) newIndex = currentIndex + 1;

    if (newIndex !== currentIndex && newIndex !== -1) {
      const newStatus = STAGES_CONFIG[newIndex].status;
      const updatedClient = { ...client, status: newStatus, updatedAt: new Date().toISOString() };
      onUpdateClient(updatedClient);
      
      onAddActivity({
        id: Math.random().toString(36).substr(2, 9),
        brokerId: currentUser.id,
        brokerName: currentUser.name,
        type: 'Meeting',
        clientName: client.name,
        description: `🔄 MUDANÇA DE ESTÁGIO: Lead movido para "${STAGES_CONFIG[newIndex].stage}" no Funil de Vendas.`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleManualStatusSet = (status: ClientStatus) => {
    if (!selectedClient) return;
    const oldStatus = selectedClient.status;
    if (oldStatus === status) return;

    const updatedClient = { ...selectedClient, status, updatedAt: new Date().toISOString() };
    onUpdateClient(updatedClient);
    setSelectedClient(updatedClient);

    const stageName = STAGES_CONFIG.find(s => s.status === status)?.stage || status;

    onAddActivity({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: 'Meeting',
      clientName: selectedClient.name,
      description: `🎯 STATUS ATUALIZADO: Fase comercial alterada manualmente para "${stageName}" via Painel Vettus.`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toISOString()
    });
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: (activityForm.type as any) || 'Call',
      clientName: selectedClient.name,
      description: activityForm.description || '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toISOString()
    };

    onAddActivity(newActivity);
    setIsActivityModalOpen(false);
    setActivityForm({ type: 'Call', description: '' });
    setSelectedClient(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Funil de Vendas Vettus</h1>
          <p className="text-slate-500">Fluxo unificado entre cadastro e jornada de compra.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl shadow-sm">
           <Users className="w-4 h-4 text-[#d4a853]" />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{clients.length} Leads Ativos</span>
        </div>
      </div>

      <div className="flex space-x-6 overflow-x-auto pb-6 h-[calc(100vh-160px)] scrollbar-custom">
        {STAGES_CONFIG.map(item => {
          const clientsInStage = clients.filter(c => c.status === item.status);
          const totalBudget = clientsInStage.reduce((acc, c) => acc + (c.budget || 0), 0);

          return (
            <div key={item.stage} className="flex-shrink-0 w-80 flex flex-col">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500">{item.stage}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm ${
                    item.status === ClientStatus.WON ? 'bg-emerald-500 text-white' : 'bg-[#d4a853] text-white'
                  }`}>
                    {clientsInStage.length}
                  </span>
                </div>
                <span className="text-[10px] font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {formatCurrency(totalBudget)}
                </span>
              </div>
              
              <div className="flex-1 bg-slate-100/40 rounded-[2.5rem] p-3 space-y-4 overflow-y-auto border border-slate-200/30 shadow-inner scrollbar-custom">
                {clientsInStage.map(client => (
                  <div 
                    key={client.id} 
                    onClick={() => handleClientClick(client)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-[#d4a853]/40 transition-all cursor-pointer group animate-in fade-in zoom-in duration-300 relative"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1.5">
                         <div className={`w-2 h-2 rounded-full ${
                           client.status === ClientStatus.WON ? 'bg-emerald-500' : 
                           client.status === ClientStatus.HOT ? 'bg-red-500 animate-pulse' : 
                           'bg-[#d4a853]'
                         }`}></div>
                         <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Vettus Imóveis</span>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleMoveStage(e, client, 'left')}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#d4a853] disabled:opacity-20"
                          disabled={STAGES_CONFIG.findIndex(s => s.status === client.status) === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleMoveStage(e, client, 'right')}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#d4a853] disabled:opacity-20"
                          disabled={STAGES_CONFIG.findIndex(s => s.status === client.status) === STAGES_CONFIG.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 mb-2 group-hover:text-[#d4a853] transition-colors leading-tight">{client.name}</h4>
                    
                    <div className="flex items-center space-x-3 mb-4">
                       <div className="w-6 h-6 rounded-lg bg-slate-900 text-[#d4a853] flex items-center justify-center text-[9px] font-black border border-white/10 shadow-sm">
                          {client.name[0]}
                       </div>
                       <span className="text-[10px] font-bold text-slate-500 truncate">{client.phone}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center text-xs font-black text-slate-900">
                        <DollarSign className="w-3 h-3 text-emerald-500 mr-0.5" />
                        {formatCurrency(client.budget).replace('R$', '').trim()}
                      </div>
                      <div className="flex items-center text-[9px] text-slate-400 font-black uppercase">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(client.lastContact).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {clientsInStage.length === 0 && (
                  <div className="h-20 border-2 border-dashed border-slate-200/60 rounded-3xl flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest italic px-4 text-center">
                    Aguardando {item.stage}s
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isActivityModalOpen && selectedClient && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-md" onClick={() => setIsActivityModalOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-0 relative z-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="navy-gradient p-8 text-white relative shrink-0">
              <button 
                onClick={() => setIsActivityModalOpen(false)}
                className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-6 mb-8">
                <div className="w-20 h-20 rounded-[2rem] gold-gradient flex items-center justify-center text-3xl font-black shadow-2xl border-4 border-white/20">
                  {selectedClient.name[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{selectedClient.name}</h2>
                  <p className="text-[#d4a853] text-[10px] font-black flex items-center mt-2 uppercase tracking-[0.2em]">
                    <Star className="w-4 h-4 mr-2 fill-[#d4a853]" />
                    Central de Temperatura do Lead
                  </p>
                </div>
              </div>
              
              {/* Stepper Manual de Estágio - UNIFICADO E LIMPO */}
              <div className="bg-white/5 backdrop-blur-sm rounded-[2rem] p-6 border border-white/10 shadow-inner">
                 <div className="flex items-center justify-between px-2 relative">
                    <div className="absolute top-4 left-0 w-full h-[2px] bg-white/10 -z-0"></div>
                    {STAGES_CONFIG.map((item, idx) => {
                       const isActive = selectedClient.status === item.status;
                       const isDone = STAGES_CONFIG.findIndex(s => s.status === selectedClient.status) > idx;
                       return (
                         <button 
                           key={item.stage}
                           onClick={() => handleManualStatusSet(item.status)}
                           className="flex flex-col items-center group relative flex-1 z-10"
                         >
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all bg-[#0f172a] ${
                              isActive ? 'border-[#d4a853] shadow-[0_0_20px_rgba(212,168,83,0.5)] scale-125' : 
                              isDone ? 'border-emerald-500' : 'border-white/20'
                            }`}>
                               {isDone ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#d4a853]' : 'bg-white/20'}`}></div>}
                            </div>
                            <span className={`text-[8px] mt-3 font-black uppercase tracking-widest transition-colors ${isActive ? 'text-[#d4a853]' : 'text-white/40 group-hover:text-white'}`}>
                               {item.stage}
                            </span>
                         </button>
                       );
                    })}
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 overflow-y-auto no-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Métricas de Valor</h4>
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Budget:</span>
                          <span className="text-sm font-black text-slate-900">{formatCurrency(selectedClient.budget)}</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Última Ação:</span>
                          <span className="text-sm font-black text-[#d4a853]">{new Date(selectedClient.lastContact).toLocaleDateString('pt-BR')}</span>
                       </div>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center space-x-3 mb-2">
                       <Phone className="w-5 h-5 text-[#d4a853]" />
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Acesso Direto</span>
                    </div>
                    <p className="text-sm font-black text-slate-900">{selectedClient.phone}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{selectedClient.status} Atual</p>
                 </div>
              </div>

              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center px-1">
                <MessageSquare className="w-4 h-4 mr-3" />
                Registrar Histórico de Atendimento
              </h3>

              <form onSubmit={handleActivitySubmit} className="space-y-6">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { type: 'Call', icon: Phone, label: 'Ligação' },
                    { type: 'Meeting', icon: Users, label: 'Reunião' },
                    { type: 'Viewing', icon: MapPin, label: 'Visita' },
                    { type: 'WhatsApp', icon: MessageSquare, label: 'WhatsApp' }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setActivityForm({...activityForm, type: item.type as any})}
                      className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all ${
                        activityForm.type === item.type 
                        ? 'bg-slate-900 border-slate-900 text-[#d4a853] shadow-xl scale-105' 
                        : 'bg-white border-slate-200 text-slate-400 hover:border-[#d4a853]'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-2" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                    </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Relatório da Interação</label>
                  <textarea 
                    required
                    value={activityForm.description}
                    onChange={e => setActivityForm({...activityForm, description: e.target.value})}
                    placeholder="Quais foram os avanços nesta oportunidade? Detalhe o que foi conversado..."
                    className="w-full h-32 bg-white border border-slate-200 rounded-[2rem] py-5 px-6 text-slate-900 text-sm font-bold outline-none focus:ring-4 focus:ring-[#d4a853]/10 transition-all resize-none leading-relaxed shadow-inner"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full gold-gradient text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-yellow-900/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <Save className="w-5 h-5" />
                  <span>Consolidar Log Unificado</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
