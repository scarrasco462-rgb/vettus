
import React, { useState } from 'react';
import { Task, SalesStage, Activity, Broker } from '../types';
// Fix: Added Save to the lucide-react imports
import { MoreHorizontal, Clock, User, DollarSign, Plus, X, Phone, Mail, MapPin, Users, CheckCircle, MessageSquare, ChevronLeft, ChevronRight, LayoutGrid, Hash, Star, Save } from 'lucide-react';

// Fix: Updated stages to match SalesStage type definition: 'Lead' | 'Frio' | 'Morno' | 'Quente' | 'Ganho'
const STAGES: SalesStage[] = ['Lead', 'Frio', 'Morno', 'Quente', 'Ganho'];

interface TasksViewProps {
  tasks: Task[];
  currentUser: Broker;
  onUpdateTask: (task: Task) => void;
  onAddActivity: (activity: Activity) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, currentUser, onUpdateTask, onAddActivity }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState<Partial<Activity>>({
    type: 'Call',
    description: ''
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsActivityModalOpen(true);
  };

  const handleMoveStage = (e: React.MouseEvent, task: Task, direction: 'left' | 'right') => {
    e.stopPropagation();
    const currentIndex = STAGES.indexOf(task.stage);
    let newIndex = currentIndex;

    if (direction === 'left' && currentIndex > 0) newIndex = currentIndex - 1;
    if (direction === 'right' && currentIndex < STAGES.length - 1) newIndex = currentIndex + 1;

    if (newIndex !== currentIndex) {
      const updatedTask = { ...task, stage: STAGES[newIndex] };
      onUpdateTask(updatedTask);
      
      onAddActivity({
        id: Math.random().toString(36).substr(2, 9),
        brokerId: currentUser.id,
        type: 'Meeting',
        clientName: task.clientName,
        description: `Lead realocado manualmente para o estágio: ${STAGES[newIndex]}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR'),
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleManualStageSet = (stage: SalesStage) => {
    if (!selectedTask) return;
    const updatedTask = { ...selectedTask, stage };
    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask);

    onAddActivity({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      type: 'Meeting',
      clientName: selectedTask.clientName,
      description: `Lead realocado via seletor para: ${stage}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR'),
      updatedAt: new Date().toISOString()
    });
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      type: (activityForm.type as any) || 'Call',
      clientName: selectedTask.clientName,
      description: activityForm.description || '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toISOString()
    };

    onAddActivity(newActivity);
    setIsActivityModalOpen(false);
    setActivityForm({ type: 'Call', description: '' });
    // Fix: Changed setSelectedClient to setSelectedTask to correctly clear task state
    setSelectedTask(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Funil de Vendas Vettus</h1>
          <p className="text-slate-500">Gestão visual e alocação manual de oportunidades premium.</p>
        </div>
        <button className="gold-gradient text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg shadow-yellow-600/20 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
          <span>Nova Oportunidade</span>
        </button>
      </div>

      <div className="flex space-x-6 overflow-x-auto pb-6 no-scrollbar h-[calc(100vh-250px)]">
        {STAGES.map(stage => {
          const tasksInStage = tasks.filter(t => t.stage === stage);
          const totalValue = tasksInStage.reduce((acc, t) => acc + t.value, 0);

          return (
            <div key={stage} className="flex-shrink-0 w-80 flex flex-col">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500">{stage}</h3>
                  <span className="bg-[#d4a853]/10 text-[#d4a853] px-2 py-0.5 rounded-full text-[9px] font-black border border-[#d4a853]/20">
                    {tasksInStage.length}
                  </span>
                </div>
                <span className="text-[10px] font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {formatCurrency(totalValue)}
                </span>
              </div>
              
              <div className="flex-1 bg-slate-50/50 rounded-[2rem] p-3 space-y-4 overflow-y-auto no-scrollbar border border-slate-200/40 shadow-inner">
                {tasksInStage.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => handleTaskClick(task)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-[#d4a853]/40 transition-all cursor-pointer group animate-in fade-in zoom-in duration-300 relative"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        task.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {task.priority}
                      </span>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleMoveStage(e, task, 'left')}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#d4a853] disabled:opacity-30"
                          disabled={STAGES.indexOf(task.stage) === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleMoveStage(e, task, 'right')}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#d4a853] disabled:opacity-30"
                          disabled={STAGES.indexOf(task.stage) === STAGES.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 mb-2 group-hover:text-[#d4a853] transition-colors leading-tight">{task.title}</h4>
                    
                    <div className="flex items-center space-x-3 mb-4">
                       <div className="w-6 h-6 rounded-full gold-gradient flex items-center justify-center text-[9px] font-black text-white">
                          {task.clientName[0]}
                       </div>
                       <span className="text-[11px] font-bold text-slate-600 truncate">{task.clientName}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center text-xs font-black text-slate-900">
                        <DollarSign className="w-3 h-3 text-emerald-500 mr-0.5" />
                        {formatCurrency(task.value).replace('R$', '').trim()}
                      </div>
                      <div className="flex items-center text-[9px] text-slate-400 font-black uppercase">
                        <Clock className="w-3 h-3 mr-1" />
                        {task.dueDate.split('-').slice(1).reverse().join('/')}
                      </div>
                    </div>
                  </div>
                ))}
                {tasksInStage.length === 0 && (
                  <div className="h-20 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">
                    Fase Livre
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isActivityModalOpen && selectedTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md" onClick={() => setIsActivityModalOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-0 relative z-10 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="navy-gradient p-8 text-white relative shrink-0">
              <button 
                onClick={() => setIsActivityModalOpen(false)}
                className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-20 h-20 rounded-3xl gold-gradient flex items-center justify-center text-3xl font-bold shadow-2xl">
                  {selectedTask.clientName[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{selectedTask.clientName}</h2>
                  <p className="text-[#d4a853] text-sm font-bold flex items-center mt-1 uppercase tracking-widest">
                    <Star className="w-4 h-4 mr-2 fill-[#d4a853]" />
                    Oportunidade: {selectedTask.title}
                  </p>
                </div>
              </div>
              
              {/* Stepper Manual de Estágio */}
              <div className="flex items-center justify-between px-2 py-4 bg-white/5 rounded-2xl border border-white/10 mt-2">
                 {STAGES.map((s, idx) => {
                    const isActive = selectedTask.stage === s;
                    const isDone = STAGES.indexOf(selectedTask.stage) > idx;
                    return (
                      <button 
                        key={s}
                        onClick={() => handleManualStageSet(s)}
                        className="flex flex-col items-center group relative flex-1"
                      >
                         <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all z-10 bg-slate-900 ${
                           isActive ? 'border-[#d4a853] shadow-[0_0_15px_rgba(212,168,83,0.4)] scale-110' : 
                           isDone ? 'border-emerald-500' : 'border-white/20'
                         }`}>
                            {isDone ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#d4a853]' : 'bg-white/20'}`}></div>}
                         </div>
                         <span className={`text-[8px] mt-2 font-black uppercase tracking-widest transition-colors ${isActive ? 'text-[#d4a853]' : 'text-white/40 group-hover:text-white'}`}>
                            {s}
                         </span>
                         {idx < STAGES.length - 1 && (
                            <div className={`absolute left-[60%] top-4 w-full h-[2px] -z-0 ${isDone ? 'bg-emerald-500' : 'bg-white/10'}`}></div>
                         )}
                      </button>
                    );
                 })}
              </div>
            </div>

            <div className="p-8 bg-slate-50 overflow-y-auto no-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Informações do Negócio</h4>
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Valor Estimado:</span>
                          <span className="text-sm font-black text-slate-900">{formatCurrency(selectedTask.value)}</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Data Limite:</span>
                          <span className="text-sm font-black text-[#d4a853]">{selectedTask.dueDate.split('-').reverse().join('/')}</span>
                       </div>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center space-x-3 mb-2">
                       <Users className="w-5 h-5 text-[#d4a853]" />
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Equipe Responsável</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{selectedTask.agent}</p>
                 </div>
              </div>

              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center px-1">
                <MessageSquare className="w-4 h-4 mr-2" />
                Registrar Log de Negociação
              </h3>

              <form onSubmit={handleActivitySubmit} className="space-y-6">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { type: 'Call', icon: Phone, label: 'Ligação' },
                    { type: 'Meeting', icon: Users, label: 'Reunião' },
                    { type: 'Viewing', icon: MapPin, label: 'Visita' },
                    { type: 'Email', icon: Mail, label: 'E-mail' }
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
                    placeholder="Quais foram os avanços nesta oportunidade? Detalhe os próximos passos..."
                    className="w-full h-32 bg-white border border-slate-200 rounded-3xl py-5 px-6 text-slate-900 text-sm outline-none focus:ring-4 focus:ring-[#d4a853]/10 transition-all resize-none leading-relaxed shadow-inner"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full gold-gradient text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-yellow-900/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <Save className="w-5 h-5" />
                  <span>Consolidar Log no Funil</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
