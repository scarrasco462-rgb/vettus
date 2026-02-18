
import React from 'react';
import { TrendingUp, Award, BadgeCheck, FileSpreadsheet, ArrowUpRight } from 'lucide-react';
import { Commission, Broker } from './types.ts';

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

export const SalesView: React.FC<SalesViewProps> = ({ sales, brokers }) => {
  // Fixed totalVolume calculation to ensure salePrice exists or default to 0
  const totalVolume = sales.reduce((acc, curr) => acc + (curr.salePrice || 0), 0);
  const totalPaid = sales.filter(c => c.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);

  const getBrokerName = (id: string) => brokers.find(b => b.id === id)?.name || 'Corretor Externo';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Vendas Vettus</h1>
          <p className="text-slate-500">Controle de VGV e liquidação de comissões.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
           <p className="text-[10px] font-black uppercase text-[#d4a853] tracking-widest mb-2">Volume Total (VGV)</p>
           <h3 className="text-3xl font-black">{formatCurrency(totalVolume)}</h3>
        </div>
        <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 text-emerald-900 shadow-sm">
           <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-2">Receita Liquidada</p>
           <h3 className="text-3xl font-black">{formatCurrency(totalPaid)}</h3>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase">
            <tr>
              <th className="px-8 py-5">Data</th>
              <th className="px-8 py-5">Imóvel</th>
              <th className="px-8 py-5">Corretor</th>
              <th className="px-8 py-5 text-right">Comissão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-6 text-xs font-bold text-slate-500">{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-6 font-black text-slate-900 text-sm uppercase">{sale.propertyTitle}</td>
                <td className="px-8 py-6 text-xs font-bold text-slate-700">{getBrokerName(sale.brokerId)}</td>
                <td className="px-8 py-6 text-right font-black text-[#d4a853]">{formatCurrency(sale.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
