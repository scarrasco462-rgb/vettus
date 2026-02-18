import React, { useState, useRef, useMemo } from 'react';
import { getAISuggestions } from '../services/gemini';
import { 
  Megaphone, 
  Users, 
  Sparkles, 
  Play, 
  Plus, 
  Zap, 
  Mail, 
  Send, 
  AtSign, 
  Type, 
  Image as ImageIcon, 
  X, 
  Paperclip, 
  CheckCircle2, 
  UserCheck, 
  Search, 
  RefreshCw,
  MessageSquare,
  Smartphone,
  QrCode,
  Filter,
  Check
} from 'lucide-react';
import { Campaign, Client, Broker, ClientStatus } from '../types';

interface MarketingViewProps {
  campaigns: Campaign[];
  clients: Client[];
  currentUser: Broker;
  brokers: Broker[]; // Adicionado para permitir filtro por corretor
}

export const MarketingView: React.FC<MarketingViewProps> = ({ campaigns, clients, currentUser, brokers = [] }) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'email' | 'whatsapp' | 'ai'>('campaigns');
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  // Email State
  const [emailOrigin, setEmailOrigin] = useState(currentUser.email);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [emailImage, setEmailImage] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');

  // WhatsApp State
  const [waBrokerFilter, setWaBrokerFilter] = useState(currentUser.role === 'Admin' ? 'all' : currentUser.id);
  const [waSelectedClients, setWaSelectedClients] = useState<string[]>([]);
  const [waMessage, setWaMessage] = useState('');
  const [waConnected, setWaConnected] = useState(false);
  const [waConnecting, setWaConnecting] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const [waProgress, setWaProgress] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    const contextPrefix = activeTab === 'whatsapp' ? 'Crie uma mensagem curta e persuasiva para WhatsApp' : 'Crie um texto curto e extremamente sofisticado para um e-mail VIP';
    const result = await getAISuggestions(`Como especialista de marketing da Vettus Imóveis, ${contextPrefix} sobre: ${aiPrompt}. O tom deve ser de exclusividade total.`);
    setAiResult(result);
    setLoadingAI(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmailImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendEmail = () => {
    if (selectedRecipients.length === 0 || !emailSubject || !emailBody) {
      alert("Preencha o assunto, corpo do e-mail e selecione pelo menos um destinatário.");
      return;
    }
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      setEmailSentSuccess(true);
      setTimeout(() => setEmailSentSuccess(false), 3000);
      setEmailSubject('');
      setEmailBody('');
      setEmailImage(null);
      setSelectedRecipients([]);
    }, 2000);
  };

  // WhatsApp Logic
  const waFilteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesBroker = waBrokerFilter === 'all' || c.brokerId === waBrokerFilter;
      return matchesBroker && c.phone;
    });
  }, [clients, waBrokerFilter]);

  const handleConnectWa = () => {
    setWaConnecting(true);
    setTimeout(() => {
      setWaConnecting(false);
      setWaConnected(true);
    }, 3000);
  };

  const handleSendWa = () => {
    if (!waConnected) {
      alert("Conecte seu WhatsApp primeiro lendo o QR Code.");
      return;
    }
    if (waSelectedClients.length === 0 || !waMessage) {
      alert("Selecione os clientes e digite a mensagem.");
      return;
    }

    setSendingWa(true);
    setWaProgress(0);
    
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setWaProgress(Math.round((current / waSelectedClients.length) * 100));
      if (current >= waSelectedClients.length) {
        clearInterval(interval);
        setTimeout(() => {
          setSendingWa(false);
          alert(`Campanha finalizada! ${waSelectedClients.length} mensagens enviadas com sucesso.`);
          setWaSelectedClients([]);
          setWaMessage('');
        }, 1000);
      }
    }, 500);
  };

  const toggleWaClient = (id: string) => {
    setWaSelectedClients(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredRecipients = clients.filter(c => 
    c.email && (c.name.toLowerCase().includes(recipientSearch.toLowerCase()) || c.email.toLowerCase().includes(recipientSearch.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Marketing de Elite</h1>
          <p className="text-slate-500 font-medium">Gestão de autoridade e prospecção multicanal Vettus.</p>
        </div>
        <div className="flex items-center space-x-2 bg-[#d4a853]/10 px-4 py-2 rounded-xl border border-[#d4a853]/20">
           <Zap className="w-4 h-4 text-[#d4a853]" />
           <span className="text-[10px] font-black uppercase tracking-widest text-[#d4a853]">Potencializador de Rede</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
        {[
          { id: 'campaigns', label: 'Dashboard', icon: Megaphone },
          { id: 'email', label: 'E-mail VIP', icon: Mail },
          { id: 'whatsapp', label: 'WhatsApp VIP', icon: MessageSquare },
          { id: 'ai', label: 'Copywriting AI', icon: Sparkles },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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

      {/* ABA: DASHBOARD */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:shadow-xl transition-all">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
                <Plus className="w-24 h-24 text-slate-900" />
             </div>
             <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                <Plus className="w-6 h-6 text-[#d4a853]" />
             </div>
             <h3 className="text-xl font-bold text-slate-900">Nova Estratégia</h3>
             <p className="text-slate-400 text-sm mt-2 mb-8">Defina novos canais de prospecção para sua carteira VIP.</p>
             <button className="gold-gradient text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Criar Campanha</button>
          </div>
          {campaigns.map(campaign => (
            <div key={campaign.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-[#0f172a] text-[#d4a853] rounded-2xl flex items-center justify-center shadow-lg">
                  <Megaphone className="w-5 h-5" />
                </div>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                  campaign.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                  {campaign.status === 'Active' ? 'Em Veiculação' : 'Rascunho'}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1 uppercase tracking-tight">{campaign.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6 flex items-center">
                <Users className="w-3 h-3 mr-1.5 text-[#d4a853]" />
                Público: {campaign.segment}
              </p>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-900">{campaign.sentCount}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Impactos</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] font-black text-emerald-600">{campaign.openRate}%</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Abertura</p>
                 </div>
                 <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-[#d4a853] transition-colors"><Play className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA: WHATSAPP VIP (NOVA) */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna 1: Status e Filtros */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`p-8 rounded-[2.5rem] border shadow-xl transition-all ${waConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
               <div className="flex items-center space-x-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${waConnected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                     <Smartphone className="w-8 h-8" />
                  </div>
                  <div>
                     <h3 className="text-sm font-black uppercase text-slate-900">WhatsApp Vettus-Sync</h3>
                     <p className={`text-[9px] font-black uppercase tracking-widest ${waConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {waConnected ? 'Conectado e Pronto' : 'Aguardando Conexão'}
                     </p>
                  </div>
               </div>

               {!waConnected ? (
                 <div className="space-y-4">
                    <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col items-center">
                       {waConnecting ? (
                          <div className="py-10 flex flex-col items-center">
                             <RefreshCw className="w-12 h-12 text-[#d4a853] animate-spin mb-4" />
                             <span className="text-[10px] font-black text-slate-400 uppercase">Validando Sessão...</span>
                          </div>
                       ) : (
                          <>
                             <div className="w-32 h-32 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 mb-4 opacity-40">
                                <QrCode className="w-20 h-20 text-slate-900" />
                             </div>
                             <button 
                               onClick={handleConnectWa}
                               className="bg-[#0f172a] text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                             >
                               Gerar QR Code
                             </button>
                          </>
                       )}
                    </div>
                    <p className="text-[9px] text-center text-slate-400 italic">Abra o WhatsApp no seu celular e leia o código para vincular a conta da imobiliária.</p>
                 </div>
               ) : (
                 <div className="bg-white p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <span className="text-xs font-bold text-slate-700">Sessão Ativa</span>
                    </div>
                    <button onClick={() => setWaConnected(false)} className="text-[9px] font-black text-red-500 uppercase hover:underline">Desconectar</button>
                 </div>
               )}
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg">
               <div className="flex items-center space-x-2 mb-6 border-b pb-4">
                  <Filter className="w-4 h-4 text-[#d4a853]" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Filtrar Carteira</h3>
               </div>
               
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Corretor Responsável</label>
                     <select 
                       value={waBrokerFilter} 
                       onChange={e => setWaBrokerFilter(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 outline-none focus:border-[#d4a853]"
                     >
                        <option value="all">Toda a Rede Vettus</option>
                        {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                     </select>
                  </div>
                  <div className="pt-4 flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-400 uppercase">Total na Carteira:</span>
                     <span className="text-xs font-black text-slate-900">{waFilteredClients.length} Leads</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Coluna 2: Seleção e Mensagem */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
                <div className="navy-gradient p-8 text-white flex items-center justify-between">
                   <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                         <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                         <h2 className="text-2xl font-black uppercase tracking-tight">Campanha Direct WhatsApp</h2>
                         <p className="text-[#d4a853] text-[9px] font-black uppercase tracking-[0.3em]">Comunicação de Alta Performance</p>
                      </div>
                   </div>
                   {sendingWa && (
                     <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center space-x-3">
                        <RefreshCw className="w-4 h-4 text-[#d4a853] animate-spin" />
                        <span className="text-[10px] font-black uppercase">{waProgress}% Concluído</span>
                     </div>
                   )}
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Seleção de Leads */}
                   <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                         <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Selecionar Destinatários</h4>
                         <button 
                           onClick={() => setWaSelectedClients(waFilteredClients.map(c => c.id))}
                           className="text-[9px] font-black text-[#d4a853] uppercase hover:underline"
                         >
                           Selecionar Todos
                         </button>
                      </div>
                      <div className="bg-slate-50 rounded-3xl border border-slate-100 p-4 max-h-[400px] overflow-y-auto no-scrollbar space-y-2">
                         {waFilteredClients.map(client => (
                            <button 
                              key={client.id}
                              onClick={() => toggleWaClient(client.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                                waSelectedClients.includes(client.id) 
                                ? 'bg-slate-900 border-slate-900 text-white' 
                                : 'bg-white border-slate-100 hover:border-[#d4a853]'
                              }`}
                            >
                               <div className="flex items-center space-x-3 overflow-hidden">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                     waSelectedClients.includes(client.id) ? 'bg-[#d4a853]' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                     {client.name[0]}
                                  </div>
                                  <div className="truncate">
                                     <p className="text-[11px] font-bold truncate">{client.name}</p>
                                     <p className="text-[9px] opacity-60 truncate">{client.phone}</p>
                                  </div>
                               </div>
                               {waSelectedClients.includes(client.id) && <Check className="w-4 h-4 text-[#d4a853]" />}
                            </button>
                         ))}
                         {waFilteredClients.length === 0 && <p className="text-center py-20 text-xs text-slate-400 italic">Nenhum cliente com telefone nesta carteira.</p>}
                      </div>
                   </div>

                   {/* Compositor */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sua Mensagem VIP</h4>
                         <button 
                           onClick={() => setActiveTab('ai')}
                           className="text-[9px] font-black text-[#d4a853] uppercase flex items-center hover:underline"
                         >
                           <Sparkles className="w-3 h-3 mr-1" /> Vettus AI
                         </button>
                      </div>
                      
                      <div className="relative">
                         <textarea 
                           value={waMessage}
                           onChange={e => setWaMessage(e.target.value)}
                           placeholder="Olá [Nome], sou da Vettus Imóveis e tenho uma oportunidade exclusiva que acaba de entrar no portfólio..."
                           className="w-full h-64 bg-slate-50 border border-slate-200 rounded-[2rem] p-6 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 resize-none"
                         />
                         <div className="absolute bottom-4 right-6 text-[9px] font-black text-slate-400 uppercase">
                            {waMessage.length} Caracteres
                         </div>
                      </div>

                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start space-x-3">
                         <Zap className="w-5 h-5 text-emerald-600 shrink-0" />
                         <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                            <strong>Dica Vettus:</strong> Mensagens personalizadas com o nome do cliente aumentam a conversão em até 40%. Use gatilhos de escassez.
                         </p>
                      </div>

                      <button 
                        onClick={handleSendWa}
                        disabled={sendingWa || waSelectedClients.length === 0 || !waConnected}
                        className="w-full gold-gradient text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-yellow-900/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                      >
                         {sendingWa ? (
                           <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              <span>Enviando {waProgress}%</span>
                           </>
                         ) : (
                           <>
                              <Send className="w-4 h-4" />
                              <span>Disparar para {waSelectedClients.length} Clientes</span>
                           </>
                         )}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ABA: E-MAIL VIP */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 h-fit">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center">
                       <UserCheck className="w-4 h-4 mr-2 text-[#d4a853]" />
                       Destinatários
                    </h3>
                    <button onClick={() => setSelectedRecipients(clients.filter(c => c.email).map(c => c.email))} className="text-[9px] font-black uppercase text-[#d4a853] hover:underline">Selecionar Todos</button>
                 </div>
                 <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                       type="text" 
                       placeholder="Buscar lead ou e-mail..." 
                       value={recipientSearch}
                       onChange={e => setRecipientSearch(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-slate-900 outline-none focus:border-[#d4a853]"
                    />
                 </div>
                 <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                    {filteredRecipients.map(client => (
                       <button 
                         key={client.id}
                         onClick={() => setSelectedRecipients(prev => prev.includes(client.email) ? prev.filter(e => e !== client.email) : [...prev, client.email])}
                         className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                           selectedRecipients.includes(client.email) 
                           ? 'bg-[#0f172a] border-[#0f172a] text-white' 
                           : 'bg-slate-50 border-slate-100 hover:border-[#d4a853]/50'
                         }`}
                       >
                          <div className="flex items-center space-x-3">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                               selectedRecipients.includes(client.email) ? 'bg-[#d4a853] text-white' : 'bg-white text-slate-900 border border-slate-200'
                             }`}>
                                {client.name[0]}
                             </div>
                             <div className="min-w-0">
                                <p className="text-[11px] font-bold truncate">{client.name}</p>
                                <p className={`text-[9px] truncate font-medium ${selectedRecipients.includes(client.email) ? 'text-slate-400' : 'text-slate-500'}`}>{client.email}</p>
                             </div>
                          </div>
                          {selectedRecipients.includes(client.email) && <CheckCircle2 className="w-3.5 h-3.5 text-[#d4a853]" />}
                       </button>
                    ))}
                    {filteredRecipients.length === 0 && <p className="text-center py-10 text-xs text-slate-400 italic">Nenhum e-mail disponível.</p>}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
                 <div className="navy-gradient p-8 text-white">
                    <div className="flex items-center space-x-4 mb-4">
                       <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center shadow-lg">
                          <Mail className="w-6 h-6 text-white" />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black uppercase tracking-tight">Composição de Comunicado VIP</h2>
                          <p className="text-[#d4a853] text-[9px] font-black uppercase tracking-[0.3em]">Canais de Transmissão Vettus-Sync</p>
                       </div>
                    </div>
                 </div>
                 <div className="p-10 space-y-8 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center">
                             <AtSign className="w-3 h-3 mr-1 text-[#d4a853]" /> E-mail de Origem
                          </label>
                          <input type="email" value={emailOrigin} onChange={e => setEmailOrigin(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-6 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d4a853]/20 shadow-sm" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center">
                             <Type className="w-3 h-3 mr-1 text-[#d4a853]" /> Assunto do Comunicado
                          </label>
                          <input type="text" placeholder="Assunto da campanha..." value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-6 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d4a853]/20 shadow-sm" />
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center justify-between">
                          <span>Corpo da Mensagem</span>
                          <button onClick={() => setActiveTab('ai')} className="text-[9px] text-[#d4a853] hover:underline flex items-center"><Sparkles className="w-3 h-3 mr-1" /> Usar IA</button>
                       </label>
                       <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                          <div className="p-4 bg-slate-50 border-b border-slate-100">
                             <button onClick={() => imageInputRef.current?.click()} className="p-2 hover:bg-white rounded-lg text-slate-500 flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
                                <ImageIcon className="w-4 h-4 text-[#d4a853]" />
                                <span>Inserir Imagem</span>
                             </button>
                             <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                          </div>
                          <div className="flex flex-col">
                             {emailImage && <div className="p-8 pb-0 relative group"><img src={emailImage} className="rounded-3xl max-h-64 object-cover" /><button onClick={() => setEmailImage(null)} className="absolute top-10 right-10 bg-white text-red-500 p-2 rounded-full shadow-lg"><X className="w-4 h-4" /></button></div>}
                             <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Digite sua mensagem..." className="w-full h-64 p-10 text-slate-700 text-base leading-relaxed outline-none resize-none" />
                          </div>
                       </div>
                    </div>
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                       <div className="flex items-center space-x-3 text-slate-400">
                          <Paperclip className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Limite: 500/dia</span>
                       </div>
                       <button onClick={handleSendEmail} disabled={sendingEmail || selectedRecipients.length === 0} className="gold-gradient text-white px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl disabled:opacity-50">
                          {sendingEmail ? <RefreshCw className="w-5 h-5 animate-spin" /> : emailSentSuccess ? <CheckCircle2 className="w-5 h-5" /> : <span>Efetuar Disparo VIP</span>}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ABA: COPYWRITING AI */}
      {activeTab === 'ai' && (
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl max-w-3xl mx-auto relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4a853]/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
          <div className="flex items-center space-x-4 mb-10">
            <div className="w-16 h-16 gold-gradient rounded-[2rem] flex items-center justify-center shadow-2xl">
              <Sparkles className="text-white w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Vettus AI Assistant</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Gerador de Conteúdo Imobiliário</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descreva a oportunidade</label>
               <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ex: Lançamento de mansão cinematográfica..." className="w-full h-40 p-8 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none focus:ring-4 focus:ring-[#d4a853]/10 text-slate-700 shadow-inner" />
            </div>
            <button onClick={handleGenerateAI} disabled={loadingAI || !aiPrompt} className="w-full gold-gradient text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center space-x-3 disabled:opacity-50 shadow-2xl">
              {loadingAI ? <RefreshCw className="w-5 h-5 animate-spin" /> : <span>Gerar Copy Premium Vettus</span>}
            </button>
          </div>
          {aiResult && (
            <div className="mt-12 p-8 bg-[#0f172a] text-white rounded-[2.5rem] border-l-[10px] border-[#d4a853] shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                 <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#d4a853]">Sugestão Gerada</span>
                 <button onClick={() => { if (confirm("Usar no WhatsApp?")) { setWaMessage(aiResult); setActiveTab('whatsapp'); } else { setEmailBody(aiResult); setActiveTab('email'); } }} className="text-[9px] font-black uppercase bg-white/10 hover:bg-[#d4a853] px-3 py-1 rounded-full transition-all">Usar Mensagem</button>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-sm italic opacity-90 font-medium">{aiResult}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};