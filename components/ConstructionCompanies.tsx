import React, { useState } from 'react';
import { 
  Building2, Plus, HardHat, Percent, Calendar, Clock, Search, 
  ChevronRight, Award, Wallet, TrendingUp, Filter, Trash2, Pencil,
  CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { ConstructionCompany, CommissionForecast, Broker } from '../types.ts';

interface ConstructionCompaniesViewProps {
  companies: ConstructionCompany[];
  forecasts: CommissionForecast[];
  onAddCompany: (company: ConstructionCompany) => void;
  onAddForecasts: (forecasts: CommissionForecast[]) => void;
  currentUser: Broker;
}

export const ConstructionCompaniesView: React.FC<ConstructionCompaniesViewProps> = ({ 
  companies, forecasts, onAddCompany, currentUser 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    commissionRate: 4,
    releaseFluxRate: 8,
    closingDay: 5,
    brokerPercent: 2,
    agencyPercent: 4
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de soma de percentuais conforme regra fiscal do sistema
    if (formData.brokerPercent + formData.agencyPercent > 25) {
      alert("A soma dos percentuais (Corretor + Imobiliária) não pode exceder 25%.");
      return;
    }

    const newCompany: ConstructionCompany = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      commissionRate: formData.commissionRate / 100,
      releaseFluxRate: formData.releaseFluxRate / 100,
      closingDay: formData.closingDay,
      brokerPercent: formData.brokerPercent / 100,
      agencyPercent: formData.agencyPercent / 100,
      updatedAt: new Date().toISOString()
    };
    onAddCompany(newCompany);
    setIsModalOpen(false);
    setFormData({ name: '', commissionRate: 4, releaseFluxRate: 8, closingDay: 5, brokerPercent: 2, agencyPercent: 4 });
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Construtoras</h1>
          <p className="text-slate-500 font-medium">Configuração de regras comerciais e fluxos de recebimento.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="gold-gradient text-white px-6 py-3 rounded-2xl flex items-center space-x-2 text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Construtora</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {companies.map(company => {
          const companyForecasts = forecasts.filter(f => f.constructionCompanyId === company.id);
          const totalExpected = companyForecasts.reduce((acc, f) => acc + f.commissionAmount, 0);
          
          return (
            <div key={company.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
                  <Building2 className="w-24 h-24" />
               </div>
               
               <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-[#d4a853] flex items-center justify-center shadow-lg">
                     <HardHat className="w-7 h-7" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-slate-900 uppercase">{company.name}</h3>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Dia de Fechamento: {String(company.closingDay).padStart(2, '0')}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Comissão Total</p>
                     <p className="text-sm font-black text-slate-900">{(company.commissionRate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Fluxo Liberação</p>
                     <p className="text-sm font-black text-[#d4a853]">{(company.releaseFluxRate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Corretor</p>
                     <p className="text-sm font-black text-emerald-600">{(company.brokerPercent * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Imobiliária</p>
                     <p className="text-sm font-black text-blue-600">{(company.agencyPercent * 100).toFixed(1)}%</p>
                  </div>
               </div>

               <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase">Previsão Acumulada</p>
                     <p className="text-lg font-black text-emerald-600">{formatCurrency(totalExpected)}</p>
                  </div>
                  <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-[#d4a853] transition-colors shadow-lg">
                     <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
          );
        })}
        {companies.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem]">
             <HardHat className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma construtora cadastrada</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[3rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-white/10">
            <div className="gold-gradient p-8 text-[#0f172a] shrink-0 border-b border-[#0f172a]/10">
               <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-[#0f172a] rounded-2xl flex items-center justify-center shadow-lg">
                    <HardHat className="w-6 h-6 text-[#d4a853]" />
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full"><Plus className="w-8 h-8 rotate-45" /></button>
               </div>
               <h2 className="text-xl font-black uppercase tracking-tight">Nova Construtora</h2>
               <p className="text-[#0f172a]/70 text-[9px] font-black uppercase tracking-widest">Configuração de Regras de Fluxo e Comissionamento</p>
            </div>

            <form onSubmit={handleSave} className="p-8 bg-slate-50 space-y-6">
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome da Construtora</label>
                     <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#d4a853]" placeholder="Ex: Vectra Construtora" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">% Comissão</label>
                        <div className="relative">
                           <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#d4a853]" />
                           <input type="number" step="0.1" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-8 px-4 text-sm font-bold text-slate-900" />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">% Fluxo Liberação</label>
                        <div className="relative">
                           <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#d4a853]" />
                           <input type="number" step="0.1" value={formData.releaseFluxRate} onChange={e => setFormData({...formData, releaseFluxRate: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-8 px-4 text-sm font-bold text-slate-900" />
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">% Corretor (0-10)</label>
                        <div className="relative">
                           <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500" />
                           <input type="number" step="0.01" min="0" max="10" value={formData.brokerPercent} onChange={e => setFormData({...formData, brokerPercent: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-8 px-4 text-sm font-bold text-slate-900" />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">% Imobiliária (0-15)</label>
                        <div className="relative">
                           <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-500" />
                           <input type="number" step="0.01" min="0" max="15" value={formData.agencyPercent} onChange={e => setFormData({...formData, agencyPercent: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-8 px-4 text-sm font-bold text-slate-900" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Dia de Fechamento (01-28)</label>
                     <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="number" min="1" max="28" value={formData.closingDay} onChange={e => setFormData({...formData, closingDay: parseInt(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 px-4 text-sm font-bold text-slate-900" />
                     </div>
                  </div>
               </div>

               <button type="submit" className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-[#d4a853] transition-all">
                  Cadastrar Parceiro
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};