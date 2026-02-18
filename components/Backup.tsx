import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Download, 
  ShieldCheck, 
  Clock, 
  FileCheck, 
  Server, 
  Copy, 
  CheckCircle2, 
  UploadCloud, 
  RotateCcw, 
  FileWarning, 
  Zap,
  Info,
  SlidersHorizontal,
  Trash2,
  AlertTriangle,
  Wifi,
  Monitor
} from 'lucide-react';
import { Broker } from '../types';

interface BackupProps {
  currentUser: Broker;
  onManualBackup: () => void;
}

const STORAGE_KEY_PREFIX = 'vettus_v3_core_';

export const Backup: React.FC<BackupProps> = ({ currentUser, onManualBackup }) => {
  const [lastBackup, setLastBackup] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'last_backup_date');
    if (saved) setLastBackup(new Date(saved).toLocaleString('pt-BR'));
  }, []);

  const adminPath = "C:\\Users\\scarr\\OneDrive\\Desktop\\backup sistema";

  const handleCopyPath = () => {
    navigator.clipboard.writeText(adminPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetSystem = () => {
    if (currentUser.role !== 'Admin') return;
    
    const confirm1 = confirm("⚠ ALERTA DE SEGURANÇA MÁXIMA ⚠\n\nVocê solicitou o zeramento completo do banco de dados Vettus. Isso apagará permanentemente todos os clientes, imóveis, vendas e logs.\n\nTEM CERTEZA ABSOLUTA?");
    
    if (confirm1) {
      const confirm2 = confirm("ESTA É A ÚLTIMA CHANCE.\n\nTodos os dados salvos localmente serão destruídos. Deseja prosseguir com o zeramento total?");
      if (confirm2) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(STORAGE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
        alert("SISTEMA REINICIADO. Todos os dados foram zerados.");
        window.location.reload();
      }
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = confirm(
      "ATENÇÃO: A restauração de backup irá SOBREPOR todos os dados atuais deste dispositivo pelos dados do arquivo. \n\nDeseja prosseguir com a recuperação?"
    );

    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(STORAGE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });

        Object.keys(data).forEach(key => {
          if (typeof data[key] === 'object') {
            localStorage.setItem(key, JSON.stringify(data[key]));
          } else {
            localStorage.setItem(key, data[key]);
          }
        });

        alert('BANCO DE DADOS RESTAURADO! O Vettus será reiniciado para sincronizar a nova base.');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('ERRO CRÍTICO: O arquivo de backup selecionado é inválido ou está corrompido.');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Database className="w-8 h-8 mr-4 text-[#d4a853]" />
            Sincronização & Backup Master
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Consolidação de rede em tempo real e proteção de ativos digitais.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-2xl border border-emerald-100 flex items-center space-x-2 shadow-sm">
           <ShieldCheck className="w-5 h-5" />
           <span className="text-[10px] font-black uppercase tracking-widest">Master Node: Sergio Carrasco Jr.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0a1120] p-10 rounded-[3.5rem] text-white border border-white/5 relative overflow-hidden group shadow-2xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4a853]/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-[#d4a853]/10"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 gold-gradient rounded-3xl flex items-center justify-center shadow-2xl">
                <Server className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Rede Vettus-Sync On-line</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Sincronização em Tempo Real Ativa</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                 <div className="flex items-center text-emerald-400 space-x-2">
                    <Wifi className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">Consolidação de Todos os Notebooks</span>
                 </div>
                 <p className="text-[11px] text-slate-300 leading-relaxed">
                   Este dispositivo (Notebook Admin) recebe instantaneamente cada cliente cadastrado por seus corretores. Seu backup conterá <strong>100% dos dados da rede</strong>.
                 </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[#d4a853] uppercase ml-1">Caminho de Segurança OneDrive</p>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 font-mono text-[10px] text-[#d4a853] break-all flex items-center justify-between group/path">
                  <span>{adminPath}</span>
                  <button 
                    onClick={handleCopyPath}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-[#d4a853]"
                    title="Copiar Caminho"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                onClick={onManualBackup}
                className="w-full gold-gradient text-white py-5 rounded-2xl font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-yellow-900/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3"
              >
                <Download className="w-5 h-5" />
                <span>Salvar Tudo no Notebook do Sergio</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-12 border-t border-white/10 pt-8 relative z-10">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-[#d4a853] opacity-60" />
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase">Último Snap</p>
                <p className="text-[10px] font-bold text-white">{lastBackup || 'Pendente'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Monitor className="w-5 h-5 text-emerald-500 opacity-60" />
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase">Status Node</p>
                <p className="text-[10px] font-bold text-emerald-400">Master Ativo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl flex flex-col justify-between group">
            <div>
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-500">
                  <RotateCcw className="w-8 h-8 text-[#d4a853]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Migração de Notebook</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Injeção de Base via Arquivo (.vettus)</p>
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`h-48 border-4 border-dashed rounded-[2.5rem] transition-all flex flex-col items-center justify-center cursor-pointer mb-6 ${
                  isRestoring ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100 hover:border-[#d4a853]/40 hover:bg-slate-50'
                }`}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept=".vettus" onChange={handleRestore} />
                {isRestoring ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <RotateCcw className="w-10 h-10 text-[#d4a853] animate-spin mb-3" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Restaurando Consolidação...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 text-slate-300 mb-4 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-bold text-slate-900 text-center">Clique para importar backup central</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {currentUser.role === 'Admin' && (
            <div className="bg-red-50 p-10 rounded-[3.5rem] border border-red-100 shadow-lg group">
              <div className="flex items-center space-x-4 mb-6">
                 <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:animate-bounce">
                    <AlertTriangle className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-red-900 uppercase">Zerar Cadastro Geral</h3>
                    <p className="text-red-600/70 text-[10px] font-bold uppercase tracking-widest">Ação Destrutiva e Irreversível</p>
                 </div>
              </div>
              <p className="text-xs text-red-700/80 leading-relaxed mb-6 font-medium italic">
                "Esta ação limpa o banco de dados local deste notebook. Utilize apenas se desejar reiniciar a operação do zero ou limpar o notebook do Sergio para manutenção."
              </p>
              <button 
                onClick={handleResetSystem}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-red-700 transition-all flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Zerar Banco de Dados Master</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};