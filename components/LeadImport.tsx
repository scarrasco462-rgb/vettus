
import React, { useState, useRef, useMemo } from 'react';
import { 
  FileUp, 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Loader2, 
  UserPlus, 
  Mail, 
  Phone, 
  Zap,
  Info,
  FileSpreadsheet,
  UserSearch,
  ArrowRightCircle,
  Database,
  Search,
  // Fix: Added missing icons
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { Client, ClientStatus, Broker } from '../types';
import * as XLSX from 'xlsx';

interface LeadImportProps {
  onImportLeads: (leads: Client[]) => void;
  onUpdateLead: (lead: Client) => void;
  currentUser: Broker;
  brokers: Broker[];
  unassignedLeads: Client[];
}

export const LeadImport: React.FC<LeadImportProps> = ({ onImportLeads, onUpdateLead, currentUser, brokers, unassignedLeads }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewLeads, setPreviewLeads] = useState<Partial<Client>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredPending = useMemo(() => {
    return unassignedLeads.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.phone.includes(searchTerm)
    );
  }, [unassignedLeads, searchTerm]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setError("Por favor, selecione uma planilha válida (.xlsx, .xls ou .csv).");
      return;
    }
    setFile(selectedFile);
    setError(null);
    parseSpreadsheet(selectedFile);
  };

  const parseSpreadsheet = (file: File) => {
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const extracted: Partial<Client>[] = json.map(row => {
          const findVal = (terms: string[]) => {
            const key = Object.keys(row).find(k => terms.some(t => k.toLowerCase().includes(t.toLowerCase())));
            return key ? row[key] : null;
          };

          const name = findVal(['nome', 'name', 'cliente', 'lead']) || "Desconhecido";
          const email = findVal(['email', 'e-mail', 'mail']) || "";
          const phone = String(findVal(['phone', 'telefone', 'whatsapp', 'celular', 'contato']) || "");
          const budgetRaw = findVal(['budget', 'orcamento', 'orçamento', 'preco', 'preço', 'valor']);
          const preference = findVal(['preference', 'preferencia', 'preferência', 'interesse', 'imovel', 'imóvel']) || "";

          return {
            name: String(name),
            email: String(email),
            phone: phone.replace(/[^\d+]/g, ''),
            budget: Number(String(budgetRaw).replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            status: ClientStatus.LEAD, 
            preference: String(preference)
          };
        });

        if (extracted.length === 0) {
          setError("Não encontramos dados válidos nesta planilha.");
        } else {
          setPreviewLeads(extracted);
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao ler o arquivo. Verifique se a planilha não está corrompida.");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = () => {
    const finalLeads: Client[] = previewLeads.map(lead => ({
      id: Math.random().toString(36).substr(2, 9),
      brokerId: 'unassigned', // IMPORTANTE: Entra como não atribuído
      name: lead.name || 'Sem Nome',
      email: lead.email || '',
      phone: lead.phone || '',
      status: ClientStatus.LEAD, 
      lastContact: new Date().toISOString().split('T')[0],
      budget: lead.budget || 0,
      assignedAgent: '',
      preference: lead.preference || '',
      updatedAt: new Date().toISOString()
    }));

    onImportLeads(finalLeads);
    setFile(null);
    setPreviewLeads([]);
    alert(`${finalLeads.length} leads importados para a fila de triagem com sucesso!`);
  };

  const assignLead = (lead: Client) => {
    const brokerId = assignmentMap[lead.id];
    if (!brokerId) {
      alert("Selecione um corretor antes de migrar.");
      return;
    }
    const broker = brokers.find(b => b.id === brokerId);
    if (!broker) return;

    const updatedLead: Client = {
      ...lead,
      brokerId: broker.id,
      assignedAgent: broker.name,
      updatedAt: new Date().toISOString()
    };

    onUpdateLead(updatedLead);
    alert(`Lead ${lead.name} migrado com sucesso para a carteira de ${broker.name}.`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Fila de Triagem Vettus</h1>
          <p className="text-slate-500 font-medium">Importação massiva e distribuição inteligente de patrimônio.</p>
        </div>
        <div className="flex items-center space-x-3">
           <div className="bg-[#0f172a] px-5 py-2.5 rounded-2xl border border-white/10 flex items-center space-x-3 shadow-xl">
              <Database className="w-5 h-5 text-[#d4a853]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{unassignedLeads.length} Leads Aguardando</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA 1: UPLOAD */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
               <FileUp className="w-32 h-32" />
            </div>
            <div className="flex items-center space-x-3 mb-4">
               <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center shadow-lg">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
               </div>
               <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest">Importar Planilha</h3>
            </div>

            {!file ? (
              <div 
                onDragEnter={handleDrag} 
                onDragLeave={handleDrag} 
                onDragOver={handleDrag} 
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`h-64 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dragActive ? 'bg-[#d4a853]/10 border-[#d4a853]' : 'bg-slate-50 border-slate-200 hover:border-[#d4a853]/50'
                }`}
              >
                <input ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
                <UploadCloud className="w-10 h-10 text-slate-300 mb-4" />
                <p className="text-[10px] font-black uppercase text-slate-400 text-center px-6">Arraste ou clique para selecionar</p>
                {error && <p className="text-[9px] text-red-500 font-bold mt-2 px-4 text-center">{error}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => {setFile(null); setPreviewLeads([]);}}><X className="w-4 h-4 text-slate-400" /></button>
                 </div>
                 {parsing ? (
                   <div className="flex flex-col items-center py-8">
                      <RefreshCw className="w-8 h-8 text-[#d4a853] animate-spin mb-2" />
                      <span className="text-[10px] font-black uppercase text-slate-400">Processando...</span>
                   </div>
                 ) : (
                   <button 
                     onClick={confirmImport}
                     className="w-full gold-gradient text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-yellow-900/20 active:scale-95 transition-all"
                   >
                     Confirmar {previewLeads.length} Leads
                   </button>
                 )}
              </div>
            )}
          </div>
          
          <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/5 text-white shadow-2xl">
             <div className="flex items-center space-x-3 mb-6">
                <Info className="w-5 h-5 text-[#d4a853]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-[#d4a853]">Regra de Negócio</h3>
             </div>
             <p className="text-[11px] text-slate-400 leading-relaxed italic">
               "Toda importação massiva é retida na triagem. Somente após a designação de um corretor responsável o lead é migrado para a aba de Clientes ativos e liberado para o fluxo comercial."
             </p>
          </div>
        </div>

        {/* COLUNA 2: LISTAGEM DE PENDENTES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
             <div className="navy-gradient p-8 text-white flex items-center justify-between">
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-[#d4a853]/20 text-[#d4a853] rounded-2xl flex items-center justify-center shadow-lg border border-[#d4a853]/20">
                      <UserSearch className="w-6 h-6" />
                   </div>
                   <div>
                      <h2 className="text-xl font-black uppercase tracking-tight">Leads em Espera</h2>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Aguardando Distribuição Operacional</p>
                   </div>
                </div>
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                   <input 
                     type="text" 
                     placeholder="Filtrar pendentes..." 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-white outline-none focus:bg-white/10 transition-all w-48"
                   />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-4">
                {filteredPending.map(lead => (
                  <div key={lead.id} className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lg hover:bg-white transition-all group">
                     <div className="flex items-center space-x-5">
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-[#d4a853] text-lg font-black shadow-sm group-hover:scale-110 transition-transform">
                           {lead.name[0]}
                        </div>
                        <div>
                           <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{lead.name}</h4>
                           <div className="flex items-center space-x-3 mt-1">
                              <span className="text-[10px] font-bold text-slate-400 flex items-center"><Phone className="w-2.5 h-2.5 mr-1" /> {lead.phone}</span>
                              <span className="text-[10px] font-black text-[#d4a853] uppercase">{lead.preference || 'Geral'}</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center space-x-4">
                        <div className="relative">
                           <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                           <select 
                             value={assignmentMap[lead.id] || ''}
                             onChange={e => setAssignmentMap({...assignmentMap, [lead.id]: e.target.value})}
                             className="bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-8 text-xs font-bold text-slate-700 outline-none focus:border-[#d4a853] appearance-none"
                           >
                              <option value="">Selecionar Corretor...</option>
                              {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                           </select>
                        </div>
                        <button 
                          onClick={() => assignLead(lead)}
                          className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all shadow-sm group/btn"
                          title="Migrar para Carteira de Clientes"
                        >
                           <ArrowRightCircle className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                        </button>
                     </div>
                  </div>
                ))}
                
                {filteredPending.length === 0 && (
                  <div className="py-32 text-center">
                     <Zap className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                     <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Fila de triagem vazia</p>
                     <p className="text-[10px] text-slate-400 mt-2">Novos leads importados aparecerão aqui.</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
