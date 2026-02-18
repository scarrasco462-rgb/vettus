
import React, { useState, useMemo } from 'react';
import { 
  Mail, Phone, UserPlus, X, User, Users, History, Plus, 
  MessageCircle, Pencil, Trash2, Calendar, Clock, 
  CheckCircle2, Save, UserSearch
} from 'lucide-react';
// Added missing imports for ConstructionCompany and CommissionForecast to satisfy App.tsx requirements
import { Client, ClientStatus, Broker, Activity, Property, Commission, Reminder, ConstructionCompany, CommissionForecast } from './types.ts';

// Fixed ClientViewProps interface to include missing properties passed from App.tsx
interface ClientViewProps {
  clients: Client[];
  activities: Activity[];
  properties: Property[];
  // Added missing props required by App.tsx logic for construction and commission tracking
  commissions: Commission[];
  constructionCompanies: ConstructionCompany[];
  commissionForecasts: CommissionForecast[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onEditClient: (client: Client) => void;
  onAddActivity: (activity: Activity) => void;
  onAddReminder: (reminder: Reminder) => void;
  onAddSale: (sale: Commission) => void;
  onUpdateProperty: (property: Property) => void;
  // Added missing callback required by App.tsx
  onAddForecasts: (forecasts: CommissionForecast[]) => void;
  currentUser: Broker;
  brokers: Broker[]; 
  onOpenAddModal?: () => void;
  onOpenImport?: () => void;
}

type SortType = 'alpha' | 'registration' | 'service';

// Updated component signature to accept the new props required by the caller in App.tsx
export const ClientView: React.FC<ClientViewProps> = ({ 
  clients, activities, onUpdateClient, onDeleteClient, onEditClient, onAddActivity, onAddReminder, currentUser, brokers, onOpenAddModal, onOpenImport,
  commissions, constructionCompanies, commissionForecasts, onAddForecasts
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('registration');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('all');
  const [currentAtendimento, setCurrentAtendimento] = useState({ type: 'Call', desc: '' });
  const [nextStep, setNextStep] = useState({ date: '', time: '10:00', type: 'Call' });

  const filteredByBroker = useMemo(() => {
    if (selectedBrokerId === 'all') return clients;
    return clients.filter(c => c.brokerId === selectedBrokerId);
  }, [clients, selectedBrokerId]);

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
    onAddActivity({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: currentAtendimento.type as any,
      clientName: selectedClient.name,
      description: currentAtendimento.desc,
      date: dateStr,
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      updatedAt: now.toISOString()
    });
    onUpdateClient({ ...selectedClient, lastContact: dateStr, updatedAt: now.toISOString() });
    setCurrentAtendimento({ type: 'Call', desc: '' });
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'Call': return <Phone className="w-4 h-4" />;
      case 'WhatsApp': return <MessageCircle className="w-4 h-4" />;
      case 'Meeting': return <Users className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Clientes</h1>
          <p className="text-slate-500">Carteira operacional Vettus Imóveis.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {currentUser.role === 'Admin' && (
            <div className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
               <UserSearch className="w-4 h-4 text-[#d4a853]" />
               <select value={selectedBrokerId} onChange={(e) => setSelectedBrokerId(e.target.value)} className="text-[10px] font-black uppercase tracking-widest bg-transparent outline-none">
                  <option value="all">Toda a Rede</option>
                  {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
               </select>
            </div>
          )}
          <button onClick={onOpenAddModal} className="gold-gradient text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-lg">
            <UserPlus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
            <tr>
              <th className="px-8 py-4">Cliente</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4">Responsável</th>
              <th className="px-8 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedClients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#d4a853] flex items-center justify-center font-black">{client.name[0]}</div>
                    <div><p className="font-bold text-slate-900 text-sm">{client.name}</p><p className="text-[10px] text-slate-400 font-bold">{client.phone}</p></div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${client.status === ClientStatus.WON ? 'gold-gradient text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-xs font-semibold text-slate-700">{client.assignedAgent}</td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => onEditClient(client)} className="p-2 bg-slate-50 text-slate-400 hover:text-[#d4a853] rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleOpenHistory(client)} className="p-2 bg-slate-50 text-slate-600 hover:bg-[#d4a853] hover:text-white rounded-lg transition-colors"><History className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showHistoryModal && selectedClient && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md" onClick={() => setShowHistoryModal(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-0 relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="navy-gradient p-8 text-white flex items-center justify-between">
              <div><h2 className="text-2xl font-black">{selectedClient.name}</h2><p className="text-[#d4a853] text-[10px] font-bold uppercase tracking-widest">Atendimento Vettus</p></div>
              <button onClick={() => setShowHistoryModal(false)} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-8 h-8" /></button>
            </div>
            <div className="p-8 overflow-y-auto no-scrollbar bg-slate-50 flex-1 space-y-6">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <textarea value={currentAtendimento.desc} onChange={e => setCurrentAtendimento({...currentAtendimento, desc: e.target.value})} placeholder="Resumo do atendimento..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d4a853]/20 h-32" />
                  <button onClick={handleSaveAtendimento} className="w-full gold-gradient text-white py-3.5 rounded-xl font-black uppercase text-xs flex items-center justify-center space-x-2 shadow-lg">
                    <Save className="w-4 h-4" />
                    <span>Registrar na Timeline</span>
                  </button>
               </div>
               <div className="space-y-4">
                  {activities.filter(a => a.clientName === selectedClient.name).map(act => (
                    <div key={act.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-start space-x-4 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-[#0f172a] text-[#d4a853] flex items-center justify-center shrink-0">{getActivityIcon(act.type)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[9px] font-black text-[#d4a853] uppercase">{act.type}</span>
                           <span className="text-[10px] text-slate-400">{new Date(act.date).toLocaleDateString('pt-BR')} • {act.time}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{act.description}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
