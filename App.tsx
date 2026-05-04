import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';

// Kernels Vettus v6.0 - Protocolo de Conectividade Ultra-Resiliente
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { PropertyView } from './components/Properties.tsx';
import { ClientView } from './components/Clients.tsx';
import { SalesView } from './components/Sales.tsx';
import { Auth } from './components/Auth.tsx';
import { NewPropertyModal } from './components/NewPropertyModal.tsx';
import { NewClientModal } from './components/NewClientModal.tsx';
import { TasksView } from './components/TasksView.tsx';
import { MarketingView } from './components/Marketing.tsx';
import { ActivityView } from './components/Activities.tsx';
import { ReminderView } from './components/Reminders.tsx';
import { BrokersView } from './components/Brokers.tsx';
import { LeadImport } from './components/LeadImport.tsx';
import { Backup } from './components/Backup.tsx';
import { DocumentsView } from './components/DocumentsView.tsx';
import { ConstructionCompaniesView } from './components/ConstructionCompanies.tsx';
import { CashFlowView } from './components/CashFlow.tsx';
import { LaunchesView } from './components/Launches.tsx';
import { LeasingView } from './components/Leasing.tsx';
import { AdsView } from './components/Ads.tsx';
import { SpreadsheetsView } from './components/Spreadsheets.tsx';
import { ClientPaymentFlowView } from './components/ClientPaymentFlow.tsx';
import { PasswordUpdateView } from './components/PasswordUpdateView.tsx';
import { MonthlyFinancialView } from './components/MonthlyFinancialView.tsx';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

import { 
  Broker, Property, Client, Task, Activity, Reminder, AppView, 
  VettusDocument, Commission, ConstructionCompany, 
  CommissionForecast, LaunchProject, Campaign, RentalContract, Expense 
} from './types.ts';
import { MOCK_BROKERS } from './constants.tsx';

const STORAGE_KEY_PREFIX = 'vettus_v3_core_';

