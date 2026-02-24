import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, Home, Wallet, Sparkles, Clock, ShieldCheck, User } from 'lucide-react';
import { getAISuggestions } from '../services/gemini.ts';
import { Property, Client, Task, Activity, Reminder, Commission, Campaign, Broker, SystemActivity, CommissionForecast } from '../types.ts';

interface DashboardProps {
  onNavigate: (view: any) => void;
  currentUser: Broker;
  statsData: {
    properties: Property[];
    clients: Client[];
    tasks: Task[];
    activities: Activity[];
    reminders: Reminder[];
    commissions: Commission[];
    campaigns: Campaign[];
    systemLogs: SystemActivity[];
    onlineBrokers: string[];
    commissionForecasts: CommissionForecast[];
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, statsData, currentUser }) => {
  const [aiInsight, setAiInsight] = useState<string>("Iniciando análise preditiva...");
  const isAdmin = currentUser.role === 'Admin';

  useEffect(() => {
    const fetchInsight = async () => {
      const insight = await getAISuggestions("Curta dica de fechamento imobiliário de alto padrão.");
      setAiInsight(insight);
    };
    fetchInsight();
  }, []);

  // Lógica de Filtragem Seletiva v6.2
  const filteredData = useMemo(() => {
    if (isAdmin) {
      return {
        clients: statsData.clients,
        properties: statsData.properties,
        commissions: statsData.commissions,
        forecasts: statsData.commissionForecasts
      };
    }
    // Para corretores, filtramos apenas o que pertence ao ID dele
    return {
      clients: statsData.clients.filter(c => c.brokerId === currentUser.id),
      properties: statsData.properties.filter(p => p.brokerId === currentUser.id),
      commissions: statsData.commissions.filter(c => c.brokerId === currentUser.id),
      forecasts: statsData.commissionForecasts.filter(f => {
        const client = statsData.clients.find(cl => cl.id === f.clientId);
        return client?.brokerId === currentUser.id;
      })
    };
  }, [statsData, currentUser, isAdmin]);

  const totalSales = filteredData.commissions.reduce((acc, c) => acc + (c.salePrice || 0), 0);
  const totalFee = filteredData.forecasts.reduce((a, f) => a + (f.commissionAmount || 0), 0);

  const stats = [
    { 
      label: isAdmin ? 'VGV Global' : 'Meu VGV', 
      value: `R$ ${(totalSales / 1000000).toFixed(1)}M`, 
      icon: Wallet, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      label: isAdmin ? 'Total Leads Ativos' : 'Meus Leads Ativos', 
      value: filteredData.clients.length.toString(), 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: isAdmin ? 'Portfólio Global' : 'Portfólio Próprio', 
      value: filteredData.properties.length.toString(), 
      icon: Home, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
    { 
      label: isAdmin ? 'Previsão FEE Global' : 'Minha Previsão FEE', 
      value: `R$ ${(totalFee / 1000).toFixed(0)}K`, 
      icon: TrendingUp, 
      color: 'text-[#d4a853]', 
      bg: 'bg-yellow-50' 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Vettus Analytics</h1>
          <div className="flex items-center space-x-2 mt-1">
             {isAdmin ? (
               <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Visão Global da Unidade</span>
               </div>
             ) : (
               <div className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Minha Performance Individual</span>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="bg-[#0f172a] rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4a853]/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-[#d4a853] mb-3 font-black text-[10px] uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>AI Assistant Intelligence</span>
          </div>
          <p className="text-white text-xl font-medium leading-relaxed italic opacity-90">"{aiInsight}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 shadow-sm`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</h3>
            <p className="text-2xl font-black text-slate-900 mt-1 tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};