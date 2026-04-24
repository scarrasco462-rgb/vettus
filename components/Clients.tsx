import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Mail, Phone, UserPlus, X, User, Users, DollarSign, History, Plus, Tag, 
  ShieldCheck, Check, Sparkles, Zap, Star, UserCheck, CalendarDays, Calendar, 
  MessageCircle, PhoneForwarded, Save, Award, Building2, Pencil, Trash2, 
  Home, Clock, CheckCircle2, RefreshCw, FileUp, UserSearch, Filter, 
  LayoutGrid, List, MessageSquare, ExternalLink, Trophy, Briefcase, 
  Percent, Calculator, PlusCircle, MinusCircle, Table2, ListOrdered,
  ArrowRight, Info, TrendingUp, CalendarPlus, LayoutPanelTop, Printer, FileText,
  FileSpreadsheet,
  Layers, HardHat, LayoutList, ArrowDownWideNarrow,
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
  onDeleteClients: (ids: string[]) => void;
  onEditClient: (client: Client) => void;
  onAddActivity: (activity: Activity) => void;
  onAddActivities: (activities: Activity[]) => void;
  onUpdateActivitiesByClient?: (clientName: string, newBrokerId: string, newBrokerName: string) => void;
  onAddReminder: (reminder: Reminder) => void;
  onAddSale: (sale: Commission) => void;
  onUpdateProperty: (property: Property) => void;
  onAddForecasts: (forecasts: CommissionForecast[]) => void;
  currentUser: Broker;
  brokers: Broker[]; 
  onOpenAddModal?: () => void;
  onOpenImport?: () => void;
  onOpenFlow?: (clientId: string, tab?: 'spreadsheet' | 'entry') => void;
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
  onUpdateClient, onDeleteClient, onDeleteClients, onEditClient, onAddActivity, onAddActivities, onUpdateActivitiesByClient, onAddReminder, onAddSale, 
  onUpdateProperty, onAddForecasts, currentUser, brokers, onOpenAddModal, onOpenImport, onOpenFlow
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showGanhosModal, setShowGanhosModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'carteira' | 'planilhas' | 'fluxos' | 'transferencia'>('carteira');
  
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
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [showBulkTransferModal, setShowBulkTransferModal] = useState(false);

  // Estado para Bloqueio
  const [blockReason, setBlockReason] = useState('');
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');
  const [selectedImportFilter, setSelectedImportFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    type: 'danger' | 'warning' | 'success';
  }>({
    show: false,
    title: '',
    message: '',
    type: 'warning'
  });

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
    setSelectedClientIds([client.id]);
    setTargetBrokerId('');
    setShowTransferModal(true);
  };

  const handleOpenBulkTransfer = () => {
    if (!isAdmin || selectedClientIds.length === 0) return;
    setTargetBrokerId('');
    setShowTransferModal(true);
  };

  const handleBulkDelete = () => {
    if (!isAdmin || selectedClientIds.length === 0) return;
    
    setConfirmModal({
      show: true,
      title: '⚠ ALERTA CRÍTICO',
      message: `Deseja EXCLUIR permanentemente ${selectedClientIds.length} lead(s) selecionado(s)? Esta ação gerará logs de auditoria para cada exclusão e é irreversível.`,
      confirmText: 'Excluir Selecionados',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        const now = new Date().toISOString();
        const dateStr = now.split('T')[0];
        const timeStr = new Date().toLocaleTimeString('pt-BR');
        const newActivities: Activity[] = [];

        selectedClientIds.forEach(clientId => {
          const client = clients.find(c => c.id === clientId);
          if (!client) return;

          newActivities.push({
            id: Math.random().toString(36).substr(2, 9),
            brokerId: currentUser.id,
            brokerName: currentUser.name,
            type: 'Meeting',
            clientName: client.name,
            description: `[AUDITORIA] EXCLUSÃO EM MASSA: User: ${currentUser.name} (Role: ${currentUser.role}) removeu o lead ${client.name} via ferramenta de exclusão múltipla.`,
            date: dateStr,
            time: timeStr,
            updatedAt: now
          });
        });

        onAddActivities(newActivities);
        onDeleteClients(selectedClientIds);

        setConfirmModal({
          show: true,
          title: 'Sucesso',
          message: `${selectedClientIds.length} lead(s) removido(s) com sucesso.`,
          type: 'success'
        });
        setSelectedClientIds([]);
      }
    });
  };

  const toggleSelectClient = (clientId: string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId) 
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClientIds.length === sortedClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(sortedClients.map(c => c.id));
    }
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

    setConfirmModal({
      show: true,
      title: 'Sucesso',
      message: "Próxima ação agendada e lembrete Master criado!",
      type: 'success'
    });
  };

  const handleConfirmTransfer = () => {
    if (selectedClientIds.length === 0 || !targetBrokerId) return;
    
    const newBroker = brokers.find(b => b.id === targetBrokerId);
    if (!newBroker) return;

    const now = new Date().toISOString();
    const dateStr = now.split('T')[0];
    const timeStr = new Date().toLocaleTimeString('pt-BR');

    selectedClientIds.forEach(clientId => {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const oldBrokerName = client.assignedAgent || 'Gestão';

      // 1. Atualizar o Cliente
      const updatedClient: Client = {
        ...client,
        brokerId: newBroker.id,
        assignedAgent: newBroker.name,
        updatedAt: now
      };
      onUpdateClient(updatedClient);
      
      // 1.1 Transferir Histórico de Atividades
      if (onUpdateActivitiesByClient) {
        onUpdateActivitiesByClient(client.name, newBroker.id, newBroker.name);
      }
      onAddActivity({
        id: Math.random().toString(36).substr(2, 9),
        brokerId: currentUser.id,
        brokerName: currentUser.name,
        type: 'Meeting',
        clientName: client.name,
        description: `[GESTÃO] TRANSFERÊNCIA DE CARTEIRA: Lead remanejado de ${oldBrokerName.toUpperCase()} para ${newBroker.name.toUpperCase()} por ${currentUser.name}.`,
        date: dateStr,
        time: timeStr,
        updatedAt: now
      });

      // 3. Notificar o Corretor Destino via Reminder
      onAddReminder({
        id: Math.random().toString(36).substr(2, 9),
        brokerId: newBroker.id,
        title: `NOVO LEAD RECEBIDO: ${client.name} transferido pela Administração.`,
        dueDate: dateStr,
        priority: 'High',
        completed: false,
        type: 'new_lead',
        updatedAt: now
      });
    });

    setConfirmModal({
      show: true,
      title: 'Sucesso',
      message: `Transferência de ${selectedClientIds.length} lead(s) concluída. ${newBroker.name} foi notificado.`,
      type: 'success'
    });
    setShowTransferModal(false);
    setSelectedClient(null);
    setSelectedClientIds([]);
    setTargetBrokerId('');
  };

  const handleConfirmBlock = () => {
    if (!selectedClient || !isAdmin) return;
    
    const isBlocking = !selectedClient.blocked;
    const now = new Date().toISOString();

    if (isBlocking && !blockReason.trim()) {
      setConfirmModal({
        show: true,
        title: 'Atenção',
        message: "Por favor, informe o motivo do bloqueio para auditoria.",
        type: 'warning'
      });
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

    setConfirmModal({
      show: true,
      title: 'Sucesso',
      message: isBlocking ? "Lead bloqueado com sucesso." : "Lead desbloqueado com sucesso.",
      type: 'success'
    });
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
      setConfirmModal({
        show: true,
        title: 'Acesso Negado',
        message: 'Administrador requerido para esta ação.',
        type: 'warning'
      });
      return;
    }

    setConfirmModal({
      show: true,
      title: '⚠ ALERTA CRÍTICO',
      message: `Deseja EXCLUIR permanentemente o lead ${client.name}? Esta ação gerará um log de auditoria irreversível.`,
      confirmText: 'Excluir Permanentemente',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
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
        setConfirmModal({
          show: true,
          title: 'Sucesso',
          message: 'Lead removido com sucesso.',
          type: 'success'
        });
      }
    });
  };

  const handleDeleteImport = (importId: string, importName: string) => {
    if (!isAdmin) return;
    
    const leadsToDelete = clients.filter(c => c.importId === importId && !c.deleted);
    if (leadsToDelete.length === 0) return;

    setConfirmModal({
      show: true,
      title: '⚠ ALERTA CRÍTICO',
      message: `Deseja EXCLUIR permanentemente todos os ${leadsToDelete.length} leads da planilha "${importName}"? Esta ação é irreversível e gerará logs de auditoria.`,
      confirmText: 'Excluir Tudo',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        const now = new Date().toISOString();
        const dateStr = now.split('T')[0];
        const timeStr = new Date().toLocaleTimeString('pt-BR');
        
        const newActivities: Activity[] = leadsToDelete.map(client => ({
          id: Math.random().toString(36).substr(2, 9),
          brokerId: currentUser.id,
          brokerName: currentUser.name,
          type: 'Meeting',
          clientName: client.name,
          description: `[AUDITORIA] EXCLUSÃO POR PLANILHA: Lead removido na exclusão da planilha "${importName}" por ${currentUser.name}.`,
          date: dateStr,
          time: timeStr,
          updatedAt: now
        }));

        onAddActivities(newActivities);
        onDeleteClients(leadsToDelete.map(c => c.id));
        setConfirmModal({
          show: true,
          title: 'Sucesso',
          message: `Planilha "${importName}" removida com sucesso. ${leadsToDelete.length} leads excluídos.`,
          type: 'success'
        });
      }
    });
  };

  const handleRegisterClosing = (client: Client) => {
    if (saleValue <= 0) {
      setConfirmModal({
        show: true,
        title: 'Atenção',
        message: "Por favor, insira o valor da venda realizada para registrar o fechamento.",
        type: 'warning'
      });
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Confirmar Fechamento',
      message: `Confirmar fechamento para ${client.name} no valor de R$ ${displaySaleValue}? O lead será movido para o status GANHO.`,
      confirmText: 'Confirmar Venda',
      cancelText: 'Cancelar',
      type: 'success',
      onConfirm: () => {
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
        setConfirmModal({
          show: true,
          title: 'Parabéns!',
          message: "Venda registrada com sucesso! Parabéns pelo fechamento.",
          type: 'success'
        });
      }
    });
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
        setConfirmModal({
          show: true,
          title: 'Erro',
          message: "Erro ao ler planilha de fluxo. Verifique o formato.",
          type: 'danger'
        });
      } finally { 
        setParsingFlux(false); 
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleVincularConstrutora = () => {
    if (!selectedClient) return;
    if (!selectedCompanyId) {
      setConfirmModal({
        show: true,
        title: 'Atenção',
        message: "Selecione uma Construtora antes de vincular.",
        type: 'warning'
      });
      return;
    }
    if (importedFlux.length === 0) {
      setConfirmModal({
        show: true,
        title: 'Atenção',
        message: "Faça o upload da planilha de fluxo para processar os ganhos.",
        type: 'warning'
      });
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

      setConfirmModal({
        show: true,
        title: 'Sucesso',
        message: `${newForecasts.length} previsões de comissão geradas com sucesso!`,
        type: 'success'
      });
      setShowGanhosModal(false);
    } else {
      setConfirmModal({
        show: true,
        title: 'Aviso',
        message: "Nenhuma linha atingiu o gatilho de liberação.",
        type: 'warning'
      });
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

  const filteredClients = useMemo(() => {
    let filtered = clients;
    if (isAdmin && selectedBrokerFilter !== 'all') {
      const selectedBroker = brokers.find(b => b.id === selectedBrokerFilter);
      const brokerName = selectedBroker?.name.toLowerCase().trim();
      
      filtered = filtered.filter(c => 
        c.brokerId === selectedBrokerFilter || 
        (brokerName && c.assignedAgent && c.assignedAgent.toLowerCase().trim() === brokerName)
      );
    }
    if (selectedImportFilter) {
      filtered = filtered.filter(c => c.importId === selectedImportFilter);
    }
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(lowSearch) || 
        c.phone.includes(searchTerm) ||
        c.email.toLowerCase().includes(lowSearch)
      );
    }
    return filtered;
  }, [clients, isAdmin, selectedBrokerFilter, selectedImportFilter, searchTerm, brokers]);

  const sortedClients = useMemo(() => [...filteredClients].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [filteredClients]);

  const spreadsheetGroups = useMemo(() => {
    const groups: Record<string, { id: string, name: string, count: number, date: string }> = {};
    clients.filter(c => !c.deleted && c.importId).forEach(c => {
      if (!groups[c.importId!]) {
        groups[c.importId!] = {
          id: c.importId!,
          name: c.importName || 'Importação Sem Nome',
          count: 0,
          date: c.updatedAt
        };
      }
      groups[c.importId!].count++;
    });
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [clients]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Central de Clientes Vettus</h1>
          <p className="text-slate-500 font-medium">Gestão de leads, histórico de atendimento e controle de planilhas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {selectedImportFilter && (
            <div className="flex items-center bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 shadow-sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 mr-2" />
              <span className="text-[10px] font-black text-emerald-700 uppercase truncate max-w-[150px]">
                {clients.find(c => c.importId === selectedImportFilter)?.importName || 'Planilha'}
              </span>
              <button 
                onClick={() => setSelectedImportFilter(null)}
                className="ml-2 p-0.5 hover:bg-emerald-200 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-emerald-600" />
              </button>
            </div>
          )}
          {isAdmin && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <Filter className="w-4 h-4 text-slate-400 mr-2" />
              <select 
                value={selectedBrokerFilter} 
                onChange={e => setSelectedBrokerFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer pr-4"
              >
                <option value="all">Todos os Corretores</option>
                {brokers.filter(b => !b.deleted).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="relative">
            <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar lead..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-slate-600 outline-none focus:border-[#d4a853] transition-all w-48"
            />
          </div>
          <button onClick={onOpenImport} className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors">
            <FileUp className="w-4 h-4 text-emerald-600" />
            <span>Importar</span>
          </button>
          {isAdmin && selectedClientIds.length > 0 && activeTab === 'carteira' && (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBulkDelete} 
                className="bg-red-50 border border-red-200 text-red-600 px-6 py-2.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-sm hover:bg-red-600 hover:text-white transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Selecionados ({selectedClientIds.length})</span>
              </button>
              <button 
                onClick={handleOpenBulkTransfer} 
                className="bg-amber-50 border border-amber-200 text-amber-600 px-6 py-2.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-sm hover:bg-amber-600 hover:text-white transition-all"
              >
                <Repeat className="w-4 h-4" />
                <span>Transferir Selecionados ({selectedClientIds.length})</span>
              </button>
            </div>
          )}
          <button onClick={onOpenAddModal} className="gold-gradient text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-lg hover:scale-[1.02] transition-transform">
            <UserPlus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('carteira')}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'carteira' 
            ? 'bg-[#0f172a] text-[#d4a853] shadow-lg scale-105' 
            : 'text-slate-500 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Carteira de Clientes</span>
        </button>
        <button
          onClick={() => setActiveTab('planilhas')}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'planilhas' 
            ? 'bg-[#0f172a] text-[#d4a853] shadow-lg scale-105' 
            : 'text-slate-500 hover:bg-white hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Gestão de Planilhas</span>
        </button>
        <button
          onClick={() => setActiveTab('fluxos')}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'fluxos' 
            ? 'bg-[#0f172a] text-[#d4a853] shadow-lg scale-105' 
            : 'text-slate-500 hover:bg-white hover:text-slate-900'
          }`}
        >
          <HardHat className="w-3.5 h-3.5" />
          <span>Fluxos de Obra</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('transferencia')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'transferencia' 
              ? 'bg-[#0f172a] text-[#d4a853] shadow-lg scale-105' 
              : 'text-slate-500 hover:bg-white hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transferência</span>
          </button>
        )}
      </div>

      {activeTab === 'carteira' ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0f172a] text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                  {isAdmin && (
                    <th className="px-8 py-6 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedClientIds.length === sortedClients.length && sortedClients.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-[#d4a853] focus:ring-[#d4a853]"
                      />
                    </th>
                  )}
                  <th className="px-8 py-6">Perfil do Lead</th>
                  <th className="px-8 py-6">Responsável</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6">Próxima Ação</th>
                  <th className="px-8 py-6 text-right">Ação Necessária</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedClients.map((client) => (
                  <tr key={client.id} className={`hover:bg-[#d4a853]/5 transition-colors group ${client.blocked ? 'grayscale bg-slate-50 opacity-70' : ''} ${selectedClientIds.includes(client.id) ? 'bg-[#d4a853]/10' : ''}`}>
                    {isAdmin && (
                      <td className="px-8 py-7">
                        <input 
                          type="checkbox" 
                          checked={selectedClientIds.includes(client.id)}
                          onChange={() => toggleSelectClient(client.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#d4a853] focus:ring-[#d4a853]"
                        />
                      </td>
                    )}
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
                          {client.spouseName && (
                            <p className="text-[9px] text-[#d4a853] font-black uppercase tracking-tighter mt-0.5">
                              Esposa: {client.spouseName} {client.spousePhone && `(${client.spousePhone})`}
                            </p>
                          )}
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
                          onClick={() => onOpenFlow?.(client.id, 'entry')}
                          className="p-2.5 bg-slate-50 text-slate-400 hover:bg-[#0a1120] hover:text-[#d4a853] rounded-xl border border-slate-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Montar Fluxo de Obra"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        <button 
                          disabled={client.blocked}
                          onClick={() => onOpenFlow?.(client.id, 'spreadsheet')}
                          className="p-2.5 bg-slate-50 text-slate-400 hover:bg-[#0a1120] hover:text-[#d4a853] rounded-xl border border-slate-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Ver Fluxo de Obra"
                        >
                          <LayoutList className="w-4 h-4" />
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
      ) : (
        <div className="space-y-6">
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
                      setSelectedImportFilter(group.id);
                      setActiveTab('carteira');
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
                 <button onClick={onOpenImport} className="mt-4 text-[#d4a853] text-[10px] font-black uppercase underline tracking-widest">Fazer primeira importação</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'fluxos' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                <HardHat className="w-5 h-5 mr-2 text-[#d4a853]" />
                Fluxos de Obra dos Clientes
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gerencie a montagem e acompanhamento dos fluxos de pagamento.</p>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              {clients.filter(c => !c.deleted && (c.status === ClientStatus.WON || (c.budget && c.budget > 0))).length} Clientes Aptos
            </span>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {clients.filter(c => !c.deleted && (c.status === ClientStatus.WON || (c.budget && c.budget > 0))).map(client => (
              <div key={client.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4a853]/5 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150"></div>
                
                <div className="flex items-center space-x-5 mb-8 relative">
                  <div className="w-16 h-16 bg-[#0f172a] rounded-[1.5rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                    <HardHat className="w-8 h-8 text-[#d4a853]" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight truncate max-w-[180px]">{client.name}</h4>
                    <p className="text-[10px] text-[#d4a853] font-black uppercase tracking-[0.2em] mt-1">{client.assignedAgent || 'Sem Corretor'}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8 relative">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orçamento/Venda</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrencyBRL(client.budget || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg shadow-sm ${client.status === ClientStatus.WON ? 'bg-emerald-500 text-white' : 'bg-[#0f172a] text-[#d4a853]'}`}>
                      {client.status}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 relative">
                  <button 
                    onClick={() => onOpenFlow?.(client.id, 'entry')}
                    className="flex-1 bg-[#0f172a] text-[#d4a853] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Montar Fluxo
                  </button>
                  <button 
                    onClick={() => onOpenFlow?.(client.id, 'spreadsheet')}
                    className="p-4 bg-white text-slate-400 hover:text-[#d4a853] hover:bg-[#0f172a] rounded-2xl border border-slate-200 transition-all shadow-md group/btn"
                    title="Ver Fluxo"
                  >
                    <LayoutList className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
                  </button>
                </div>
              </div>
            ))}
            
            {clients.filter(c => !c.deleted && (c.status === ClientStatus.WON || (c.budget && c.budget > 0))).length === 0 && (
              <div className="col-span-full py-40 text-center border-2 border-dashed border-slate-200 rounded-[3.5rem] bg-slate-50/50">
                <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl mx-auto mb-6 border border-slate-100">
                  <HardHat className="w-12 h-12 text-slate-200" />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Nenhum cliente apto para fluxo de obra encontrado</p>
                <p className="text-slate-300 text-[10px] font-bold uppercase mt-2">Clientes com status 'WON' ou orçamento definido aparecerão aqui.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transferencia' && isAdmin && (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
           <div className="bg-[#0f172a] rounded-[2.5rem] p-8 shadow-2xl border border-[#d4a853]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-1/2 -translate-y-1/2">
                 <ArrowRightLeft className="w-64 h-64 text-[#d4a853]" />
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                 <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 gold-gradient rounded-[2rem] flex items-center justify-center shadow-2xl scale-110">
                       <Repeat className="w-10 h-10 text-[#0a1120]" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black text-white uppercase tracking-tight">Transferência em Massa</h2>
                       <p className="text-[#d4a853] text-[10px] font-black uppercase tracking-[0.3em] mt-1">Re-alocação Estratégica de Leads</p>
                    </div>
                 </div>

                 <div className="flex items-center space-x-6 bg-white/5 p-4 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status da Seleção</p>
                       <p className="text-xl font-black text-white leading-none mt-1">{selectedClientIds.length} <span className="text-[10px] text-[#d4a853]">LEADS</span></p>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="flex flex-col space-y-2">
                       <select 
                          value={targetBrokerId} 
                          onChange={e => setTargetBrokerId(e.target.value)}
                          className="bg-[#0a1120] border border-[#d4a853]/30 rounded-xl px-4 py-2 text-[10px] font-black text-white uppercase outline-none focus:border-[#d4a853] min-w-[200px]"
                       >
                          <option value="">Destino do Patrimônio...</option>
                          {brokers.filter(b => !b.deleted && !b.blocked).map(b => (
                             <option key={b.id} value={b.id}>{b.name} ({b.role})</option>
                          ))}
                       </select>
                       <button 
                          disabled={selectedClientIds.length === 0 || !targetBrokerId}
                          onClick={handleConfirmTransfer}
                          className="gold-gradient text-[#0a1120] px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 disabled:grayscale transition-all hover:scale-[1.02] shadow-xl"
                       >
                          Executar Transferência
                       </button>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                          <th className="px-8 py-6 w-10">
                             <input 
                               type="checkbox" 
                               checked={selectedClientIds.length === sortedClients.length && sortedClients.length > 0}
                               onChange={toggleSelectAll}
                               className="w-4 h-4 rounded border-slate-300 text-[#d4a853] focus:ring-[#d4a853]"
                             />
                          </th>
                          <th className="px-8 py-6">Lead</th>
                          <th className="px-8 py-6">Responsável Atual</th>
                          <th className="px-8 py-6">Status Comercial</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {sortedClients.map(client => (
                          <tr key={client.id} className={`hover:bg-slate-50 transition-colors ${selectedClientIds.includes(client.id) ? 'bg-[#d4a853]/5' : ''}`}>
                             <td className="px-8 py-6">
                                <input 
                                  type="checkbox" 
                                  checked={selectedClientIds.includes(client.id)}
                                  onChange={() => toggleSelectClient(client.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-[#d4a853] focus:ring-[#d4a853]"
                                />
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex items-center space-x-4">
                                   <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs">{client.name[0]}</div>
                                   <div>
                                      <p className="font-black text-slate-900 text-xs uppercase">{client.name}</p>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{client.phone}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase">
                                   {client.assignedAgent || 'Não Atribuído'}
                                </span>
                             </td>
                             <td className="px-8 py-6">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${client.status === ClientStatus.WON ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                   {client.status}
                                </span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

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
      {showTransferModal && (selectedClient || selectedClientIds.length > 0) && (
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
                          <h2 className="text-2xl font-black uppercase tracking-tight">{selectedClientIds.length > 1 ? 'Transferência em Massa' : 'Transferência'}</h2>
                          <p className="text-[#0a1120]/70 text-[10px] font-black uppercase tracking-[0.3em]">Remanejamento de Patrimônio</p>
                       </div>
                    </div>
                    <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-8 h-8" /></button>
                 </div>
              </div>

              <div className="p-10 bg-slate-50 space-y-8">
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{selectedClientIds.length > 1 ? 'Leads em Remanejamento' : 'Lead em Remanejamento'}</p>
                    <h4 className="text-lg font-black text-slate-900 uppercase">
                        {selectedClientIds.length > 1 
                          ? `${selectedClientIds.length} Leads Selecionados`
                          : selectedClient?.name || (selectedClientIds.length === 1 ? clients.find(c => c.id === selectedClientIds[0])?.name : 'Lead Selecionado')}
                    </h4>
                    <div className="flex items-center space-x-2 mt-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase">Custódia Atual:</span>
                       <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded">{selectedClient?.assignedAgent || (selectedClientIds.length === 1 ? clients.find(c => c.id === selectedClientIds[0])?.assignedAgent : '') || 'Não Atribuído'}</span>
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
                       {brokers.filter(b => b.id !== selectedClient.brokerId && !b.deleted && !b.blocked).map(b => (
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
    </div>
  );
};