const loadLocal = <T,>(key: string, def: T): T => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return val ? JSON.parse(val) : def;
  } catch { return def; }
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Broker | null>(() => loadLocal('session_user', null));
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'disconnected'>('disconnected');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const loginTimeRef = useRef<number>(Date.now());

  // Estados Gerenciados (Rede Vettus)
  const [brokers, setBrokers] = useState<Broker[]>(() => loadLocal('brokers', MOCK_BROKERS));
  const [onlinePeers, setOnlinePeers] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>(() => loadLocal('properties', []));
  const [clients, setClients] = useState<Client[]>(() => loadLocal('clients', []));
  const [activities, setActivities] = useState<Activity[]>(() => loadLocal('activities', []));
  const [reminders, setReminders] = useState<Reminder[]>(() => loadLocal('reminders', []));
  const [commissions, setCommissions] = useState<Commission[]>(() => loadLocal('commissions', []));
  const [commissionForecasts, setCommissionForecasts] = useState<CommissionForecast[]>(() => loadLocal('commissionForecasts', []));
  const [documents, setDocuments] = useState<VettusDocument[]>(() => loadLocal('documents', []));
  const [constructionCompanies, setConstructionCompanies] = useState<ConstructionCompany[]>(() => loadLocal('constructionCompanies', []));
  const [launches, setLaunches] = useState<LaunchProject[]>(() => loadLocal('launches', []));
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => loadLocal('campaigns', []));
  const [rentals, setRentals] = useState<RentalContract[]>(() => loadLocal('rentals', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadLocal('expenses', []));

  const [preselectedClientForFlow, setPreselectedClientForFlow] = useState<string | null>(null);
  const [preselectedFlowTab, setPreselectedFlowTab] = useState<'spreadsheet' | 'entry'>('entry');

  // Modais
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const activeConnections = useRef<Map<string, DataConnection>>(new Map());
  const peerIdentities = useRef<Map<string, { id: string, name: string, role: string }>>(new Map());
  const pendingChunks = useRef<Map<string, { total: number, chunks: string[] }>>(new Map());
  const peerRef = useRef<Peer | null>(null);
  const isInitializingRef = useRef(false);
  const lastInitRef = useRef(0);
  const isConnectingToMasterRef = useRef(false);
  const masterIdRef = useRef<string | null>(null);
  const initTimeoutRef = useRef<any>(null);
  const statusDebounceRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const conflictDetectedRef = useRef(false);
  const stateRef = useRef({ 
    brokers, properties, clients, activities, reminders, 
    commissions, commissionForecasts, documents, 
    constructionCompanies, launches, campaigns, rentals, expenses 
  });

  // Global Error Boundary (Silencioso)
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      // Silenciar erros conhecidos do PeerJS e sinalização WebRTC
      const msg = e.message || '';
      if (
        msg.includes('PeerJS') || 
        msg.includes('Aborting') || 
        msg.includes('unavailable-id') || 
        msg.includes('ID') && msg.includes('taken') ||
        msg.includes('already exists')
      ) {
        // Silenciamos o log ruidoso no console pois o sistema trata isso via conflictDetectedRef
        e.preventDefault();
        return;
      }
      
      console.error('Uncaught Exception Interceptada:', msg, e.error);
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      // Silenciar rejeições do PeerJS
      const msg = e.reason?.message || e.reason?.type || '';
      if (
        msg.includes('PeerJS') || 
        msg.includes('Aborting') || 
        msg.includes('unavailable-id') ||
        msg.includes('taken')
      ) {
        e.preventDefault();
        return;
      }

      console.error('Unhandled Promise Rejection Interceptada:', e.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Sincronização e Auditoria de Sessão
  useEffect(() => {
    stateRef.current = { 
      brokers, properties, clients, activities, reminders, 
      commissions, commissionForecasts, documents, 
      constructionCompanies, launches, campaigns, rentals, expenses 
    };
    Object.entries(stateRef.current).forEach(([k, v]) => {
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + k, JSON.stringify(v));
      } catch (e) {
        console.warn(`Kernel Storage: Falha ao salvar ${k}:`, e);
        if (k === 'activities' || (e instanceof Error && e.name === 'QuotaExceededError')) {
           const isQuotaError = e instanceof Error && (
             e.name === 'QuotaExceededError' || 
             e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
             e.message?.includes('quota')
           );
           
           if (isQuotaError && k === 'activities') {
              console.warn('Kernel Storage: Limpando logs antigos para liberar espaço...');
              setActivities(prev => prev.slice(0, 50)); 
           }
        }
      }
    });
    setLastSavedTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  }, [brokers, properties, clients, activities, reminders, commissions, commissionForecasts, documents, constructionCompanies, launches, campaigns, rentals, expenses]);

  const isSergioEmail = (email?: string) => {
    if (!email) return false;
    const e = email.toLowerCase().trim();
    return e === 'scarrasco462@gmail.com' || e === 'sergioconsultorimobiliario01@gmail.com';
  };

  // Auditoria de Sessão (Separada para evitar loops com activities)
  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'session_user', JSON.stringify(currentUser));
      } catch (e) {}

      if (!isSergioEmail(currentUser.email)) {
         // Se temos brokers carregados (mais do que apenas o Sergio inicial), validamos a existência
         // Damos uma carência maior (60s) para que o P2P sincronize a base antes de validar a sessão
         const sessionAge = Date.now() - loginTimeRef.current;
         if (brokers.length > 2 && sessionAge > 60000) { 
           const stillExists = brokers.find(b => (b.id === currentUser.id || b.email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()) && !b.deleted);
           if (!stillExists) {
              console.warn(`Sessão Inválida: Usuário ${currentUser.email} não encontrado na base sincronizada (Size: ${brokers.length}).`);
              handleLogout();
           } else if (stillExists.blocked || stillExists.deleted) {
              console.warn(`Sessão Inválida: Usuário ${currentUser.email} está bloqueado ou removido.`);
              handleLogout();
           }
         }
      }
    }
  }, [brokers, currentUser]);

  const handleLogin = (user: Broker) => {
    loginTimeRef.current = Date.now();
    setCurrentUser(user);
    // logSystemAction é chamado via useCallback, precisamos definir logSystemAction ANTES ou usar uma referência
  };

  const logSystemAction = useCallback((description: string, targetName?: string, type: string = 'System') => {
    if (!currentUser) return;
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: type as any,
      clientName: targetName || 'SISTEMA',
      description: `[LOG] ${description}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR'),
      updatedAt: new Date().toISOString()
    };
    setActivities(prev => [newActivity, ...prev]);
  }, [currentUser]);

  const handleLogout = () => {
    logSystemAction('Logout efetuado do sistema');
    if (peerRef.current) peerRef.current.destroy();
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'session_user');
    setCurrentUser(null);
  };

  const isInternalUpdateRef = useRef(0);
  const isSyncingRemoteRef = useRef(false);
  const lastRemoteMergeRef = useRef(0); 
  const mergeQueue = useRef<any[]>([]);
  const isProcessingQueue = useRef(false);
  const peerLastSeen = useRef<Map<string, number>>(new Map());
  const chunkTimeoutRef = useRef<Map<string, number>>(new Map());
  const myAppId = useRef(Math.random().toString(36).substr(2, 9));
  const seenMessages = useRef<Set<string>>(new Set());

  const processMergeQueue = async () => {
    if (isProcessingQueue.current || mergeQueue.current.length === 0) return;
    
    isProcessingQueue.current = true;
    while (mergeQueue.current.length > 0) {
      const nextItem = mergeQueue.current.shift();
      if (nextItem) {
        const { payload, messageId, senderPeerId } = nextItem;
        await executeMerge(payload, messageId, senderPeerId);
      }
      await new Promise(r => setTimeout(r, 20));
    }
    isProcessingQueue.current = false;
  };

  const mergeData = (payload: any, messageId?: string, senderPeerId?: string) => {
    mergeQueue.current.push({ payload, messageId, senderPeerId });
    processMergeQueue();
  };

  const executeMerge = async (payload: any, messageId?: string, senderPeerId?: string) => {
    if (!payload || isSyncingRemoteRef.current) return;
    
    // Filtro de eco redundante por ID de mensagem e APP ID
    if (messageId) {
      if (seenMessages.current.has(messageId)) return;
      seenMessages.current.add(messageId);
      if (seenMessages.current.size > 2000) {
        const arr = Array.from(seenMessages.current);
        seenMessages.current = new Set(arr.slice(1000));
      }
    }

    isSyncingRemoteRef.current = true;
    let dataChanged = false;

    try {
      // Pequeno delay para garantir que o buffer de rede local foi limpo
      await new Promise(r => setTimeout(r, 50));
      const updateCollection = (prev: any[], next: any[]) => {
        if (!next) return prev;
        const map = new Map(prev.map(item => [item.id, item]));
        let collectionChanged = false;
        
        next.forEach(item => {
          const existing = map.get(item.id);
          const itemDate = new Date(item.updatedAt || item.date || 0).getTime();
          const existingDate = existing ? new Date(existing.updatedAt || existing.date || 0).getTime() : -1;

          const isNewer = itemDate > existingDate;
          const isDifferentEqualDate = itemDate === existingDate && JSON.stringify(item) !== JSON.stringify(existing);

          if (!existing || isNewer || isDifferentEqualDate) {
             map.set(item.id, item);
             collectionChanged = true;
             dataChanged = true;
          }
        });
        
        if (collectionChanged) {
          isInternalUpdateRef.current += 1;
        }
        return collectionChanged ? Array.from(map.values()) : prev;
      };

      if (payload.brokers) setBrokers(p => updateCollection(p, payload.brokers));
      if (payload.clients) setClients(p => updateCollection(p, payload.clients));
      if (payload.properties) setProperties(p => updateCollection(p, payload.properties));
      if (payload.launches) setLaunches(p => updateCollection(p, payload.launches));
      if (payload.activities) setActivities(p => updateCollection(p, payload.activities));
      if (payload.reminders) setReminders(p => updateCollection(p, payload.reminders));
      if (payload.commissions) setCommissions(p => updateCollection(p, payload.commissions));
      if (payload.commissionForecasts) setCommissionForecasts(p => updateCollection(p, payload.commissionForecasts));
      if (payload.documents) setDocuments(p => updateCollection(p, payload.documents));
      if (payload.constructionCompanies) setConstructionCompanies(p => updateCollection(p, payload.constructionCompanies));
      if (payload.campaigns) setCampaigns(p => updateCollection(p, payload.campaigns));
      if (payload.rentals) setRentals(p => updateCollection(p, payload.rentals));
      if (payload.expenses) setExpenses(p => updateCollection(p, payload.expenses));

      if (dataChanged && messageId && activeConnections.current.size > 0) {
        activeConnections.current.forEach(async (conn) => {
          if (conn.open && conn.peer !== senderPeerId) {
            try {
              const identity = peerIdentities.current.get(conn.peer);
              const filteredPayload = (currentUser?.role === 'Admin' && identity) 
                ? filterPayloadForPeer(payload, identity, stateRef.current)
                : payload;

              await safeSend(conn, { 
                type: 'DATA_UPDATE', 
                payload: filteredPayload, 
                messageId,
                senderId: peerRef.current?.id, 
                senderAppId: myAppId.current 
              });
            } catch (e) {}
          }
        });
      }

      if (dataChanged && currentUser?.role === 'Admin') {
        try {
          localStorage.setItem(STORAGE_KEY_PREFIX + 'last_sync_backup', JSON.stringify(stateRef.current));
        } catch (e) {
          console.warn('Falha ao salvar backup local:', e);
        }
      }
      if (dataChanged) {
        lastRemoteMergeRef.current = Date.now();
      }
    } finally {
      isSyncingRemoteRef.current = false;
    }
  };

  // Comunicação instantânea entre abas (mesmo dispositivo)
  useEffect(() => {
    const channel = new BroadcastChannel('vettus_internal_sync');
    channel.onmessage = (event) => {
      if (event.data.type === 'DATA_UPDATE' && event.data.senderAppId !== myAppId.current) {
        mergeData(event.data.payload);
      }
    };
    return () => channel.close();
  }, [mergeData]);

  const filterPayloadForPeer = (payload: any, identity: { id: string, name: string, role: string }, fullState: any) => {
    if (!payload || identity.role === 'Admin') return payload;

    const filtered: any = { ...payload };
    const uid = identity.id;
    const nameStr = identity.name?.toLowerCase().trim() || '';

    // Referência de clientes que este peer possui acesso para filtrar outras coleções (Ex: Atividades)
    const accessibleClients = fullState.clients?.filter((c: any) => 
      c.brokerId === uid || 
      (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === nameStr) ||
      c.brokerId === 'unassigned' ||
      !c.brokerId
    ) || [];

    if (filtered.clients) {
      filtered.clients = filtered.clients.filter((c: any) => 
        c.brokerId === uid || 
        (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === nameStr) ||
        c.brokerId === 'unassigned' ||
        !c.brokerId
      );
    }

    // Corretores podem ver todas as propriedades para trabalhar em equipe (Padrão de Mercado)
    if (filtered.properties) {
      filtered.properties = filtered.properties.filter((p: any) => !p.deleted || p.brokerId === uid);
    }

    if (filtered.activities) {
      filtered.activities = filtered.activities.filter((a: any) => {
        if (a.brokerId === uid) return true;
        // Permitir que o corretor receba histórico de clientes que ele possui acesso
        return accessibleClients.some((c: any) => c.name === a.clientName);
      });
    }

    if (filtered.reminders) filtered.reminders = filtered.reminders.filter((r: any) => r.brokerId === uid);
    if (filtered.commissions) filtered.commissions = filtered.commissions.filter((c: any) => c.brokerId === uid);
    if (filtered.expenses) filtered.expenses = filtered.expenses.filter((e: any) => e.brokerId === uid);
    if (filtered.brokers) filtered.brokers = filtered.brokers.filter((b: any) => b.id === uid || b.role === 'Admin');

    return filtered;
  };

  const safeSend = async (conn: DataConnection, data: any) => {
    if (!conn || !conn.open) return;
    
    // Verificação de buffer excedido (previne perda de pacotes e memória em conexões simultâneas)
    if ((conn as any).dataChannel?.bufferedAmount > 8 * 1024 * 1024) {
      console.warn(`Kernel P2P: Buffer crítico para ${conn.peer} (${Math.round((conn as any).dataChannel.bufferedAmount/1024)}KB), pulando broadcast...`);
      return;
    }

    try {
      const stringified = JSON.stringify(data);
      const CHUNK_SIZE = 32768; // 32KB chunks para melhor vazão sem fragmentação excessiva
      
      if (stringified.length <= CHUNK_SIZE) {
        conn.send(data);
        return;
      }

      const chunkId = `chunk-${myAppId.current}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const total = Math.ceil(stringified.length / CHUNK_SIZE);
      
      console.log(`Kernel P2P: Broadcast de ${Math.round(stringified.length/1024)}KB via ${chunkId}`);
      
      for (let i = 0; i < total; i++) {
        // Delay adaptativo baseado no tamanho total do payload
        const adaptiveDelay = stringified.length > 500000 ? 50 : 25;
        await new Promise(r => setTimeout(r, adaptiveDelay)); 
        
        if (!conn.open) break;
        
        conn.send({
          type: 'DATA_CHUNK',
          chunkId,
          index: i,
          total,
          data: stringified.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        });
      }
    } catch (e) {
      console.error('Kernel P2P: Erro crítico no envio (DataChannel Congestion):', e);
    }
  };

  const handleIncomingData = async (conn: DataConnection, d: any) => {
    if (!d) return;

    if (d.type === 'DATA_CHUNK') {
      const { chunkId, index, total, data } = d;
      chunkTimeoutRef.current.set(chunkId, Date.now());

      let record = pendingChunks.current.get(chunkId);
      if (!record) {
        record = { total, chunks: new Array(total).fill(null) };
        pendingChunks.current.set(chunkId, record);
      }
      
      record.chunks[index] = data;
      
      const receivedCount = record.chunks.filter(c => c !== null).length;
      if (receivedCount === total) {
        try {
          const completeData = JSON.parse(record.chunks.join(''));
          pendingChunks.current.delete(chunkId);
          chunkTimeoutRef.current.delete(chunkId);
          await executeMerge(completeData.payload, completeData.messageId, conn.peer);
        } catch (e) {
          console.error('Kernel P2P: Erro ao reconstruir chunk:', e);
          pendingChunks.current.delete(chunkId);
          chunkTimeoutRef.current.delete(chunkId);
        }
      }
      return;
    }

    if (d.type === 'GREETING') {
      console.log(`Kernel P2P: Conexão identificada -> ${d.payload.name} (${d.payload.role})`);
      peerIdentities.current.set(conn.peer, d.payload);
      setOnlinePeers(Array.from(activeConnections.current.keys()));
      
      if (currentUser?.role === 'Admin' || isSergioEmail(currentUser?.email)) {
        const filtered = filterPayloadForPeer(stateRef.current, d.payload, stateRef.current);
        await safeSend(conn, { 
          type: 'DATA_UPDATE', 
          payload: filtered,
          messageId: `welcome-back-${myAppId.current}-${Date.now()}`,
          senderAppId: myAppId.current
        });
      }
    }

    if (d.type === 'DATA_UPDATE' && d.senderAppId !== myAppId.current) mergeData(d.payload, d.messageId, conn.peer);

    if (d.type === 'SYNC_REQUEST') {
      const identity = peerIdentities.current.get(conn.peer);
      const payload = (currentUser?.role === 'Admin' && identity)
        ? filterPayloadForPeer(stateRef.current, identity, stateRef.current)
        : stateRef.current;

      await safeSend(conn, { 
        type: 'DATA_UPDATE', 
        payload, 
        messageId: `sync-resp-${myAppId.current}-${Date.now()}`,
        senderAppId: myAppId.current 
      });
    }

    if (d.type === 'PING') {
      peerLastSeen.current.set(conn.peer, Date.now());
      await safeSend(conn, { type: 'PONG' });
    }
    if (d.type === 'PONG') {
      peerLastSeen.current.set(conn.peer, Date.now());
    }

    if (d.type === 'REMOTE_AUTH_REQUEST' && (currentUser?.role === 'Admin' || isSergioEmail(currentUser?.email))) {
      const { email, password } = d.payload;
      console.log(`Kernel Auth: Recebida solicitação de login remoto para ${email}`);
      const emailClean = email.toLowerCase().trim();
      const passwordClean = (password || '').trim();
      const broker = stateRef.current.brokers.find(b => b.email.toLowerCase().trim() === emailClean && !b.deleted);
      
      if (broker) {
        if (broker.password === passwordClean || (!broker.password && !passwordClean)) {
          if (broker.blocked) {
            await safeSend(conn, { type: 'REMOTE_AUTH_FAILURE', message: 'ACESSO SUSPENSO: Seu usuário está marcado como "Bloqueado" no sistema.' });
          } else {
            // Filtrar os dados para o corretor antes de enviar
            const filteredData = filterPayloadForPeer(stateRef.current, broker, stateRef.current);
            await safeSend(conn, { type: 'REMOTE_AUTH_SUCCESS', payload: { user: broker, fullData: filteredData } });
          }
        } else {
          await safeSend(conn, { type: 'REMOTE_AUTH_FAILURE', message: 'Senha incorreta para este e-mail.' });
        }
      } else {
        console.warn(`Kernel Auth: E-mail ${email} não encontrado na base ativa.`);
        await safeSend(conn, { type: 'REMOTE_AUTH_FAILURE', message: 'E-mail não cadastrado nesta Unidade.' });
      }
    }
  };

  // Sincronização Incremental e Otimizada (v7.0)
  const prevCollectionsRef = useRef<Record<string, any[]>>({});

  useEffect(() => {
    const collections = { 
      brokers, properties, clients, activities, reminders, 
      commissions, commissionForecasts, documents, 
      constructionCompanies, launches, campaigns, rentals, expenses 
    };

    const changedCollections: Record<string, any[]> = {};
    let hasChanges = false;

    Object.entries(collections).forEach(([key, list]) => {
      const prevList = prevCollectionsRef.current[key] || [];
      if (list !== prevList) {
        // Kernels Differencial: Envia apenas os itens que mudaram (updatedAt ou novos)
        const diff = list.filter(item => {
          const prevItem = prevList.find(p => p.id === item.id);
          if (!prevItem) return true;
          // Comparação robusta: updatedAt ou Mudança Estrutural (Deep Equal simplificado via Stringify)
          return item.updatedAt !== prevItem.updatedAt || JSON.stringify(item) !== JSON.stringify(prevItem);
        });

        if (diff.length > 0) {
          changedCollections[key] = diff;
          hasChanges = true;
        }
      }
    });

    prevCollectionsRef.current = collections;
    stateRef.current = collections;

    if (hasChanges) {
      // Bloqueio robusto de eco/boomerang
      const now = Date.now();
      const isRemoteSilenced = (now - lastRemoteMergeRef.current) < 2000;
      
      if (isInternalUpdateRef.current > 0 || isRemoteSilenced) {
        if (isInternalUpdateRef.current > 0) isInternalUpdateRef.current -= 1;
        console.log('Kernel P2P: Broadcast silenciado (Atualização Interna ou Eco recente)');
        return;
      }

      // Sincroniza abas locais instantaneamente
      const messageId = `${myAppId.current}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      try {
        const channel = new BroadcastChannel('vettus_internal_sync');
        channel.postMessage({ 
          type: 'DATA_UPDATE', 
          payload: changedCollections,
          messageId,
          senderAppId: myAppId.current
        });
        channel.close();
      } catch (e) {}

      if (activeConnections.current.size > 0) {
        const timeout = setTimeout(() => {
          activeConnections.current.forEach(async (conn) => {
            if (conn.open) {
              try {
                const identity = peerIdentities.current.get(conn.peer);
                const filteredPayload = (currentUser?.role === 'Admin' && identity)
                  ? filterPayloadForPeer(changedCollections, identity, stateRef.current)
                  : changedCollections;

                await safeSend(conn, { 
                  type: 'DATA_UPDATE', 
                  payload: filteredPayload, 
                  messageId,
                  senderId: peerRef.current?.id,
                  senderAppId: myAppId.current
                });
              } catch (e) {
                console.warn('P2P Broadcast Error:', e);
              }
            }
          });
        }, 100);
        return () => clearTimeout(timeout);
      }
    }
  }, [brokers, properties, clients, activities, reminders, commissions, commissionForecasts, documents, constructionCompanies, launches, campaigns, rentals, expenses]);

  // Resposta automática para solicitações de login de outras abas (mesmo PC)
  useEffect(() => {
    const authChannel = new BroadcastChannel('vettus_internal_sync_auth');
    authChannel.onmessage = (e) => {
      if (e.data.type === 'AUTH_REQUEST' && currentUser && (currentUser.role === 'Admin' || isSergioEmail(currentUser.email))) {
        const { email, password } = e.data;
        const broker = brokers.find(b => b.email.toLowerCase().trim() === email.toLowerCase().trim() && !b.deleted);
        if (broker && (broker.password === password || (!broker.password && !password))) {
          if (!broker.blocked) {
            authChannel.postMessage({ 
              type: 'AUTH_RESPONSE', 
              success: true, 
              user: broker, 
              fullData: stateRef.current 
            });
          }
        }
      }
    };
    return () => authChannel.close();
  }, [currentUser, brokers]);

  const handleForceSync = useCallback(() => {
    if (activeConnections.current.size === 0) return;
    
    const messageId = `force-sync-${myAppId.current}-${Date.now()}`;
    console.log(`Kernel P2P: Iniciando Sincronização Forçada para ${activeConnections.current.size} conexões...`);
    
    activeConnections.current.forEach(async (conn) => {
      if (conn.open) {
        try {
          const identity = peerIdentities.current.get(conn.peer);
          // Admins enviam dados filtrados para cada corretor, corretores enviam tudo (já filtrado)
          const payload = (currentUser?.role === 'Admin' && identity)
            ? filterPayloadForPeer(stateRef.current, identity, stateRef.current)
            : stateRef.current;

          await safeSend(conn, { 
            type: 'DATA_UPDATE', 
            payload, 
            messageId,
            senderAppId: myAppId.current,
            force: true 
          });
        } catch (e) {}
      }
    });
  }, [currentUser]);

  // PeerJS Kernel v7.0 - Ultra-Fast Discovery
  const initPeer = useCallback(() => {
    if (!currentUser || isInitializingRef.current) return;
    
    // Throttling: Evita reinicializações em menos de 1s
    const now = Date.now();
    if (now - lastInitRef.current < 1000) return;
    lastInitRef.current = now;
    
    // Verificação de conectividade básica do navegador - Bypass para redes instáveis
    if (!window.navigator.onLine && reconnectAttemptsRef.current < 5) {
      console.log('Kernel P2P: Navegador reporta offline, mas tentando forçar sinalização...');
    } else if (!window.navigator.onLine) {
      setSyncStatus('disconnected');
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = setTimeout(initPeer, 5000);
      return;
    }

    // Se já temos um peer funcional, não reiniciamos
    if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.disconnected) {
      return;
    }

    if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    
    // Limpeza profunda e síncrona de conexões antigas
    if (peerRef.current) {
      const oldPeer = peerRef.current;
      peerRef.current = null;
      isConnectingToMasterRef.current = false;
      isInitializingRef.current = true; 
      
      activeConnections.current.forEach(conn => {
        try { 
          if (conn.open) {
            conn.send({ type: 'DISCONNECTING' });
          }
          conn.off('data');
          conn.off('open');
          conn.off('error');
          conn.off('close');
          conn.close(); 
        } catch(e) {}
      });
      activeConnections.current.clear();
      peerIdentities.current.clear();

      if (!oldPeer.destroyed) {
        try {
          oldPeer.off('open');
          oldPeer.off('error');
          oldPeer.off('close');
          oldPeer.off('connection');
          oldPeer.off('disconnected');
          oldPeer.destroy();
        } catch (e) {}
      }
      
      // Delay maior (2s) para garantir que o PeerJS server e o browser liberem totalmente os sockets
      initTimeoutRef.current = setTimeout(() => {
        isInitializingRef.current = false;
        initPeer();
      }, 2000);
      return;
    }

    isInitializingRef.current = true;
    if (statusDebounceRef.current) clearTimeout(statusDebounceRef.current);
    setSyncStatus('syncing');

    const netId = (currentUser.networkId || 'VETTUS-PRO').toUpperCase().trim();
    const masterId = `vettus-hub-${netId}`;
    masterIdRef.current = masterId;
    
    const isMasterCandidate = currentUser.role === 'Admin' || isSergioEmail(currentUser.email);

    const myId = (isMasterCandidate && !conflictDetectedRef.current)
      ? masterId 
      : `vettus-node-${netId}-${currentUser.id}-${Math.floor(Math.random() * 100000)}`;

    const peer = (() => {
      try {
        return new Peer(myId, { 
          secure: true, 
          debug: 0, // Reduzido para zero para eliminar popups de erro e logs ruidosos do PeerJS
          pingInterval: 15000, // Aumentado para 15s para tolerar alta latência em redes 2.4GHz ruidosas
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
              { urls: 'stun:stun.l.google.com:19305' },
              { urls: 'stun:stun.voxgratia.org:3478' },
              { urls: 'stun:stun.ekiga.net' },
              { urls: 'stun:stun.ideasip.com' },
              { urls: 'stun:stun.schlund.de' }
            ],
            iceCandidatePoolSize: 30, // Máximo de candidatos para furar firewalls de roteadores 2.4G/5G
            sdpSemantics: 'unified-plan'
          }
        });
      } catch (e) {
        console.error('Kernel P2P: Falha crítica ao instanciar Peer:', e);
        return null;
      }
    })();

    if (!peer) {
      isInitializingRef.current = false;
      initTimeoutRef.current = setTimeout(initPeer, 5000);
      return;
    }

    peerRef.current = peer;

    peer.on('open', (id) => {
      isInitializingRef.current = false;
      reconnectAttemptsRef.current = 0; 
      console.log('Kernel P2P On:', id);
      setSyncStatus('synced');
      
      const pingInterval = setInterval(() => {
        if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.disconnected) {
          try {
            if ((peerRef.current as any).socket && (peerRef.current as any).socket.send) {
              (peerRef.current as any).socket.send({ type: 'HEARTBEAT' });
            }
            
            const now = Date.now();
            activeConnections.current.forEach(async (conn) => {
              if (conn.open) {
                await safeSend(conn, { type: 'PING' });
              }
            });

            chunkTimeoutRef.current.forEach((time, cId) => {
              if (now - time > 30000) {
                pendingChunks.current.delete(cId);
                chunkTimeoutRef.current.delete(cId);
              }
            });

            activeConnections.current.forEach((conn, peerId) => {
              const lastSeen = peerLastSeen.current.get(peerId) || 0;
              if (peerId !== masterId && (now - lastSeen > 45000)) {
                console.log(`Kernel P2P: GC Peer ${peerId}`);
                try { conn.close(); } catch(e) {}
                activeConnections.current.delete(peerId);
                peerIdentities.current.delete(peerId);
              }
            });
            setOnlinePeers(Array.from(activeConnections.current.keys()));
          } catch(e) {}
        } else {
          clearInterval(pingInterval);
        }
      }, 10000);

      if (id !== masterId) connectToMaster();
    });

    peer.on('close', () => {
      isInitializingRef.current = false;
      peerRef.current = null;
      setSyncStatus('disconnected');
    });

    const connectToMaster = () => {
      if (!peer || peer.destroyed || peer.disconnected || isConnectingToMasterRef.current) return;
      isConnectingToMasterRef.current = true;
      
      const conn = peer.connect(masterId, { 
        reliable: true,
        serialization: 'json',
        metadata: { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      });

      const connTimeout = setTimeout(() => {
        if (!conn.open) {
          isConnectingToMasterRef.current = false;
          conn.close();
        }
      }, 30000); // Aumentado para 30s para suportar conexões iniciais lentas (2G/2.4GHz)
      
      conn.on('open', async () => {
        clearTimeout(connTimeout);
        isConnectingToMasterRef.current = false;
        reconnectAttemptsRef.current = 0; 
        
        // Anti-leak: Limita conexões ativas
        if (activeConnections.current.size > 15 && !isMasterCandidate) {
          const firstKey = activeConnections.current.keys().next().value;
          if (firstKey) {
            const oldConn = activeConnections.current.get(firstKey);
            try {
              oldConn?.off('data');
              oldConn?.off('open');
              oldConn?.off('error');
              oldConn?.off('close');
              oldConn?.close();
            } catch(e) {}
            activeConnections.current.delete(firstKey);
          }
        }

        activeConnections.current.set(conn.peer, conn);
        setOnlinePeers(Array.from(activeConnections.current.keys()));
        setSyncStatus('synced');
        
        // PRIORIDADE 1: Identificação Imediata
        await safeSend(conn, { 
          type: 'GREETING', 
          payload: { id: currentUser.id, name: currentUser.name, role: currentUser.role } 
        });

        // PRIORIDADE 2: Sinalizar que deseja sincronizar
        await safeSend(conn, { type: 'SYNC_REQUEST' });

        // PRIORIDADE 3: Envio de dados pesados
        await safeSend(conn, { 
          type: 'DATA_UPDATE', 
          payload: stateRef.current,
          messageId: `init-push-${myAppId.current}-${Date.now()}`,
          senderAppId: myAppId.current
        });
        
        conn.on('data', (d: any) => handleIncomingData(conn, d));
        conn.on('close', () => {
          activeConnections.current.delete(conn.peer);
          setOnlinePeers(Array.from(activeConnections.current.keys()));
        });
        conn.on('error', () => {
          activeConnections.current.delete(conn.peer);
          setOnlinePeers(Array.from(activeConnections.current.keys()));
        });
        
        await safeSend(conn, { 
          type: 'DATA_UPDATE', 
          payload: stateRef.current,
          messageId: `initial-${myAppId.current}-${Date.now()}`,
          senderAppId: myAppId.current
        });
      });

      conn.on('error', (err) => {
        isConnectingToMasterRef.current = false;
        console.warn('Erro na conexão com Master:', err);
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000); 
        reconnectAttemptsRef.current++;
        setTimeout(connectToMaster, delay);
      });
    };

    peer.on('connection', (conn) => {
      if (conn.metadata) {
        console.log(`Kernel P2P: Bio-ID detectado para ${conn.peer} (${conn.metadata.name})`);
        peerIdentities.current.set(conn.peer, conn.metadata);
      }

      if (activeConnections.current.size > 80) {
        try { conn.close(); } catch(e) {}
        return;
      }
      
      activeConnections.current.set(conn.peer, conn);
      setOnlinePeers(Array.from(activeConnections.current.keys()));
      
      conn.on('data', (d: any) => handleIncomingData(conn, d));
      
      conn.on('open', async () => {
        await safeSend(conn, { 
          type: 'GREETING', 
          payload: { id: currentUser.id, name: currentUser.name, role: currentUser.role } 
        });

        if (currentUser.role === 'Admin' || isSergioEmail(currentUser.email)) {
          console.log(`Kernel Master: Alimentando nó secundário ${conn.peer}`);
          await safeSend(conn, { 
            type: 'DATA_UPDATE', 
            payload: stateRef.current,
            messageId: `master-feed-${myAppId.current}-${Date.now()}`,
            senderAppId: myAppId.current
          });
        }
      });

      const cleanup = () => {
        activeConnections.current.delete(conn.peer);
        peerIdentities.current.delete(conn.peer);
        setOnlinePeers(Array.from(activeConnections.current.keys()));
      };

      conn.on('close', cleanup);
      conn.on('error', cleanup);
    });

    peer.on('disconnected', () => {
      console.log('Kernel P2P: Link de sinalização interrompido, tentando restauração...');
      setSyncStatus('disconnected');
      if (statusDebounceRef.current) clearTimeout(statusDebounceRef.current);
      statusDebounceRef.current = setTimeout(() => {
        if (peerRef.current && !peerRef.current.destroyed && peerRef.current.disconnected) {
          peerRef.current.reconnect();
          setSyncStatus('synced');
        }
      }, 5000);
    });

    peer.on('error', (err) => {
      isInitializingRef.current = false;
      const errorType = err.type || (err as any).message || 'unknown';
      setSyncStatus('disconnected');
      
      console.warn('Peer Protocol Alert:', errorType);

      if (errorType === 'network' || errorType === 'lost-connection' || errorType === 'server-error' || errorType === 'socket-error') {
         reconnectAttemptsRef.current++;
         const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
         console.log(`Kernel P2P: Erro de sinalização/rede. Tentando reconectar em ${Math.round(delay/1000)}s...`);
         initTimeoutRef.current = setTimeout(() => initPeer(), delay);
         return;
      }

      if (errorType === 'unavailable-id' || errorType.includes('taken')) {
         console.warn('Kernel P2P: Conflito de ID Master detectado.');
         conflictDetectedRef.current = true; 
         isInitializingRef.current = false;
         if (peerRef.current === peer) peerRef.current = null;
         if (!peer.destroyed) try { peer.destroy(); } catch (e) {}
         if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
         initTimeoutRef.current = setTimeout(() => initPeer(), 2000);
         return;
      }

      if (errorType.includes('Aborting') || errorType.includes('PeerJS') || errorType.includes('iceConnectionState') || errorType.includes('RTCPeerConnection')) {
         console.warn('Kernel P2P: Reiniciando subsistema WebRTC devido a erro crítico...');
         isInitializingRef.current = false;
         if (peerRef.current === peer) peerRef.current = null;
         if (!peer.destroyed) try { peer.destroy(); } catch (e) {}
         if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
         initTimeoutRef.current = setTimeout(() => initPeer(), 8000);
         return;
      }

      // Outros erros
      reconnectAttemptsRef.current++;
      const nextDelay = Math.min(5000 * reconnectAttemptsRef.current, 60000);
      initTimeoutRef.current = setTimeout(() => initPeer(), nextDelay);
    });

  }, [currentUser, mergeData]);

  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        initPeer();
      }, 500);
      
      const heartbeat = setInterval(() => {
        if (activeConnections.current.size > 0) {
          activeConnections.current.forEach(async (conn) => {
            if (conn.open) {
              try {
                await safeSend(conn, { type: 'PING' });
                
                // Periodic Consistency Check: Força sincronização a cada ciclo (probabilidade aumentada)
                if (Math.random() > 0.4) {
                  await safeSend(conn, { type: 'SYNC_REQUEST' });
                }
              } catch (e) {
                console.warn('Heartbeat Sync Error:', e);
              }
            }
          });
        }
      }, 7000); 

      // Visibility Handler: Apenas recriar se estiver desconectado e voltar a ficar visível
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          if (!peerRef.current || peerRef.current.disconnected || peerRef.current.destroyed) {
            initPeer();
          } else {
            activeConnections.current.forEach(async (conn) => {
              if (conn.open) try { await safeSend(conn, { type: 'PING' }); } catch(e) {}
            });
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('online', handleVisibility);
      window.addEventListener('beforeunload', () => {
        activeConnections.current.forEach(c => c.close());
        peerRef.current?.destroy();
      });

      return () => {
        clearTimeout(timer);
        clearInterval(heartbeat);
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('online', handleVisibility);
        if (peerRef.current) peerRef.current.destroy();
      };
    }
  }, [currentUser, initPeer]);

  // Handler Estratégico de Exclusão de Corretor
  const handleDeleteBrokerWithLeadSafeguard = (brokerId: string) => {
    const brokerToDelete = brokers.find(b => b.id === brokerId);
    if (!brokerToDelete) return;
    const now = new Date().toISOString();
    const orphanedLeads = clients.filter(c => c.brokerId === brokerId);
    setClients(prev => prev.map(c => 
      c.brokerId === brokerId 
        ? { ...c, brokerId: 'unassigned', assignedAgent: 'REALOCAÇÃO PENDENTE', updatedAt: now }
        : c
    ));
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { ...b, deleted: true, updatedAt: now } 
        : b
    ));
    alert(`Membro removido da rede. ${orphanedLeads.length} leads foram movidos para a Fila de Triagem.`);
  };

  if (!currentUser) return <Auth onLogin={handleLogin} existingBrokers={brokers} onUpdateInitialData={mergeData} />;

  const isAdmin = currentUser.role === 'Admin' || isSergioEmail(currentUser.email);
  const pendingRemindersCount = reminders.filter(r => !r.completed && r.brokerId === currentUser.id).length;

  const handleForceReconnect = useCallback(() => {
    console.log('Kernel P2P: Reinicialização manual solicitada...');
    conflictDetectedRef.current = false;
    reconnectAttemptsRef.current = 0;
    initPeer();
  }, [initPeer]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Kernel P2P: Rede física detectada (Online), restabelecendo canais...');
      initPeer();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [initPeer]);

  useEffect(() => {
    const safetyNet = setInterval(() => {
      if (currentUser && syncStatus === 'disconnected' && !isInitializingRef.current) {
        console.log('Kernel P2P: Safety Net - Reconectando subsistema inativo...');
        initPeer();
      }
    }, 20000); // Checa a cada 20s
    return () => clearInterval(safetyNet);
  }, [currentUser, syncStatus, initPeer]);

  return (
    <Layout 
      currentView={currentView} 
      onViewChange={setCurrentView} 
      currentUser={currentUser} 
      onLogout={handleLogout} 
      pendingRemindersCount={pendingRemindersCount}
      syncStatus={syncStatus}
      onForceReconnect={handleForceReconnect}
      lastSaved={lastSavedTime}
    >
      {currentView === 'dashboard' && (
        <Dashboard 
          onNavigate={setCurrentView} 
          currentUser={currentUser} 
          onForceSync={handleForceSync}
          onForceReconnect={handleForceReconnect}
          syncStatus={syncStatus}
          statsData={{ 
            properties: (isAdmin ? properties : properties.filter(p => p.brokerId === currentUser.id)).filter(p => !p.deleted), 
            clients: (isAdmin ? clients : clients.filter(c => c.brokerId === currentUser.id || (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim()))).filter(c => !c.deleted), 
            tasks: [], 
            activities: isAdmin ? activities : activities.filter(a => a.brokerId === currentUser.id), 
            reminders: reminders.filter(r => r.brokerId === currentUser.id), 
            commissions: isAdmin ? commissions : commissions.filter(c => c.brokerId === currentUser.id), 
            campaigns: isAdmin ? campaigns : campaigns.filter(c => c.brokerId === currentUser.id), 
            systemLogs: [], 
            isMaster: peerRef.current?.id === masterIdRef.current,
            myPeerId: peerRef.current?.id,
            rawConnectionCount: activeConnections.current.size,
            onlineBrokers: [
              // Inclui o próprio usuário na lista para feedback visual
              {
                peerId: 'self',
                id: currentUser.id,
                name: `${currentUser.name} (Você)`,
                role: currentUser.role,
                isSelf: true
              },
              ...onlinePeers.map(peerId => {
                const identity = peerIdentities.current.get(peerId);
                const lastSeen = peerLastSeen.current.get(peerId) || 0;
                const isRecentlyActive = (Date.now() - lastSeen) < 30000;
                
                return {
                  peerId,
                  id: identity?.id || 'unknown',
                  name: identity?.name || (peerId === masterIdRef.current ? 'Administrador (Sergio)' : 'Conectando...'),
                  role: identity?.role || 'Filiado',
                  isSelf: false,
                  lastSeenMs: lastSeen,
                  isRecentlyActive,
                  networkId: peerId.split('-')[0].toUpperCase()
                };
              })
            ].filter(p => {
              if (p.isSelf) return true;
              if (isAdmin) return true;
              return p.peerId === masterIdRef.current;
            }), 
            commissionForecasts: isAdmin ? commissionForecasts : commissionForecasts.filter(f => {
              const client = clients.find(cl => cl.id === f.clientId);
              return client && !client.deleted && (client.brokerId === currentUser.id || (client.assignedAgent && client.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim()));
            })
          }} 
        />
      )}

      {currentView === 'properties' && (
        <PropertyView 
          properties={properties.filter(p => !p.deleted)} 
          currentUser={currentUser} 
          brokers={brokers} 
          onAddProperty={p => setProperties(v => [{...p, updatedAt: new Date().toISOString()}, ...v])} 
          onEditProperty={p => { setPropertyToEdit(p); setIsPropertyModalOpen(true); }} 
          onDeleteProperty={id => setProperties(v => v.map(p => p.id === id ? { ...p, deleted: true, updatedAt: new Date().toISOString() } : p))} 
          onOpenAddModal={() => { setPropertyToEdit(null); setIsPropertyModalOpen(true); }} 
          availableTypes={['Apartamento', 'Casa', 'Terreno', 'Cobertura', 'Prontos']} 
          availableStatuses={['Disponível', 'Vendido', 'Reservado', 'Lançamento']} 
          onAddType={() => {}} 
          onAddStatus={() => {}} 
        />
      )}

      {currentView === 'clients' && (
        <ClientView 
          clients={(isAdmin ? clients : clients.filter(c => {
            const isAssignedById = c.brokerId === currentUser.id;
            const isAssignedByName = c.assignedAgent && c.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
            const isUnassigned = c.brokerId === 'unassigned';
            return isAssignedById || (isAssignedByName && !isUnassigned);
          }))} 
          activities={isAdmin ? activities : activities.filter(a => {
            if (a.brokerId === currentUser.id) return true;
            return clients.some(c => 
              c.name === a.clientName && 
              !c.deleted && 
              (c.brokerId === currentUser.id || (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim()))
            );
          })} 
          properties={properties.filter(p => !p.deleted)} 
          commissions={commissions} 
          constructionCompanies={constructionCompanies} 
          commissionForecasts={commissionForecasts} 
          currentUser={currentUser} 
          brokers={brokers} 
          onAddClient={c => setClients(v => [{...c, updatedAt: new Date().toISOString()}, ...v])} 
          onUpdateClient={c => setClients(v => v.map(x => x.id === c.id ? {...c, updatedAt: new Date().toISOString()} : x))} 
          onUpdateClients={updatedClients => {
            const now = new Date().toISOString();
            setClients(v => {
              const map = new Map(v.map(x => [x.id, x]));
              updatedClients.forEach(c => map.set(c.id, { ...c, updatedAt: now }));
              return Array.from(map.values());
            });
          }}
          onDeleteClient={id => setClients(v => v.map(c => c.id === id ? { ...c, deleted: true, updatedAt: new Date().toISOString() } : c))} 
          onDeleteClients={ids => setClients(v => v.map(c => ids.includes(c.id) ? { ...c, deleted: true, updatedAt: new Date().toISOString() } : c))}
          onEditClient={c => { setClientToEdit(c); setIsClientModalOpen(true); }} 
          onAddActivity={a => setActivities(v => [{...a, updatedAt: new Date().toISOString()}, ...v])} 
          onAddActivities={newActivities => {
            const now = new Date().toISOString();
            setActivities(v => [...newActivities.map(a => ({...a, updatedAt: now})), ...v]);
          }}
          onUpdateActivitiesByClient={() => {
            // Histórico preservado com autor original.
            // A visibilidade agora é garantida pelo filtro dinâmico no App.tsx
          }}
          onAddReminder={r => setReminders(v => [{...r, updatedAt: new Date().toISOString()}, ...v])} 
          onAddReminders={newReminders => {
            const now = new Date().toISOString();
            setReminders(v => [...newReminders.map(r => ({...r, updatedAt: now})), ...v]);
          }}
          onAddSale={s => setCommissions(v => [{...s, updatedAt: new Date().toISOString()}, ...v])} 
          onUpdateProperty={p => setProperties(v => v.map(x => x.id === p.id ? {...p, updatedAt: new Date().toISOString()} : x))} 
          onAddForecasts={f => setCommissionForecasts(v => [...f.map(item => ({...item, updatedAt: new Date().toISOString()})), ...v])} 
          onOpenAddModal={() => { setClientToEdit(null); setIsClientModalOpen(true); }}
          onOpenImport={() => setCurrentView('lead_import')}
          onOpenFlow={(clientId, tab) => { setPreselectedClientForFlow(clientId); setPreselectedFlowTab(tab || 'entry'); setCurrentView('client_payment_flow'); }}
        />
      )}

      {currentView === 'tasks' && (
        <TasksView 
          clients={(isAdmin ? clients.filter(c => c.brokerId !== 'unassigned') : clients.filter(c => c.brokerId === currentUser.id || (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim()))).filter(c => !c.deleted && !c.blocked)} 
          currentUser={currentUser} 
          brokers={brokers}
          onUpdateClient={c => setClients(v => v.map(x => x.id === c.id ? {...c, updatedAt: new Date().toISOString()} : x))} 
          onAddActivity={a => setActivities(v => [{...a, updatedAt: new Date().toISOString()}, ...v])} 
        />
      )}

      {currentView === 'monthly_financial' && (
        <MonthlyFinancialView 
          expenses={expenses}
          onAddExpense={e => setExpenses(v => [{...e, updatedAt: new Date().toISOString()}, ...v])}
          onUpdateExpense={e => setExpenses(v => v.map(x => x.id === e.id ? {...e, updatedAt: new Date().toISOString()} : x))}
          onDeleteExpense={id => setExpenses(v => v.map(e => e.id === id ? {...e, deleted: true, updatedAt: new Date().toISOString()} : e))}
          currentUser={currentUser}
        />
      )}

      {currentView === 'reminders' && (
        <ReminderView 
          reminders={reminders.filter(r => r.brokerId === currentUser.id)} 
          onToggleReminder={id => setReminders(v => v.map(r => r.id === id ? { ...r, completed: !r.completed, updatedAt: new Date().toISOString() } : r))} 
          onMarkAllAsRead={() => {
            const now = new Date().toISOString();
            setReminders(prev => prev.map(r => 
              r.brokerId === currentUser.id && !r.completed 
                ? { ...r, completed: true, updatedAt: now } 
                : r
            ));
          }}
          onDeleteRead={() => {
            setReminders(prev => prev.filter(r => 
              !(r.brokerId === currentUser.id && r.completed)
            ));
          }}
        />
      )}

      {currentView === 'cash_flow' && (
        <CashFlowView 
          commissions={commissions} 
          forecasts={commissionForecasts} 
          companies={constructionCompanies} 
          currentUser={currentUser}
        />
      )}

      {currentView === 'client_payment_flow' && (
        <ClientPaymentFlowView 
          commissions={commissions} 
          brokers={brokers}
          clients={clients.filter(c => !c.deleted)}
          properties={properties.filter(p => !p.deleted)}
          launches={launches}
          currentUser={currentUser}
          onUpdateSale={s => setCommissions(v => v.map(x => x.id === s.id ? {...s, updatedAt: new Date().toISOString()} : x))}
          onAddSale={s => setCommissions(v => [{...s, updatedAt: new Date().toISOString()}, ...v])}
          onDeleteSale={id => setCommissions(v => v.map(c => c.id === id ? {...c, deleted: true, updatedAt: new Date().toISOString()} : c))}
          preselectedClientId={preselectedClientForFlow}
          preselectedTab={preselectedFlowTab}
          onClearPreselection={() => setPreselectedClientForFlow(null)}
        />
      )}

      {currentView === 'sales' && (
        <SalesView 
          sales={isAdmin ? commissions : commissions.filter(c => c.brokerId === currentUser.id)} 
          brokers={brokers} 
          currentUser={currentUser}
          onUpdateSale={s => setCommissions(v => v.map(x => x.id === s.id ? {...s, updatedAt: new Date().toISOString()} : x))}
        />
      )}

      {currentView === 'marketing' && (
        <MarketingView 
          campaigns={isAdmin ? campaigns : campaigns.filter(c => c.brokerId === currentUser.id)} 
          clients={(isAdmin ? clients : clients.filter(c => c.brokerId === currentUser.id || (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim()))).filter(c => !c.deleted)} 
          currentUser={currentUser} 
          brokers={brokers}
          onAddCampaign={c => setCampaigns(v => [{...c, updatedAt: new Date().toISOString()}, ...v])}
          onUpdateCampaign={c => setCampaigns(v => v.map(x => x.id === c.id ? {...c, updatedAt: new Date().toISOString()} : x))}
          onDeleteCampaign={id => setCampaigns(v => v.map(c => c.id === id ? {...c, deleted: true, updatedAt: new Date().toISOString()} : c))}
        />
      )}

      {currentView === 'activities' && (
        <ActivityView 
          activities={isAdmin ? activities : activities.filter(a => {
            if (a.brokerId === currentUser.id) return true;
            return clients.some(c => 
              c.name === a.clientName && 
              !c.deleted && 
              (c.brokerId === currentUser.id || (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim()))
            );
          })} 
          onAddActivity={a => setActivities(v => [{...a, updatedAt: new Date().toISOString()}, ...v])} 
          onAddReminder={r => setReminders(v => [{...r, updatedAt: new Date().toISOString()}, ...v])} 
          currentUser={currentUser}
          clients={(isAdmin ? clients : clients.filter(c => c.brokerId === currentUser.id)).filter(c => !c.deleted)}
          brokers={brokers}
        />
      )}

      {currentView === 'brokers' && (
        <BrokersView 
          brokers={brokers} 
          onAddBroker={b => setBrokers(v => [{...b, updatedAt: new Date().toISOString()}, ...v])} 
          onUpdateBroker={b => setBrokers(v => v.map(x => x.id === b.id ? {...b, updatedAt: new Date().toISOString()} : x))} 
          onDeleteBroker={handleDeleteBrokerWithLeadSafeguard} 
          onAddActivity={a => setActivities(v => [{...a, updatedAt: new Date().toISOString()}, ...v])}
          currentUser={currentUser}
        />
      )}

      {currentView === 'password_update' && (
        <PasswordUpdateView 
          currentUser={currentUser}
          onUpdateBroker={b => setBrokers(v => v.map(x => x.id === b.id ? {...b, updatedAt: new Date().toISOString()} : x))}
        />
      )}

      {currentView === 'lead_import' && (
        <LeadImport 
          unassignedLeads={clients.filter(c => c.brokerId === 'unassigned' && !c.deleted)}
          brokers={brokers}
          currentUser={currentUser}
          onImportLeads={ls => setClients(v => [...v, ...ls.map(l => ({...l, updatedAt: new Date().toISOString()}))])}
          onUpdateLead={l => {
             const updatedAt = new Date().toISOString();
             if (l.brokerId !== 'unassigned') {
                const newBroker = brokers.find(b => b.id === l.brokerId);
                if (newBroker) {
                   setActivities(prev => prev.map(a => a.clientName === l.name ? { ...a, brokerId: newBroker.id, brokerName: newBroker.name, updatedAt } : a));
                }
                const newReminder: Reminder = {
                   id: Math.random().toString(36).substr(2, 9),
                   brokerId: l.brokerId,
                   title: `NOVO LEAD ATRIBUÍDO: ${l.name}`,
                   dueDate: new Date().toISOString().split('T')[0],
                   priority: 'High',
                   completed: false,
                   type: 'new_lead',
                   updatedAt
                };
                setReminders(prev => [newReminder, ...prev]);
             }
             setClients(v => v.map(x => x.id === l.id ? {...l, updatedAt} : x));
          }}
        />
      )}

      {currentView === 'documents' && (
        <DocumentsView 
          documents={documents} 
          onUpload={d => setDocuments(v => [{...d, updatedAt: new Date().toISOString()}, ...v])} 
          onDelete={id => setDocuments(v => v.map(d => d.id === id ? { ...d, deleted: true, updatedAt: new Date().toISOString() } : d))} 
          currentUser={currentUser}
        />
      )}

      {currentView === 'construction_companies' && (
        <ConstructionCompaniesView 
          companies={constructionCompanies} 
          forecasts={commissionForecasts} 
          onAddCompany={c => setConstructionCompanies(v => [{...c, updatedAt: new Date().toISOString()}, ...v])} 
          onAddForecasts={f => setCommissionForecasts(v => [...f.map(item => ({...item, updatedAt: new Date().toISOString()})), ...v])}
          currentUser={currentUser}
        />
      )}

      {currentView === 'launches' && (
        <LaunchesView 
          launches={launches} 
          clients={clients.filter(c => !c.deleted)}
          brokers={brokers}
          currentUser={currentUser} 
          onAddLaunch={l => setLaunches(v => [{...l, updatedAt: new Date().toISOString()}, ...v])}
          onUpdateLaunch={l => setLaunches(v => v.map(x => x.id === l.id ? {...l, updatedAt: new Date().toISOString()} : x))}
        />
      )}

      {currentView === 'leasing' && (
        <LeasingView 
          rentals={rentals} 
          properties={properties} 
          currentUser={currentUser} 
          onAddRental={r => setRentals(v => [{...r, updatedAt: new Date().toISOString()}, ...v])} 
        />
      )}

      {currentView === 'ads' && (
        <AdsView properties={isAdmin ? properties : properties.filter(p => p.brokerId === currentUser.id)} currentUser={currentUser} />
      )}

      {currentView === 'spreadsheets' && (
        <SpreadsheetsView 
          brokers={brokers} 
          clients={clients} 
          commissions={commissions} 
          properties={properties} 
          currentUser={currentUser}
          onDeleteClients={ids => setClients(v => v.map(c => ids.includes(c.id) ? { ...c, deleted: true, updatedAt: new Date().toISOString() } : c))}
          onAddActivities={newActivities => setActivities(v => [...newActivities.map(a => ({...a, updatedAt: new Date().toISOString()})), ...v])}
          onNavigate={setCurrentView}
        />
      )}

      {currentView === 'backup' && (
        <Backup 
          currentUser={currentUser} 
          onManualBackup={() => {
            const data = JSON.stringify(stateRef.current);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vettus_backup_${currentUser.networkId}_${new Date().toISOString().split('T')[0]}.vettus`;
            a.click();
            try {
              localStorage.setItem(STORAGE_KEY_PREFIX + 'last_backup_date', new Date().toISOString());
            } catch (e) {
              console.warn('Kernel Storage: Falha ao salvar data do backup:', e);
            }
          }} 
        />
      )}

      <NewPropertyModal 
        isOpen={isPropertyModalOpen} 
        onClose={() => setIsPropertyModalOpen(false)} 
        onAddProperty={p => setProperties(v => [{...p, updatedAt: new Date().toISOString()}, ...v])} 
        onUpdateProperty={p => setProperties(v => v.map(x => x.id === p.id ? {...p, updatedAt: new Date().toISOString()} : x))}
        propertyToEdit={propertyToEdit}
        currentUser={currentUser}
        brokers={brokers}
        availableTypes={['Apartamento', 'Casa', 'Terreno', 'Cobertura', 'Prontos']}
        availableStatuses={['Disponível', 'Vendido', 'Reservado', 'Lançamento']}
      />

      <NewClientModal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)} 
        onAddClient={c => {
          setClients(v => [{...c, updatedAt: new Date().toISOString()}, ...v]);
          logSystemAction(`Novo cliente cadastrado: ${c.name}`, c.name);
        }} 
        onUpdateClient={c => {
          const updatedAt = new Date().toISOString();
          const newBroker = brokers.find(b => b.id === c.brokerId);
          if (newBroker) {
             setActivities(prev => prev.map(a => a.clientName === c.name ? { ...a, brokerId: newBroker.id, brokerName: newBroker.name, updatedAt } : a));
          }
          setClients(v => v.map(x => x.id === c.id ? {...c, updatedAt} : x));
          logSystemAction(`Cliente atualizado: ${c.name}`, c.name);
        }}
        clientToEdit={clientToEdit}
        currentUser={currentUser}
        brokers={brokers}
      />

    </Layout>
  );
};

export default App;