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

import { 
  Broker, Property, Client, Task, Activity, Reminder, AppView, 
  VettusDocument, Commission, ConstructionCompany, 
  CommissionForecast, LaunchProject, Campaign, RentalContract 
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

  // Estados Gerenciados (Rede Vettus)
  const [brokers, setBrokers] = useState<Broker[]>(() => {
    const local = loadLocal('brokers', MOCK_BROKERS);
    // Reset automático se detectar dados mock antigos para "zerar" a equipe conforme solicitado
    if (local.some(b => b.id === 'broker-amanda' || b.id === 'broker-roberto' || b.id === 'admin-luciana')) {
      return MOCK_BROKERS;
    }
    return local;
  });
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

  const [preselectedClientForFlow, setPreselectedClientForFlow] = useState<string | null>(null);

  // Modais
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const stateRef = useRef({ 
    brokers, properties, clients, activities, reminders, 
    commissions, commissionForecasts, documents, 
    constructionCompanies, launches, campaigns, rentals 
  });
  
  const activeConnections = useRef<Map<string, DataConnection>>(new Map());
  const peerRef = useRef<Peer | null>(null);
  const statusDebounceRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);

  // Sincronização e Auditoria de Sessão
  useEffect(() => {
    stateRef.current = { 
      brokers, properties, clients, activities, reminders, 
      commissions, commissionForecasts, documents, 
      constructionCompanies, launches, campaigns, rentals 
    };
    Object.entries(stateRef.current).forEach(([k, v]) => localStorage.setItem(STORAGE_KEY_PREFIX + k, JSON.stringify(v)));
    
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'session_user', JSON.stringify(currentUser));
      const isSergio = currentUser.email.toLowerCase() === 'scarrasco462@gmail.com';
      if (!isSergio) {
         const stillExists = brokers.find(b => b.id === currentUser.id);
         if (!stillExists || stillExists.blocked || stillExists.deleted) handleLogout();
      }
    }
  }, [brokers, properties, clients, activities, reminders, commissions, commissionForecasts, documents, constructionCompanies, launches, campaigns, rentals, currentUser]);

  const handleLogout = () => {
    if (peerRef.current) peerRef.current.destroy();
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'session_user');
    setCurrentUser(null);
  };

  const mergeData = useCallback((payload: any) => {
    if (!payload) return;
    
    const updateCollection = (prev: any[], next: any[]) => {
      if (!next) return prev;
      const map = new Map(prev.map(item => [item.id, item]));
      next.forEach(item => {
        const existing = map.get(item.id);
        if (!existing || new Date(item.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
           map.set(item.id, item);
        }
      });
      return Array.from(map.values());
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

    if (currentUser?.role === 'Admin') {
       localStorage.setItem(STORAGE_KEY_PREFIX + 'last_sync_backup', JSON.stringify(stateRef.current));
    }
  }, [currentUser]);

  // Broadcast Automático
  useEffect(() => {
    if (activeConnections.current.size > 0) {
      const payload = { 
        brokers, properties, clients, activities, reminders, 
        commissions, commissionForecasts, documents, 
        constructionCompanies, launches, campaigns, rentals 
      };
      activeConnections.current.forEach(conn => {
        if (conn.open) {
          try { conn.send({ type: 'DATA_UPDATE', payload }); } catch { activeConnections.current.delete(conn.peer); }
        }
      });
    }
  }, [brokers, properties, clients, activities, reminders, commissions, commissionForecasts, documents, constructionCompanies, launches, campaigns, rentals]);

  // PeerJS Kernel v6.0 - Protocolo Ultra-Resiliente
  const initPeer = useCallback(() => {
    if (!currentUser) return;
    
    if (statusDebounceRef.current) clearTimeout(statusDebounceRef.current);
    setSyncStatus('syncing');

    const netId = (currentUser.networkId || 'VETTUS-PRO').toLowerCase().trim();
    const masterId = `vettus-master-${netId}`;
    const sessionSuffix = Math.random().toString(36).substring(7);
    const myId = currentUser.role === 'Admin' ? masterId : `vettus-node-${netId}-${currentUser.id}-${sessionSuffix}`;
    
    // Destruir anterior se existir
    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
    }

    const peer = new Peer(myId, { 
      secure: true, 
      debug: 1,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        sdpSemantics: 'unified-plan'
      }
    });

    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('Kernel P2P On:', id);
      reconnectAttemptsRef.current = 0;
      setSyncStatus('synced');
      
      if (currentUser.role !== 'Admin') {
        connectToMaster();
      }
    });

    const connectToMaster = () => {
      if (!peer || peer.destroyed || peer.disconnected) return;
      
      const conn = peer.connect(masterId, { reliable: true });
      
      conn.on('open', () => {
        activeConnections.current.set(conn.peer, conn);
        conn.on('data', (d: any) => {
           if (d.type === 'DATA_UPDATE') mergeData(d.payload);
           if (d.type === 'PING') conn.send({ type: 'PONG' });
        });
        conn.send({ type: 'DATA_UPDATE', payload: stateRef.current });
      });

      conn.on('error', () => {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        setTimeout(connectToMaster, delay);
        reconnectAttemptsRef.current++;
      });
    };

    peer.on('connection', (conn) => {
      activeConnections.current.set(conn.peer, conn);
      
      conn.on('data', (d: any) => {
        if (d.type === 'DATA_UPDATE') mergeData(d.payload);
        if (d.type === 'PING') conn.send({ type: 'PONG' });
        
        if (d.type === 'REMOTE_AUTH_REQUEST' && currentUser.role === 'Admin') {
           const { email, password } = d.payload;
           const broker = stateRef.current.brokers.find(b => b.email.toLowerCase() === email.toLowerCase());
           if (broker && (broker.password === password || !broker.password)) {
              if (broker.blocked || broker.deleted) {
                conn.send({ type: 'REMOTE_AUTH_FAILURE', message: 'ACESSO SUSPENSO.' });
              } else {
                conn.send({ type: 'REMOTE_AUTH_SUCCESS', payload: { user: broker, fullData: stateRef.current } });
              }
           } else {
              conn.send({ type: 'REMOTE_AUTH_FAILURE', message: 'Credenciais inválidas.' });
           }
        }
      });
      
      conn.on('open', () => conn.send({ type: 'DATA_UPDATE', payload: stateRef.current }));
    });

    peer.on('disconnected', () => {
      // Debounce de 3 segundos para evitar flapping visual
      statusDebounceRef.current = setTimeout(() => {
        setSyncStatus('disconnected');
        if (!peer.destroyed) peer.reconnect();
      }, 3000);
    });

    peer.on('error', (err) => {
      console.error('Peer Protocol Alert:', err.type);
      setSyncStatus('disconnected');
      
      if (err.type === 'unavailable-id' as any) {
         // Se o ID Master estiver preso, esperar 10s para expirar a sessão anterior
         peer.destroy();
         setTimeout(initPeer, 10000); 
      } else if (err.type === 'network' || err.type === 'socket-error') {
         peer.destroy();
         setTimeout(initPeer, 5000);
      }
    });

  }, [currentUser, mergeData]);

  useEffect(() => {
    if (currentUser) {
      initPeer();
      
      // Heartbeat a cada 25s para manter túnel NAT aberto
      const heartbeat = setInterval(() => {
        activeConnections.current.forEach(conn => {
          if (conn.open) conn.send({ type: 'PING' });
        });
      }, 25000);

      // Visibility Handler: Destruir ao sair, recriar ao voltar (Economia de Recursos/IDs)
      const handleVisibility = () => {
        if (document.visibilityState === 'hidden') {
          if (peerRef.current) peerRef.current.destroy();
        } else {
          initPeer();
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('beforeunload', () => peerRef.current?.destroy());

      return () => {
        clearInterval(heartbeat);
        document.removeEventListener('visibilitychange', handleVisibility);
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
      onForceReconnect={initPeer}
    >
      {currentView === 'dashboard' && (
        <Dashboard 
          onNavigate={setCurrentView} 
          currentUser={currentUser} 
          statsData={{ 
            properties, clients, tasks: [], activities, reminders, 
            commissions, campaigns, systemLogs: [], 
            onlineBrokers: Array.from(activeConnections.current.keys()), 
            commissionForecasts 
          }} 
        />
      )}

      {currentView === 'properties' && (
        <PropertyView 
          properties={properties} 
          currentUser={currentUser} 
          brokers={brokers} 
          onAddProperty={p => setProperties(v => [p, ...v])} 
          onEditProperty={p => { setPropertyToEdit(p); setIsPropertyModalOpen(true); }} 
          onDeleteProperty={id => setProperties(v => v.filter(x => x.id !== id))} 
          onOpenAddModal={() => { setPropertyToEdit(null); setIsPropertyModalOpen(true); }} 
          availableTypes={['Apartamento', 'Casa', 'Terreno', 'Cobertura']} 
          availableStatuses={['Disponível', 'Vendido', 'Reservado', 'Lançamento']} 
          onAddType={() => {}} 
          onAddStatus={() => {}} 
        />
      )}

      {currentView === 'clients' && (
        <ClientView 
          clients={isAdmin ? clients : clients.filter(c => c.brokerId === currentUser.id)} 
          activities={isAdmin ? activities : activities.filter(a => clients.some(c => c.name === a.clientName && c.brokerId === currentUser.id))} 
          properties={properties} 
          commissions={commissions} 
          constructionCompanies={constructionCompanies} 
          commissionForecasts={commissionForecasts} 
          currentUser={currentUser} 
          brokers={brokers} 
          onAddClient={c => setClients(v => [{...c, updatedAt: new Date().toISOString()}, ...v])} 
          onUpdateClient={c => setClients(v => v.map(x => x.id === c.id ? {...c, updatedAt: new Date().toISOString()} : x))} 
          onDeleteClient={id => setClients(v => v.filter(x => x.id !== id))} 
          onEditClient={c => { setClientToEdit(c); setIsClientModalOpen(true); }} 
          onAddActivity={a => setActivities(v => [a, ...v])} 
          onAddReminder={r => setReminders(v => [r, ...v])} 
          onAddSale={s => setCommissions(v => [s, ...v])} 
          onUpdateProperty={p => setProperties(v => v.map(x => x.id === p.id ? p : x))} 
          onAddForecasts={f => setCommissionForecasts(v => [...f, ...v])} 
          onOpenAddModal={() => { setClientToEdit(null); setIsClientModalOpen(true); }}
          onOpenImport={() => setCurrentView('lead_import')}
          onOpenFlow={(clientId) => { setPreselectedClientForFlow(clientId); setCurrentView('client_payment_flow'); }}
        />
      )}

      {currentView === 'tasks' && (
        <TasksView 
          clients={isAdmin ? clients.filter(c => c.brokerId !== 'unassigned') : clients.filter(c => c.brokerId === currentUser.id)} 
          currentUser={currentUser} 
          onUpdateClient={c => setClients(v => v.map(x => x.id === c.id ? c : x))} 
          onAddActivity={a => setActivities(v => [a, ...v])} 
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
        />
      )}

      {currentView === 'client_payment_flow' && (
        <ClientPaymentFlowView 
          commissions={commissions} 
          brokers={brokers}
          clients={clients}
          properties={properties}
          launches={launches}
          currentUser={currentUser}
          onUpdateSale={s => setCommissions(v => v.map(x => x.id === s.id ? s : x))}
          onAddSale={s => setCommissions(v => [s, ...v])}
          onDeleteSale={id => setCommissions(v => v.filter(x => x.id !== id))}
          preselectedClientId={preselectedClientForFlow}
          onClearPreselection={() => setPreselectedClientForFlow(null)}
        />
      )}

      {currentView === 'sales' && (
        <SalesView 
          sales={commissions} 
          brokers={brokers} 
          currentUser={currentUser}
          onUpdateSale={s => setCommissions(v => v.map(x => x.id === s.id ? s : x))}
        />
      )}

      {currentView === 'marketing' && (
        <MarketingView 
          campaigns={campaigns} 
          clients={clients} 
          currentUser={currentUser} 
          brokers={brokers}
        />
      )}

      {currentView === 'activities' && (
        <ActivityView 
          activities={isAdmin ? activities : activities.filter(a => a.brokerId === currentUser.id)} 
          onAddActivity={a => setActivities(v => [a, ...v])} 
          onAddReminder={r => setReminders(v => [r, ...v])} 
          currentUser={currentUser}
          clients={isAdmin ? clients : clients.filter(c => c.brokerId === currentUser.id)}
        />
      )}

      {currentView === 'brokers' && (
        <BrokersView 
          brokers={brokers} 
          onAddBroker={b => setBrokers(v => [...v, b])} 
          onUpdateBroker={b => setBrokers(v => v.map(x => x.id === b.id ? b : x))} 
          onDeleteBroker={handleDeleteBrokerWithLeadSafeguard} 
          onAddActivity={a => setActivities(v => [a, ...v])}
          currentUser={currentUser}
        />
      )}

      {currentView === 'password_update' && (
        <PasswordUpdateView 
          currentUser={currentUser}
          onUpdateBroker={b => setBrokers(v => v.map(x => x.id === b.id ? b : x))}
        />
      )}

      {currentView === 'lead_import' && (
        <LeadImport 
          unassignedLeads={clients.filter(c => c.brokerId === 'unassigned')}
          brokers={brokers}
          currentUser={currentUser}
          onImportLeads={ls => setClients(v => [...v, ...ls])}
          onUpdateLead={l => {
             if (l.brokerId !== 'unassigned') {
                const newReminder: Reminder = {
                   id: Math.random().toString(36).substr(2, 9),
                   brokerId: l.brokerId,
                   title: `NOVO LEAD ATRIBUÍDO: ${l.name}`,
                   dueDate: new Date().toISOString().split('T')[0],
                   priority: 'High',
                   completed: false,
                   type: 'new_lead',
                   updatedAt: new Date().toISOString()
                };
                setReminders(prev => [newReminder, ...prev]);
             }
             setClients(v => v.map(x => x.id === l.id ? l : x));
          }}
        />
      )}

      {currentView === 'documents' && (
        <DocumentsView 
          documents={documents} 
          onUpload={d => setDocuments(v => [d, ...v])} 
          onDelete={id => setDocuments(v => v.filter(x => x.id !== id))} 
          currentUser={currentUser}
        />
      )}

      {currentView === 'construction_companies' && (
        <ConstructionCompaniesView 
          companies={constructionCompanies} 
          forecasts={commissionForecasts} 
          onAddCompany={c => setConstructionCompanies(v => [...v, c])} 
          onAddForecasts={f => setCommissionForecasts(v => [...v, ...f])}
          currentUser={currentUser}
        />
      )}

      {currentView === 'launches' && (
        <LaunchesView 
          launches={launches} 
          clients={clients}
          brokers={brokers}
          currentUser={currentUser} 
          onAddLaunch={l => setLaunches(v => [l, ...v])}
          onUpdateLaunch={l => setLaunches(v => v.map(x => x.id === l.id ? l : x))}
        />
      )}

      {currentView === 'leasing' && (
        <LeasingView 
          rentals={rentals} 
          properties={properties} 
          currentUser={currentUser} 
          onAddRental={r => setRentals(v => [r, ...v])} 
        />
      )}

      {currentView === 'ads' && (
        <AdsView properties={properties} currentUser={currentUser} />
      )}

      {currentView === 'spreadsheets' && (
        <SpreadsheetsView 
          brokers={brokers} 
          clients={clients} 
          commissions={commissions} 
          properties={properties} 
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
            localStorage.setItem(STORAGE_KEY_PREFIX + 'last_backup_date', new Date().toISOString());
          }} 
        />
      )}

      <NewPropertyModal 
        isOpen={isPropertyModalOpen} 
        onClose={() => setIsPropertyModalOpen(false)} 
        onAddProperty={p => setProperties(v => [p, ...v])} 
        onUpdateProperty={p => setProperties(v => v.map(x => x.id === p.id ? p : x))}
        propertyToEdit={propertyToEdit}
        currentUser={currentUser}
        brokers={brokers}
        availableTypes={['Apartamento', 'Casa', 'Terreno', 'Cobertura']}
        availableStatuses={['Disponível', 'Vendido', 'Reservado', 'Lançamento']}
      />

      <NewClientModal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)} 
        onAddClient={c => setClients(v => [c, ...v])} 
        onUpdateClient={c => setClients(v => v.map(x => x.id === c.id ? c : x))}
        clientToEdit={clientToEdit}
        currentUser={currentUser}
        brokers={brokers}
      />
    </Layout>
  );
};

export default App;