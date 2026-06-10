
import React from 'react';
import { Wallet, CheckCircle, Clock, Download, TrendingUp, User, Building2, Calendar, ArrowUpRight, Users } from 'lucide-react';
import { Commission, Broker } from '../types';

interface CommissionViewProps {
  commissions: Commission[];
  brokers: Broker[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

export const CommissionView: React.FC<CommissionViewProps> = ({ commissions, brokers }) => {
  const totalPaid = commissions.filter(c => c.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPending = commissions.filter(c => c.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);

  const getBrokerName = (id: string) => {
    return brokers.find(b => b.id === id)?.name || 'Corretor Externo';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Extrato de Comissões</h1>
          <p className="text-slate-500">Detalhamento individualizado por imóvel e corretor responsável.</p>
        </div>
        <button className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors uppercase tracking-widest">
          <Download className="w-4 h-4" />
          <span>Exportar Relatório</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#0f172a] text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#d4a853]/10 rounded-full blur-3xl group-hover:bg-[#d4a853]/20 transition-all"></div>
          <TrendingUp className="absolute top-6 right-6 w-8 h-8 text-[#d4a853] opacity-50" />
          <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Comissões Pagas</h3>
          <p className="text-4xl font-black tracking-tight">{formatCurrency(totalPaid)}</p>
          <div className="mt-4 flex items-center text-green-400 text-xs font-bold">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            <span>+12% vs mês anterior</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <Clock className="absolute top-6 right-6 w-8 h-8 text-yellow-500 opacity-20" />
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Previsão Pendente</h3>
          <p className="text-4xl font-black text-slate-900 tracking-tight">{formatCurrency(totalPending)}</p>
          <p className="mt-4 text-slate-400 text-xs font-medium italic">Aguardando liberação de escritura</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Vendas Concluídas</h3>
              <p className="text-4xl font-black text-slate-900">{commissions.length}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center shadow-lg">
              <Wallet className="text-white w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Lançamentos Individuais</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {commissions.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-[#d4a853]/20 transition-all group flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${item.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-[#d4a853] transition-colors">{item.propertyTitle}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {item.status === 'Paid' ? 'Liquidado' : 'Aguardando'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1">
                    <div className="flex items-center text-xs text-slate-500">
                      <User className="w-3.5 h-3.5 mr-1.5 text-[#d4a853]" />
                      <span className="font-semibold text-slate-700">{getBrokerName(item.brokerId)}</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <span>Comprador: <span className="font-medium text-slate-600">{item.clientName}</span></span>
                    </div>
                    <div className="flex items-center text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <span>{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between md:text-right border-t md:border-t-0 pt-4 md:pt-0">
                <div className="md:hidden">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor da Comissão</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(item.amount)}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Crédito em Conta Vettus</p>
                </div>
              </div>
            </div>
          ))}

          {commissions.length === 0 && (
            <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 py-32 text-center">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-bold italic">Nenhuma transação individual encontrada para este período.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
