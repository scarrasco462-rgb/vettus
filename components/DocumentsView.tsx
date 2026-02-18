
import React, { useState, useRef } from 'react';
import { 
  Files, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  File as FileIcon, 
  Search, 
  Trash2, 
  Download, 
  Filter,
  Plus,
  Clock,
  HardDrive,
  CheckCircle2,
  X,
  Database
} from 'lucide-react';
import { Broker, VettusDocument } from '../types';

interface DocumentsViewProps {
  documents: VettusDocument[];
  onUpload: (doc: VettusDocument) => void;
  onDelete: (id: string) => void;
  currentUser: Broker;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ documents, onUpload, onDelete, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Todos', 'Contrato', 'Identidade', 'Escritura', 'Financeiro', 'Outros'];

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'Todos' || doc.category === filter;
    return matchesSearch && matchesFilter;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar tamanho (limitar a 5MB por ser localStorage)
    if (file.size > 5 * 1024 * 1024) {
      alert("Para manter a performance da rede Vettus, arquivos individuais devem ter menos de 5MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const category = prompt("Selecione a categoria (Contrato, Identidade, Escritura, Financeiro ou Outros):", "Outros") as any;
      
      const newDoc: VettusDocument = {
        id: Math.random().toString(36).substr(2, 9),
        brokerId: currentUser.id,
        brokerName: currentUser.name,
        name: file.name,
        category: categories.includes(category) ? category : 'Outros',
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: file.type,
        data: base64,
        date: new Date().toISOString()
      };

      onUpload(newDoc);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-[#d4a853]" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    return <FileIcon className="w-8 h-8 text-blue-500" />;
  };

  const handleDownload = (doc: VettusDocument) => {
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight uppercase">
            <Files className="w-8 h-8 mr-4 text-[#d4a853]" />
            Central de Documentos
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Gestão de arquivos institucionais e anexos de leads.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 flex items-center space-x-3 shadow-sm focus-within:ring-2 focus-within:ring-[#d4a853]/50 transition-all">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar arquivo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-48 font-bold text-slate-900" 
            />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="gold-gradient text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-yellow-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-3"
          >
            <Plus className="w-5 h-5" />
            <span>Upload Manual</span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      <div className="flex items-center space-x-4 overflow-x-auto no-scrollbar pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border ${
              filter === cat 
              ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-lg' 
              : 'bg-white text-slate-400 border-slate-200 hover:border-[#d4a853]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className="flex items-center justify-between mb-6">
               <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center group-hover:bg-[#d4a853]/10 transition-colors">
                  {getFileIcon(doc.type)}
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full mb-1">{doc.category}</span>
                  <span className="text-[9px] font-bold text-slate-400">{doc.size}</span>
               </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900 mb-1 truncate" title={doc.name}>{doc.name}</h3>
            <div className="flex items-center text-[10px] text-slate-400 mb-6">
               <Clock className="w-3 h-3 mr-1.5" />
               <span>{new Date(doc.date).toLocaleDateString('pt-BR')}</span>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t border-slate-50">
               <button 
                 onClick={() => handleDownload(doc)}
                 className="flex-1 bg-slate-50 hover:bg-[#d4a853] hover:text-white text-slate-500 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
               >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Baixar
               </button>
               <button 
                 onClick={() => confirm('Excluir documento permanentemente?') && onDelete(doc.id)}
                 className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
               >
                  <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
             <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mx-auto mb-6">
                <Files className="w-10 h-10 text-slate-200" />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum arquivo encontrado nesta categoria</p>
             <button onClick={() => fileInputRef.current?.click()} className="mt-4 text-[#d4a853] text-[10px] font-black uppercase underline tracking-widest">Fazer primeiro upload manual</button>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <Database className="w-32 h-32 text-[#d4a853]" />
         </div>
         <div className="flex items-center space-x-4 mb-6 relative z-10">
            <div className="w-12 h-12 bg-[#d4a853]/20 rounded-2xl flex items-center justify-center">
               <HardDrive className="w-6 h-6 text-[#d4a853]" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Status do Armazenamento Digital</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
            <div className="space-y-4">
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Quota Local Utilizada</span>
                  <span className="text-[#d4a853]">{(documents.length * 0.4).toFixed(1)}MB / 10MB</span>
               </div>
               <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-[#d4a853] shadow-[0_0_15px_rgba(212,168,83,0.4)]" style={{width: `${Math.min(100, (documents.length * 4))}%`}}></div>
               </div>
               <p className="text-[10px] text-slate-500 italic">Arquivos anexados são sincronizados automaticamente em toda a rede Vettus se o Master estiver online.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col justify-center">
               <div className="flex items-center space-x-3 text-[#d4a853] mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Protocolo de Backup V3</span>
               </div>
               <p className="text-[11px] text-slate-300 leading-relaxed">
                  Lembre-se: Após anexar documentos críticos, gere um novo <strong>Snapshot .vettus</strong> para garantir a redundância no OneDrive ou HD Externo.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};
