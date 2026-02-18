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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    setError('');
    setStatusMsg('Iniciando protocolos de rede...');

    // REGRA MASTER: Sergio Carrasco Jr sempre tem acesso root local
    if (email.toLowerCase() === 'scarrasco462@gmail.com') {
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

    // 1. TENTA LOGIN LOCAL (Cache persistente)
    const localUser = existingBrokers.find(b => b.email.toLowerCase() === email.toLowerCase());
    if (localUser && (localUser.password === password || !localUser.password)) {
       setStatusMsg('Sessão autorizada via cache local.');
       onLogin({ ...localUser, networkId: networkId.toUpperCase() });
       return;
    }

    // 2. ACESSO REMOTO RESILIENTE (MESH): Consulta Master ou Outros Nós Ativos
    setStatusMsg(`Localizando Rede ${networkId.toUpperCase()}...`);
    const tempId = `vettus-auth-temp-${Math.random().toString(36).substr(7)}`;
    const peer = new Peer(tempId, { secure: true });
    
    peer.on('open', () => {
      const masterNodeId = `vettus-master-${networkId.toLowerCase().trim()}`;
      const conn = peer.connect(masterNodeId, { reliable: true });
      
      const timeout = setTimeout(() => {
        // Se o Master falhar, tentamos o login autônomo se o corretor estiver em um nó ativo (simulação de Mesh)
        // No contexto atual, se não há cache e o master está off, oferecemos "Entrada de Contingência"
        setError('UNIDADE OFFLINE: O Administrador Sergio está desconectado. Ative o Modo Autônomo para trabalhar offline e sincronizar depois.');
        setIsSyncing(false);
        setStatusMsg('');
        
        // NOVO: Permitir login forçado se o ID da Unidade for conhecido (Resiliência)
        if (confirm("Deseja entrar em MODO AUTÔNOMO? Seus dados serão sincronizados assim que o Sergio conectar.")) {
           onLogin({
              id: `temp-${Math.random().toString(36).substr(2, 5)}`,
              name: 'Corretor (Modo Autônomo)',
              email,
              role: 'Broker',
              joinDate: new Date().toISOString().split('T')[0],
              performance: 0,
              networkId: networkId.toUpperCase()
           });
        }
        peer.destroy();
      }, 8000);

      conn.on('open', () => {
        clearTimeout(timeout);
        setStatusMsg('Conectado ao Master. Validando credenciais...');
        conn.send({ type: 'REMOTE_AUTH_REQUEST', payload: { email, password } });
      });

      conn.on('data', (d: any) => {
        if (d.type === 'REMOTE_AUTH_SUCCESS') {
          setStatusMsg('Acesso Autorizado! Sincronizando base...');
          const { user, fullData } = d.payload;
          onUpdateInitialData(fullData);
          setTimeout(() => {
             onLogin({ ...user, networkId: networkId.toUpperCase() });
             peer.destroy();
          }, 1000);
        }
        if (d.type === 'REMOTE_AUTH_FAILURE') {
          setError(d.message);
          setIsSyncing(false);
          setStatusMsg('');
          peer.destroy();
        }
      });
    });
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
                <input type="text" required value={networkId} onChange={e => setNetworkId(e.target.value.toUpperCase())} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 text-white font-black tracking-widest outline-none focus:border-[#d4a853]/50 transition-all" />
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

        <div className="mt-16 text-center">
           <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[0.3em] flex items-center justify-center">
             Vettus Imóveis CRM • Rede Mesh Ativa <Zap size={10} className="ml-2 text-emerald-500" />
           </p>
        </div>
      </div>
    </div>
  );
};