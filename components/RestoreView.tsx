
import React, { useState, useRef } from 'react';
import { 
  RotateCcw, 
  UploadCloud, 
  RefreshCw, 
  FileWarning, 
  ShieldAlert, 
  CheckCircle2, 
  X,
  Database,
  Info
} from 'lucide-react';
import { Broker } from '../types';

interface RestoreViewProps {
  currentUser: Broker;
}

const STORAGE_KEY_PREFIX = 'vettus_v3_core_';

export const RestoreView: React.FC<RestoreViewProps> = ({ currentUser }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = confirm(
      "⚠ AVISO CRÍTICO DE RESTAURAÇÃO ⚠\n\nEsta ação irá APAGAR todos os dados atuais (imóveis, clientes, vendas) deste dispositivo e substituí-los pelo backup selecionado.\n\nVocê tem um backup atual salvo? Deseja prosseguir?"
    );

    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Verifica se é um arquivo Vettus válido
        const hasVettusKeys = Object.keys(data).some(key => key.startsWith(STORAGE_KEY_PREFIX));
        if (!hasVettusKeys) {
          throw new Error("Arquivo inválido. O arquivo selecionado não contém dados compatíveis com o Vettus CRM.");
        }

        // Limpar dados atuais
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(STORAGE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });

        // Injetar novos dados
        Object.keys(data).forEach(key => {
          const val = data[key];
          localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val);
        });

        alert('✅ SUCESSO! O Banco de Dados foi restaurado. O sistema irá reiniciar agora para aplicar as mudanças.');
        window.location.reload();
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro desconhecido ao processar o arquivo.");
        setIsRestoring(false);
      }
    };
    reader.onerror = () => {
      setError("Falha na leitura do arquivo físico.");
      setIsRestoring(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight uppercase">
            <RotateCcw className="w-8 h-8 mr-4 text-[#d4a853]" />
            Restauração de Sistema
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Recuperação manual de snapshots e base de dados operacional.</p>
        </div>
        <div className="bg-red-50 text-red-600 px-5 py-2.5 rounded-2xl border border-red-100 flex items-center space-x-2 shadow-sm">
           <ShieldAlert className="w-5 h-5" />
           <span className="text-[10px] font-black uppercase tracking-widest">Protocolo de Recuperação</span>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
          <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center shadow-xl mb-8 group-hover:rotate-12 transition-transform duration-500">
             <Database className="w-12 h-12 text-[#d4a853]" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Selecione seu arquivo de Backup</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-10">
            Utilize esta função para migrar seus dados para um novo notebook ou recuperar informações após uma limpeza de cache. O arquivo deve ter a extensão <strong className="text-slate-900">.vettus</strong>.
          </p>

          <div 
            onClick={() => !isRestoring && fileInputRef.current?.click()}
            className={`w-full h-64 border-4 border-dashed rounded-[3rem] transition-all flex flex-col items-center justify-center cursor-pointer ${
              isRestoring ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100 hover:border-[#d4a853]/40 hover:bg-slate-50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".vettus" 
              onChange={handleRestore} 
            />
            
            {isRestoring ? (
              <div className="flex flex-col items-center animate-pulse">
                <RefreshCw className="w-12 h-12 text-[#d4a853] animate-spin mb-4" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Injetando Dados na Rede Vettus...</span>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8 text-[#d4a853]" />
                </div>
                <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Clique para fazer upload</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] mt-2">Formatos aceitos: .vettus (JSON)</p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-8 bg-red-500 text-white p-4 rounded-2xl flex items-center space-x-3 text-xs font-bold animate-in slide-in-from-top-4 shadow-lg shadow-red-900/20">
               <ShieldAlert className="w-5 h-5 shrink-0" />
               <p>{error}</p>
               <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-white/20 rounded-full">
                  <X className="w-4 h-4" />
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 space-y-4">
            <div className="flex items-center space-x-3 text-amber-700">
               <FileWarning className="w-6 h-6" />
               <h3 className="text-sm font-black uppercase tracking-widest">Aviso de Sobrescrita</h3>
            </div>
            <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
              Ao restaurar, os dados locais atuais serão <strong>permanentemente removidos</strong>. Se você tiver leads novos que não estão no backup, eles serão perdidos. Recomendamos gerar um backup da base atual antes de restaurar uma antiga.
            </p>
         </div>

         <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 space-y-4 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <CheckCircle2 className="w-20 h-20 text-[#d4a853]" />
            </div>
            <div className="flex items-center space-x-3">
               <Info className="w-6 h-6 text-[#d4a853]" />
               <h3 className="text-sm font-black uppercase tracking-widest">Dica de Segurança</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sempre salve seus backups em um local seguro (OneDrive ou Google Drive). O Vettus não armazena seus dados em servidores centrais, garantindo sua total privacidade e posse das informações.
            </p>
         </div>
      </div>
    </div>
  );
};
