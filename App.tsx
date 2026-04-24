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

  // Estados Gerenciados (Rede Vettus)
  const [brokers, setBrokers] = useState<Broker[]>(() => loadLocal('brokers', MOCK_BROKERS));
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
  const peerRef = useRef<Peer | null>(null);
  const isInitializingRef = useRef(false);
  const initTimeoutRef = useRef<any>(null);
  const statusDebounceRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const stateRef = useRef({ 
    brokers, properties, clients, activities, reminders, 
    commissions, commissionForecasts, documents, 
    constructionCompanies, launches, campaigns, rentals, expenses 
  });

  // Global Error Boundary (Silencioso)
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      // Silenciar erros conhecidos do PeerJS
      if (e.message?.includes('PeerJS') || e.message?.includes('Aborting') || e.message?.includes('unavailable-id')) {
        console.warn('Kernel P2P: Erro interceptado e silenciado:', e.message);
        e.preventDefault();
        return;
      }
      
      // Capturar outros erros "Uncaught" para evitar travamento total
      console.error('Uncaught Exception Interceptada:', e.message, e.error);
      // Opcional: e.preventDefault(); // Se quisermos esconder do console, mas melhor deixar logado
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      // Silenciar rejeições do PeerJS
      if (e.reason?.message?.includes('PeerJS') || e.reason?.type?.includes('PeerJS')) {
        console.warn('Kernel P2P: Rejeição interceptada e silenciada:', e.reason.message || e.reason.type);
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
         if (brokers.length > 2) { 
           const stillExists = brokers.find(b => b.id === currentUser.id || b.email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim());
           if (!stillExists || stillExists.blocked || stillExists.deleted) {
              console.warn('Sessão Inválida: Usuário não encontrado ou bloqueado.');
              handleLogout();
           }
         }
      }
    }
  }, [brokers, currentUser]);

  const logSystemAction = useCallback((description: string, type: string = 'System') => {
    if (!currentUser) return;
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      brokerName: currentUser.name,
      type: type as any,
      clientName: 'SISTEMA',
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

  const isInternalUpdateRef = useRef(false);
  const myAppId = useRef(Math.random().toString(36).substr(2, 9));

  const mergeData = useCallback((payload: any) => {
    if (!payload) return;
    
    isInternalUpdateRef.current = true;
    let changed = false;
    const updateCollection = (prev: any[], next: any[]) => {
      if (!next) return prev;
      const map = new Map(prev.map(item => [item.id, item]));
      let collectionChanged = false;
      
      next.forEach(item => {
        const existing = map.get(item.id);
        if (!existing || new Date(item.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
           map.set(item.id, item);
           collectionChanged = true;
           changed = true;
        }
      });
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

    if (changed && currentUser?.role === 'Admin') {
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'last_sync_backup', JSON.stringify(stateRef.current));
      } catch (e) {
        console.warn('Falha ao salvar backup local (Quota Exceeded?):', e);
      }
    }
  }, [currentUser]);

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
        changedCollections[key] = list;
        hasChanges = true;
      }
    });

    prevCollectionsRef.current = collections;
    stateRef.current = collections;

    if (hasChanges) {
      if (isInternalUpdateRef.current) {
        isInternalUpdateRef.current = false;
        return;
      }

      // Sincroniza abas locais instantaneamente
      try {
        const channel = new BroadcastChannel('vettus_internal_sync');
        channel.postMessage({ 
          type: 'DATA_UPDATE', 
          payload: changedCollections,
          senderAppId: myAppId.current
        });
        channel.close();
      } catch (e) {}

      if (activeConnections.current.size > 0) {
        const timeout = setTimeout(() => {
          activeConnections.current.forEach(conn => {
            if (conn.open) {
              try {
                conn.send({ 
                  type: 'DATA_UPDATE', 
                  payload: changedCollections, 
                  senderId: peerRef.current?.id,
                  senderAppId: myAppId.current
                });
              } catch (e) {
                console.warn('P2P Broadcast Error:', e);
              }
            }
          });
        }, 300);
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
        const broker = brokers.find(b => b.email.toLowerCase().trim() === email.toLowerCase().trim());
        if (broker && (broker.password === password || (!broker.password && !password))) {
          if (!broker.blocked && !broker.deleted) {
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

  // PeerJS Kernel v7.0 - Ultra-Fast Discovery
  const initPeer = useCallback(() => {
    if (!currentUser || isInitializingRef.current) return;
    
    // Verificação de conectividade básica do navegador
    if (!window.navigator.onLine) {
      setSyncStatus('disconnected');
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = setTimeout(initPeer, 5000);
      return;
    }

    // Se já temos um peer funcional e conectado, não reiniciamos sem necessidade
    if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.disconnected) {
      return;
    }

    if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    isInitializingRef.current = true;
    if (statusDebounceRef.current) clearTimeout(statusDebounceRef.current);
    setSyncStatus('syncing');

    const netId = (currentUser.networkId || 'VETTUS-PRO').toLowerCase().trim();
    const masterId = `vettus-master-${netId}`;
    const isMasterCandidate = true; // Todo terminal pode tentar ser master para garantir descoberta rápida

    const myId = (isMasterCandidate && reconnectAttemptsRef.current < 2)
      ? masterId 
      : `vettus-node-${netId}-${currentUser.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Limpeza profunda e segura com delay para evitar "Aborting!"
    if (peerRef.current) {
      const oldPeer = peerRef.current;
      peerRef.current = null;
      try {
        oldPeer.off('open');
        oldPeer.off('error');
        oldPeer.off('close');
        oldPeer.off('disconnected');
        if (!oldPeer.destroyed) {
          oldPeer.destroy();
        }
      } catch (e) {
        console.warn('Cleanup Peer Error:', e);
      }
      
      // Delay de 2s após destruir para garantir que o PeerJS limpe o estado interno
      initTimeoutRef.current = setTimeout(() => {
        isInitializingRef.current = false;
        initPeer();
      }, 2000);
      return;
    }

    const peer = (() => {
      try {
        return new Peer(myId, { 
          secure: true, 
          debug: 0, // Silenciar logs internos para evitar alertas desnecessários
          config: {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            sdpSemantics: 'unified-plan'
          }
        });
      } catch (e) {
        console.error('Falha crítica ao instanciar PeerJS:', e);
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
      reconnectAttemptsRef.current = 0; // Reset ao abrir com sucesso
      console.log('Kernel P2P On:', id);
      setSyncStatus('synced');
      if (id !== masterId) connectToMaster();
    });

    peer.on('close', () => {
      isInitializingRef.current = false;
      peerRef.current = null;
      setSyncStatus('disconnected');
    });

    const connectToMaster = () => {
      if (!peer || peer.destroyed || peer.disconnected) return;
      
      const conn = peer.connect(masterId, { reliable: true });
      
      conn.on('open', () => {
        reconnectAttemptsRef.current = 0; // Reset ao conectar ao master
        activeConnections.current.set(conn.peer, conn);
        conn.on('data', (d: any) => {
           if (d.type === 'DATA_UPDATE' && d.senderId !== peerRef.current?.id) mergeData(d.payload);
           if (d.type === 'PING') conn.send({ type: 'PONG' });
        });
        conn.on('close', () => activeConnections.current.delete(conn.peer));
        conn.on('error', () => activeConnections.current.delete(conn.peer));
        try {
          conn.send({ type: 'DATA_UPDATE', payload: stateRef.current });
        } catch (e) {
          console.warn('Erro ao enviar dados iniciais via P2P:', e);
        }
      });

      conn.on('error', (err) => {
        console.warn('Erro na conexão com Master:', err);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        setTimeout(connectToMaster, delay);
        reconnectAttemptsRef.current++;
      });
    };

    peer.on('connection', (conn) => {
      activeConnections.current.set(conn.peer, conn);
      console.log('Nova conexão P2P estabelecida:', conn.peer);
      
      conn.on('data', (d: any) => {
        if (d.type === 'DATA_UPDATE' && d.senderId !== peerRef.current?.id) {
           console.log('Dados recebidos via P2P, mesclando...');
           mergeData(d.payload);
        }
        if (d.type === 'PING') conn.send({ type: 'PONG' });
        
         if (d.type === 'REMOTE_AUTH_REQUEST' && (currentUser.role === 'Admin' || isSergioEmail(currentUser.email))) {
           const { email, password } = d.payload;
           console.log(`Auth P2P: Requisição para ${email}`);
           const broker = stateRef.current.brokers.find(b => b.email.toLowerCase().trim() === email.toLowerCase().trim());
           if (broker && (broker.password === password || (!broker.password && !password))) {
              if (broker.blocked || broker.deleted) {
                conn.send({ type: 'REMOTE_AUTH_FAILURE', message: 'ACESSO SUSPENSO: Contate o administrador.' });
              } else {
                console.log(`Auth P2P: SUCESSO para ${email}`);
                conn.send({ type: 'REMOTE_AUTH_SUCCESS', payload: { user: broker, fullData: stateRef.current } });
              }
           } else {
              console.warn(`Auth P2P: FALHA - Credenciais incorretas para ${email}`);
              conn.send({ type: 'REMOTE_AUTH_FAILURE', message: 'E-mail ou senha incorretos. Verifique com o administrador se você foi cadastrado.' });
           }
        }
      });
      
      conn.on('open', () => conn.send({ type: 'DATA_UPDATE', payload: stateRef.current }));
      conn.on('close', () => activeConnections.current.delete(conn.peer));
      conn.on('error', () => activeConnections.current.delete(conn.peer));
    });

    peer.on('disconnected', () => {
      if (statusDebounceRef.current) clearTimeout(statusDebounceRef.current);
      statusDebounceRef.current = setTimeout(() => {
        if (peer && !peer.destroyed && peer.disconnected) {
          peer.reconnect();
        }
      }, 5000);
    });

    peer.on('error', (err) => {
      isInitializingRef.current = false;
      const errorType = err.type || (err as any).message || 'unknown';
      
      // Tratamento para erro de rede (falha de conexão com o servidor de sinalização)
      if (errorType === 'network') {
         console.warn('Kernel P2P: Falha de rede detectada. Reescalonando tentativa...');
         setSyncStatus('disconnected');
         reconnectAttemptsRef.current++;
         const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 60000);
         initTimeoutRef.current = setTimeout(() => initPeer(), delay);
         return;
      }

      // Tratamento silencioso para ID ocupado (Master já ativo em outra aba)
      if (errorType === 'unavailable-id' || errorType.includes('taken')) {
         console.warn('Kernel P2P: ID Master ocupado. Alternando para modo Node...');
         // Pula imediatamente para modo Node desativando a tentativa de Master
         reconnectAttemptsRef.current = 5; 
         if (!peer.destroyed) {
            try { peer.destroy(); } catch (e) {}
         }
         initTimeoutRef.current = setTimeout(() => initPeer(), 100);
         return;
      }

      if (errorType.includes('Aborting')) {
         console.warn('Kernel P2P: Abortado. Reiniciando...');
         if (!peer.destroyed) {
            try { peer.destroy(); } catch (e) {}
         }
         initTimeoutRef.current = setTimeout(() => initPeer(), 3000);
         return;
      }

      console.error('Peer Protocol Alert:', errorType);

      reconnectAttemptsRef.current++;
      if (reconnectAttemptsRef.current < 15) {
        initTimeoutRef.current = setTimeout(() => initPeer(), 10000);
      }
    });

  }, [currentUser, mergeData]);

  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        initPeer();
      }, 500);
      
      const heartbeat = setInterval(() => {
        activeConnections.current.forEach(conn => {
          if (conn.open) conn.send({ type: 'PING' });
        });
      }, 25000);

      // Visibility Handler: Apenas recriar se estiver desconectado e voltar a ficar visível
      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && (!peerRef.current || peerRef.current.disconnected || peerRef.current.destroyed)) {
          initPeer();
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('online', handleVisibility);
      window.addEventListener('beforeunload', () => peerRef.current?.destroy());

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

  if (!currentUser) return <Auth onLogin={setCurrentUser} existingBrokers={brokers} onUpdateInitialData={mergeData} />;

  const isAdmin = currentUser.role === 'Admin';
  const pendingRemindersCount = reminders.filter(r => !r.completed && r.brokerId === currentUser.id).length;

  return (
    <Layout 
      currentView={currentView} 
      onViewChange={setCurrentView} 
      currentUser={currentUser} 
      onLogout={handleLogout} 
      pendingRemindersCount={pendingRemindersCount}
      syncStatus={syncStatus}
      onForceReconnect={() => {
        reconnectAttemptsRef.current = 0;
        initPeer();
      }}
      lastSaved={lastSavedTime}
    >
      {currentView === 'dashboard' && (
        <Dashboard 
          onNavigate={setCurrentView} 
          currentUser={currentUser} 
          statsData={{ 
            properties: (isAdmin ? properties : properties.filter(p => p.brokerId === currentUser.id)).filter(p => !p.deleted), 
            clients: (isAdmin ? clients : clients.filter(c => c.brokerId === currentUser.id || (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim()))).filter(c => !c.deleted), 
            tasks: [], 
            activities: isAdmin ? activities : activities.filter(a => a.brokerId === currentUser.id), 
            reminders: reminders.filter(r => r.brokerId === currentUser.id), 
            commissions: isAdmin ? commissions : commissions.filter(c => c.brokerId === currentUser.id), 
            campaigns: isAdmin ? campaigns : campaigns.filter(c => c.brokerId === currentUser.id), 
            systemLogs: [], 
            onlineBrokers: Array.from(activeConnections.current.keys()), 
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
          })).filter(c => !c.deleted)} 
          activities={isAdmin ? activities : activities.filter(a => a.brokerId === currentUser.id)} 
          properties={properties.filter(p => !p.deleted)} 
          commissions={commissions} 
          constructionCompanies={constructionCompanies} 
          commissionForecasts={commissionForecasts} 
          currentUser={currentUser} 
          brokers={brokers} 
          onAddClient={c => setClients(v => [{...c, updatedAt: new Date().toISOString()}, ...v])} 
          onUpdateClient={c => setClients(v => v.map(x => x.id === c.id ? {...c, updatedAt: new Date().toISOString()} : x))} 
          onDeleteClient={id => setClients(v => v.map(c => c.id === id ? { ...c, deleted: true, updatedAt: new Date().toISOString() } : c))} 
          onDeleteClients={ids => setClients(v => v.map(c => ids.includes(c.id) ? { ...c, deleted: true, updatedAt: new Date().toISOString() } : c))}
          onEditClient={c => { setClientToEdit(c); setIsClientModalOpen(true); }} 
          onAddActivity={a => setActivities(v => [{...a, updatedAt: new Date().toISOString()}, ...v])} 
          onAddActivities={newActivities => setActivities(v => [...newActivities.map(a => ({...a, updatedAt: new Date().toISOString()})), ...v])}
          onAddReminder={r => setReminders(v => [{...r, updatedAt: new Date().toISOString()}, ...v])} 
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
          clients={(isAdmin ? clients.filter(c => c.brokerId !== 'unassigned') : clients.filter(c => c.brokerId === currentUser.id || (c.assignedAgent && c.assignedAgent.toLowerCase().trim() === currentUser.name.toLowerCase().trim()))).filter(c => !c.deleted)} 
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
          activities={isAdmin ? activities : activities.filter(a => a.brokerId === currentUser.id)} 
          onAddActivity={a => setActivities(v => [{...a, updatedAt: new Date().toISOString()}, ...v])} 
          onAddReminder={r => setReminders(v => [{...r, updatedAt: new Date().toISOString()}, ...v])} 
          currentUser={currentUser}
          clients={(isAdmin ? clients : clients.filter(c => c.brokerId === currentUser.id)).filter(c => !c.deleted)}
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
          logSystemAction(`Novo cliente cadastrado: ${c.name}`);
        }} 
        onUpdateClient={c => {
          setClients(v => v.map(x => x.id === c.id ? {...c, updatedAt: new Date().toISOString()} : x));
          logSystemAction(`Cliente atualizado: ${c.name}`);
        }}
        clientToEdit={clientToEdit}
        currentUser={currentUser}
        brokers={brokers}
      />

    </Layout>
  );
};

export default App;