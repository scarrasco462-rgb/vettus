
import React, { useState, useMemo } from 'react';
import { 
  Home, 
  Key, 
  Calendar, 
  User, 
  Clock, 
  TrendingUp, 
  Plus, 
  Filter, 
  Search, 
  ChevronRight, 
  BadgeCheck, 
  AlertCircle,
  FileText,
  DollarSign
} from 'lucide-react';
import { RentalContract, Property, Broker, Client } from '../types';

interface LeasingViewProps {
  rentals: RentalContract[];
  properties: Property[];
  currentUser: Broker;
  onAddRental: (contract: RentalContract) => void;
}

export const LeasingView: React.FC<LeasingViewProps> = ({ rentals, properties, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const activeRentals = rentals.filter(r => r.status === 'Active');
  const totalRevenue = activeRentals.reduce((acc, curr) => acc + curr.monthlyValue, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Locação</h1>
          <p className="text-slate-500 font-medium">Controle de contratos ativos e repasses mensais.</p>
        </div>
        <button className="gold-gradient text-white px-6 py-3 rounded-2xl flex items-center space-x-2 text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform">
           <Plus className="w-4 h-4" />
           <span>Novo Contrato</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
            <TrendingUp className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-black uppercase text-[#d4a853] tracking-widest mb-2">Faturamento Recorrente</p>
          <h3 className="text-3xl font-black">{formatCurrency(totalRevenue)}</h3>
          <div className="mt-4 flex items-center text-emerald-400 text-[10px] font-black uppercase">
            <BadgeCheck className="w-4 h-4 mr-1" />
            <span>{activeRentals.length} Contratos Ativos</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Vencimentos 30 Dias</p>
          <h3 className="text-3xl font-black text-slate-900">{rentals.filter(r => r.status === 'Expired').length}</h3>
          <div className="mt-4 flex items-center text-amber-500 text-[10px] font-black uppercase">
            <Clock className="w-4 h-4 mr-1" />
            <span>Ações de Renovação</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Repasses Vettus</p>
             <span className="text-[10px] font-black text-[#d4a853] uppercase">Adm. 10%</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(totalRevenue * 0.1)}</p>
          <p className="mt-4 text-[10px] text-slate-400 font-medium italic text-center">Taxa de administração líquida.</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
         <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Carteira de Locação Ativa</h2>
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Filtrar inquilino ou imóvel..." 
                 className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none w-64"
               />
            </div>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
                     <th className="px-10 py-5">Imóvel / Código</th>
                     <th className="px-10 py-5">Inquilino</th>
                     <th className="px-10 py-5">Vigência</th>
                     <th className="px-10 py-5 text-right">Aluguel Mensal</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {rentals.map(rental => (
                    <tr key={rental.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                       <td className="px-10 py-6">
                          <div>
                             <p className="text-sm font-bold text-slate-900 uppercase group-hover:text-[#d4a853] transition-colors">{rental.propertyTitle}</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">REF: {rental.id.toUpperCase()}</p>
                          </div>
                       </td>
                       <td className="px-10 py-6">
                          <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 rounded-full bg-slate-900 text-[#d4a853] flex items-center justify-center text-[10px] font-black">{rental.clientName[0]}</div>
                             <span className="text-xs font-bold text-slate-700">{rental.clientName}</span>
                          </div>
                       </td>
                       <td className="px-10 py-6">
                          <div className="flex flex-col">
                             <span className="text-xs font-bold text-slate-600">{new Date(rental.startDate).toLocaleDateString('pt-BR')} até {new Date(rental.endDate).toLocaleDateString('pt-BR')}</span>
                             <span className={`text-[8px] font-black uppercase mt-1 ${rental.status === 'Active' ? 'text-emerald-500' : 'text-amber-500'}`}>{rental.status}</span>
                          </div>
                       </td>
                       <td className="px-10 py-6 text-right">
                          <span className="text-sm font-black text-slate-900">{formatCurrency(rental.monthlyValue)}</span>
                       </td>
                    </tr>
                  ))}
                  {rentals.length === 0 && (
                    <tr>
                       <td colSpan={4} className="py-20 text-center">
                          <Key className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum contrato de locação ativo na rede</p>
                       </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
