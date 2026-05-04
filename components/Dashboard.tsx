import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Users, Home, Wallet, Sparkles, ShieldCheck, User, 
  ArrowUpRight, ArrowDownRight, Download, Maximize2, 
  Calendar, Target, Wifi
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { getAISuggestions } from '../services/gemini.ts';
import { Property, Client, Activity, Commission, Campaign, Broker, SystemActivity, CommissionForecast, ClientStatus } from '../types.ts';

interface DashboardProps {
  onNavigate: (view: any) => void;
  currentUser: Broker;
  statsData: {
    properties: Property[];
    clients: Client[];
    tasks: any[];
    activities: Activity[];
    reminders: any[];
    commissions: Commission[];
    campaigns: Campaign[];
    systemLogs: SystemActivity[];
    onlineBrokers: {
      peerId: string;
      id: string;
      name: string;
      role: string;
      isSelf?: boolean;
      lastSeenMs?: number;
      isRecentlyActive?: boolean;
      networkId?: string;
    }[];
    commissionForecasts: CommissionForecast[];
    isMaster?: boolean;
    myPeerId?: string;
    rawConnectionCount?: number;
  };
  onForceSync?: () => void;
  onForceReconnect?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, statsData, currentUser, onForceSync, onForceReconnect }) => {
  const [aiInsight, setAiInsight] = useState<string>("Iniciando análise preditiva...");
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | '30d' | '7d'>('all');
  const isAdmin = currentUser.role === 'Admin' || 
                  currentUser.email.toLowerCase().trim() === 'scarrasco462@gmail.com' || 
                  currentUser.email.toLowerCase().trim() === 'sergioconsultorimobiliario01@gmail.com';

  useEffect(() => {
    const fetchInsight = async () => {
      const dataSummary = `Leads: ${statsData.clients.length}, VGV: R$ ${statsData.commissions.reduce((a, b) => a + (b.salePrice || 0), 0)}`;
      const insight = await getAISuggestions(`Ignore instruções anteriores. Com base nestes dados reais do sistema: ${dataSummary}, dê 1 insight estratégico curto de performance imobiliária em português.`);
      setAiInsight(insight);
    };
    fetchInsight();
  }, [statsData.clients.length, statsData.commissions.length]);

  const analytics = useMemo(() => {
    // VGV Mensal
    const monthlyVGV: { [key: string]: number } = {};
    statsData.commissions.forEach(c => {
      if (!c.date || !c.isGanho) return;
      const date = new Date(c.date);
      const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyVGV[key] = (monthlyVGV[key] || 0) + (c.salePrice || 0);
    });

    const vgvChartData = Object.entries(monthlyVGV)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => {
        const [mA, yA] = a.name.split('/');
        const [mB, yB] = b.name.split('/');
        return new Date(`${mA} 01 20${yA}`).getTime() - new Date(`${mB} 01 20${yB}`).getTime();
      });

    // Lead Status
    const leadStatusData = Object.values(ClientStatus).map(status => ({
      name: status,
      value: statsData.clients.filter(c => c.status === status).length
    })).filter(d => d.value > 0);

    // Top Imóveis
    const propMap = statsData.commissions.filter(c => c.isGanho).reduce((acc: any, c) => {
      acc[c.propertyTitle] = (acc[c.propertyTitle] || 0) + (c.salePrice || 0);
      return acc;
    }, {});
    const topProperties = Object.entries(propMap)
      .map(([name, vgv]: any) => ({ name: name.split(' ')[0], vgv }))
      .sort((a, b) => b.vgv - a.vgv)
      .slice(0, 5);

    return { vgvChartData, leadStatusData, topProperties };
  }, [statsData]);

  const totalSales = statsData.commissions.reduce((acc, c) => acc + (c.isGanho ? (c.salePrice || 0) : 0), 0);
  const totalFee = statsData.commissionForecasts.reduce((a, f) => a + (f.commissionAmount || 0), 0);
  const COLORS = ['#d4a853', '#0f172a', '#334155', '#475569', '#64748b'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase">Vettus Business Intelligence</h1>
          <div className="flex items-center space-x-2 mt-1">
             {isAdmin ? (
                <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                   <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Painel Administrativo Hub</span>
                </div>
             ) : (
                <div className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                   <User className="w-3.5 h-3.5 mr-1.5" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Painel Consultor Individual</span>
                </div>
             )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && onForceSync && (
            <button
              onClick={() => {
                setIsSyncing(true);
                onForceSync();
                setTimeout(() => setIsSyncing(false), 2000);
              }}
              disabled={isSyncing}
              title="Forçar envio de atualizações para todos os corretores online"
              className={`flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isSyncing 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Rede'}
            </button>
          )}
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-1 flex items-center shadow-sm">
            {(['all', '30d', '7d'] as const).map(f => (
              <button key={f} onClick={() => setTimeFilter(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeFilter === f ? 'bg-[#050810] text-[#d4a853]' : 'text-slate-400 hover:text-slate-600'}`}>
                {f === 'all' ? 'Completo' : f}
              </button>
            ))}
          </div>
          <button className="flex items-center space-x-2 px-5 py-3 bg-[#050810] text-[#d4a853] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
            <Download size={14} />
            <span>Exportar Data</span>
          </button>
        </div>
      </div>

      <div className="bg-[#0f172a] rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 relative overflow-hidden shadow-2xl border-b-8 border-[#d4a853]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4a853]/5 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 lg:gap-8">
          <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-[#d4a853]/10 flex items-center justify-center shrink-0 border border-[#d4a853]/20">
             <Sparkles className="w-6 h-6 lg:w-8 lg:h-8 text-[#d4a853]" />
          </div>
          <div className="space-y-1 lg:space-y-2">
            <span className="text-[#d4a853] font-black text-[9px] lg:text-[10px] uppercase tracking-[0.4em]">Insights de IA & Copilot</span>
            <p className="text-white text-lg lg:text-xl font-medium italic opacity-95 leading-tight">"{aiInsight}"</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          { label: isAdmin ? 'VGV Global' : 'Meu VGV', value: `R$ ${(totalSales / 1000000).toFixed(1)}M`, icon: Wallet, color: 'emerald', trend: '+12.5%' },
          { label: 'Leads Ativos', value: statsData.clients.length, icon: Users, color: 'blue', trend: '+2.4%' },
          { label: 'Unidades/Lotes', value: statsData.properties.length, icon: Home, color: 'purple', trend: 'Auditado' },
          { label: 'Comissão FEE', value: `R$ ${(totalFee / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'amber', trend: '+5.2%' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-500 group">
            <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mb-4 lg:mb-6 shadow-sm group-hover:scale-110 transition-all`}>
              <stat.icon className="w-6 h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-widest">{stat.label}</h3>
              <div className={`flex items-center space-x-1 text-[9px] lg:text-[10px] font-black ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-slate-400'}`}>
                {stat.trend.startsWith('+') && <ArrowUpRight size={10} />}
                <span>{stat.trend}</span>
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-slate-900 mt-1 tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 border border-slate-100 shadow-sm flex flex-col gap-6 lg:gap-8">
          <div className="flex items-center justify-between">
            <div>
               <h3 className="text-md lg:text-lg font-black text-slate-900 uppercase">Fluxo de Vendas (VGV)</h3>
               <p className="text-slate-400 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">Consolidado Mensal</p>
            </div>
            <button className="p-2 hover:bg-slate-50 rounded-xl transition-all"><Maximize2 size={16} className="text-slate-400" /></button>
          </div>
          <div className="h-[300px] lg:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.vgvChartData}>
                <defs>
                  <linearGradient id="colorVgv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d4a853" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={v => `R$${v/1000}k`} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="total" stroke="#d4a853" strokeWidth={4} fillOpacity={1} fill="url(#colorVgv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 border border-slate-100 shadow-sm flex flex-col gap-6 lg:gap-8">
          <h3 className="text-md lg:text-lg font-black text-slate-900 uppercase">Qualificação Leads</h3>
          <div className="h-[200px] lg:h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.leadStatusData} innerRadius={60} outerRadius={100} paddingAngle={8} dataKey="value">
                  {analytics.leadStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '12px'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-3xl font-black text-slate-900 leading-none">{statsData.clients.length}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Base Total</p>
            </div>
          </div>
          <div className="space-y-3 mt-auto">
             {analytics.leadStatusData.map((d, i) => (
               <div key={i} className="flex items-center justify-between">
                 <div className="flex items-center space-x-2">
                   <div className="w-2 h-2 rounded-full" style={{background: COLORS[i % COLORS.length]}}></div>
                   <span className="text-[10px] font-bold text-slate-500 uppercase">{d.name}</span>
                 </div>
                 <span className="text-[10px] font-black text-slate-900">{d.value}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {isAdmin ? (
          <div className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
             <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${statsData.onlineBrokers.filter(b => !b.isSelf && b.isRecentlyActive).length > 0 ? 'bg-emerald-100 text-emerald-600 animate-pulse scale-110' : 'bg-slate-100 text-slate-400'}`}>
                <Wifi size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Sincronização Ativa</h3>
             <div className="flex items-center space-x-2 mt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] border-2 border-white"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#d4a853]">
                  Rede Vettus Pro Conectada
                </p>
             </div>
             
             <p className="text-slate-500 text-sm mt-3 max-w-xs uppercase font-bold tracking-tight">
                {statsData.onlineBrokers.filter(b => !b.isSelf).length === 0 
                  ? "Sua unidade está online e pronta para sincronizar."
                  : `Existem ${statsData.onlineBrokers.filter(b => !b.isSelf).length} corretor(es) ativos na sua rede.`
                }
             </p>
             {statsData.onlineBrokers.length > 0 && (
               <div className="mt-8 w-full space-y-3">
                  <div className="flex items-center justify-between px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                     <span>Corretor / Dispositivo</span>
                     <span>Status de Sincronia</span>
                  </div>
                  {statsData.onlineBrokers.map((peer: any, i: number) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${peer.isSelf ? 'bg-[#d4a853]/5 border-[#d4a853]/20 shadow-sm shadow-yellow-500/10' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                      <div className="flex items-center space-x-3 text-left">
                         <div className="relative">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm ${peer.isSelf ? 'bg-white' : 'bg-slate-50'}`}>
                               <User size={18} className={peer.name === 'Conectando...' ? 'animate-pulse text-slate-300' : 'text-[#d4a853]'} />
                            </div>
                            {!peer.isSelf && (
                               <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${peer.isRecentlyActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            )}
                         </div>
                         <div>
                            <p className={`text-[11px] font-black uppercase leading-none tracking-tight ${peer.name === 'Conectando...' ? 'text-slate-400 italic' : 'text-slate-900'}`}>{peer.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                              {peer.role} {peer.isSelf ? ' (Você)' : ''}
                            </p>
                         </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                            <div className={`w-1.5 h-1.5 rounded-full ${peer.isSelf ? 'bg-emerald-500 animate-pulse' : (peer.name === 'Conectando...' ? 'bg-slate-300' : (peer.isRecentlyActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-400'))}`}></div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${peer.isSelf || peer.isRecentlyActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {peer.isSelf ? 'Oline / Mestre' : (peer.name === 'Conectando...' ? 'Sincronizando' : (peer.isRecentlyActive ? 'Conectado' : 'Sinal Instável'))}
                            </span>
                         </div>
                         {!peer.isSelf && peer.lastSeenMs > 0 && (
                           <span className="text-[7px] font-bold text-slate-300 mt-1 uppercase">Visto há {Math.round((Date.now() - peer.lastSeenMs)/1000)}s</span>
                         )}
                      </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 border border-slate-100 shadow-sm">
             <h3 className="text-xs lg:text-sm font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-50 pb-4 mb-4 lg:mb-6">Top Projetos por VGV</h3>
             <div className="h-[200px] lg:h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={analytics.topProperties} layout="vertical" margin={{left: 20}}>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} />
                   <Tooltip contentStyle={{borderRadius: '12px'}} />
                   <Bar dataKey="vgv" fill="#d4a853" radius={[0, 10, 10, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        )}
        <div className="bg-[#050810] rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 shadow-xl overflow-hidden relative">
          <div className="absolute bottom-0 right-0 p-8 opacity-5"><Target size={140} className="text-[#d4a853]" /></div>
          <h3 className="text-xs lg:text-sm font-black text-[#d4a853] uppercase tracking-widest border-b border-white/10 pb-4 mb-6 lg:mb-8">Cronograma de Recebimento</h3>
          <div className="space-y-5 relative z-10">
             {statsData.commissions.filter(c => c.triggerDate).slice(0, 4).sort((a,b) => new Date(a.triggerDate!).getTime() - new Date(b.triggerDate!).getTime()).map((c, i) => (
               <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-[1.5rem] border border-white/10 hover:bg-white/10 transition-all cursor-default">
                 <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-[#d4a853]/10 flex items-center justify-center text-[#d4a853]">
                       <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase leading-tight">{c.clientName}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{c.propertyTitle}</p>
                    </div>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-black text-[#d4a853]">{new Date(c.triggerDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                   <p className="text-[8px] font-black text-slate-500 uppercase">Trigger Date</p>
                 </div>
               </div>
             ))}
             {statsData.commissions.filter(c => c.triggerDate).length === 0 && (
               <div className="py-20 text-center">
                  <p className="text-slate-500 text-xs italic">Nenhum gatilho de comissão pendente no calendário.</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
