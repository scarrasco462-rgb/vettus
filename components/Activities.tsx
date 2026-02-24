
import React, { useState, useMemo } from 'react';
import { 
  Phone, 
  Mail, 
  Users, 
  MapPin, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  X, 
  Bell, 
  CheckCircle, 
  LayoutList, 
  CalendarDays,
  StickyNote,
  Star,
  FileText,
  User as UserIcon,
  MessageCircle,
  PhoneForwarded,
  Trash2,
  Filter,
  Check,
  ShieldAlert
} from 'lucide-react';
import { Activity, Broker, Reminder, Client } from '../types';

interface ActivityViewProps {
  activities: Activity[];
  onAddActivity: (activity: Activity) => void;
  onAddReminder: (reminder: Reminder) => void;
  currentUser: Broker;
  clients: Client[];
}

export const ActivityView: React.FC<ActivityViewProps> = ({ 
  activities, 
  onAddActivity, 
  onAddReminder, 
  currentUser,
  clients 
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('timeline');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    type: 'Call' as const,
    clientName: '',
    description: '',
    time: '10:00',
    createReminder: true,
    priority: 'Medium' as const
  });

  const filteredActivities = useMemo(() => {
    if (typeFilter === 'all') return activities;
    return activities.filter(a => a.type === typeFilter);
  }, [activities, typeFilter]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthName = useMemo(() => {
    return currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const totalSlots = 42;
    
    const slots = [];
    for (let i = 0; i < firstDay; i++) slots.push({ day: null, current: false });
    for (let i = 1; i <= days; i++) slots.push({ day: i, current: true });
    while (slots.length < totalSlots) slots.push({ day: null, current: false });
    
    return slots;
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const getActivitiesForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return activities.filter(a => a.date === dateStr);
  };

  const handleActivityClick = (activity: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedActivity(activity);
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'Call': return <Phone className="w-4 h-4" />;
      case 'WhatsApp': return <MessageCircle className="w-4 h-4" />;
      case 'Email': return <Mail className="w-4 h-4" />;
      case 'Viewing': return <MapPin className="w-4 h-4" />;
      case 'Meeting': return <Users className="w-4 h-4" />;
      case 'Call_Back': return <PhoneForwarded className="w-4 h-4" />;
      case 'System': return <ShieldAlert className="w-4 h-4 text-[#d4a853]" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dayToUse = selectedDay || new Date().getDate();
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayToUse).padStart(2, '0')}`;
    
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: formData.type,
      clientName: formData.clientName || 'Geral (Sem Vínculo)',
      description: `Agendamento: ${formData.description}`,
      date: dateStr,
      time: formData.time,
      updatedAt: new Date().toISOString()
    };

    onAddActivity(newActivity);

    if (formData.createReminder) {
      const newReminder: Reminder = {
        id: Math.random().toString(36).substr(2, 9),
        brokerId: currentUser.id,
        title: `${formData.type}: ${formData.description} (${formData.clientName || 'Geral'})`,
        dueDate: dateStr,
        priority: formData.priority,
        completed: false,
        updatedAt: new Date().toISOString()
      };
      onAddReminder(newReminder);
    }

    setIsModalOpen(false);
    setFormData({ type: 'Call', clientName: '', description: '', time: '10:00', createReminder: true, priority: 'Medium' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Timeline Master Vettus</h1>
          <p className="text-slate-500 font-medium">Linha do tempo de execuções sincronizada em rede.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="bg-white border border-slate-200 p-1.5 rounded-xl flex items-center shadow-sm">
             <Filter className="w-3.5 h-3.5 text-[#d4a853] ml-2" />
             <select 
               value={typeFilter} 
               onChange={e => setTypeFilter(e.target.value)}
               className="text-[10px] font-black uppercase bg-transparent outline-none text-slate-600 cursor-pointer px-2"
             >
                <option value="all">Todas Atividades</option>
                <option value="Call">📞 Ligações</option>
                <option value="WhatsApp">💬 WhatsApp</option>
                <option value="Meeting">🤝 Reuniões</option>
                <option value="Viewing">🏠 Visitas</option>
             </select>
          </div>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center shadow-inner">
            <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><CalendarDays className="w-4 h-4" /><span>Mapa</span></button>
            <button onClick={() => setViewMode('timeline')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${viewMode === 'timeline' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><LayoutList className="w-4 h-4" /><span>Timeline</span></button>
          </div>
          <button onClick={() => { setSelectedDay(null); setIsModalOpen(true); }} className="gold-gradient text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg"><Plus className="w-4 h-4" /><span>Agendar</span></button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
            <div className="navy-gradient p-8 flex items-center justify-between text-white">
              <h2 className="text-xl font-bold uppercase tracking-widest flex items-center">
                <CalendarIcon className="w-5 h-5 mr-3 text-[#d4a853]" />
                {monthName}
              </h2>
              <div className="flex items-center space-x-2">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">Hoje</button>
                <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-7 gap-px bg-slate-100">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="bg-white py-4 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</span>
                </div>
              ))}
              
              {calendarDays.map((slot, idx) => {
                const dayActs = getActivitiesForDay(slot.day);
                const isToday = slot.day === new Date().getDate() && 
                                currentDate.getMonth() === new Date().getMonth() && 
                                currentDate.getFullYear() === new Date().getFullYear();
                
                return (
                  <div key={idx} onClick={() => { if(slot.day) { setSelectedDay(slot.day); setIsModalOpen(true); } }} className={`bg-white h-32 p-3 relative group transition-all cursor-pointer hover:bg-slate-50 ${!slot.current ? 'bg-slate-50/50' : ''}`}>
                    <span className={`text-xs font-bold ${isToday ? 'bg-[#d4a853] text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md' : slot.current ? 'text-slate-900' : 'text-slate-300'}`}>{slot.day}</span>
                    <div className="mt-2 space-y-1 overflow-hidden">
                      {dayActs.slice(0, 3).map(act => (
                        <div key={act.id} onClick={(e) => handleActivityClick(act, e)} className="bg-slate-100 rounded-md p-1 border-l-2 border-[#d4a853] overflow-hidden cursor-pointer hover:bg-[#d4a853]/10 transition-colors">
                          <p className="text-[9px] font-bold text-slate-700 truncate">{act.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-[#0a1120] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5"><Bell className="w-32 h-32" /></div>
             <h3 className="text-lg font-black uppercase tracking-widest text-[#d4a853] mb-6">Métricas de Execução</h3>
             <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                   <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total na Timeline</p>
                   <p className="text-2xl font-black">{activities.length}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                   <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Visitas Realizadas</p>
                   <p className="text-2xl font-black text-emerald-500">{activities.filter(a => a.type === 'Viewing').length}</p>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-10 pb-20 no-scrollbar">
          <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-1 before:bg-slate-200">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="relative flex items-start group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-[#0a1120] text-[#d4a853] shadow-xl z-10 group-hover:scale-125 transition-transform">
                  {getActivityIcon(activity.type)}
                </div>
                <div onClick={(e) => handleActivityClick(activity, e)} className="ml-10 flex-1 p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#d4a853]/30 transition-all cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">{getActivityIcon(activity.type)}</div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                         activity.type === 'Viewing' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                       }`}>{activity.type}</span>
                       <span className="text-[10px] font-bold text-slate-400">EXECUTADO POR {activity.brokerName?.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center text-[#d4a853] font-black text-[10px] uppercase">
                       <Clock className="w-3.5 h-3.5 mr-1" />
                       {activity.time}
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">{activity.description}</h3>
                  <div className="flex items-center space-x-4">
                     <div className="flex items-center text-xs font-bold text-slate-600">
                        <UserIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {activity.clientName}
                     </div>
                     <div className="flex items-center text-xs font-bold text-slate-400">
                        <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {new Date(activity.date).toLocaleDateString('pt-BR')}
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredActivities.length === 0 && (
            <div className="py-32 text-center">
               <StickyNote className="w-16 h-16 text-slate-200 mx-auto mb-4" />
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nenhum registro para este filtro na linha do tempo.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Detalhes e Inclusão mantidos conforme versão anterior... */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="navy-gradient p-8 text-white">
               <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center shadow-lg"><Clock className="w-6 h-6" /></div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6 text-white" /></button>
               </div>
               <h2 className="text-2xl font-bold uppercase tracking-tight">Agendar Atividade</h2>
               <p className="text-slate-400 text-sm">Registro obrigatório na linha do tempo Master.</p>
            </div>
            <form onSubmit={handleSubmit} className="p-8 bg-slate-50 space-y-6">
               <div className="grid grid-cols-4 gap-2">
                  {[{ id: 'Call', icon: Phone, label: 'Ligação' }, { id: 'Meeting', icon: Users, label: 'Reunião' }, { id: 'Viewing', icon: MapPin, label: 'Visita' }, { id: 'Email', icon: Mail, label: 'E-mail' }].map(item => {
                    const Icon = item.icon;
                    return (
                    <button key={item.id} type="button" onClick={() => setFormData({...formData, type: item.id as any})} className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${formData.type === item.id ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-[#d4a853]'}`}>
                      <Icon className="w-5 h-5 mb-1" /><span className="text-[9px] font-bold uppercase">{item.label}</span>
                    </button>
                    );
                  })}
               </div>
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Vincular a Cliente</label>
                    <select value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-sm text-slate-900 outline-none font-bold shadow-sm">
                      <option value="">Nenhum (Atividade Interna)</option>
                      {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Descrição do Agendamento</label>
                    <input type="text" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ex: Apresentação de Proposta Cobertura Jardins" className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-sm text-slate-900 outline-none font-bold shadow-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Horário</label>
                        <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-sm text-slate-900 outline-none font-black shadow-sm" />
                     </div>
                  </div>
               </div>
               <button type="submit" className="w-full gold-gradient text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-yellow-900/20 hover:scale-[1.02] active:scale-95 transition-all">Consolidar na Agenda Master</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
