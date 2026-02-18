
// Added missing useId and fixed corrupted import on line 1
import React, { useState, useEffect, useId } from 'react';
import { 
  LayoutDashboard, Home, Users, Bell, Calendar, LogOut, Megaphone,
  Kanban, ShieldCheck, BadgeDollarSign, TableProperties, FileUp,
  Database, Files, HardHat, TrendingUp, Layers, Key, Palette, Menu, 
  X as CloseIcon, ChevronLeft, ChevronRight, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import { Broker, AppView } from './types.ts';

export const VettusLogo = ({ className = "w-20 h-20" }: { className?: string }) => {
  const idPrefix = useId().replace(/:/g, "");
  
  return (
    <div className={`relative ${className} flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group`}>
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-xl group-hover:drop-shadow-[0_0_8px_rgba(212,168,83,0.6)] transition-all duration-500">
        <defs>
          {/* Gradiente Dourado v4.9 - Reflexo Metálico Profundo */}
          <linearGradient id={`gold-grad-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a6d3b" />
            <stop offset="35%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#fff7ad" />
            <stop offset="65%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#8a6d3b" />
          </linearGradient>

          {/* Metal-Glow 2.0 - Brilho Sutil e Preciso */}
          <filter id={`metal-glow-${idPrefix}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur"/>
            <feOffset in="blur" dx="0" dy="0.5" result="offsetBlur"/>
            <feFlood floodColor="#FFD700" floodOpacity="0.3" result="glowColor"/>
            <feComposite in="glowColor" in2="offsetBlur" operator="in" result="glow"/>
            <feMerge>
              <feMergeNode in="glow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <mask id={`v-mask-${idPrefix}`}>
            <rect width="120" height="120" fill="white" />
            <path 
              d="M25 35 L60 95 L95 35" 
              stroke="black" 
              strokeWidth="11" 
              fill="none" 
              strokeLinejoin="round" 
              strokeLinecap="round" 
            />
          </mask>
        </defs>
        
        <g filter={`url(#metal-glow-${idPrefix})`}>
          {/* O "I" - Prédio Arquitetônico */}
          <g mask={`url(#v-mask-${idPrefix})`}>
            <rect x="55" y="25" width="10" height="70" rx="1" stroke={`url(#gold-grad-${idPrefix})`} strokeWidth="2" fill="none" className="group-hover:stroke-white transition-colors duration-500" />
            <g stroke={`url(#gold-grad-${idPrefix})`} strokeWidth="0.8" opacity="0.4">
              <path d="M57 35 H63 M57 42 H63 M57 49 H63 M57 56 H63 M57 63 H63 M57 70 H63 M57 77 H63 M57 84 H63" />
            </g>
          </g>

          {/* O "V" Principal - Stroke v4.9 */}
          <path 
            d="M25 35 L60 95 L95 35" 
            stroke={`url(#gold-grad-${idPrefix})`} 
            strokeWidth="7.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none"
            className="group-hover:stroke-[8.5px] transition-all duration-500"
          />
        </g>
      </svg>
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
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onViewChange, 
  currentUser, 
  onLogout, 
  pendingRemindersCount, 
  syncStatus = 'disconnected' 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('vettus_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('vettus_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const navItems = [
    { id: 'dashboard' as AppView, icon: LayoutDashboard, label: 'Painel' },
    { id: 'cash_flow' as AppView, icon: TrendingUp, label: 'Fluxo Caixa' },
    { id: 'tasks' as AppView, icon: Kanban, label: 'Funil' },
    { id: 'properties' as AppView, icon: Home, label: 'Imóveis' },
    { id: 'launches' as AppView, icon: Layers, label: 'Lançamentos' },
    { id: 'clients' as AppView, icon: Users, label: 'Clientes' },
    { id: 'construction_companies' as AppView, icon: HardHat, label: 'Construtoras' },
    { id: 'ads' as AppView, icon: Palette, label: 'Anúncios' },
    { id: 'documents' as AppView, icon: Files, label: 'Arquivos' },
    { id: 'spreadsheets' as AppView, icon: TableProperties, label: 'Planilhas' },
    { id: 'marketing' as AppView, icon: Megaphone, label: 'Marketing' },
    { id: 'activities' as AppView, icon: Calendar, label: 'Agenda' },
    { id: 'brokers' as AppView, icon: ShieldCheck, label: 'Equipe' },
    { id: 'backup' as AppView, icon: Database, label: 'Backup' },
  ].filter(item => {
    if ((item.id === 'brokers' || item.id === 'backup') && currentUser.role !== 'Admin') return false;
    return !currentUser.permissions || currentUser.permissions.includes(item.id);
  });

  const handleNavClick = (viewId: AppView) => {
    onViewChange(viewId);
    setIsSidebarOpen(false);
  };

  const SyncIndicator = () => (
    <div className={`p-2 rounded-xl flex items-center space-x-2 transition-all duration-500 border ${
      syncStatus === 'synced' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
      syncStatus === 'syncing' ? 'bg-[#d4a853]/10 border-[#d4a853]/20 text-[#d4a853]' : 
      'bg-red-500/10 border-red-500/20 text-red-500'
    }`} title={syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Desconectado'}>
      {syncStatus === 'synced' ? <Wifi size={16} /> : syncStatus === 'syncing' ? <RefreshCw size={16} className="animate-spin" /> : <WifiOff size={16} />}
      <span className="hidden md:block text-[8px] font-black uppercase tracking-widest">
        {syncStatus === 'synced' ? 'Online' : syncStatus === 'syncing' ? 'Sync' : 'Offline'}
      </span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a1120] text-white flex items-center justify-between px-4 z-[60] border-b border-white/5 shadow-xl">
        <div className="flex items-center space-x-3">
          <VettusLogo className="w-10 h-10" />
          <h1 className="text-sm font-black tracking-[0.2em] text-[#d4a853]">VETTUS</h1>
        </div>
        <div className="flex items-center space-x-2">
          <SyncIndicator />
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white hover:bg-white/5 rounded-xl transition-all">
            {isSidebarOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div className="hidden lg:flex fixed top-6 right-8 z-[70] items-center space-x-4">
          <SyncIndicator />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside 
        className={`bg-[#0a1120] text-white flex flex-col fixed inset-y-0 left-0 z-[56] no-print shadow-2xl border-r border-white/5 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${!isSidebarOpen && (isCollapsed ? 'lg:w-20' : 'lg:w-64')}`}
      >
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 gold-gradient rounded-full items-center justify-center text-[#0a1120] shadow-lg hover:scale-110 active:scale-95 transition-all z-[61]"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`flex flex-col items-center border-b border-white/5 relative transition-all duration-300 ${isCollapsed && !isSidebarOpen ? 'p-4' : 'p-8'}`}>
          <VettusLogo className={`${isCollapsed && !isSidebarOpen ? 'w-12 h-12' : 'w-16 h-16 lg:w-24 lg:h-24'} mb-1`} />
          {(!isCollapsed || isSidebarOpen) && (
            <h1 className="text-xl font-black tracking-[0.3em] text-[#d4a853] uppercase mt-2 animate-in fade-in duration-500">VETTUS</h1>
          )}
        </div>

        <div className="px-3 py-6 space-y-1 flex-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isCollapsed && !isSidebarOpen ? 'justify-center space-x-0' : 'space-x-3'
              } ${
                currentView === item.id 
                ? 'bg-[#d4a853] text-[#0a1120] font-black shadow-lg shadow-yellow-900/40' 
                : 'text-slate-200/60 hover:bg-white/5 hover:text-white'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${currentView === item.id ? 'text-[#0a1120]' : 'group-hover:text-[#d4a853] transition-colors'}`} />
              {(!isCollapsed || isSidebarOpen) && (
                <span className="text-[10px] uppercase tracking-widest font-black truncate animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 space-y-4">
          <button onClick={onLogout} className={`w-full flex items-center text-slate-400 hover:text-red-400 transition-colors group ${isCollapsed && !isSidebarOpen ? 'justify-center' : 'space-x-3 px-4 py-3'}`}>
            <LogOut className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            {(!isCollapsed || isSidebarOpen) && <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 min-h-screen pt-16 lg:pt-0 bg-[#f8fafc] ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="p-4 md:p-6 lg:p-10 max-w-[1600px] mx-auto overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};
