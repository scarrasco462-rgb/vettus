
import React, { useMemo } from 'react';
import { 
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Calendar, 
  Filter, AlertCircle, CheckCircle2, DollarSign, Building2, 
  ChevronRight, Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Commission, CommissionForecast, ConstructionCompany } from '../types';

interface CashFlowViewProps {
  commissions: Commission[];
  forecasts: CommissionForecast[];
  companies: ConstructionCompany[];
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({ commissions, forecasts, companies }) => {
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((m, i) => {
      const comms = commissions.filter(c => new Date(c.date).getMonth() === i).reduce((acc, curr) => acc + curr.amount, 0);
      const fcs = forecasts.filter(f => new Date(f.forecastDate).getMonth() === i).reduce((acc, curr) => acc + curr.commissionAmount, 0);
      return { name: m, realizado: comms, previsto: fcs };
    });
  }, [commissions, forecasts]);

  const totalRealizado = commissions.filter(c => c.status === 'Paid').reduce((acc, c) => acc + c.amount, 0);
  const totalPrevisto = forecasts.filter(f => f.status !== 'Recebido').reduce((acc, f) => acc + f.commissionAmount, 0);
  const healthScore = totalRealizado > 0 ? (totalRealizado / (totalRealizado + totalPrevisto)) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Fluxo de Caixa Vettus</h1>
          <p className="text-slate-500 font-medium">Previsão 12 meses e controle de recebíveis por construtora.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm">
            <Filter className="w-4 h-4" />
            <span>Filtros Avançados</span>
          </button>
          <button className="bg-[#0f172a] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg">
            <Download className="w-4 h-4 text-[#d4a853]" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-black uppercase text-[#d4a853] tracking-widest mb-2">Liquidado em Conta</p>
          <h3 className="text-3xl font-black">{formatCurrency(totalRealizado)}</h3>
          <div className="mt-4 flex items-center text-emerald-400 text-[10px] font-black uppercase">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            <span>+18.4% este mês</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Previsão 12 Meses</p>
          <h3 className="text-3xl font-black text-slate-900">{formatCurrency(totalPrevisto)}</h3>
          <div className="mt-4 flex items-center text-amber-500 text-[10px] font-black uppercase">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Aguardando Fluxo Construtora</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Saúde Financeira</p>
             <span className={`text-[10px] font-black uppercase ${healthScore > 90 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {healthScore > 90 ? 'Excelente' : 'Estável'}
             </span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
             <div className={`h-full transition-all duration-1000 ${healthScore > 90 ? 'bg-emerald-500' : healthScore < 80 ? 'bg-red-500' : 'bg-[#d4a853]'}`} style={{ width: `${healthScore}%` }}></div>
          </div>
          <p className="mt-4 text-[10px] text-slate-400 font-medium italic text-center">Baseado na taxa de conversão de leads hot/warm.</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Projeção de Ganhos Anual</h2>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#d4a853]"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase">Realizado</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-slate-200"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase">Projetado</span>
            </div>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#d4a853" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="realizado" stroke="#d4a853" fillOpacity={1} fill="url(#colorRealizado)" strokeWidth={4} />
              <Area type="monotone" dataKey="previsto" stroke="#e2e8f0" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0a1120] p-8 rounded-[2.5rem] border border-white/5 text-white shadow-2xl">
           <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center">
                 <Building2 className="w-6 h-6 text-slate-900" />
              </div>
              <h3 className="text-xl font-bold tracking-tight uppercase">Alertas Construtoras</h3>
           </div>
           <div className="space-y-4">
              {companies.slice(0, 3).map(comp => (
                <div key={comp.id} className="bg-white/5 p-5 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all">
                   <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-[#d4a853]/30 flex items-center justify-center font-black text-[10px] text-[#d4a853]">
                         {comp.name[0]}
                      </div>
                      <div>
                         <p className="text-sm font-bold">{comp.name}</p>
                         <p className="text-[9px] text-slate-500 uppercase tracking-widest">Base Pagamento: Dia {comp.basePaymentDay}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-[#d4a853]">{(comp.commissionRate * 100).toFixed(1)}% FEE</p>
                      <button className="text-[8px] font-black uppercase text-slate-400 group-hover:text-white transition-colors">Detalhes</button>
                   </div>
                </div>
              ))}
              {companies.length === 0 && <p className="text-center py-10 text-slate-500 text-xs italic">Nenhum parceiro configurado no módulo comercial.</p>}
           </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                 <AlertCircle className="w-6 h-6 text-[#d4a853]" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Controle de Adiantamentos</h3>
           </div>
           <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-center">
              <Download className="w-10 h-10 text-slate-200 mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-[200px]">Arraste planilhas de liberação aqui para auditar</p>
           </div>
        </div>
      </div>
    </div>
  );
};
