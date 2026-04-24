
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
  UserCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Table2,
  UserSearch,
  X
} from 'lucide-react';
import { Broker, Client, Commission, Property, ClientStatus, Activity } from '../types';
import * as XLSX from 'xlsx';

interface SpreadsheetsViewProps {
  brokers: Broker[];
  clients: Client[];
  commissions: Commission[];
  properties: Property[];
  currentUser: Broker;
  onDeleteClients?: (ids: string[]) => void;
  onAddActivities?: (activities: Activity[]) => void;
  onNavigate?: (view: any) => void;
}

type SpreadsheetTab = 'clients' | 'sales' | 'performance' | 'leads' | 'imports' | 'bulk_delete';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

export const SpreadsheetsView: React.FC<SpreadsheetsViewProps> = ({ 
  brokers, clients, commissions, properties, currentUser, 
  onDeleteClients, onAddActivities, onNavigate 
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const [activeTab, setActiveTab] = useState<SpreadsheetTab>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [brokerFilter, setBrokerFilter] = useState<string>(isAdmin ? 'Todos' : currentUser.id);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    type: 'danger' | 'success' | 'warning';
  }>({
    show: false,
    title: '',
    message: '',
    type: 'warning'
  });

  const spreadsheetGroups: { id: string, name: string, date: string, count: number }[] = Array.from<{ id: string, name: string, date: string, count: number }>(
    clients.reduce((acc, client) => {
      if (client.importId && !client.deleted) {
        const existing = acc.get(client.importId);
        if (existing) {
          existing.count++;
        } else {
          acc.set(client.importId, {
            id: client.importId,
            name: client.importName || 'Importação Sem Nome',
            date: client.updatedAt || new Date().toISOString(),
            count: 1
          });
        }
      }
      return acc;
    }, new Map<string, { id: string, name: string, date: string, count: number }>())
    .values()
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDeleteImport = (importId: string, importName: string) => {
    if (!isAdmin) return;

    setConfirmModal({
      show: true,
      title: '⚠ EXCLUSÃO DE PLANILHA',
      message: `Você está prestes a remover permanentemente a planilha "${importName}" e TODOS os ${clients.filter(c => c.importId === importId && !c.deleted).length} leads associados a ela. Esta ação é irreversível.`,
      confirmText: 'Confirmar Exclusão Total',
      cancelText: 'Manter Dados',
      type: 'danger',
      onConfirm: () => {
        const leadsToDelete = clients.filter(c => c.importId === importId && !c.deleted);
        const leadIds = leadsToDelete.map(c => c.id);
        
        const now = new Date().toISOString();
        const dateStr = now.split('T')[0];
        const timeStr = new Date().toLocaleTimeString('pt-BR');
        
        const newActivities: Activity[] = leadsToDelete.map(client => ({
          id: Math.random().toString(36).substr(2, 9),
          brokerId: currentUser.id,
          brokerName: currentUser.name,
          type: 'System',
          clientName: client.name,
          description: `[AUDITORIA] EXCLUSÃO DE PLANILHA: Planilha "${importName}" removida. Lead ${client.name} excluído permanentemente.`,
          date: dateStr,
          time: timeStr,
          updatedAt: now
        }));

        onAddActivities?.(newActivities);
        onDeleteClients?.(leadIds);

        setConfirmModal({
          show: true,
          title: 'Planilha Removida',
          message: `A planilha e seus leads foram excluídos com sucesso.`,
          type: 'success'
        });
      }
    });
  };

  const handleBulkDelete = () => {
    if (!isAdmin || selectedClientIds.length === 0) return;

    setConfirmModal({
      show: true,
      title: '⚠ EXCLUSÃO EM MASSA',
      message: `Você selecionou ${selectedClientIds.length} leads para exclusão permanente. Esta ação não pode ser desfeita. Deseja continuar?`,
      confirmText: 'Excluir Selecionados',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        const leadsToDelete = clients.filter(c => selectedClientIds.includes(c.id));
        
        const now = new Date().toISOString();
        const dateStr = now.split('T')[0];
        const timeStr = new Date().toLocaleTimeString('pt-BR');
        
        const newActivities: Activity[] = leadsToDelete.map(client => ({
          id: Math.random().toString(36).substr(2, 9),
          brokerId: currentUser.id,
          brokerName: currentUser.name,
          type: 'System',
          clientName: client.name,
          description: `[AUDITORIA] EXCLUSÃO EM MASSA: Lead ${client.name} excluído permanentemente.`,
          date: dateStr,
          time: timeStr,
          updatedAt: now
        }));

        onAddActivities?.(newActivities);
        onDeleteClients?.(selectedClientIds);
        setSelectedClientIds([]);

        setConfirmModal({
          show: true,
          title: 'Leads Excluídos',
          message: `${selectedClientIds.length} leads foram removidos com sucesso.`,
          type: 'success'
        });
      }
    });
  };

  const toggleClientSelection = (id: string) => {
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = (data: any[]) => {
    if (selectedClientIds.length === data.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(data.map(c => c.id));
    }
  };

  const getBrokerName = (id: string) => brokers.find(b => b.id === id)?.name || 'Desconhecido';
  
  // Helper para buscar telefone do cliente pelo nome (usado no relatório de vendas)
  const getClientPhone = (name: string) => {
    return clients.find(c => c.name === name)?.phone || 'Não informado';
  };

  const getFilteredData = () => {
    const search = searchTerm.toLowerCase();
    
    // Filtro de segurança por role
    const baseClients = isAdmin ? clients : clients.filter(c => c.brokerId === currentUser.id || (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim()));
    const baseCommissions = isAdmin ? commissions : commissions.filter(c => c.brokerId === currentUser.id);
    const baseBrokers = (isAdmin ? brokers : brokers.filter(b => b.id === currentUser.id)).filter(b => !b.deleted);

    if (activeTab === 'clients' || activeTab === 'bulk_delete') {
      const selectedBroker = brokers.find(b => b.id === brokerFilter);
      const brokerName = selectedBroker?.name.toLowerCase().trim();

      return baseClients.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search);
        const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
        const matchesBroker = brokerFilter === 'Todos' || 
                             c.brokerId === brokerFilter ||
                             (brokerName && c.assignedAgent && c.assignedAgent.toLowerCase().trim() === brokerName);
        return matchesSearch && matchesStatus && matchesBroker && !c.deleted;
      });
    } else if (activeTab === 'sales') {
      const selectedBroker = brokers.find(b => b.id === brokerFilter);
      const brokerName = selectedBroker?.name.toLowerCase().trim();

      return baseCommissions.filter(s => {
        const matchesSearch = s.propertyTitle.toLowerCase().includes(search) || s.clientName.toLowerCase().includes(search);
        const matchesBroker = brokerFilter === 'Todos' || 
                             s.brokerId === brokerFilter ||
                             (brokerName && s.assignedAgent && s.assignedAgent.toLowerCase().trim() === brokerName);
        return matchesSearch && matchesBroker;
      });
    } else if (activeTab === 'performance') {
      return baseBrokers
        .filter(b => brokerFilter === 'Todos' || b.id === brokerFilter)
        .map(broker => {
          const bSales = baseCommissions.filter(c => c.brokerId === broker.id);
          const totalAgency = bSales.reduce((acc, c) => acc + (c.agencyAmount || 0), 0);
          const totalBroker = bSales.reduce((acc, c) => acc + (c.brokerAmount || 0), 0);
          const bClients = baseClients.filter(c => c.brokerId === broker.id).length;
          const conv = bClients > 0 ? (bSales.length / bClients * 100).toFixed(1) : '0.0';
          return {
            name: broker.name,
            activeClients: bClients,
            salesCount: bSales.length,
            conversion: conv + '%',
            totalAgency,
            totalBroker,
            performance: broker.performance + '%'
          };
        }).filter(b => b.name.toLowerCase().includes(search));
    } else {
      return baseBrokers
        .filter(b => brokerFilter === 'Todos' || b.id === brokerFilter)
        .map(broker => {
          const bClients = baseClients.filter(c => c.brokerId === broker.id);
          return {
            name: broker.name,
            firstContact: bClients.filter(c => c.status === ClientStatus.LEAD).length,
            cold: bClients.filter(c => c.status === ClientStatus.COLD).length,
            warm: bClients.filter(c => c.status === ClientStatus.WARM).length,
            hot: bClients.filter(c => c.status === ClientStatus.HOT).length,
            total: bClients.length
          };
        }).filter(b => b.name.toLowerCase().includes(search) && b.total > 0);
    }
  };

  const handlePrintInNewTab = () => {
    const data = getFilteredData();
    const title = getActiveReportTitle();
    const brokerName = brokerFilter === 'Todos' ? 'Toda a Equipe' : getBrokerName(brokerFilter);
    const date = new Date().toLocaleString('pt-BR');
    
    let tableHtml = '';
    
    if (activeTab === 'clients' || activeTab === 'bulk_delete') {
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
              <th>Corretor</th><th>Imóvel</th><th>Data</th><th>Cliente</th><th>Contato</th><th>Comissão Imob.</th><th>Comissão Corretor</th>
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
                <td><b>${formatCurrency(s.agencyAmount || 0)}</b></td>
                <td><b>${formatCurrency(s.brokerAmount || 0)}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'performance') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Membro</th><th>Carteira Ativa</th><th>Fechamentos</th><th>Conversão</th><th>Comissão Imob.</th><th>Comissão Corretor</th><th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((p: any) => `
              <tr>
                <td><b>${p.name}</b></td>
                <td>${p.activeClients}</td>
                <td>${p.salesCount}</td>
                <td>${p.conversion}</td>
                <td><b>${formatCurrency(p.totalAgency)}</b></td>
                <td><b>${formatCurrency(p.totalBroker)}</b></td>
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
    
    if (activeTab === 'clients' || activeTab === 'bulk_delete') {
      ws_data = [
        ['Corretor', 'Cliente', 'E-mail', 'Telefone', 'Status', 'Orçamento', 'Último Contato', 'Próxima Ação'],
        ...data.map((c: any) => [
          getBrokerName(c.brokerId), c.name, c.email, c.phone, c.status, c.budget, c.lastContact, c.nextActivityDate || 'N/A'
        ])
      ];
    } else if (activeTab === 'sales') {
      ws_data = [
        ['Corretor', 'Imóvel', 'Data Venda', 'Cliente', 'Telefone Cliente', 'Comissão Imobiliária', 'Comissão Corretor', 'Status'],
        ...data.map((s: any) => [
          getBrokerName(s.brokerId), s.propertyTitle, s.date, s.clientName, getClientPhone(s.clientName), s.agencyAmount || 0, s.brokerAmount || 0, s.status
        ])
      ];
    } else if (activeTab === 'performance') {
      ws_data = [
        ['Corretor', 'Carteira Ativa', 'Fechamentos', 'Conversão', 'Comissão Imobiliária', 'Comissão Corretor', 'Score'],
        ...data.map((p: any) => [
          p.name, p.activeClients, p.salesCount, p.conversion, p.totalAgency, p.totalBroker, p.performance
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
      case 'bulk_delete': return 'Exclusão Seletiva de Clientes';
      case 'imports': return 'Gestão de Planilhas Importadas';
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
          {activeTab === 'bulk_delete' && selectedClientIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg hover:bg-red-700 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Selecionados ({selectedClientIds.length})</span>
            </button>
          )}
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
            { id: 'sales', label: 'Comissão Realizada', icon: BadgeDollarSign },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'leads', label: 'Leads', icon: PieChart },
            { id: 'imports', label: 'Gestão de Planilhas', icon: FileSpreadsheet },
            { id: 'bulk_delete', label: 'Exclusão Seletiva', icon: Trash2 },
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
          {isAdmin && (
            <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
               <UserCheck className="w-3.5 h-3.5 text-[#d4a853] ml-2" />
               <select 
                 value={brokerFilter}
                 onChange={(e) => setBrokerFilter(e.target.value)}
                 className="text-[10px] font-black uppercase bg-transparent outline-none text-slate-700 cursor-pointer pr-4"
               >
                  <option value="Todos">Toda a Equipe</option>
                  {brokers.filter(b => !b.deleted).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
               </select>
            </div>
          )}

          {(activeTab === 'clients' || activeTab === 'bulk_delete') && (
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
             Visualização: {activeTab === 'imports' ? 'Gestão de Planilhas Importadas' : getActiveReportTitle()}
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-yellow-100 to-transparent"></div>
        </div>

        {activeTab === 'imports' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spreadsheetGroups.map(group => (
              <div key={group.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
                   <FileSpreadsheet className="w-24 h-24" />
                </div>
                
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center shadow-lg">
                    <Table2 className="w-7 h-7 text-[#d4a853]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[180px]" title={group.name}>
                      {group.name}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      {new Date(group.date).toLocaleDateString('pt-BR')} às {new Date(group.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[#d4a853]" />
                    <span className="text-xs font-black text-slate-700">{group.count} Leads</span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-lg">Importado</span>
                </div>

                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => {
                      onNavigate?.('clients');
                    }}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center"
                  >
                    <UserSearch className="w-3.5 h-3.5 mr-2" />
                    Ver Leads
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteImport(group.id, group.name)}
                      className="p-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl border border-red-100 transition-all"
                      title="Excluir Planilha e Leads"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {spreadsheetGroups.length === 0 && (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                 <FileSpreadsheet className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                 <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nenhuma planilha importada recentemente</p>
                 <button onClick={() => onNavigate?.('lead_import')} className="mt-4 text-[#d4a853] text-[10px] font-black uppercase underline tracking-widest">Fazer primeira importação</button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden printable-area">
            <div className="overflow-x-auto">
              {(activeTab === 'clients' || activeTab === 'bulk_delete') && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                      {activeTab === 'bulk_delete' && (
                        <th className="px-8 py-5 w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedClientIds.length === getFilteredData().length && getFilteredData().length > 0}
                            onChange={() => toggleAllSelection(getFilteredData())}
                            className="w-4 h-4 rounded border-slate-300 text-[#d4a853] focus:ring-[#d4a853]"
                          />
                        </th>
                      )}
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
                      <tr 
                        key={client.id} 
                        className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${selectedClientIds.includes(client.id) ? 'bg-slate-50' : ''}`}
                        onClick={() => activeTab === 'bulk_delete' && toggleClientSelection(client.id)}
                      >
                        {activeTab === 'bulk_delete' && (
                          <td className="px-8 py-5">
                            <input 
                              type="checkbox" 
                              checked={selectedClientIds.includes(client.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleClientSelection(client.id);
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-[#d4a853] focus:ring-[#d4a853]"
                            />
                          </td>
                        )}
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
                      <th className="px-8 py-5 text-right">Comissão Imobiliária</th>
                      <th className="px-8 py-5 text-right">Comissão Corretor</th>
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
                        <td className="px-8 py-5 text-right font-mono text-sm font-black text-blue-600">{formatCurrency(sale.agencyAmount || 0)}</td>
                        <td className="px-8 py-5 text-right font-mono text-sm font-black text-emerald-600">{formatCurrency(sale.brokerAmount || 0)}</td>
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
                      <th className="px-8 py-5 text-right">Comissão Imobiliária</th>
                      <th className="px-8 py-5 text-right">Comissão Corretor</th>
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
                        <td className="px-8 py-5 text-right font-mono text-xs font-black text-blue-600">{formatCurrency(data.totalAgency)}</td>
                        <td className="px-8 py-5 text-right font-mono text-xs font-black text-emerald-600">{formatCurrency(data.totalBroker)}</td>
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
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO / ALERTA CUSTOMIZADO */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-white/10">
            <div className={`p-8 flex flex-col items-center text-center space-y-4 ${
              confirmModal.type === 'danger' ? 'bg-red-50' : 
              confirmModal.type === 'success' ? 'bg-emerald-50' : 'bg-amber-50'
            }`}>
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${
                confirmModal.type === 'danger' ? 'bg-red-600 text-white' : 
                confirmModal.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
              }`}>
                {confirmModal.type === 'danger' ? <Trash2 className="w-10 h-10" /> : 
                 confirmModal.type === 'success' ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
              </div>
              <div>
                <h3 className={`text-xl font-black uppercase tracking-tight ${
                  confirmModal.type === 'danger' ? 'text-red-900' : 
                  confirmModal.type === 'success' ? 'text-emerald-900' : 'text-amber-900'
                }`}>
                  {confirmModal.title}
                </h3>
                <p className="text-slate-600 text-sm font-bold mt-2 px-4 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="p-8 bg-white flex flex-col space-y-3">
              {confirmModal.onConfirm ? (
                <>
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm?.();
                      setConfirmModal(prev => ({ ...prev, show: false }));
                    }}
                    className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${
                      confirmModal.type === 'danger' ? 'bg-red-600 text-white' : 
                      confirmModal.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {confirmModal.confirmText || 'Confirmar'}
                  </button>
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    {confirmModal.cancelText || 'Cancelar'}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${
                    confirmModal.type === 'danger' ? 'bg-red-600 text-white' : 
                    confirmModal.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {getFilteredData().length === 0 && activeTab !== 'imports' && (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 mt-8">
           <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
           <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum registro encontrado com os filtros atuais</p>
        </div>
      )}
    </div>
  );
};
