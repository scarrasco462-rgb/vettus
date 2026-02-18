
import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Home, Wallet, Sparkles, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAISuggestions } from './services/gemini.ts';
import { Property, Client, Task, Activity, Reminder, Commission, Campaign, Broker, SystemActivity, CommissionForecast } from './types.ts';

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

export const Dashboard: React.FC<DashboardProps> = ({ statsData, currentUser }) => {
  const [aiInsight, setAiInsight] = useState<string>("Iniciando análise preditiva...");

  useEffect(() => {
    const fetchInsight = async () => {
      const insight = await getAISuggestions("Curta dica de fechamento imobiliário de alto padrão.");
      setAiInsight(insight);
    };
    fetchInsight();
  }, []);

  const totalSales = statsData.tasks.filter(t => t.stage === 'Ganho').reduce((acc, t) => acc + t.value, 0);

  const stats = [
    { label: 'VGV Negociado', value: `R$ ${(totalSales / 1000000).toFixed(1)}M`, icon: Wallet, color: 'text-emerald-600' },
    { label: 'Leads Ativos', value: statsData.clients.length.toString(), icon: Users, color: 'text-blue-600' },
    { label: 'Portfólio', value: statsData.properties.length.toString(), icon: Home, color: 'text-purple-600' },
    { label: 'Previsão FEE', value: `R$ ${(statsData.commissions.reduce((a,c)=>a+c.amount,0)/1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-[#d4a853]' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Vettus Analytics</h1>
          <p className="text-slate-500 mt-1 font-medium">Inteligência Operacional da Unidade.</p>
        </div>
      </div>

      <div className="bg-[#0f172a] rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl border border-white/5">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-[#d4a853] mb-3 font-black text-[10px] uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>AI Assistant</span>
          </div>
          <p className="text-white text-xl font-medium leading-relaxed italic opacity-90">"{aiInsight}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all">
            <div className={`w-12 h-12 rounded-2xl bg-slate-50 ${stat.color} flex items-center justify-center mb-4 shadow-sm`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</h3>
            <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
