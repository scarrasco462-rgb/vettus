import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Mail, Phone, UserPlus, X, User, Users, DollarSign, History, Plus, Tag, 
  ShieldCheck, Check, Sparkles, Zap, Star, UserCheck, CalendarDays, Calendar, 
  MessageCircle, PhoneForwarded, Save, Award, Building2, Pencil, Trash2, 
  Home, Clock, CheckCircle2, RefreshCw, FileUp, UserSearch, Filter, 
  LayoutGrid, List, MessageSquare, ExternalLink, Trophy, Briefcase, 
  Percent, Calculator, PlusCircle, MinusCircle, Table2, ListOrdered,
  ArrowRight, Info, TrendingUp, CalendarPlus, LayoutPanelTop, Printer, FileText,
  Layers, HardHat, ArrowDownWideNarrow,
  UploadCloud, ShieldAlert, Trash, AlertTriangle, ChevronDown,
  Repeat, ArrowRightLeft, UserCheck2, ShieldOff, Lock, Unlock, ShieldAlert as ShieldIcon
} from 'lucide-react';
import { Client, ClientStatus, Broker, Activity, Property, Commission, Reminder, ConstructionCompany, CommissionForecast } from '../types.ts';
import * as XLSX from 'xlsx';

interface ClientViewProps {
  clients: Client[];
  activities: Activity[];
  properties: Property[];
  commissions: Commission[];
  constructionCompanies: ConstructionCompany[];
  commissionForecasts: CommissionForecast[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onEditClient: (client: Client) => void;
  onAddActivity: (activity: Activity) => void;
  onAddReminder: (reminder: Reminder) => void;
  onAddSale: (sale: Commission) => void;
  onUpdateProperty: (property: Property) => void;
  onAddForecasts: (forecasts: CommissionForecast[]) => void;
  currentUser: Broker;
  brokers: Broker[]; 
  onOpenAddModal?: () => void;
  onOpenImport?: () => void;
  onOpenFlow?: (clientId: string) => void;
}

const formatCurrencyBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const parseExcelValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val).replace(/[R$\s.%]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const parseExcelDate = (val: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const parts = String(val).split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return new Date(val).toISOString().split('T')[0];
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

const parseCurrencyToNumber = (value: string): number => {
  const cleanValue = value.replace(/[^\d]/g, '');
  return cleanValue ? parseFloat(cleanValue) / 100 : 0;
};

export const ClientView: React.FC<ClientViewProps> = ({ 
  clients, activities, properties, commissions = [], constructionCompanies = [], commissionForecasts = [], 
  onUpdateClient, onDeleteClient, onEditClient, onAddActivity, onAddReminder, onAddSale, 
  onUpdateProperty, onAddForecasts, currentUser, brokers, onOpenAddModal, onOpenImport, onOpenFlow
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showGanhosModal, setShowGanhosModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  
  // Estados para Registro de Atendimento
  const [currentAtendimento, setCurrentAtendimento] = useState({ type: 'Call', desc: '' });
  const [nextStep, setNextStep] = useState({ date: '', time: '10:00', type: 'Call' });

  // Estados Ganhos Construtora
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [importedFlux, setImportedFlux] = useState<any[]>([]);
  const [parsingFlux, setParsingFlux] = useState(false);
  const [saleValue, setSaleValue] = useState<number>(0);
  const [displaySaleValue, setDisplaySaleValue] = useState('0,00');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para Transferência
  const [targetBrokerId, setTargetBrokerId] = useState('');

  // Estado para Bloqueio
  const [blockReason, setBlockReason] = useState('');

  const isAdmin = currentUser.role === 'Admin';

  const handleOpenGanhos = (client: Client) => {
    setSelectedClient(client);
    setImportedFlux([]);
    setSelectedCompanyId('');
    const initialValue = client.budget || 0;
    setSaleValue(initialValue);
    setDisplaySaleValue(formatInputToBRL(initialValue.toFixed(2).replace('.', '')));
    setShowGanhosModal(true);
  };

  const handleOpenHistory = (client: Client) => {
    setSelectedClient(client);
    setCurrentAtendimento({ type: 'Call', desc: '' });
    setNextStep({ 
      date: client.nextActivityDate || '', 
      time: client.nextActivityTime || '10:00', 
      type: client.nextActivityType || 'Call' 
    });
    setShowHistoryModal(true);
  };

  const handleOpenTransfer = (client: Client) => {
    if (!isAdmin) return;
    setSelectedClient(client);
    setTargetBrokerId('');
    setShowTransferModal(true);
  };

  const handleOpenBlock = (client: Client) => {
    if (!isAdmin) return;
    setSelectedClient(client);
    setBlockReason(client.blockReason || '');
    setShowBlockModal(true);
  };

  const handleSaveAtendimento = () => {
    if (!selectedClient || !currentAtendimento.desc.trim()) return;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    onAddActivity({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: currentAtendimento.type as any,
      clientName: selectedClient.name,
      description: currentAtendimento.desc,
      date: dateStr,
      time: timeStr,
      updatedAt: now.toISOString()
    });

    const updatedClient = { 
      ...selectedClient, 
      lastContact: dateStr, 
      updatedAt: now.toISOString() 
    };
    onUpdateClient(updatedClient);
    setSelectedClient(updatedClient);
    setCurrentAtendimento({ type: 'Call', desc: '' });
  };

  const handleSaveAgendamento = () => {
    if (!selectedClient || !nextStep.date) return;
    
    const updatedClient = { 
      ...selectedClient, 
      nextActivityDate: nextStep.date, 
      nextActivityTime: nextStep.time, 
      nextActivityType: nextStep.type as any,
      updatedAt: new Date().toISOString() 
    };
    onUpdateClient(updatedClient);
    setSelectedClient(updatedClient);

    onAddReminder({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      title: `Ação Vettus: ${nextStep.type === 'Call' ? 'Ligar para' : 'Encontro com'} ${selectedClient.name} às ${nextStep.time}`,
      dueDate: nextStep.date,
      priority: 'High',
      completed: false,
      updatedAt: new Date().toISOString()
    });

    setNextStep({
      date: '',
      time: '10:00',
      type: 'Call'
    });

    alert("Próxima ação agendada e lembrete Master criado!");
  };

  const handleConfirmTransfer = () => {
    if (!selectedClient || !targetBrokerId) return;
    
    const newBroker = brokers.find(b => b.id === targetBrokerId);
    if (!newBroker) return;

    const oldBrokerName = selectedClient.assignedAgent || 'Gestão';
    const now = new Date().toISOString();

    // 1. Atualizar o Cliente
    const updatedClient: Client = {
      ...selectedClient,
      brokerId: newBroker.id,
      assignedAgent: newBroker.name,
      updatedAt: now
    };
    onUpdateClient(updatedClient);

    // 2. Registrar Log de Auditoria
    onAddActivity({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: 'Meeting',
      clientName: selectedClient.name,
      description: `[GESTÃO] TRANSFERÊNCIA DE CARTEIRA: Lead remanejado de ${oldBrokerName.toUpperCase()} para ${newBroker.name.toUpperCase()} por ${currentUser.name}.`,
      date: now.split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR'),
      updatedAt: now
    });

    // 3. Notificar o Corretor Destino via Reminder
    onAddReminder({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: newBroker.id,
      title: `NOVO LEAD RECEBIDO: ${selectedClient.name} transferido pela Administração.`,
      dueDate: now.split('T')[0],
      priority: 'High',
      completed: false,
      type: 'new_lead',
      updatedAt: now
    });

    alert(`Transferência concluída. ${newBroker.name} foi notificado sobre o novo lead.`);
    setShowTransferModal(false);
    setSelectedClient(null);
  };

  const handleConfirmBlock = () => {
    if (!selectedClient || !isAdmin) return;
    
    const isBlocking = !selectedClient.blocked;
    const now = new Date().toISOString();

    if (isBlocking && !blockReason.trim()) {
      alert("Por favor, informe o motivo do bloqueio para auditoria.");
      return;
    }

    const updatedClient: Client = {
      ...selectedClient,
      blocked: isBlocking,
      blockReason: isBlocking ? blockReason : '',
      updatedAt: now
    };

    onUpdateClient(updatedClient);

    onAddActivity({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: 'Meeting',
      clientName: selectedClient.name,
      description: isBlocking 
        ? `[SEGURANÇA] LEAD BLOQUEADO: Suspensão de atendimento autorizada por ${currentUser.name}. Motivo: ${blockReason.toUpperCase()}`
        : `[SEGURANÇA] LEAD DESBLOQUEADO: Acesso reestabelecido por ${currentUser.name}.`,
      date: now.split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR'),
      updatedAt: now
    });

    alert(isBlocking ? "Lead bloqueado com sucesso." : "Lead desbloqueado com sucesso.");
    setShowBlockModal(false);
    setSelectedClient(null);
  };

  const handleSaleValueInput = (val: string) => {
    const formatted = formatInputToBRL(val);
    setDisplaySaleValue(formatted);
    setSaleValue(parseCurrencyToNumber(formatted));
  };

  const handleDeleteLead = (client: Client) => {
    if (!isAdmin) {
      alert("Acesso negado - Administrador requerido");
      return;
    }

    if (confirm(`⚠ ALERTA CRÍTICO: Deseja EXCLUIR permanentemente o lead ${client.name}? Esta ação gerará um log de auditoria irreversível.`)) {
      onAddActivity({
        id: Math.random().toString(36).substr(2, 9),
        brokerId: currentUser.id,
        brokerName: currentUser.name,
        type: 'Meeting',
        clientName: client.name,
        description: `[AUDITORIA] EXCLUSÃO DE LEAD: User: ${currentUser.name} (Role: ${currentUser.role}) removeu o lead ${client.name}.`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR'),
        updatedAt: new Date().toISOString()
      });

      onDeleteClient(client.id);
      alert("Lead removido com sucesso.");
    }
  };

  const handleRegisterClosing = (client: Client) => {
    if (saleValue <= 0) {
      alert("Por favor, insira o valor da venda realizada para registrar o fechamento.");
      return;
    }

    if (confirm(`Confirmar fechamento para ${client.name} no valor de R$ ${displaySaleValue}? O lead será movido para o status GANHO.`)) {
      const updatedAt = new Date().toISOString();
      const updatedClient = { 
        ...client, 
        status: ClientStatus.WON, 
        budget: saleValue, 
        updatedAt 
      };
      
      onUpdateClient(updatedClient);

      onAddActivity({
        id: Math.random().toString(36).substr(2, 9),
        brokerId: currentUser.id,
        brokerName: currentUser.name,
        type: 'Meeting',
        clientName: client.name,
        description: `FECHAMENTO CONCLUÍDO: Lead classificado como GANHO. Valor da Venda: ${formatCurrencyBRL(saleValue)}.`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR'),
        updatedAt
      });

      setSelectedClient(updatedClient);
      alert("Venda registrada com sucesso! Parabéns pelo fechamento.");
    }
  };

  const handleFluxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsingFlux(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        setImportedFlux(json);
      } catch (err) { 
        alert("Erro ao ler planilha de fluxo. Verifique o formato."); 
      } finally { 
        setParsingFlux(false); 
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleVincularConstrutora = () => {
    if (!selectedClient) return;
    if (!selectedCompanyId) {
      alert("Selecione uma Construtora antes de vincular.");
      return;
    }
    if (importedFlux.length === 0) {
      alert("Faça o upload da planilha de fluxo para processar os ganhos.");
      return;
    }

    const company = constructionCompanies.find(c => c.id === selectedCompanyId);
    if (!company) return;

    const newForecasts: CommissionForecast[] = [];
    
    importedFlux.forEach((row: any, idx: number) => {
      const colPercent = row['% Acumulado Contrato'] || row['% Pago'] || row['% Acumulado'] || '0';
      const pagoPct = parseExcelValue(colPercent) / 100;
      
      if (pagoPct >= company.releaseFluxRate) {
        const colValor = row['Valor Total Contrato'] || row['Valor Contrato'] || saleValue || selectedClient.budget || '0';
        const valorContrato = parseExcelValue(colValor);
        const dataParcela = row['Data Parcela'] || row['Data'] || row['Vencimento'];
        
        const forecastDateStr = parseExcelDate(dataParcela);
        const dateObj = new Date(forecastDateStr);
        const forecastDate = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0); 
        forecastDate.setDate(forecastDate.getDate() + (company.closingDay || 5)); 

        newForecasts.push({
          id: Math.random().toString(36).substr(2, 9),
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          constructionCompanyId: company.id,
          constructionCompanyName: company.name,
          saleId: `flux-${selectedClient.id}-${idx}-${Date.now()}`,
          salePrice: valorContrato,
          paidPercent: pagoPct,
          commissionAmount: valorContrato * company.commissionRate,
          forecastDate: forecastDate.toISOString().split('T')[0],
          status: 'Aguardando Fluxo',
          updatedAt: new Date().toISOString()
        });
      }
    });

    if (newForecasts.length > 0) {
      onAddForecasts(newForecasts);
      
      onAddActivity({
        id: Math.random().toString(36).substr(2, 9),
        brokerId: currentUser.id,
        brokerName: currentUser.name,
        type: 'WhatsApp',
        clientName: selectedClient.name,
        description: `VÍNCULO CONSTRUTORA: ${company.name}. Geradas ${newForecasts.length} previsões de comissão via fluxo.`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR'),
        updatedAt: new Date().toISOString()
      });

      alert(`${newForecasts.length} previsões de comissão geradas com sucesso!`);
      setShowGanhosModal(false);
    } else {
      alert("Nenhuma linha atingiu o gatilho de liberação.");
    }
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'Call': return <Phone className="w-4 h-4" />;
      case 'WhatsApp': return <MessageCircle className="w-4 h-4" />;
      case 'Meeting': return <Users className="w-4 h-4" />;
      case 'Viewing': return <Home className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const sortedClients = useMemo(() => [...clients].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [clients]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Gestão Comercial de Carteira</h1>
          <p className="text-slate-500 font-medium">Controle de leads, histórico de atendimento e follow-up.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onOpenImport} className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors">
            <FileUp className="w-4 h-4 text-emerald-600" />
            <span>Importar</span>
          </button>
          <button onClick={onOpenAddModal} className="gold-gradient text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-lg hover:scale-[1.02] transition-transform">
            <UserPlus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0f172a] text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-6">Perfil do Lead</th>
                <th className="px-8 py-6">Responsável</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Próxima Ação</th>
                <th className="px-8 py-6 text-right">Ação Necessária</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedClients.map((client) => (
                <tr key={client.id} className={`hover:bg-[#d4a853]/5 transition-colors group ${client.blocked ? 'grayscale bg-slate-50 opacity-70' : ''}`}>
                  <td className="px-8 py-7">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-[#d4a853] flex items-center justify-center font-black shadow-lg">{client.name[0]}</div>
                        {client.blocked && (
                          <div className="absolute -top-1.5 -right-1.5 bg-red-600 text-white p-1 rounded-full border-2 border-white shadow-sm">
                            <ShieldOff className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                           <p className="font-black text-slate-900 text-sm uppercase">{client.name}</p>
                           {client.blocked && (
                              <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm" title={`Motivo: ${client.blockReason}`}>BLOQUEADO</span>
                           )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{client.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex items-center space-x-2">
                       <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-slate-200">
                          {client.assignedAgent || 'Gestão'}
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border inline-flex items-center justify-center min-w-[100px] ${client.status === ClientStatus.WON ? 'gold-gradient text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-8 py-7">
                    {client.nextActivityDate ? (
                       <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-900 uppercase">
                             {new Date(client.nextActivityDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[9px] font-black text-[#d4a853] uppercase tracking-tighter">
                             {client.nextActivityType || 'Follow-up'} às {client.nextActivityTime}
                          </span>
                       </div>
                    ) : (
                       <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest italic">Aguardando Agenda</span>
                    )}
                  </td>
                  <td className="px-8 py-7 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        disabled={client.blocked}
                        onClick={() => handleOpenHistory(client)}
                        className="p-2.5 bg-blue-50 text-blue-600 hover:bg-[#0a1120] hover:text-[#d4a853] rounded-xl border border-blue-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Histórico & Próxima Ação"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button 
                        disabled={client.blocked}
                        onClick={() => onOpenFlow?.(client.id)}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:bg-[#0a1120] hover:text-[#d4a853] rounded-xl border border-slate-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Montar Fluxo de Obra"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                      
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleOpenTransfer(client)}
                            className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl border border-amber-200 transition-all shadow-sm"
                            title="Transferir Custódia do Lead"
                          >
                            <Repeat className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleOpenBlock(client)}
                            className={`p-2.5 border transition-all shadow-sm rounded-xl ${client.blocked ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white' : 'bg-slate-900 text-[#d4a853] border-slate-800 hover:bg-red-600 hover:text-white'}`}
                            title={client.blocked ? "Desbloquear Lead" : "Bloquear Lead"}
                          >
                            {client.blocked ? <Unlock className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          </button>
                        </>
                      )}

                      <button 
                        disabled={client.blocked}
                        onClick={() => handleOpenGanhos(client)} 
                        className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl border border-emerald-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed" 
                        title="Ganho"
                      >
                        <Trophy className="w-4 h-4" />
                      </button>
                      
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteLead(client)} 
                          className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl border border-red-200 transition-all shadow-sm" 
                          title="Excluir Lead"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button 
                        disabled={client.blocked}
                        onClick={() => onEditClient(client)} 
                        className="p-2.5 bg-white text-slate-400 hover:text-[#d4a853] rounded-xl border border-slate-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Editar Lead"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL BLOQUEIO DE SEGURANÇA */}
      {showBlockModal && selectedClient && (
        <div className="fixed inset-0 z-[195] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setShowBlockModal(false)}></div>
           <div className="bg-white w-full max-w-lg rounded-[3rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-white/10">
              <div className={`${selectedClient.blocked ? 'bg-emerald-600' : 'bg-red-600'} p-10 text-white shrink-0 border-b border-black/10`}>
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-5">
                       <div className="w-16 h-16 bg-white/20 rounded-[2rem] flex items-center justify-center shadow-2xl">
                          {selectedClient.blocked ? <Unlock className="w-8 h-8" /> : <ShieldOff className="w-8 h-8" />}
                       </div>
                       <div>
                          <h2 className="text-2xl font-black uppercase tracking-tight">{selectedClient.blocked ? 'Desbloquear' : 'Bloquear Lead'}</h2>
                          <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.3em]">Protocolo de Segurança Admin</p>
                       </div>
                    </div>
                    <button onClick={() => setShowBlockModal(false)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-8 h-8" /></button>
                 </div>
              </div>

              <div className="p-10 bg-slate-50 space-y-8">
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lead Selecionado</p>
                    <h4 className="text-lg font-black text-slate-900 uppercase">{selectedClient.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Status Atual: {selectedClient.blocked ? 'SUSPENSO' : 'ATIVO'}</p>
                 </div>

                 {!selectedClient.blocked ? (
                   <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-500 uppercase ml-2 flex items-center">
                         <ShieldIcon className="w-4 h-4 mr-2 text-red-600" /> Motivo da Suspensão *
                      </label>
                      <textarea 
                        required
                        value={blockReason}
                        onChange={e => setBlockReason(e.target.value)}
                        placeholder="Informe o motivo do bloqueio (ex: cliente duplicado, comportamento inadequado, lead inválido)..."
                        className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 text-sm font-bold text-slate-900 outline-none focus:border-red-600 shadow-sm min-h-[150px] resize-none"
                      />
                   </div>
                 ) : (
                   <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-3">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Motivo do Bloqueio Anterior:</p>
                      <p className="text-sm font-bold text-emerald-900 italic">"{selectedClient.blockReason}"</p>
                   </div>
                 )}

                 <div className={`p-6 rounded-3xl border flex items-start space-x-4 ${selectedClient.blocked ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                    <AlertTriangle className="w-6 h-6 shrink-0 mt-1" />
                    <p className="text-[11px] leading-relaxed font-medium">
                       {selectedClient.blocked 
                         ? "Ao desbloquear, o lead voltará a aparecer no funil de vendas e o corretor poderá retomar o atendimento normalmente."
                         : "Ao bloquear, o atendimento será suspenso. O lead ficará inacessível para corretores e não aparecerá em novos filtros de prospecção."}
                    </p>
                 </div>

                 <button 
                    onClick={handleConfirmBlock} 
                    disabled={!selectedClient.blocked && !blockReason.trim()}
                    className={`w-full py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-4 disabled:opacity-50 ${selectedClient.blocked ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                 >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>{selectedClient.blocked ? 'Confirmar Reativação' : 'Confirmar Suspensão'}</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL TRANSFERÊNCIA DE CUSTÓDIA */}
      {showTransferModal && selectedClient && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setShowTransferModal(false)}></div>
           <div className="bg-white w-full max-w-lg rounded-[3rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-white/10">
              <div className="gold-gradient p-10 text-[#0a1120] shrink-0 border-b border-[#0a1120]/10">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-5">
                       <div className="w-16 h-16 bg-[#0a1120] rounded-[2rem] flex items-center justify-center shadow-2xl">
                          <ArrowRightLeft className="w-8 h-8 text-[#d4a853]" />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black uppercase tracking-tight">Transferência</h2>
                          <p className="text-[#0a1120]/70 text-[10px] font-black uppercase tracking-[0.3em]">Remanejamento de Patrimônio</p>
                       </div>
                    </div>
                    <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-8 h-8" /></button>
                 </div>
              </div>

              <div className="p-10 bg-slate-50 space-y-8">
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lead em Remanejamento</p>
                    <h4 className="text-lg font-black text-slate-900 uppercase">{selectedClient.name}</h4>
                    <div className="flex items-center space-x-2 mt-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase">Custódia Atual:</span>
                       <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded">{selectedClient.assignedAgent || 'Não Atribuído'}</span>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase ml-2 flex items-center">
                       <UserCheck2 className="w-4 h-4 mr-2 text-[#d4a853]" /> Selecionar Novo Corretor
                    </label>
                    <select 
                       value={targetBrokerId} 
                       onChange={e => setTargetBrokerId(e.target.value)} 
                       className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 outline-none focus:border-[#d4a853] shadow-sm"
                    >
                       <option value="">Selecione o destino estratégico...</option>
                       {brokers.filter(b => b.id !== selectedClient.brokerId).map(b => (
                         <option key={b.id} value={b.id}>{b.name} ({b.role})</option>
                       ))}
                    </select>
                 </div>

                 <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start space-x-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                       Esta ação removerá o lead da carteira atual e o moverá para o novo corretor. O destinatário receberá um <strong>alerta de prioridade máxima</strong> no sistema.
                    </p>
                 </div>

                 <button 
                    onClick={handleConfirmTransfer} 
                    disabled={!targetBrokerId}
                    className="w-full gold-gradient text-[#0a1120] py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-4 disabled:opacity-50"
                 >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>Confirmar Remanejamento</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL HISTÓRICO & PRÓXIMA AÇÃO */}
      {showHistoryModal && selectedClient && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setShowHistoryModal(false)}></div>
           <div className="bg-white w-full max-w-4xl rounded-[3rem] p-0 relative z-10 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col max-h-[95vh] border border-white/10">
              <div className="navy-gradient p-10 text-white shrink-0 border-b border-[#d4a853]/30">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                       <div className="w-16 h-16 gold-gradient rounded-[2rem] flex items-center justify-center shadow-2xl">
                          <History className="w-8 h-8 text-[#0a1120]" />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black uppercase tracking-tight">{selectedClient.name}</h2>
                          <p className="text-[#d4a853] text-[10px] font-black uppercase tracking-[0.3em]">Timeline de Atendimento & Follow-up</p>
                       </div>
                    </div>
                    <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                       <X className="w-8 h-8" />
                    </button>
                 </div>
              </div>

              <div className="p-10 overflow-y-auto no-scrollbar bg-slate-50 flex-1 space-y-10">
                 {/* REGISTRO DE ATENDIMENTO REALIZADO */}
                 <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 border-b-2 border-slate-50 pb-4">
                       <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                       <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">O que foi conversado hoje?</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Canal de Contato</label>
                          <select 
                            value={currentAtendimento.type} 
                            onChange={e => setCurrentAtendimento({...currentAtendimento, type: e.target.value})} 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 px-4 text-xs font-black text-slate-900 outline-none focus:border-[#d4a853]"
                          >
                             <option value="Call">📞 Ligação Efetuada</option>
                             <option value="WhatsApp">💬 WhatsApp Enviado</option>
                             <option value="Meeting">🤝 Reunião Presencial</option>
                             <option value="Viewing">🏠 Visita Realizada</option>
                          </select>
                       </div>
                       <div className="md:col-span-3 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Resumo da Interação</label>
                          <textarea 
                            value={currentAtendimento.desc} 
                            onChange={e => setCurrentAtendimento({...currentAtendimento, desc: e.target.value})} 
                            placeholder="Descreva detalhes importantes da conversa, objeções ou avanços..." 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none focus:border-[#d4a853] resize-none h-32" 
                          />
                       </div>
                    </div>
                    <button 
                       onClick={handleSaveAtendimento} 
                       className="w-full bg-[#0a1120] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center space-x-3 hover:bg-slate-800 transition-all shadow-xl"
                    >
                       <Save className="w-4 h-4" />
                       <span>Salvar Registro na Timeline Master</span>
                    </button>
                 </div>

                 {/* AGENDAMENTO DE PRÓXIMA AÇÃO */}
                 <div className="bg-[#d4a853]/5 p-8 rounded-[2.5rem] border-2 border-[#d4a853]/20 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 border-b-2 border-[#d4a853]/10 pb-4">
                       <CalendarPlus className="w-5 h-5 text-[#d4a853]" />
                       <h4 className="text-[11px] font-black uppercase text-slate-600 tracking-widest">Próxima Ação (Gera Alerta)</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Data do Follow-up</label>
                          <input type="date" value={nextStep.date} onChange={e => setNextStep({...nextStep, date: e.target.value})} className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3.5 px-4 text-xs font-black text-slate-900 outline-none focus:border-[#d4a853]" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Horário</label>
                          <input type="time" value={nextStep.time} onChange={e => setNextStep({...nextStep, time: e.target.value})} className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3.5 px-4 text-xs font-black text-slate-900 outline-none focus:border-[#d4a853]" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Ação Sugerida</label>
                          <select value={nextStep.type} onChange={e => setNextStep({...nextStep, type: e.target.value})} className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3.5 px-4 text-xs font-black text-slate-900 outline-none">
                             <option value="Call">📞 Retornar Ligação</option>
                             <option value="WhatsApp">💬 Mensagem Direct</option>
                             <option value="Meeting">🤝 Reunião / Alinhamento</option>
                             <option value="Viewing">🏠 Mostrar Unidade</option>
                          </select>
                       </div>
                    </div>
                    <button 
                       onClick={handleSaveAgendamento} 
                       className="w-full gold-gradient text-[#0a1120] py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center space-x-3 shadow-xl hover:scale-[1.01] transition-all"
                    >
                       <Zap className="w-4 h-4" />
                       <span>Confirmar Agendamento e Criar Lembrete</span>
                    </button>
                 </div>

                 {/* LISTA CRONOLÓGICA DE INTERAÇÕES */}
                 <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                       <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] flex items-center">
                          <ListOrdered className="w-4 h-4 mr-3" /> 
                          Histórico de Atividade Consolidado
                       </h5>
                       <span className="text-[9px] font-bold text-slate-400 px-4 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">Registros de Rede Vettus</span>
                    </div>
                    
                    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-1 before:bg-slate-200">
                       {activities.filter(a => a.clientName === selectedClient.name).reverse().map(act => (
                          <div key={act.id} className="relative flex items-start group">
                             <div className="flex items-center justify-center w-12 h-12 rounded-2xl border-4 border-slate-50 bg-[#0a1120] text-[#d4a853] shadow-lg z-10 group-hover:scale-110 transition-transform">
                                {getActivityIcon(act.type)}
                             </div>
                             <div className="ml-8 flex-1 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                   {getActivityIcon(act.type)}
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-slate-50 pb-3 gap-2">
                                   <div className="flex items-center space-x-3">
                                      <span className="text-[10px] font-black text-[#d4a853] uppercase bg-[#0a1120] px-3 py-1 rounded-lg">
                                         {act.type}
                                      </span>
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Efetuado por {act.brokerName || 'Vettus System'}</span>
                                   </div>
                                   <div className="flex items-center text-slate-900 font-mono text-[11px] font-black space-x-4">
                                      <span className="flex items-center bg-slate-50 px-2 py-1 rounded-md border border-slate-100"><Calendar className="w-3.5 h-3.5 mr-1.5 text-[#d4a853]" /> {new Date(act.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                      <span className="flex items-center bg-slate-50 px-2 py-1 rounded-md border border-slate-100"><Clock className="w-3.5 h-3.5 mr-1.5 text-[#d4a853]" /> {act.time}</span>
                                   </div>
                                </div>
                                <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                                   "{act.description}"
                                </p>
                             </div>
                          </div>
                       ))}
                       {activities.filter(a => a.clientName === selectedClient.name).length === 0 && (
                          <div className="py-24 text-center text-slate-300 font-black uppercase tracking-[0.2em] ml-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white">
                             Nenhum registro de contato efetuado.
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL GANHO CONSTRUTORA (MANTIDO) */}
      {showGanhosModal && selectedClient && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setShowGanhosModal(false)}></div>
          <div className="bg-white w-full max-w-4xl rounded-[3rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[90vh]">
             <div className="gold-gradient p-10 text-[#0f172a] shrink-0 border-b border-[#0f172a]/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-5">
                    <div className="w-16 h-16 bg-[#0f172a] rounded-[2rem] flex items-center justify-center shadow-2xl"><Trophy className="w-8 h-8 text-[#d4a853]" /></div>
                    <div><h2 className="text-2xl font-black uppercase tracking-tight">Ganho</h2><p className="text-[#0f172a]/70 text-[10px] font-black uppercase tracking-[0.3em]">{selectedClient.name}</p></div>
                  </div>
                  <button onClick={() => setShowGanhosModal(false)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-8 h-8" /></button>
                </div>
             </div>

             <div className="p-10 overflow-y-auto bg-slate-50 space-y-8 no-scrollbar">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center"><HardHat className="w-4 h-4 mr-2 text-[#d4a853]" /> Selecionar Construtora</label>
                      <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 outline-none focus:border-[#d4a853]">
                         <option value="">Selecione um parceiro...</option>
                         {constructionCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center"><FileText className="w-4 h-4 mr-2 text-[#d4a853]" /> Upload Fluxo Pagamento (Excel)</label>
                      <div onClick={() => fileInputRef.current?.click()} className="w-full bg-white border-2 border-dashed border-slate-200 rounded-2xl py-3 px-6 flex items-center justify-center space-x-3 cursor-pointer hover:bg-slate-50 transition-all">
                         <UploadCloud className="w-5 h-5 text-slate-400" />
                         <span className="text-xs font-bold text-slate-600">{parsingFlux ? 'Lendo Arquivo...' : importedFlux.length > 0 ? 'Planilha Carregada' : 'Selecionar .xlsx / .csv'}</span>
                         <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFluxUpload} />
                      </div>
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-5">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${selectedClient.status === ClientStatus.WON ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Trophy className="w-7 h-7" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Comercial</p>
                          <p className="text-lg font-black text-slate-900 uppercase">{selectedClient.status}</p>
                       </div>
                    </div>
                    
                    {selectedClient.status !== ClientStatus.WON && (
                        <div className="flex flex-col md:flex-row items-center gap-4 flex-1 max-w-md">
                           <div className="w-full space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Valor da Venda Realizada (R$)</label>
                              <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                                <input 
                                  type="text" 
                                  value={displaySaleValue} 
                                  onChange={e => handleSaleValueInput(e.target.value)}
                                  placeholder="0,00"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-black text-slate-900 outline-none focus:border-emerald-500" 
                                />
                              </div>
                           </div>
                           <button 
                             onClick={() => handleRegisterClosing(selectedClient)}
                             className="w-full md:w-auto px-8 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2 shrink-0 self-end"
                           >
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Registrar Fechamento</span>
                           </button>
                        </div>
                    )}
                </div>

                <button onClick={handleVincularConstrutora} disabled={!selectedCompanyId || importedFlux.length === 0} className="w-full gold-gradient text-[#0f172a] py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50">
                   <Zap className="w-5 h-5" />
                   <span>Vincular e Gerar Previsões</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};