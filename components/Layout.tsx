import React, { useState, useEffect, useId } from 'react';
import { 
  LayoutDashboard, Home, Users, Bell, Calendar, LogOut, Megaphone,
  Kanban, ShieldCheck, BadgeDollarSign, TableProperties, FileUp,
  Database, Files, HardHat, TrendingUp, Layers, Key, Palette, Menu, 
  X as CloseIcon, ChevronLeft, ChevronRight, ChevronDown, Wifi, WifiOff, RefreshCw,
  Calculator, AlertCircle, ShieldAlert, Edit3
} from 'lucide-react';
import { Broker, AppView } from '../types.ts';

export const VettusSymbol = ({ className = "w-12 h-12" }: { className?: string }) => {
  const idPrefix = useId().replace(/:/g, "");
  return (
    <div className={`relative ${className} flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group`}>
      <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-[0_15px_35px_rgba(0,0,0,0.8)]">
        <defs>
          <linearGradient id={`gold-metallic-v5-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a6d3b" />
            <stop offset="25%" stopColor="#d4a853" />
            <stop offset="50%" stopColor="#fff7ad" />
            <stop offset="75%" stopColor="#d4a853" />
            <stop offset="100%" stopColor="#8a6d3b" />
          </linearGradient>
          <radialGradient id={`shine-v5-${idPrefix}`} cx="20%" cy="20%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M50 80 H150 L200 310 L250 80 H350 L220 370 H180 L50 80Z" fill={`url(#gold-metallic-v5-${idPrefix})`} />
        <circle cx="85" cy="110" r="45" fill={`url(#shine-v5-${idPrefix})`} opacity="0.3" />
        <g fill={`url(#gold-metallic-v5-${idPrefix})`}>
          <rect x="155" y="200" width="15" height="75" rx="0.5" />
          <path d="M155 200 H170 L162.5 185 Z" />
          <rect x="172" y="160" width="18" height="115" rx="0.5" />
          <path d="M172 160 H190 L181 145 Z" />
          <rect x="192" y="110" width="22" height="165" rx="0.5" />
          <rect x="195" y="100" width="16" height="10" rx="0.5" />
          <rect x="198" y="90" width="10" height="10" rx="0.5" />
          <path d="M201 60 H205 L203 90 Z" />
          <rect x="202.5" y="40" width="1.5" height="20" />
          <rect x="216" y="155" width="18" height="120" rx="0.5" />
          <path d="M216 155 H234 L225 140 Z" />
          <rect x="236" y="210" width="12" height="65" rx="0.5" />
          <path d="M236 210 H248 L242 200 Z" />
        </g>
      </svg>
    </div>
  );
};

export const VettusLogoFull = ({ className = "w-full" }: { className?: string }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className} animate-in fade-in duration-1000`}>
      <VettusSymbol className="w-44 h-44 mb-6" />
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-[0.15em] text-white uppercase mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          VETTUS <span className="text-[#d4a853]">IMÓVEIS</span>
        </h1>
        <div className="flex items-center justify-center space-x-6">
          <div className="h-[2px] w-12 bg-gradient-to-l from-[#d4a853] to-transparent opacity-60"></div>
          <p className="text-[13px] font-bold tracking-[0.6em] text-[#d4a853] uppercase whitespace-nowrap">NEGÓCIOS IMOBILIÁRIOS</p>
          <div className="h-[2px] w-12 bg-gradient-to-r from-[#d4a853] to-transparent opacity-60"></div>
        </div>
      </div>
    </div>
  );
};

export const VettusLogoReduced = ({ className = "w-full" }: { className?: string }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className} animate-in fade-in duration-500`}>
      <VettusSymbol className="w-16 h-16" />
      <h1 className="text-md font-black tracking-[0.3em] text-[#d4a853] uppercase mt-3" style={{ fontFamily: "'Playfair Display', serif" }}>VETTUS</h1>
    </div>
  );
};

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: AppView) => void;
  currentUser: Broker;
  onLogout: () => void;
  pendingRemindersCount: number;
  syncStatus?: 'synced' | 'syncing' | 'disconnected';
  onForceReconnect?: () => void;
  lastSaved?: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onViewChange, 
  currentUser, 
  onLogout, 
  pendingRemindersCount, 
  syncStatus = 'disconnected',
  onForceReconnect,
  lastSaved
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('vettus_sidebar_collapsed');
    return saved === 'true';
  });
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('vettus_sidebar_collapsed', String(isCollapsed));
    } catch (e) {
      console.warn('Layout: Falha ao salvar estado da sidebar:', e);
    }
  }, [isCollapsed]);

  const navItems = [
    { id: 'dashboard' as AppView, icon: LayoutDashboard, label: 'Painel' },
    { id: 'cash_flow' as AppView, icon: BadgeDollarSign, label: 'Fluxo Pagamento' },
    { id: 'monthly_financial' as AppView, icon: Calculator, label: 'Financeiro Mensal' },
    { id: 'client_payment_flow' as AppView, icon: Edit3, label: 'Fluxo de Obra' },
    { id: 'tasks' as AppView, icon: Kanban, label: 'Funil' },
    { 
      id: 'properties_group' as any, 
      icon: Home, 
      label: 'Imóveis', 
      subItems: [
        { id: 'properties' as AppView, label: 'Prontos' },
        { id: 'launches' as AppView, label: 'Lançamentos' }
      ] 
    },
    { id: 'clients' as AppView, icon: Users, label: 'Clientes' },
    { id: 'reminders' as AppView, icon: Bell, label: 'Lembretes' },
    { id: 'construction_companies' as AppView, icon: HardHat, label: 'Construtoras' },
    { id: 'ads' as AppView, icon: Palette, label: 'Anúncios' },
    { id: 'documents' as AppView, icon: Files, label: 'Arquivos' },
    { id: 'spreadsheets' as AppView, icon: TableProperties, label: 'Planilhas' },
    { id: 'marketing' as AppView, icon: Megaphone, label: 'Marketing' },
    { id: 'activities' as AppView, icon: Calendar, label: 'Agenda' },
    { id: 'brokers' as AppView, icon: ShieldCheck, label: 'Equipe' },
    { id: 'password_update' as AppView, icon: Key, label: 'Segurança' },
    { id: 'backup' as AppView, icon: Database, label: 'Backup' },
  ].filter(item => {
    if (item.subItems) {
      item.subItems = item.subItems.filter(sub => {
        return !currentUser.permissions || currentUser.permissions.includes(sub.id);
      });
      return item.subItems.length > 0;
    }
    if (['brokers', 'backup', 'monthly_financial'].includes(item.id)) {
      return currentUser.role === 'Admin';
    }
    return !currentUser.permissions || currentUser.permissions.includes(item.id);
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  const handleNavClick = (viewId: AppView) => {
    onViewChange(viewId);
  };

  const statusIcons = (
    <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2' : 'space-x-2'}`}>
      <button 
        onClick={() => onViewChange('reminders')}
        className={`relative p-2 rounded-xl transition-all hover:bg-white/10 border border-white/5 group ${
          pendingRemindersCount > 0 
          ? 'text-red-500 bg-red-500/5' 
          : 'text-slate-500'
        }`}
        title="Lembretes"
      >
        <Bell size={16} className={pendingRemindersCount > 0 ? 'animate-swing group-hover:animate-none' : ''} />
        {pendingRemindersCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-[#020617] shadow-lg">
            {pendingRemindersCount}
          </span>
        )}
      </button>

      <div 
        className={`p-2 rounded-xl transition-all border border-white/5 flex items-center justify-center ${
          syncStatus === 'synced' ? 'text-[#d4a853] bg-[#d4a853]/5' : 
          syncStatus === 'syncing' ? 'text-[#d4a853] animate-pulse' : 
          'text-red-500 bg-red-500/5'
        }`}
      >
        {syncStatus === 'synced' ? <Wifi size={16} /> : syncStatus === 'syncing' ? <RefreshCw size={16} className="animate-spin" /> : <WifiOff size={16} />}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc] overflow-x-hidden print:bg-white print:block">
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#020617] text-white flex items-center justify-between px-4 z-[60] border-b border-white/5 shadow-xl print:hidden">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <VettusSymbol className="w-10 h-10" />
            <h1 className="text-sm font-black tracking-[0.2em] text-[#d4a853]">VETTUS</h1>
          </div>
          <div className="h-6 w-px bg-white/10 mx-1" />
          <div className="flex items-center space-x-2">
             <button 
                onClick={() => onViewChange('reminders')}
                className={`relative p-2 rounded-xl transition-all ${pendingRemindersCount > 0 ? 'text-red-500' : 'text-slate-500'}`}
             >
                <Bell size={18} className={pendingRemindersCount > 0 ? 'animate-swing' : ''} />
                {pendingRemindersCount > 0 && (
                   <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-[#020617]">
                      {pendingRemindersCount}
                   </span>
                )}
             </button>
             <div 
                className={`p-2 rounded-xl transition-all ${syncStatus === 'synced' ? 'text-[#d4a853]' : syncStatus === 'syncing' ? 'text-[#d4a853] animate-pulse' : 'text-red-500'}`}
             >
                {syncStatus === 'synced' ? <Wifi size={18} /> : syncStatus === 'syncing' ? <RefreshCw size={18} className="animate-spin" /> : <WifiOff size={18} />}
             </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white hover:bg-white/5 rounded-xl transition-all">
            {isSidebarOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside 
        className={`bg-[#020617] text-white flex flex-col fixed inset-y-0 left-0 z-[56] no-print shadow-2xl border-r border-white/10 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${!isSidebarOpen && (isCollapsed ? 'lg:w-20' : 'lg:w-64')}`}
      >
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 gold-gradient rounded-full items-center justify-center text-[#0a1120] shadow-lg hover:scale-110 active:scale-95 transition-all z-[61]"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`flex flex-col border-b border-white/5 relative transition-all duration-300 ${isCollapsed ? 'p-4 items-center' : 'p-6 items-stretch'}`}>
          <div className={`flex items-center w-full ${isCollapsed ? 'flex-col space-y-4' : 'space-x-4 justify-start'}`}>
            <div className="flex items-center space-x-3">
              <VettusSymbol className={isCollapsed ? "w-10 h-10" : "w-11 h-11"} />
              {!isCollapsed && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                  <h1 className="text-lg font-black tracking-[0.2em] text-[#d4a853] uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>VETTUS</h1>
                  <p className="text-[7px] font-bold text-slate-500 tracking-[0.3em] uppercase">IMÓVEIS PRO</p>
                </div>
              )}
            </div>
            {statusIcons}
          </div>
        </div>

        <div className="px-3 py-6 space-y-1 flex-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isGroup = !!item.subItems;
            const isExpanded = expandedGroups.includes(item.id) || (isGroup && item.subItems.some(s => s.id === currentView));
            const isActive = currentView === item.id || (isGroup && item.subItems.some(s => s.id === currentView));

            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => isGroup ? toggleGroup(item.id) : handleNavClick(item.id)}
                  className={`w-full flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    isCollapsed ? 'justify-center space-x-0' : 'space-x-3'
                  } ${
                    isActive 
                    ? 'bg-[#d4a853] text-[#0a1120] font-black shadow-lg shadow-yellow-900/40' 
                    : 'text-slate-200/60 hover:bg-white/5 hover:text-white'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#0a1120]' : 'group-hover:text-[#d4a853] transition-colors'}`} />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest font-black truncate animate-in fade-in slide-in-from-left-2 duration-300">
                        {item.label}
                        {item.id === 'reminders' && pendingRemindersCount > 0 && (
                          <span className="ml-2 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full">{pendingRemindersCount}</span>
                        )}
                      </span>
                      {isGroup && (
                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  )}
                </button>

                {isGroup && isExpanded && !isCollapsed && (
                  <div className="ml-4 pl-4 border-l border-white/10 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    {item.subItems.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => handleNavClick(sub.id)}
                        className={`w-full flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 group/sub ${
                          currentView === sub.id 
                          ? 'text-[#d4a853] font-black' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-[9px] uppercase tracking-[0.2em] font-black">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 space-y-4">
          <button onClick={onLogout} className={`w-full flex items-center text-slate-400 hover:text-red-400 transition-colors group ${isCollapsed ? 'justify-center' : 'space-x-3 px-4 py-3'}`}>
            <LogOut className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 min-h-screen pt-16 lg:pt-0 print:m-0 print:p-0 print:pt-0 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="p-4 md:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto print:p-0 print:max-w-none">
          {children}
        </div>
      </main>
      <style>{`
        @keyframes swing {
          0% { transform: rotate(0); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(5deg); }
          40% { transform: rotate(-5deg); }
          50% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
        .animate-swing {
          animation: swing 2s infinite ease-in-out;
          transform-origin: top center;
        }
      `}</style>
    </div>
  );
};