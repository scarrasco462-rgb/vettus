
import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, Home, Users, Bell, Calendar, LogOut, Megaphone,
  Kanban, ShieldCheck, BadgeDollarSign, TableProperties, FileUp,
  Database, RotateCcw, Files, HardHat, TrendingUp, Layers, Key, Palette
} from 'lucide-react';
import { Broker, AppView } from './types.ts';

export const VettusLogo = ({ className = "w-20 h-20" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group`}>
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-2xl">
      <defs>
        <linearGradient id="vettus-gold-root-linear" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8860b" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>

        <filter id="metal-glow-root" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur"/>
          <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
          <feFlood floodColor="#FFD700" floodOpacity="0.4" result="glowColor"/>
          <feComposite in="glowColor" in2="offsetBlur" operator="in" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <mask id="v-frame-mask-root">
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
      
      <g filter="url(#metal-glow-root)">
        <g mask="url(#v-frame-mask-root)">
          <rect x="55" y="25" width="10" height="70" rx="1" stroke="url(#vettus-gold-root-linear)" strokeWidth="2.5" fill="none" />
          <g stroke="url(#vettus-gold-root-linear)" strokeWidth="1" opacity="0.4">
            <path d="M57 35 H63 M57 42 H63 M57 49 H63 M57 56 H63 M57 63 H63 M57 70 H63 M57 77 H63 M57 84 H63" />
          </g>
        </g>

        <path 
          d="M25 35 L60 95 L95 35" 
          stroke="url(#vettus-gold-root-linear)" 
          strokeWidth="7" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none"
        />
      </g>
    </svg>
  </div>
);

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: AppView) => void;
  currentUser: Broker;
  onLogout: () => void;
  pendingRemindersCount: number;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange, currentUser, onLogout, pendingRemindersCount }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className={`bg-[#0a1120] text-white flex flex-col fixed inset-y-0 left-0 z-50 no-print shadow-2xl transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`p-6 flex flex-col items-center border-b border-white/5 relative ${isCollapsed ? 'p-4' : 'p-8'}`}>
          <VettusLogo className={`${isCollapsed ? 'w-10 h-10' : 'w-20 h-20'} mb-2`} />
          {!isCollapsed && <h1 className="text-lg font-extrabold tracking-widest text-[#FFD700] uppercase">VETTUS</h1>}
        </div>
        <div className="px-3 py-6 space-y-1 flex-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.id ? 'bg-[#FFD700] text-[#0a1120] shadow-lg' : 'text-slate-400 hover:bg-white/5'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-white/5">
          <button onClick={onLogout} className={`w-full flex items-center space-x-3 px-4 py-3 text-slate-500 hover:text-red-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="text-xs font-black uppercase tracking-widest">Sair</span>}
          </button>
        </div>
      </aside>
      <main className={`flex-1 min-h-screen bg-[#f8fafc] transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
