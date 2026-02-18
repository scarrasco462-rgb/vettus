
import React, { useState } from 'react';
import { 
  TableProperties, 
  Users, 
  BadgeDollarSign, 
  TrendingUp, 
  PieChart, 
  Search, 
  Printer,
  Clock,
  Building2,
  FileSpreadsheet,
  Filter,
  Award,
  Calendar,
  Hash,
  Tag,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { Broker, Client, Commission, Property, ClientStatus } from '../types';
import * as XLSX from 'xlsx';

interface SpreadsheetsViewProps {
  brokers: Broker[];
  clients: Client[];
  commissions: Commission[];
  properties: Property[];
}

type SpreadsheetTab = 'clients' | 'sales' | 'performance' | 'leads';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

export const SpreadsheetsView: React.FC<SpreadsheetsViewProps> = ({ brokers, clients, commissions, properties }) => {
  const [activeTab, setActiveTab] = useState<SpreadsheetTab>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [brokerFilter, setBrokerFilter] = useState<string>('Todos');

  const getBrokerName = (id: string) => brokers.find(b => b.id === id)?.name || 'Desconhecido';
  
  // Helper para buscar telefone do cliente pelo nome (usado no relatório de vendas)
  const getClientPhone = (name: string) => {
    return clients.find(c => c.name === name)?.phone || 'Não informado';
  };

  const getFilteredData = () => {
    const search = searchTerm.toLowerCase();
    
    if (activeTab === 'clients') {
      return clients.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search);
        const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
        const matchesBroker = brokerFilter === 'Todos' || c.brokerId === brokerFilter;
        return matchesSearch && matchesStatus && matchesBroker;
      });
    } else if (activeTab === 'sales') {
      return commissions.filter(s => {
        const matchesSearch = s.propertyTitle.toLowerCase().includes(search) || s.clientName.toLowerCase().includes(search);
        const matchesBroker = brokerFilter === 'Todos' || s.brokerId === brokerFilter;
        return matchesSearch && matchesBroker;
      });
    } else if (activeTab === 'performance') {
      return brokers
        .filter(b => brokerFilter === 'Todos' || b.id === brokerFilter)
        .map(broker => {
          const bSales = commissions.filter(c => c.brokerId === broker.id);
          const total = bSales.reduce((acc, c) => acc + c.amount, 0);
          const bClients = clients.filter(c => c.brokerId === broker.id).length;
          const conv = bClients > 0 ? (bSales.length / bClients * 100).toFixed(1) : '0.0';
          return {
            name: broker.name,
            activeClients: bClients,
            salesCount: bSales.length,
            conversion: conv + '%',
            totalFaturado: total,
            performance: broker.performance + '%'
          };
        }).filter(b => b.name.toLowerCase().includes(search));
    } else {
      return brokers
        .filter(b => brokerFilter === 'Todos' || b.id === brokerFilter)
        .map(broker => {
          const bClients = clients.filter(c => c.brokerId === broker.id);
          return {
            name: broker.name,
            firstContact: bClients.filter(c => c.status === ClientStatus.LEAD).length,
            cold: bClients.filter(c => c.status === ClientStatus.COLD).length,
            warm: bClients.filter(c => c.status === ClientStatus.WARM).length,
            hot: bClients.filter(c => c.status === ClientStatus.HOT).length,
            total: bClients.length
          };
        }).filter(b => b.name.toLowerCase().includes(search));
    }
  };

  const handlePrintInNewTab = () => {
    const data = getFilteredData();
    const title = getActiveReportTitle();
    const brokerName = brokerFilter === 'Todos' ? 'Toda a Equipe' : getBrokerName(brokerFilter);
    const date = new Date().toLocaleString('pt-BR');
    
    let tableHtml = '';
    
    if (activeTab === 'clients') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Corretor</th><th>Cliente</th><th>Telefone</th><th>Status</th><th>Orçamento</th><th>Último Contato</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((c: any) => `
              <tr>
                <td>${getBrokerName(c.brokerId)}</td>
                <td><b>${c.name}</b></td>
                <td>${c.phone || 'N/A'}</td>
                <td>${c.status}</td>
                <td>${formatCurrency(c.budget)}</td>
                <td>${new Date(c.lastContact).toLocaleDateString('pt-BR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'sales') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Corretor</th><th>Imóvel</th><th>Data</th><th>Cliente</th><th>Contato</th><th>Comissão</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((s: any) => `
              <tr>
                <td>${getBrokerName(s.brokerId)}</td>
                <td>${s.propertyTitle}</td>
                <td>${new Date(s.date).toLocaleDateString('pt-BR')}</td>
                <td>${s.clientName}</td>
                <td>${getClientPhone(s.clientName)}</td>
                <td><b>${formatCurrency(s.amount)}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'performance') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Membro</th><th>Carteira Ativa</th><th>Fechamentos</th><th>Conversão</th><th>Volume Total</th><th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((p: any) => `
              <tr>
                <td><b>${p.name}</b></td>
                <td>${p.activeClients}</td>
                <td>${p.salesCount}</td>
                <td>${p.conversion}</td>
                <td>${formatCurrency(p.totalFaturado)}</td>
                <td>${p.performance}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'leads') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Corretor</th><th>Lead</th><th>Frio</th><th>Morno</th><th>Quente</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((l: any) => `
              <tr>
                <td><b>${l.name}</b></td>
                <td>${l.firstContact}</td>
                <td>${l.cold}</td>
                <td>${l.warm}</td>
                <td>${l.hot}</td>
                <td><b>${l.total}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Vettus Imóveis - ${title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #0f172a; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d4a853; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-text { font-size: 24px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
            .report-title { font-size: 18px; font-weight: 700; text-align: center; background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 30px; text-transform: uppercase; }
            .filter-info { font-size: 12px; color: #64748b; margin-bottom: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #0f172a; color: white; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 12px; font-size: 12px; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo-text">Vettus Imóveis</div>
              <div style="font-size: 10px; color: #d4a853; font-weight: 700;">RELATÓRIO DE GESTÃO VETTUS-SYNC</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: #94a3b8; font-weight: 800;">EMISSÃO</div>
              <div style="font-size: 12px; font-weight: 700;">${date}</div>
            </div>
          </div>
          <div class="report-title">${title}</div>
          <div class="filter-info">Filtro aplicado: ${brokerName}</div>
          ${tableHtml}
          <div class="footer">
            Vettus CRM Pro - Tecnologia Sérgio Carrasco Jr. © ${new Date().getFullYear()}
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    const data = getFilteredData();
    const filename = `vettus_${activeTab}_${brokerFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    let ws_data: any[][] = [];
    
    if (activeTab === 'clients') {
      ws_data = [
        ['Corretor', 'Cliente', 'E-mail', 'Telefone', 'Status', 'Orçamento', 'Último Contato', 'Próxima Ação'],
        ...data.map((c: any) => [
          getBrokerName(c.brokerId), c.name, c.email, c.phone, c.status, c.budget, c.lastContact, c.nextActivityDate || 'N/A'
        ])
      ];
    } else if (activeTab === 'sales') {
      ws_data = [
        ['Corretor', 'Imóvel', 'Data Venda', 'Cliente', 'Telefone Cliente', 'Valor Comissão', 'Status'],
        ...data.map((s: any) => [
          getBrokerName(s.brokerId), s.propertyTitle, s.date, s.clientName, getClientPhone(s.clientName), s.amount, s.status
        ])
      ];
    } else if (activeTab === 'performance') {
      ws_data = [
        ['Corretor', 'Carteira Ativa', 'Fechamentos', 'Conversão', 'Total Comissões', 'Score'],
        ...data.map((p: any) => [
          p.name, p.activeClients, p.salesCount, p.conversion, p.totalFaturado, p.performance
        ])
      ];
    } else {
      ws_data = [
        ['Corretor', 'Lead', 'Frio', 'Morno', 'Quente', 'Total Base'],
        ...data.map((l: any) => [
          l.name, l.firstContact, l.cold, l.warm, l.hot, l.total
        ])
      ];
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Filtrado");
    XLSX.writeFile(wb, filename);
  };

  const getActiveReportTitle = () => {
    switch(activeTab) {
      case 'clients': return 'Planilha de Atendimento a Clientes';
      case 'sales': return 'Consolidado de Vendas e Comissões';
      case 'performance': return 'Performance de Equipe';
      case 'leads': return 'Matriz de Temperatura por Corretor';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center uppercase tracking-tight">
            <TableProperties className="w-6 h-6 mr-3 text-[#d4a853]" />
            Central de Planilhas
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Relatórios operacionais exportáveis da rede Vettus.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center space-x-3 shadow-sm focus-within:ring-2 focus-within:ring-[#d4a853]/50 transition-all">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-48 font-bold text-slate-900" 
            />
          </div>
          <button 
            onClick={handlePrintInNewTab}
            className="bg-[#0f172a] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-[#d4a853]" />
            <span>Imprimir</span>
          </button>
          <button 
            onClick={handleExportExcel}
            className="gold-gradient text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-yellow-600/20 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
          {[
            { id: 'clients', label: 'Clientes', icon: Users },
            { id: 'sales', label: 'Vendas', icon: BadgeDollarSign },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'leads', label: 'Leads', icon: PieChart },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as SpreadsheetTab); }}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-[#0f172a] text-[#d4a853] shadow-lg scale-105' 
                : 'text-slate-500 hover:bg-white hover:text-slate-900'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
             <UserCheck className="w-3.5 h-3.5 text-[#d4a853] ml-2" />
             <select 
               value={brokerFilter}
               onChange={(e) => setBrokerFilter(e.target.value)}
               className="text-[10px] font-black uppercase bg-transparent outline-none text-slate-700 cursor-pointer pr-4"
             >
                <option value="Todos">Toda a Equipe</option>
                {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
             </select>
          </div>

          {activeTab === 'clients' && (
            <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
               <Filter className="w-3.5 h-3.5 text-[#d4a853] ml-2" />
               <select 
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value)}
                 className="text-[10px] font-black uppercase bg-transparent outline-none text-slate-700 cursor-pointer pr-4"
               >
                  <option value="Todos">Todos os Status</option>
                  {Object.values(ClientStatus).map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-[10px] font-black text-[#d4a853] uppercase tracking-[0.3em] ml-2 flex items-center">
             <div className="w-1.5 h-1.5 rounded-full bg-[#d4a853] mr-2"></div>
             Visualização: {getActiveReportTitle()}
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-yellow-100 to-transparent"></div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden printable-area">
          <div className="overflow-x-auto">
            {activeTab === 'clients' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-5">Corretor Responsável</th>
                    <th className="px-8 py-5">Nome do Lead</th>
                    <th className="px-8 py-5">Telefone</th>
                    <th className="px-8 py-5">Status Comercial</th>
                    <th className="px-8 py-5">Orçamento Estimado</th>
                    <th className="px-8 py-5">Último Contato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getFilteredData().map((client: any) => (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 text-xs font-bold text-slate-700">
                        <div className="flex items-center">
                           <div className="w-6 h-6 rounded-full bg-slate-900 text-[#d4a853] flex items-center justify-center text-[9px] font-black mr-2 shadow-sm">
                              {getBrokerName(client.brokerId)[0]}
                           </div>
                           {getBrokerName(client.brokerId)}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-900">{client.name}</td>
                      <td className="px-8 py-5 text-xs font-black text-emerald-600">{client.phone || 'N/A'}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          client.status === ClientStatus.HOT ? 'bg-red-50 text-red-600 border-red-100' :
                          client.status === ClientStatus.WON ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>{client.status}</span>
                      </td>
                      <td className="px-8 py-5 text-xs font-black text-slate-600">{formatCurrency(client.budget)}</td>
                      <td className="px-8 py-5 text-xs text-slate-500 font-medium">{new Date(client.lastContact).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'sales' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-5">Corretor Vettus</th>
                    <th className="px-8 py-5">Imóvel Negociado</th>
                    <th className="px-8 py-5">Comprador</th>
                    <th className="px-8 py-5">Telefone Comprador</th>
                    <th className="px-8 py-5">Data Transação</th>
                    <th className="px-8 py-5 text-right">Comissão Realizada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getFilteredData().map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 text-xs font-bold text-slate-700">{getBrokerName(sale.brokerId)}</td>
                      <td className="px-8 py-5 text-xs text-slate-900 font-bold">{sale.propertyTitle}</td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-600">{sale.clientName}</td>
                      <td className="px-8 py-5 text-xs font-black text-emerald-600">{getClientPhone(sale.clientName)}</td>
                      <td className="px-8 py-5 text-xs text-slate-500 font-medium">{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-8 py-5 text-right font-mono text-sm font-black text-[#d4a853]">{formatCurrency(sale.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'performance' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-5">Perfil do Corretor</th>
                    <th className="px-8 py-5 text-center">Carteira Ativa</th>
                    <th className="px-8 py-5 text-center">Vendas Fechadas</th>
                    <th className="px-8 py-5 text-center">Conversão Médias</th>
                    <th className="px-8 py-5 text-right">Volume de Comissões</th>
                    <th className="px-8 py-5 text-right">Performance Global</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getFilteredData().map((data: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 font-black text-slate-900 text-xs uppercase tracking-tight">{data.name}</td>
                      <td className="px-8 py-5 text-center text-xs font-bold text-slate-600">{data.activeClients}</td>
                      <td className="px-8 py-5 text-center text-xs font-bold text-slate-600">{data.salesCount}</td>
                      <td className="px-8 py-5 text-center font-black text-emerald-600 text-xs">{data.conversion}</td>
                      <td className="px-8 py-5 text-right font-mono text-xs font-black text-slate-900">{formatCurrency(data.totalFaturado)}</td>
                      <td className="px-8 py-5 text-right">
                        <span className="px-3 py-1 bg-slate-900 text-[#d4a853] rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-sm border border-[#d4a853]/20">{data.performance}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'leads' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-5">Corretor</th>
                    <th className="px-8 py-5 text-center">Novos Leads</th>
                    <th className="px-8 py-5 text-center">Status Frio</th>
                    <th className="px-8 py-5 text-center">Status Morno</th>
                    <th className="px-8 py-5 text-center">Status Quente</th>
                    <th className="px-8 py-5 text-right">Total Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getFilteredData().map((stat: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 font-black text-slate-900 text-xs uppercase">{stat.name}</td>
                      <td className="px-8 py-5 text-center"><span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{stat.firstContact}</span></td>
                      <td className="px-8 py-5 text-center"><span className="text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{stat.cold}</span></td>
                      <td className="px-8 py-5 text-center"><span className="text-[10px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">{stat.warm}</span></td>
                      <td className="px-8 py-5 text-center"><span className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">{stat.hot}</span></td>
                      <td className="px-8 py-5 text-right font-black text-slate-900 text-xs">{stat.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      {getFilteredData().length === 0 && (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 mt-8">
           <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
           <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum registro encontrado com os filtros atuais</p>
        </div>
      )}
    </div>
  );
};
