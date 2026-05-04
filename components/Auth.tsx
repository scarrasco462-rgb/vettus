import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, Sparkles, Globe, RefreshCw, Wifi, AlertTriangle, Zap } from 'lucide-react';
import { Peer } from 'peerjs';
import { Broker, ALL_PERMISSIONS } from '../types.ts';
import { VettusLogoFull } from './Layout.tsx';

interface AuthProps {
  onLogin: (user: Broker) => void;
  existingBrokers: Broker[];
  onUpdateInitialData: (payload: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, existingBrokers, onUpdateInitialData }) => {
  const [networkId, setNetworkId] = useState(() => localStorage.getItem('vettus_network_id') || 'VETTUS-PRO');
  const [email, setEmail] = useState(() => localStorage.getItem('vettus_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleNetworkIdChange = (val: string) => {
    const id = val.toUpperCase().trim();
    setNetworkId(id);
    localStorage.setItem('vettus_network_id', id);
  };

  const pendingChunksAuth = React.useRef<Map<string, { total: number, chunks: string[] }>>(new Map());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    setError('');
    setStatusMsg('Iniciando protocolos de rede...');
    localStorage.setItem('vettus_remembered_email', email);

    // REGRA MASTER: Sergio Carrasco Jr sempre tem acesso root local
    const isSergio = email.toLowerCase() === 'scarrasco462@gmail.com' || email.toLowerCase() === 'sergioconsultorimobiliario01@gmail.com';
    if (isSergio) {
       onLogin({
          id: 'admin-sergio',
          name: 'Sergio Carrasco Junior',
          email,
          role: 'Admin',
          joinDate: '2024-01-01',
          performance: 100,
          networkId: networkId.toUpperCase(),
          permissions: ALL_PERMISSIONS
       });
       return;
    }

    // 1. TENTA LOGIN LOCAL (Cache persistente em memória e storage)
    let localBrokers = [...existingBrokers];
    if (localBrokers.length <= 2) {
       try {
          const stored = localStorage.getItem('vettus_v3_core_brokers');
          if (stored) {
             const parsed = JSON.parse(stored);
             if (Array.isArray(parsed)) localBrokers = parsed;
          }
       } catch (e) {}
    }

    const emailTrim = email.toLowerCase().trim();
    const passwordTrim = password.trim();
    const localUser = localBrokers.find(b => b.email.toLowerCase().trim() === emailTrim && !b.deleted);
    if (localUser && (localUser.password === passwordTrim || (!localUser.password && !passwordTrim))) {
       setStatusMsg('Sessão autorizada via cache local.');
       onLogin({ ...localUser, networkId: networkId.toUpperCase() });
       return;
    }

    // 2. CHECK VIA BROADCAST CHANNEL (Outra aba no mesmo PC)
    setStatusMsg('Consultando sessões locais ativas...');
    const authChannel = new BroadcastChannel('vettus_internal_sync_auth');
    let authResponded = false;

    const authTimeout = setTimeout(() => {
       if (!authResponded) {
          authChannel.close();
          proceedToRemoteAuth();
       }
    }, 1500);

    authChannel.onmessage = (e) => {
       if (e.data.type === 'AUTH_RESPONSE' && e.data.success) {
          authResponded = true;
          clearTimeout(authTimeout);
          setStatusMsg('Login autorizado via aba local ativa.');
          onUpdateInitialData(e.data.fullData);
          onLogin({ ...e.data.user, networkId: networkId.toUpperCase() });
          authChannel.close();
       }
    };

    authChannel.postMessage({ type: 'AUTH_REQUEST', email, password });

    function proceedToRemoteAuth() {
       // 3. ACESSO REMOTO RESILIENTE (MESH): Consulta Master ou Outros Nós Ativos
       setStatusMsg(`Localizando Master da Unidade ${networkId.toUpperCase()}...`);
       const tempId = `vettus-auth-temp-${Math.random().toString(36).substr(7)}`;
       
       const peer = (() => {
         try {
           return new Peer(tempId, { 
             secure: true,
             debug: 0,
             config: {
               iceServers: [
                 { urls: 'stun:stun.l.google.com:19302' },
                 { urls: 'stun:stun1.l.google.com:19302' },
                 { urls: 'stun:stun2.l.google.com:19302' },
                 { urls: 'stun:stun3.l.google.com:19302' },
                 { urls: 'stun:stun4.l.google.com:19302' },
                 { urls: 'stun:global.stun.twilio.com:3478' },
                 { urls: 'stun:stun.voiparound.com:3478' },
                 { urls: 'stun:stun.voxgratia.org:3478' }
               ],
               iceCandidatePoolSize: 10,
               sdpSemantics: 'unified-plan'
             }
           });
         } catch (e) {
           console.error('Erro ao instanciar Peer de Autenticação:', e);
           return null;
         }
       })();

       if (!peer) {
         setError('Falha ao iniciar protocolo de rede. Tente novamente.');
         setIsSyncing(false);
         return;
       }
       
       peer.on('error', (err) => {
         console.warn('Auth Peer Error:', err.type);
         if (err.type === 'peer-unavailable') {
            setError(`UNIDADE MASTER OFFLINE: O Administrador (Sergio) precisa estar com o sistema aberto para autorizar seu primeiro acesso neste notebook. Verifique também se o "Identificador da Unidade" (${networkId}) está correto.`);
            setIsSyncing(false);
            setStatusMsg('');
         } else if (err.type === 'network') {
            setError('FALHA DE REDE: Verifique sua conexão com a internet. O sistema não conseguiu alcançar a rede global PeerJS.');
            setIsSyncing(false);
         } else {
            setError(`Erro de Protocolo (${err.type}). Tente atualizar a página ou usar o Google Chrome.`);
            setIsSyncing(false);
         }
       });

       peer.on('open', () => {
         const masterNodeId = `vettus-master-${networkId.toLowerCase().trim()}`;
         const conn = peer.connect(masterNodeId, { reliable: true });
         
         const timeout = setTimeout(() => {
           setError(`CONEXÃO P2P: Timeout ao conectar com a Unidade Sergio (${networkId}). Verifique se ele está online.`);
           setIsSyncing(false);
           setStatusMsg('');
           peer.destroy();
         }, 25000);

         const handleAuthData = (d: any) => {
           if (!d) return;

           // REASSEMBLY DE CHUNKS
           if (d.type === 'DATA_CHUNK') {
             const { chunkId, index, total, data } = d;
             let record = pendingChunksAuth.current.get(chunkId);
             if (!record) {
               record = { total, chunks: new Array(total).fill('') };
               pendingChunksAuth.current.set(chunkId, record);
             }
             
             record.chunks[index] = data;
             const receivedCount = record.chunks.filter(c => c !== '').length;
             
             setStatusMsg(`Sincronizando: ${Math.round((receivedCount / total) * 100)}%...`);

             if (receivedCount === total) {
               try {
                 const completeData = JSON.parse(record.chunks.join(''));
                 pendingChunksAuth.current.delete(chunkId);
                 handleAuthData(completeData);
               } catch (e) {
                 console.error('Auth: Erro ao reconstruir chunk de dados:', e);
               }
             }
             return;
           }

           if (d.type === 'REMOTE_AUTH_SUCCESS') {
             setStatusMsg('Acesso Autorizado! Sincronizando base...');
             const { user, fullData } = d.payload;
             onUpdateInitialData(fullData);
             setTimeout(() => {
                onLogin({ ...user, networkId: networkId.toUpperCase() });
                peer.destroy();
             }, 1000);
           } else if (d.type === 'REMOTE_AUTH_FAILURE') {
             setError(d.message);
             setIsSyncing(false);
             setStatusMsg('');
             peer.destroy();
           }
         };

         conn.on('open', () => {
           clearTimeout(timeout);
           setStatusMsg('Conectado ao Master. Validando credenciais...');
           try {
             conn.send({ type: 'REMOTE_AUTH_REQUEST', payload: { email: emailTrim, password } });
           } catch (e) {
             setError('Falha na comunicação com o Master. Tente novamente.');
             setIsSyncing(false);
           }
         });

         conn.on('data', (d: any) => handleAuthData(d));
       });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[140px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#d4a853]/5 rounded-full blur-[140px]"></div>
      </div>

      <div className="w-full max-w-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-12">
          <VettusLogoFull />
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.02] backdrop-blur-2xl p-10 rounded-[3.5rem] border border-white/10 shadow-2xl space-y-6 max-w-md mx-auto">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#d4a853] uppercase ml-2 tracking-widest block">Identificador da Unidade</label>
              <div className="relative group">
                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[#d4a853]" />
                <input 
                  type="text" 
                  required 
                  value={networkId} 
                  onChange={e => handleNetworkIdChange(e.target.value)} 
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 text-white font-black tracking-widest outline-none focus:border-[#d4a853]/50 transition-all uppercase" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest block">E-mail Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[#d4a853]" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 text-white outline-none focus:border-[#d4a853]/50 transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest block">Senha de Acesso</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[#d4a853]" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 text-white outline-none focus:border-[#d4a853]/50 transition-all" />
              </div>
            </div>
          </div>

          {statusMsg && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-center justify-center space-x-3">
               <RefreshCw size={14} className="text-blue-400 animate-spin" />
               <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{statusMsg}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start space-x-3">
               <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
               <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest leading-relaxed">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSyncing} className="w-full gold-gradient text-black py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <><span>Entrar na Unidade</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="mt-16 text-center space-y-4">
           <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[0.3em] flex items-center justify-center">
             Vettus Imóveis CRM • Rede Mesh Ativa <Zap size={10} className="ml-2 text-emerald-500" />
           </p>
           {isSyncing && (
             <p className="text-[8px] text-slate-700 font-mono">
               Handshake: vettus-auth-{Math.random().toString(36).substr(7)} &raquo; vettus-master-{networkId.toLowerCase().trim()}
             </p>
           )}
        </div>
      </div>
    </div>
  );
};