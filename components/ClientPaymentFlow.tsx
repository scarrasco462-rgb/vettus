import React, { useState, useMemo, useEffect } from 'react';
import { 
  Layers, Search, FileSpreadsheet, Download, Filter, 
  Calculator, DollarSign, UserCheck, ChevronRight, 
  LayoutList, TrendingUp, Wallet, CheckCircle2, Clock,
  ArrowRight, Info, Percent, Edit3, Building2, Plus,
  Minus, Save, Calendar, MousePointer2, X, Briefcase,
  PlusCircle, UserPlus, FileText, CheckCircle, Trash2,
  ArrowDownWideNarrow, Zap, ChevronDown, ChevronUp, AlertCircle,
  Star, Printer
} from 'lucide-react';
import { Commission, Broker, Client, PaymentProposal, Property, LaunchProject } from '../types.ts';
import * as XLSX from 'xlsx';

interface ClientPaymentFlowProps {
  commissions: Commission[];
  brokers: Broker[];
  clients: Client[];
  properties: Property[];
  launches: LaunchProject[];
  currentUser?: Broker;
  onUpdateSale?: (sale: Commission) => void;
  onAddSale?: (sale: Commission) => void;
  onDeleteSale?: (id: string) => void;
  preselectedClientId?: string | null;
  onClearPreselection?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatInputToBRL = (value: string): string => {
  const nums = value.replace(/[^\d]/g, '');
  if (!nums) return '0,00';
  const float = parseFloat(nums) / 100;
  return float.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatNumberToInputBRL = (value: number): string => {
  return (value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const parseCurrencyToNumber = (value: string): number => {
  const cleanValue = value.replace(/[^\d]/g, '');
  return cleanValue ? parseFloat(cleanValue) / 100 : 0;
};

export const ClientPaymentFlowView: React.FC<ClientPaymentFlowProps> = ({ 
  commissions, brokers, clients, properties, launches, currentUser, onUpdateSale, onAddSale, onDeleteSale,
  preselectedClientId, onClearPreselection
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'spreadsheet' | 'entry'>('spreadsheet');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Form State para Inclusão de Dados
  const [formEntry, setFormEntry] = useState({
    brokerId: '',
    propertyTitle: '',
    clientName: '',
    unitNumber: '',
    salePrice: '0,00',
    signalValue: '0,00',
    signalMethod: 'PIX (Construtora)',
    signalDate: new Date().toISOString().split('T')[0],
    downPaymentValue: '0,00',
    downPaymentDate: new Date().toISOString().split('T')[0],
    qtyParcelas: 1,
    valParcela: '0,00',
    individualBalloons: [] as { date: string, value: string }[]
  });

  // Efeito para "Importar Automaticamente" ao navegar da aba Clientes
  useEffect(() => {
    if (preselectedClientId) {
      const client = clients.find(c => c.id === preselectedClientId);
      if (client) {
        setFormEntry(prev => ({
          ...prev,
          clientName: client.name,
          brokerId: client.brokerId,
          salePrice: formatNumberToInputBRL(client.budget || 0)
        }));
        setActiveSubTab('entry');
        onClearPreselection?.();
      }
    }
  }, [preselectedClientId, clients, onClearPreselection]);

  const getBrokerName = (id: string) => brokers.find(b => b.id === id)?.name || 'Externo';

  const paymentData = useMemo(() => {
    return commissions.filter(c => {
      const matchesSearch = (c.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.propertyTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [commissions, searchTerm]);

  const stats = useMemo(() => {
    const totalVgv = paymentData.reduce((acc, c) => acc + (c.salePrice || 0), 0);
    const totalDuringConstruction = paymentData.reduce((acc, sale) => {
      const prop = sale.structuredProposal;
      const mensais = prop?.monthlyInstallments?.reduce((sum, m) => sum + m.value, 0) || 0;
      const baloes = prop?.balloons?.reduce((sum, b) => sum + b.value, 0) || 0;
      const total = (prop?.signalValue || 0) + (prop?.downPaymentValue || 0) + mensais + baloes;
      return acc + total;
    }, 0);

    return { totalVgv, totalDuringConstruction, activeContracts: paymentData.length };
  }, [paymentData]);

  const projectOptions = useMemo(() => {
    const fromProps = properties.map(p => p.projectName || p.title).filter(Boolean);
    const fromLaunches = launches.map(l => l.name).filter(Boolean);
    return Array.from(new Set([...fromProps, ...fromLaunches])).sort();
  }, [properties, launches]);

  const clientOptions = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const handleUpdateItem = (sale: Commission, type: 'installment' | 'balloon' | 'signal' | 'entry', index: number, field: 'value' | 'date' | 'method', val: any) => {
    if (!onUpdateSale) return;
    const newProposal = JSON.parse(JSON.stringify(sale.structuredProposal || {}));
    
    if (type === 'installment') {
      if (field === 'value') newProposal.monthlyInstallments[index].value = val;
      if (field === 'date') newProposal.monthlyInstallments[index].date = val;
    } else if (type === 'balloon') {
      if (field === 'value') newProposal.balloons[index].value = val;
      if (field === 'date') newProposal.balloons[index].date = val;
    } else if (type === 'signal') {
      if (field === 'value') newProposal.signalValue = val;
      if (field === 'method') newProposal.signalMethod = val;
    } else if (type === 'entry') {
      if (field === 'value') newProposal.downPaymentValue = val;
      if (field === 'date') newProposal.downPaymentDate = val;
    }

    onUpdateSale({ ...sale, structuredProposal: newProposal, updatedAt: new Date().toISOString() });
  };

  const handleUpdateMainField = (sale: Commission, field: string, val: any) => {
    if (!onUpdateSale) return;
    onUpdateSale({ ...sale, [field]: val, updatedAt: new Date().toISOString() });
  };

  const handleDeleteEntry = (id: string) => {
    if (currentUser?.role !== 'Admin') {
      alert("Apenas Administradores podem excluir fluxos.");
      return;
    }
    if (confirm("Deseja realmente excluir este fluxo permanentemente?")) {
      onDeleteSale?.(id);
    }
  };

  const handleQtyBalloonsChange = (qty: number) => {
    const newCount = Math.max(0, qty);
    const currentList = [...formEntry.individualBalloons];
    if (newCount > currentList.length) {
      const additional = Array(newCount - currentList.length).fill(null).map(() => ({
        date: new Date().toISOString().split('T')[0],
        value: '0,00'
      }));
      setFormEntry({ ...formEntry, individualBalloons: [...currentList, ...additional] });
    } else {
      setFormEntry({ ...formEntry, individualBalloons: currentList.slice(0, newCount) });
    }
  };

  const updateIndividualBalloon = (index: number, field: 'date' | 'value', val: string) => {
    const newList = [...formEntry.individualBalloons];
    if (field === 'value') newList[index].value = formatInputToBRL(val);
    else newList[index].date = val;
    setFormEntry({ ...formEntry, individualBalloons: newList });
  };

  const handlePrintFlow = (sale: Commission) => {
    const prop = sale.structuredProposal;
    if (!prop) return;

    const dateMap = new Map<string, { installment?: number, balloon?: number }>();
    prop.monthlyInstallments?.forEach(m => {
        const current = dateMap.get(m.date) || {};
        dateMap.set(m.date, { ...current, installment: m.value });
    });
    prop.balloons?.forEach(b => {
        const current = dateMap.get(b.date) || {};
        dateMap.set(b.date, { ...current, balloon: b.value });
    });
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalVgv = sale.salePrice || 0;
    const totalDuring = (prop.signalValue || 0) + (prop.downPaymentValue || 0) + 
                       (prop.monthlyInstallments?.reduce((s, m) => s + m.value, 0) || 0) + 
                       (prop.balloons?.reduce((s, b) => s + b.value, 0) || 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Vettus - Fluxo de Pagamento - ${sale.clientName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=swap');
            
            @page {
              size: A4;
              margin: 10mm;
            }
            
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 0; 
              margin: 0; 
              color: #0a1120; 
              line-height: 1.2; 
              background: white; 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .header { 
              border-bottom: 2px solid #d4a853; 
              padding-bottom: 12px; 
              margin-bottom: 15px; 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
            }

            .title-section {
               display: flex;
               flex-direction: column;
            }

            .main-title { 
              font-size: 20pt; 
              font-weight: 900; 
              text-transform: uppercase; 
              letter-spacing: 0.05em; 
              color: #0a1120; 
              font-family: 'Playfair Display', serif;
            }

            .sub-brand {
               font-size: 8pt; 
               color: #d4a853; 
               font-weight: 800; 
               letter-spacing: 0.25em; 
               margin-top: -2px;
            }

            .brand-logo-section { text-align: right; }
            .brand-name { font-size: 14pt; font-weight: 900; color: #0a1120; text-transform: uppercase; font-family: 'Playfair Display', serif; }
            .brand-sub { font-size: 7pt; font-weight: 700; color: #d4a853; text-transform: uppercase; letter-spacing: 0.2em; }
            
            .summary-container {
              background: #f8fafc; 
              border-radius: 12px; 
              border: 1pt solid #e2e8f0;
              padding: 15px;
              margin-bottom: 15px;
            }

            .summary-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 8px 20px; 
            }

            .summary-item { 
              display: flex; 
              flex-direction: column; 
              border-bottom: 0.5pt solid #e2e8f0; 
              padding-bottom: 4px; 
            }

            .summary-label { 
              font-size: 6.5pt; 
              font-weight: 800; 
              color: #64748b; 
              text-transform: uppercase; 
              letter-spacing: 0.05em; 
              margin-bottom: 1px; 
            }

            .summary-value { 
              font-size: 9.5pt; 
              font-weight: 800; 
              color: #0a1120; 
            }

            .value-highlight { color: #059669; }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 5px;
              font-size: 8.5pt;
            }

            th { 
              background: #0a1120; 
              color: #d4a853; 
              padding: 8px 12px; 
              font-size: 7.5pt; 
              text-transform: uppercase; 
              text-align: left; 
              font-weight: 900; 
              letter-spacing: 0.1em;
            }

            td { 
              border-bottom: 0.5pt solid #f1f5f9; 
              padding: 6px 12px; 
              font-weight: 600; 
              color: #334155; 
            }

            tr:nth-child(even) { background-color: #fafbfc; }

            .text-right { text-align: right; }
            .total-cell { color: #0a1120; font-weight: 900; }
            
            .footer { 
              margin-top: 20px; 
              font-size: 7pt; 
              color: #94a3b8; 
              text-align: center; 
              border-top: 0.5pt solid #f1f5f9; 
              padding-top: 10px; 
              text-transform: uppercase; 
              font-weight: 800; 
              letter-spacing: 0.1em;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-section">
                <div class="main-title">Fluxo de Pagamento</div>
                <div class="sub-brand">Relatório Master Vettus Intelligence</div>
            </div>
            <div class="brand-logo-section">
                <div class="brand-name">Vettus <span style="color:#d4a853">Imóveis</span></div>
                <div class="brand-sub">Negócios Imobiliários</div>
            </div>
          </div>
          
          <div class="summary-container">
            <div class="summary-grid">
              <div class="summary-item"><span class="summary-label">Cliente Adquirente</span><span class="summary-value">${sale.clientName || 'N/A'}</span></div>
              <div class="summary-item"><span class="summary-label">Empreendimento</span><span class="summary-value">${sale.propertyTitle || 'N/A'}</span></div>
              <div class="summary-item"><span class="summary-label">Unidade / Fração</span><span class="summary-value">${sale.unitNumber || 'TBD'}</span></div>
              
              <div class="summary-item"><span class="summary-label">Valor do Contrato (VGV)</span><span class="summary-value">${formatCurrency(totalVgv)}</span></div>
              <div class="summary-item"><span class="summary-label">Total em Aportes Fluxo</span><span class="summary-value">${formatCurrency(totalDuring)}</span></div>
              <div class="summary-item"><span class="summary-label">Remanescente / Financiamento</span><span class="summary-value value-highlight">${formatCurrency(totalVgv - totalDuring)}</span></div>
              
              <div class="summary-item"><span class="summary-label">Sinal de Reserva</span><span class="summary-value">${formatCurrency(prop.signalValue || 0)}</span></div>
              <div class="summary-item"><span class="summary-label">Entrada Consolidada</span><span class="summary-value">${formatCurrency(prop.downPaymentValue || 0)}</span></div>
              <div class="summary-item" style="border: none;"><span class="summary-label">Data da Liquidação Entrada</span><span class="summary-value">${prop.downPaymentDate ? new Date(prop.downPaymentDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Vencimento Cronológico</th>
                <th>Parcela Ordinária (Mensal)</th>
                <th>Aporte Intermediário (Balão)</th>
                <th class="text-right">Total Mensal Acumulado</th>
              </tr>
            </thead>
            <tbody>
                ${sortedDates.map(d => {
                    const e = dateMap.get(d)!;
                    const totalRow = (e.installment || 0) + (e.balloon || 0);
                    return `
                        <tr>
                            <td><b>${new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')}</b></td>
                            <td>${e.installment ? formatCurrency(e.installment) : '—'}</td>
                            <td>${e.balloon ? '<b>' + formatCurrency(e.balloon) + '</b>' : '—'}</td>
                            <td class="text-right total-cell">${formatCurrency(totalRow)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
          </table>

          <div class="footer">
            Este documento é de caráter informativo para fins de planejamento financeiro • Emitido em ${new Date().toLocaleString('pt-BR')} • Vettus CRM v4.1
          </div>
          <script>
            window.onload = function() { 
              setTimeout(function() { window.print(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddSale) return;

    const salePriceNum = parseCurrencyToNumber(formEntry.salePrice);
    const newSale: Commission = {
      id: Math.random().toString(36).substr(2, 9),
      brokerId: formEntry.brokerId,
      propertyTitle: formEntry.propertyTitle || 'Não Informado',
      clientName: formEntry.clientName || 'Não Informado',
      unitNumber: formEntry.unitNumber,
      salePrice: salePriceNum,
      amount: salePriceNum * 0.06, 
      brokerAmount: (salePriceNum * 0.06) * 0.4,
      agencyAmount: (salePriceNum * 0.06) * 0.6,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      structuredProposal: {
        signalValue: parseCurrencyToNumber(formEntry.signalValue),
        signalMethod: formEntry.signalMethod,
        downPaymentValue: parseCurrencyToNumber(formEntry.downPaymentValue),
        downPaymentDate: formEntry.downPaymentDate,
        monthlyInstallments: Array(formEntry.qtyParcelas).fill(null).map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() + i + 1);
          return { date: d.toISOString().split('T')[0], value: parseCurrencyToNumber(formEntry.valParcela) };
        }),
        balloons: formEntry.individualBalloons.map(b => ({ date: b.date, value: parseCurrencyToNumber(b.value) }))
      }
    };

    onAddSale(newSale);
    setFormEntry({
      brokerId: '', propertyTitle: '', clientName: '', unitNumber: '',
      salePrice: '0,00', signalValue: '0,00', signalMethod: 'PIX (Construtora)', signalDate: new Date().toISOString().split('T')[0],
      downPaymentValue: '0,00', downPaymentDate: new Date().toISOString().split('T')[0],
      qtyParcelas: 1, valParcela: '0,00', individualBalloons: []
    });
    setActiveSubTab('spreadsheet');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Layers className="w-8 h-8 mr-3 text-[#d4a853]" />
            Fluxo de Obra
          </h1>
          <p className="text-slate-500 font-medium italic">Monitoramento e Auditoria de Integralização de Ativos.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200 shadow-inner">
             <button onClick={() => setActiveSubTab('spreadsheet')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'spreadsheet' ? 'bg-[#050810] text-[#d4a853] shadow-lg scale-105' : 'text-slate-500'}`}>
                <FileSpreadsheet className="w-4 h-4 mr-2 inline" /> Planilha de Ativos
             </button>
             <button onClick={() => setActiveSubTab('entry')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'entry' ? 'bg-[#050810] text-[#d4a853] shadow-lg scale-105' : 'text-slate-500'}`}>
                <PlusCircle className="w-4 h-4 mr-2 inline" /> Inclusão Manual
             </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'spreadsheet' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-[#050810] p-7 rounded-[2rem] text-white shadow-2xl border-b-4 border-[#d4a853]">
                <p className="text-[9px] font-black uppercase text-[#d4a853] mb-2 tracking-widest">VGV Total Auditado</p>
                <p className="text-2xl font-black">{formatCurrency(stats.totalVgv)}</p>
             </div>
             <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-md">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Aportes Período Obra</p>
                <p className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalDuringConstruction)}</p>
             </div>
             <div className="bg-[#d4a853]/10 p-7 rounded-[2rem] border border-[#d4a853]/20 shadow-md">
                <p className="text-[9px] font-black text-[#8a6d3b] uppercase mb-2 tracking-widest">% de Integralização</p>
                <p className="text-2xl font-black text-[#8a6d3b]">{stats.totalVgv > 0 ? ((stats.totalDuringConstruction / stats.totalVgv) * 100).toFixed(1) : 0}%</p>
             </div>
             <div className="bg-emerald-50 p-7 rounded-[2rem] border border-emerald-100 shadow-md">
                <p className="text-[9px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Saldo Pós Obra</p>
                <p className="text-2xl font-black text-emerald-700">{formatCurrency(stats.totalVgv - stats.totalDuringConstruction)}</p>
             </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4a853]" />
                  <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="Filtrar por nome do cliente ou projeto..." 
                    className="bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-6 text-xs font-bold text-slate-900 outline-none focus:border-[#d4a853] w-full md:w-[400px] shadow-sm" 
                  />
               </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-[#050810] text-white">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#d4a853]">Contrato / Corretor</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Empreendimento</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">VGV Total</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center bg-white/5">Durante Obra</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center bg-white/10 text-emerald-400">Pós Obra</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentData.map((sale, idx) => {
                    const isExpanded = expandedSaleId === sale.id;
                    const prop = sale.structuredProposal;
                    const total = sale.salePrice || 0;
                    const duringVal = (prop?.signalValue || 0) + (prop?.downPaymentValue || 0) + (prop?.monthlyInstallments?.reduce((s,m) => s+m.value, 0) || 0) + (prop?.balloons?.reduce((s,b) => s+b.value, 0) || 0);
                    const postVal = total - duringVal;

                    return (
                      <React.Fragment key={sale.id}>
                        <tr className={`hover:bg-slate-50 transition-all ${isExpanded ? 'bg-[#d4a853]/5' : idx % 2 !== 0 ? 'bg-slate-50/30' : 'bg-white'}`}>
                          <td className="px-8 py-6">
                             <div className="flex items-center space-x-4">
                                <button 
                                  onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)} 
                                  className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center shadow-sm ${isExpanded ? 'bg-[#050810] text-[#d4a853]' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-900'}`}
                                >
                                   {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                                <div>
                                   <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{sale.clientName}</p>
                                   <div className="flex items-center space-x-2 mt-0.5">
                                      <span className="text-[9px] text-[#d4a853] font-black uppercase bg-[#050810] px-2 py-0.5 rounded shadow-sm">{getBrokerName(sale.brokerId)}</span>
                                   </div>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{sale.propertyTitle}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">UND: {sale.unitNumber || 'TBD'}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="inline-block relative group/cell">
                                <input 
                                  type="text" 
                                  defaultValue={formatNumberToInputBRL(total)}
                                  onBlur={(e) => handleUpdateMainField(sale, 'salePrice', parseCurrencyToNumber(e.target.value))}
                                  className="w-36 bg-white border border-slate-100 group-hover/cell:border-[#d4a853] text-right text-[13px] font-black text-slate-900 outline-none focus:ring-4 focus:ring-[#d4a853]/10 rounded-xl px-3 py-2 transition-all shadow-sm"
                                />
                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                             </div>
                          </td>
                          <td className="px-8 py-6 text-center bg-amber-50/50">
                             <div className="flex flex-col items-center">
                                <span className="text-[13px] font-black text-[#8a6d3b]">{formatCurrency(duringVal)}</span>
                                <span className="text-[8px] font-black text-[#8a6d3b]/60 uppercase mt-1 tracking-widest">Integralizado</span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-center bg-emerald-50/50">
                             <div className="flex flex-col items-center">
                                <span className="text-[13px] font-black text-emerald-700">{formatCurrency(postVal)}</span>
                                <span className="text-[8px] font-black text-emerald-700/60 uppercase mt-1 tracking-widest">Financiamento</span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                             {currentUser?.role === 'Admin' && (
                               <button 
                                 onClick={() => handleDeleteEntry(sale.id)} 
                                 className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm border border-red-100"
                               >
                                  <Trash2 size={16} />
                               </button>
                             )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-100/50">
                             <td colSpan={6} className="px-12 py-12">
                                <div className="bg-white rounded-[3rem] border-2 border-slate-200 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
                                   <div className="p-7 bg-[#050810] text-white flex items-center justify-between border-b-4 border-[#d4a853]">
                                      <div className="flex items-center space-x-4">
                                         <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center shadow-lg">
                                            <FileSpreadsheet className="w-6 h-6 text-[#0a1120]" />
                                         </div>
                                         <div>
                                            <h4 className="text-sm font-black uppercase tracking-widest">Fluxo de Pagamento</h4>
                                            <p className="text-[#d4a853] text-[9px] font-bold uppercase tracking-[0.3em]">Fluxo de Pagamento • Ref: {sale.id}</p>
                                         </div>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                         <button 
                                           onClick={() => handlePrintFlow(sale)}
                                           className="flex items-center space-x-2 px-6 py-2.5 bg-white/10 hover:bg-[#d4a853] hover:text-[#0a1120] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-inner border border-white/10"
                                         >
                                            <Printer className="w-4 h-4" />
                                            <span>Imprimir PDF</span>
                                         </button>
                                      </div>
                                   </div>

                                   <div className="p-8 space-y-8 bg-slate-50/50">
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                         <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Sinal de Reserva</label>
                                            <div className="relative">
                                               <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
                                               <input type="text" defaultValue={formatNumberToInputBRL(prop?.signalValue || 0)} onBlur={e => handleUpdateItem(sale, 'signal', 0, 'value', parseCurrencyToNumber(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pl-9 pr-4 text-xs font-black text-slate-900 outline-none focus:border-[#d4a853] shadow-inner" />
                                            </div>
                                         </div>
                                         <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Forma de Pagto</label>
                                            <input type="text" defaultValue={prop?.signalMethod} onBlur={e => handleUpdateItem(sale, 'signal', 0, 'method', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-5 text-xs font-black text-slate-900 outline-none focus:border-blue-600 shadow-inner" />
                                         </div>
                                         <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Valor de Entrada</label>
                                            <div className="relative">
                                               <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
                                               <input type="text" defaultValue={formatNumberToInputBRL(prop?.downPaymentValue || 0)} onBlur={e => handleUpdateItem(sale, 'entry', 0, 'value', parseCurrencyToNumber(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pl-9 pr-4 text-xs font-black text-slate-900 outline-none focus:border-[#d4a853] shadow-inner" />
                                            </div>
                                         </div>
                                         <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Data da Entrada</label>
                                            <div className="relative">
                                               <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                               <input type="date" defaultValue={prop?.downPaymentDate} onBlur={e => handleUpdateItem(sale, 'entry', 0, 'date', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pl-9 px-4 text-[11px] font-black text-slate-900 outline-none focus:border-[#d4a853] shadow-inner" />
                                            </div>
                                         </div>
                                      </div>

                                      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                                         <table className="w-full text-left">
                                            <thead className="bg-[#0f172a] text-white">
                                               <tr className="text-[10px] font-black uppercase tracking-[0.2em]">
                                                  <th className="px-8 py-5">DATA VENCIMENTO</th>
                                                  <th className="px-8 py-5 text-center">PARCELA FLUXO (MENSAL)</th>
                                                  <th className="px-8 py-5 text-center">BALÃO / INTERMEDIÁRIA</th>
                                                  <th className="px-8 py-5 text-right">TOTAL DO MÊS</th>
                                               </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                               {(() => {
                                                  const dateMap = new Map<string, { installment?: { val: number, idx: number }, balloon?: { val: number, idx: number } }>();
                                                  
                                                  prop?.monthlyInstallments?.forEach((m: any, idx: number) => {
                                                     const current = dateMap.get(m.date) || {};
                                                     dateMap.set(m.date, { ...current, installment: { val: m.value, idx } });
                                                  });
                                                  
                                                  prop?.balloons?.forEach((b: any, idx: number) => {
                                                     const current = dateMap.get(b.date) || {};
                                                     dateMap.set(b.date, { ...current, balloon: { val: b.value, idx } });
                                                  });

                                                  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                                                  return sortedDates.map((dateKey) => {
                                                     const entry = dateMap.get(dateKey)!;
                                                     const totalRow = (entry.installment?.val || 0) + (entry.balloon?.val || 0);
                                                     
                                                     return (
                                                        <tr key={dateKey} className="group hover:bg-slate-50 transition-all">
                                                           <td className="px-8 py-4">
                                                              <div className="flex items-center space-x-3">
                                                                 <Calendar className="w-4 h-4 text-slate-400" />
                                                                 <span className="text-[12px] font-black text-slate-900 uppercase">
                                                                    {new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                                 </span>
                                                              </div>
                                                           </td>
                                                           <td className="px-8 py-4 text-center">
                                                              {entry.installment ? (
                                                                 <div className="flex items-center justify-center space-x-2 bg-emerald-50/50 py-2 rounded-xl border border-emerald-100/50">
                                                                    <DollarSign size={10} className="text-emerald-400" />
                                                                    <input 
                                                                      type="text" 
                                                                      defaultValue={formatNumberToInputBRL(entry.installment.val)}
                                                                      onBlur={e => handleUpdateItem(sale, 'installment', entry.installment!.idx, 'value', parseCurrencyToNumber(e.target.value))}
                                                                      className="bg-transparent border-none outline-none text-center text-[12px] font-black w-28 text-emerald-700"
                                                                    />
                                                                 </div>
                                                              ) : (
                                                                 <span className="text-[10px] text-slate-200 uppercase font-black">-</span>
                                                              )}
                                                           </td>
                                                           <td className="px-8 py-4 text-center">
                                                              {entry.balloon ? (
                                                                 <div className="flex items-center justify-center space-x-2 bg-amber-50/50 py-2 rounded-xl border border-amber-100/50">
                                                                    <Zap size={10} className="text-amber-500" />
                                                                    <input 
                                                                      type="text" 
                                                                      defaultValue={formatNumberToInputBRL(entry.balloon.val)}
                                                                      onBlur={e => handleUpdateItem(sale, 'balloon', entry.balloon!.idx, 'value', parseCurrencyToNumber(e.target.value))}
                                                                      className="bg-transparent border-none outline-none text-center text-[12px] font-black w-28 text-amber-700"
                                                                    />
                                                                 </div>
                                                              ) : (
                                                                 <span className="text-[10px] text-slate-200 uppercase font-black">-</span>
                                                              )}
                                                           </td>
                                                           <td className="px-8 py-4 text-right">
                                                              <span className="text-[13px] font-black text-[#0a1120]">
                                                                 {formatCurrency(totalRow)}
                                                              </span>
                                                           </td>
                                                        </tr>
                                                     );
                                                  });
                                               })()}
                                            </tbody>
                                         </table>
                                      </div>
                                   </div>
                                </div>
                             </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-700">
           <div className="bg-white rounded-[3.5rem] border-2 border-slate-300 shadow-2xl overflow-hidden">
              <div className="navy-gradient p-10 text-white border-b-4 border-[#d4a853]">
                 <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 gold-gradient rounded-[2rem] flex items-center justify-center shadow-2xl">
                       <PlusCircle className="w-9 h-9 text-[#0a1120]" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black uppercase tracking-tight">Novo Fluxo de Integralização</h2>
                       <p className="text-[#d4a853] text-[10px] font-black uppercase tracking-[0.3em]">Célula de Auditoria Financeira</p>
                    </div>
                 </div>
              </div>

              <form onSubmit={handleSubmitEntry} className="p-12 bg-white space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-7">
                       <div className="flex items-center space-x-3 mb-2 border-b-2 border-slate-200 pb-3">
                          <UserPlus className="w-5 h-5 text-[#d4a853]" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Responsável e Comprador</h3>
                       </div>
                       
                       <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-900 uppercase ml-2">Corretor Responsável *</label>
                          <select required value={formEntry.brokerId} onChange={e => setFormEntry({...formEntry, brokerId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-400 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 outline-none focus:border-[#d4a853] shadow-sm"><option value="">Selecione o corretor...</option>{brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-900 uppercase ml-2">Cliente Comprador</label>
                          <select value={formEntry.clientName} onChange={e => setFormEntry({...formEntry, clientName: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-400 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 outline-none focus:border-[#d4a853] shadow-sm"><option value="">Selecione o cliente...</option>{clientOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                       </div>
                    </div>

                    <div className="space-y-7">
                       <div className="flex items-center space-x-3 mb-2 border-b-2 border-slate-200 pb-3">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Imóvel e Unidade</h3>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-900 uppercase ml-2">Projeto</label>
                          <select value={formEntry.propertyTitle} onChange={e => setFormEntry({...formEntry, propertyTitle: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-400 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 outline-none focus:border-blue-600 shadow-sm"><option value="">Selecione o empreendimento...</option>{projectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-900 uppercase ml-2">Unidade / Bloco</label>
                          <input type="text" value={formEntry.unitNumber} onChange={e => setFormEntry({...formEntry, unitNumber: e.target.value})} placeholder="Ex: Apto 1402" className="w-full bg-slate-50 border-2 border-slate-400 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 outline-none focus:border-blue-600 shadow-sm" />
                       </div>
                    </div>
                 </div>

                 <div className="pt-10 space-y-10 border-t-2 border-slate-300">
                    <div className="flex items-center space-x-3 border-b-2 border-slate-300 pb-3 w-fit pr-10">
                       <TrendingUp className="w-5 h-5 text-emerald-600" />
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Condições Financeiras</h3>
                    </div>

                    <div className="space-y-10">
                       {/* SEÇÃO: DADOS DA RESERVA (VALOR, DATA E FORMA PIX) */}
                       <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-300 shadow-xl space-y-6">
                          <div className="flex items-center space-x-2 border-b-2 border-slate-100 pb-3">
                             <Star className="w-4 h-4 text-[#d4a853] fill-[#d4a853]" />
                             <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">DADOS DA RESERVA (Obrigatório)</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Valor da Reserva</label>
                                <div className="relative">
                                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
                                   <input type="text" value={formEntry.signalValue} onChange={e => setFormEntry({...formEntry, signalValue: formatInputToBRL(e.target.value)})} className="w-full bg-white border-2 border-slate-400 rounded-xl py-4 px-8 text-sm font-black text-slate-900 shadow-sm focus:border-emerald-600 outline-none transition-all" />
                                </div>
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Data da Reserva</label>
                                <div className="relative">
                                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                   <input type="date" value={formEntry.signalDate} onChange={e => setFormEntry({...formEntry, signalDate: e.target.value})} className="w-full bg-white border-2 border-slate-400 rounded-xl py-4 pl-9 px-4 text-xs font-black text-slate-900 shadow-sm focus:border-[#d4a853] outline-none" />
                                </div>
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Forma PIX Construtora</label>
                                <div className="relative">
                                   <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                   <select value={formEntry.signalMethod} onChange={e => setFormEntry({...formEntry, signalMethod: e.target.value})} className="w-full bg-white border-2 border-slate-400 rounded-xl py-4 pl-9 px-5 text-[10px] font-black uppercase text-slate-900 shadow-sm focus:border-[#d4a853] appearance-none cursor-pointer outline-none">
                                      <option value="PIX (Construtora)">PIX (CONSTRUTORA)</option>
                                      <option value="TED (Construtora)">TED (CONSTRUTORA)</option>
                                      <option value="BOLETO">BOLETO BANCÁRIO</option>
                                   </select>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          {/* CARD: ENTRADA ADICIONAL E VGV TOTAL */}
                          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-300 shadow-xl space-y-6 relative overflow-hidden">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Valor de Entrada Adicional</label>
                                <div className="relative">
                                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
                                   <input type="text" value={formEntry.downPaymentValue} onChange={e => setFormEntry({...formEntry, downPaymentValue: formatInputToBRL(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl py-4 px-8 text-sm font-black text-slate-900 shadow-inner" />
                                </div>
                             </div>

                             {/* CAMPO DE DATA ADICIONADO ABAIXO DO VALOR DE ENTRADA */}
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Data da Entrada Adicional</label>
                                <div className="relative">
                                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                   <input type="date" value={formEntry.downPaymentDate} onChange={e => setFormEntry({...formEntry, downPaymentDate: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl py-4 pl-12 pr-4 text-xs font-black text-slate-900 shadow-inner outline-none focus:border-[#d4a853]" />
                                </div>
                             </div>

                             <div className="pt-6 border-t-2 border-slate-200">
                                <label className="text-[11px] font-black text-slate-900 uppercase ml-1 block mb-3">Valor Total de Venda (VGV) *</label>
                                <div className="relative">
                                   <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-[#d4a853]" />
                                   <input type="text" value={formEntry.salePrice} onChange={e => setFormEntry({...formEntry, salePrice: formatInputToBRL(e.target.value)})} className="w-full bg-white border-2 border-slate-500 rounded-[2rem] py-6 px-14 text-2xl font-black text-slate-900 outline-none focus:border-[#d4a853] shadow-lg" />
                                </div>
                             </div>
                          </div>

                          <div className="space-y-8">
                             {/* MENSALIDADES */}
                             <div className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-300 shadow-xl space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                   <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Qtd Parcelas</label>
                                      <input type="number" min="1" max="360" value={formEntry.qtyParcelas} onChange={e => setFormEntry({...formEntry, qtyParcelas: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border-2 border-slate-400 rounded-xl py-4 px-5 text-sm font-black text-slate-900" />
                                   </div>
                                   <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-900 uppercase ml-1">Valor Mensal</label>
                                      <div className="relative">
                                         <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-700" />
                                         <input type="text" value={formEntry.valParcela} onChange={e => setFormEntry({...formEntry, valParcela: formatInputToBRL(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-400 rounded-xl py-4 px-8 text-sm font-black text-slate-900" />
                                      </div>
                                   </div>
                                </div>
                             </div>

                             {/* SEÇÃO DE BALÕES / APORTES INTERMEDIÁRIOS */}
                             <div className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-300 shadow-xl space-y-6 relative">
                                <div className="flex items-center space-x-2 border-b-2 border-slate-300 pb-4 mb-2">
                                   <ArrowDownWideNarrow className="w-5 h-5 text-amber-600" />
                                   <span className="text-xs font-black uppercase text-slate-900 tracking-widest">Inclusão de Balões</span>
                                </div>
                                
                                <div className="space-y-2 mb-4">
                                   <label className="text-[11px] font-black text-slate-900 uppercase ml-1">Quantidade de Balões</label>
                                   <div className="relative">
                                      <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                                      <input 
                                        type="number" 
                                        min="0" 
                                        max="60"
                                        value={formEntry.individualBalloons.length} 
                                        onChange={e => handleQtyBalloonsChange(parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-50 border-2 border-slate-400 rounded-xl py-4 pl-12 pr-6 text-sm font-black text-slate-900 outline-none focus:border-amber-600 transition-all shadow-inner" 
                                        placeholder="Ex: 5"
                                      />
                                   </div>
                                </div>
                                
                                <div className="space-y-4 max-h-[450px] overflow-y-auto no-scrollbar pr-1 pt-2 border-t border-slate-100">
                                   {formEntry.individualBalloons.length > 0 && (
                                      <div className="grid grid-cols-[1fr,1.2fr,1.5fr,auto] gap-4 px-4 mb-2 border-b border-slate-50 pb-2">
                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IDENTIFICADOR</span>
                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DATA VENCIMENTO</span>
                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-4">VALOR APORTE</span>
                                         <span className="w-8"></span>
                                      </div>
                                   )}
                                   
                                   {formEntry.individualBalloons.map((b, i) => (
                                     <div key={i} className="grid grid-cols-[1fr,2.5fr,auto] gap-6 items-center p-5 bg-white border-2 border-slate-200 rounded-[2rem] animate-in slide-in-from-right-4 transition-all group hover:border-[#d4a853] shadow-sm">
                                       <div className="flex items-center space-x-3">
                                          <div className="w-10 h-10 rounded-xl bg-[#050810] flex items-center justify-center text-[#d4a853] shadow-md">
                                             <Zap size={18} />
                                          </div>
                                          <span className="text-xs font-black text-slate-900 uppercase">Balão {String(i + 1).padStart(2, '0')}</span>
                                       </div>
                                       
                                       <div className="space-y-3">
                                          <div className="relative">
                                             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4a853]" />
                                             <input 
                                               type="date" 
                                               value={b.date} 
                                               onChange={e => updateIndividualBalloon(i, 'date', e.target.value)} 
                                               className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-[11px] font-black text-slate-900 outline-none focus:border-[#d4a853] transition-all" 
                                             />
                                          </div>
                                          <div className="relative">
                                             <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
                                             <input 
                                               type="text" 
                                               value={b.value} 
                                               onChange={e => updateIndividualBalloon(i, 'value', e.target.value)} 
                                               className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-black text-slate-900 outline-none focus:border-emerald-600 transition-all shadow-inner" 
                                               placeholder="0,00"
                                             />
                                          </div>
                                       </div>
                                       
                                       <button type="button" onClick={() => setFormEntry({...formEntry, individualBalloons: formEntry.individualBalloons.filter((_, idx) => idx !== i)})} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                          <Trash2 size={20} />
                                       </button>
                                     </div>
                                   ))}
                                   
                                   {formEntry.individualBalloons.length === 0 && (
                                      <div className="py-12 text-center bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-400">
                                         <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Nenhum aporte balão listado</p>
                                      </div>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <button type="submit" className="w-full gold-gradient text-[#0a1120] py-8 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-[1.01] active:scale-98 flex items-center justify-center space-x-4 transition-all border-b-8 border-yellow-700/40">
                    <CheckCircle className="w-8 h-8" />
                    <span>Consolidar Ativo na Base Vettus</span>
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};