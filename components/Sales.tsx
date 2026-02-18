
import React, { useState } from 'react';
import { ShoppingCart, Download, TrendingUp, User, Building2, Calendar, FileSpreadsheet, BadgeCheck, Clock, ArrowUpRight, Hash, Tag, DollarSign, Award, X, CheckCircle2, ChevronRight, Calculator, ListOrdered } from 'lucide-react';
import { Commission, Broker } from '../types';

interface SalesViewProps {
  sales: Commission[];
  brokers: Broker[];
  onUpdateSale?: (sale: Commission) => void;
  currentUser?: Broker;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const getMonthName = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
};

export const SalesView: React.FC<SalesViewProps> = ({ sales, brokers, onUpdateSale, currentUser }) => {
  const [selectedSale, setSelectedSale] = useState<Commission | null>(null);
  
  const totalVolume = sales.reduce((acc, curr) => acc + (curr.salePrice || 0), 0);
  const totalCommissions = sales.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaidCommissions = sales.filter(c => c.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);

  const getBrokerName = (id: string) => {
    return brokers.find(b => b.id === id)?.name || 'Corretor Externo';
  };

  const groupedSales = sales.reduce((groups, sale) => {
    const month = getMonthName(sale.date);
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(sale);
    return groups;
  }, {} as Record<string, Commission[]>);

  const sortedMonths = Object.keys(groupedSales).sort((a, b) => {
    return new Date(groupedSales[b][0].date).getTime() - new Date(groupedSales[a][0].date).getTime();
  });

  const handleMarkAsPaid = () => {
    if (!selectedSale || !onUpdateSale) return;
    if (confirm("Deseja liquidar esta comissão?")) {
      onUpdateSale({ ...selectedSale, status: 'Paid', updatedAt: new Date().toISOString() });
      setSelectedSale(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Consolidação Vettus</h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">Controle de VGV e liquidação operacional.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <span>Excel Master</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-[#0f172a] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
              <TrendingUp className="w-20 md:w-24 h-20 md:h-24" />
           </div>
           <p className="text-[9px] md:text-[10px] font-black uppercase text-[#d4a853] tracking-widest mb-2">Volume Total (VGV)</p>
           <h3 className="text-2xl md:text-3xl font-black">{formatCurrency(totalVolume)}</h3>
           <div className="mt-4 flex items-center text-emerald-400 text-[9px] md:text-[10px] font-black uppercase">
              <ArrowUpRight className="w-4 h-4 mr-1 shrink-0" />
              <span>Contratos Gerados</span>
           </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
           <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Comissões Brutas</p>
           <h3 className="text-2xl md:text-3xl font-black text-slate-900">{formatCurrency(totalCommissions)}</h3>
           <div className="mt-4 flex items-center text-[#d4a853] text-[9px] md:text-[10px] font-black uppercase">
              <Award className="w-4 h-4 mr-1 shrink-0" />
              <span>Taxa Média 6%</span>
           </div>
        </div>

        <div className="bg-emerald-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-emerald-100 shadow-sm sm:col-span-2 lg:col-span-1">
           <p className="text-[9px] md:text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-2">Receita Liquidada</p>
           <h3 className="text-2xl md:text-3xl font-black text-emerald-900">{formatCurrency(totalPaidCommissions)}</h3>
           <div className="mt-4 flex items-center text-emerald-600 text-[9px] md:text-[10px] font-black uppercase">
              <BadgeCheck className="w-4 h-4 mr-1 shrink-0" />
              <span>Saldo em Conta Vettus</span>
           </div>
        </div>
      </div>

      <div className="space-y-8 md:space-y-12">
        {sortedMonths.map(month => (
          <div key={month} className="space-y-4">
            <div className="flex items-center space-x-4 ml-2">
              <h2 className="text-[10px] md:text-sm font-black text-[#d4a853] uppercase tracking-[0.2em] md:tracking-[0.3em] whitespace-nowrap">{month}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-yellow-200 to-transparent"></div>
            </div>

            <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">
                      <th className="px-6 md:px-8 py-4 md:py-5">Data</th>
                      <th className="px-6 md:px-8 py-4 md:py-5">Empreendimento</th>
                      <th className="px-6 md:px-8 py-4 md:py-5">Corretor</th>
                      <th className="px-6 md:px-8 py-4 md:py-5 text-right">Valor FEE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedSales[month].map((sale) => (
                      <tr key={sale.id} onClick={() => setSelectedSale(sale)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                        <td className="px-6 md:px-8 py-5 md:py-6">
                           <span className="text-[11px] md:text-xs font-bold text-slate-500">{new Date(sale.date).toLocaleDateString('pt-BR')}</span>
                        </td>
                        <td className="px-6 md:px-8 py-5 md:py-6">
                           <div className="min-w-0 max-w-[200px] md:max-w-none">
                              <p className="text-xs md:text-sm font-black text-slate-900 uppercase group-hover:text-[#d4a853] transition-colors truncate">{sale.propertyTitle}</p>
                              <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">U: {sale.unitNumber || '?'}</p>
                           </div>
                        </td>
                        <td className="px-6 md:px-8 py-5 md:py-6">
                           <div className="flex items-center space-x-2 md:space-x-3">
                              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-900 text-[#d4a853] flex items-center justify-center text-[8px] md:text-[10px] font-black shadow-sm shrink-0">{getBrokerName(sale.brokerId)[0]}</div>
                              <span className="text-[11px] md:text-xs font-bold text-slate-700 truncate">{getBrokerName(sale.brokerId)}</span>
                           </div>
                        </td>
                        <td className="px-6 md:px-8 py-5 md:py-6 text-right">
                           <div className="flex flex-col items-end shrink-0">
                              <span className="text-xs md:text-sm font-black text-slate-900">{formatCurrency(sale.amount)}</span>
                              <span className={`text-[7px] md:text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${sale.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'}`}>
                                 {sale.status === 'Paid' ? 'Liquidado' : 'Pendente'}
                              </span>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedSale && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-[#0a1120]/95 backdrop-blur-md" onClick={() => setSelectedSale(null)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
             <div className="gold-gradient p-6 md:p-8 text-[#0f172a] shrink-0 border-b border-[#0f172a]/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-[#0f172a] rounded-[1rem] md:rounded-[1.5rem] flex items-center justify-center shadow-2xl shrink-0"><Award className="w-5 h-5 md:w-7 md:h-7 text-[#d4a853]" /></div>
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-xl font-black uppercase tracking-tight truncate">Detalhes Venda</h2>
                      <p className="text-[#0f172a]/70 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] truncate">ID: {selectedSale.id}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-black/5 rounded-full shrink-0"><X className="w-6 h-6" /></button>
                </div>
             </div>

             <div className="p-6 md:p-8 overflow-y-auto no-scrollbar bg-slate-50 space-y-6 md:space-y-8 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-1">Volume (VGV)</p>
                      <p className="text-base md:text-lg font-black text-slate-900">{formatCurrency(selectedSale.salePrice || 0)}</p>
                   </div>
                   <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-1">Comissão Master</p>
                      <p className="text-base md:text-lg font-black text-[#d4a853]">{formatCurrency(selectedSale.amount)}</p>
                   </div>
                </div>

                <div className="bg-slate-900 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-5"><Calculator className="w-12 md:w-16 h-12 md:h-16" /></div>
                   <h4 className="text-[9px] md:text-[10px] font-black uppercase text-[#d4a853] tracking-widest mb-4 border-b border-white/10 pb-2">Partilha Master</h4>
                   
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] md:text-[10px] font-bold opacity-70 uppercase tracking-widest">Corretor (40%):</span>
                         <span className="text-xs md:text-sm font-black">{formatCurrency(selectedSale.brokerAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] md:text-[10px] font-bold opacity-70 uppercase tracking-widest">Vettus (60%):</span>
                         <span className="text-xs md:text-sm font-black">{formatCurrency(selectedSale.agencyAmount)}</span>
                      </div>
                   </div>
                </div>

                {selectedSale.status === 'Pending' && currentUser?.role === 'Admin' && (
                  <button onClick={handleMarkAsPaid} className="w-full bg-emerald-600 text-white py-4 md:py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center space-x-3">
                     <BadgeCheck className="w-5 h-5 shrink-0" />
                     <span>Liquidar no Caixa</span>
                  </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
