import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Plus, 
  AlertTriangle, 
  RefreshCw, 
  UserPlus, 
  Clock,
  Zap,
  Tag,
  Calendar,
  BellRing
} from 'lucide-react';
import { Reminder } from '../types';

interface ReminderViewProps {
  reminders: Reminder[];
  onToggleReminder: (id: string) => void;
}

export const ReminderView: React.FC<ReminderViewProps> = ({ reminders, onToggleReminder }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getLocalToday = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const getLocalTime = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  const today = getLocalToday();
  const currentTime = getLocalTime();

  const isReminderOverdue = (reminder: Reminder) => {
    if (reminder.completed) return false;
    if (reminder.dueDate < today) return true;
    if (reminder.dueDate === today) {
      const hourMatch = reminder.title?.match(/(\d{2}:\d{2})/);
      if (hourMatch && hourMatch[1] < currentTime) return true;
    }
    return false;
  };

  const sortedReminders = [...reminders].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const aOverdue = isReminderOverdue(a);
    const bOverdue = isReminderOverdue(b);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (a.priority !== b.priority) {
      if (a.priority === 'High') return -1;
      if (b.priority === 'High') return 1;
    }
    return a.dueDate.localeCompare(b.dueDate);
  });

  const getBadge = (reminder: Reminder) => {
    const isOverdue = isReminderOverdue(reminder);
    
    if (isOverdue) return {
      icon: AlertTriangle,
      label: 'ATRASADO',
      className: 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20'
    };

    switch(reminder.type) {
      case 'new_lead':
        return {
          icon: UserPlus,
          label: 'NOVO LEAD',
          className: 'bg-emerald-600 text-white'
        };
      case 'standard':
      default:
        return {
          icon: Calendar,
          label: 'AGENDA',
          className: 'bg-blue-600 text-white'
        };
    }
  };

  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center">
            <BellRing className="w-8 h-8 mr-4 text-[#d4a853]" />
            Minha Fila de Ações
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Agendamentos, Triagem e Follow-ups da sua Unidade.</p>
        </div>
        <div className="flex items-center space-x-3">
           <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#d4a853]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {reminders.filter(r => !r.completed).length} Pendências
              </span>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedReminders.map((reminder) => {
          const badge = getBadge(reminder);
          const isOverdue = isReminderOverdue(reminder);
          const BadgeIcon = badge?.icon;

          return (
            <div 
              key={reminder.id} 
              className={`bg-white p-6 rounded-[2.5rem] border shadow-sm flex items-center space-x-6 hover:shadow-xl transition-all group relative overflow-hidden ${
                reminder.completed ? 'opacity-50 grayscale bg-slate-50/50 border-slate-100' : 
                isOverdue ? 'border-red-300 bg-red-50/40' : 'border-slate-100'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                isOverdue ? 'bg-red-500' : 
                reminder.type === 'new_lead' ? 'bg-emerald-500' : 'bg-[#d4a853]'
              }`}></div>

              <button 
                onClick={() => onToggleReminder(reminder.id)}
                className={`transition-all hover:scale-110 active:scale-90 shrink-0 ${
                  reminder.completed ? 'text-emerald-500' : 
                  isOverdue ? 'text-red-500' : 'text-slate-300 group-hover:text-[#d4a853]'
                }`}
              >
                {reminder.completed ? <CheckCircle2 className="w-10 h-10" /> : <Circle className="w-10 h-10" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h3 className={`text-base font-black transition-all truncate uppercase tracking-tight ${reminder.completed ? 'text-slate-400 line-through' : isOverdue ? 'text-red-800' : 'text-slate-900'}`}>
                    {reminder.title}
                  </h3>
                  {badge && !reminder.completed && (
                    <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${badge.className}`}>
                      {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
                      <span>{badge.label}</span>
                    </div>
                  )}
                  {reminder.priority === 'High' && !reminder.completed && !isOverdue && (
                    <div className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg flex items-center text-[8px] font-black uppercase tracking-widest border border-orange-200">
                       <AlertCircle className="w-3 h-3 mr-1" />
                       URGENTE
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <p className={`text-xs flex items-center font-bold ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                    <Calendar className={`w-3.5 h-3.5 mr-1.5 ${isOverdue ? 'text-red-500 animate-pulse' : 'text-[#d4a853]'}`} />
                    Compromisso: {formatDateSafe(reminder.dueDate)}
                  </p>
                  {reminder.metadata && (
                    <p className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      Ref: {reminder.metadata}
                    </p>
                  )}
                </div>
              </div>

              {!reminder.completed && (
                <div className="hidden md:flex flex-col items-end shrink-0">
                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${isOverdue ? 'text-red-600 animate-pulse' : 'text-slate-400'}`}>
                    {isOverdue ? 'EXECUÇÃO IMEDIATA' : 'PROGRAMADO'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-emerald-500'}`}></div>
                    <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>{isOverdue ? 'EXPIRADO' : 'NO PRAZO'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {reminders.length === 0 && (
          <div className="py-32 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Tag className="w-10 h-10 text-slate-200" />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Parabéns! Sua fila de lembretes está limpa.</p>
          </div>
        )}
      </div>
    </div>
  );
};