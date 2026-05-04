import React, { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';
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
  Monitor,
  RefreshCw,
  Save,
  ClipboardPaste,
  ShieldQuestion,
  Lock
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
  const [pasteData, setPasteData] = useState('');
  const [decryptionKey, setDecryptionKey] = useState('');
  const [showPasteMode, setShowPasteMode] = useState(false);
  const [backupKeyInput, setBackupKeyInput] = useState(false);
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

  const performActualRestore = (data: any) => {
    // Limpar base atual
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });

    // Injetar nova base
    const injectData = (dataToInject: any) => {
      Object.keys(dataToInject).forEach(key => {
        try {
          let value = dataToInject[key];
          
          // Se a chave parecer criptografada (padrão AES SALT)
          if (typeof value === 'string' && value.startsWith('U2FsdGVkX1')) {
            if (decryptionKey) {
              try {
                const bytes = CryptoJS.AES.decrypt(value, decryptionKey);
                const decrypted = bytes.toString(CryptoJS.enc.Utf8);
                if (decrypted) {
                   const decryptedVal = JSON.parse(decrypted);
                   // Se o valor descriptografado for um objeto com chaves da base, fazemos merge recursivo
                   if (typeof decryptedVal === 'object' && decryptedVal !== null && !Array.isArray(decryptedVal)) {
                      injectData(decryptedVal);
                      return; // Não salva o contêiner encriptado, salva os filhos
                   }
                   value = decryptedVal;
                }
              } catch (e) {
                console.warn(`Kernel Crypto: Falha ao descriptografar ${key}. Mantendo original.`);
              }
            }
          }

          const storageKey = key.startsWith(STORAGE_KEY_PREFIX) ? key : STORAGE_KEY_PREFIX + key;
          
          if (typeof value === 'object' && value !== null) {
            localStorage.setItem(storageKey, JSON.stringify(value));
          } else {
            localStorage.setItem(storageKey, String(value));
          }
        } catch (e) {
          console.warn(`Kernel Storage: Falha ao restaurar chave ${key}:`, e);
        }
      });
    };

    injectData(data);

    alert('BANCO DE DADOS RESTAURADO COM SUCESSO!\n\nO sistema será reiniciado agora para carregar as novas informações.');
    window.location.reload();
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
        performActualRestore(data);
      } catch (err) {
        console.error(err);
        alert('ERRO CRÍTICO: O arquivo de backup selecionado é inválido ou está corrompido.');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteRestore = () => {
    if (!pasteData.trim()) return;
    
    try {
      const data = JSON.parse(pasteData.trim());
      const confirmRestore = confirm(
        "Deseja restaurar o sistema a partir do texto colado?\n\nIsso irá sobrepor os dados atuais."
      );
      if (confirmRestore) {
        setIsRestoring(true);
        performActualRestore(data);
      }
    } catch (e) {
      alert("Erro ao processar o texto colado. Certifique-se de que é um JSON válido.");
    }
  };

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadBackup = () => {
    onManualBackup();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 5000);
    
    // Update local date for UI immediately
    setLastBackup(new Date().toLocaleString('pt-BR'));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Database className="w-8 h-8 mr-4 text-[#d4a853]" />
            Sistema de Backup & Restauração
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Gerenciamento centralizado de dados e recuperação de desastres.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-2xl border border-emerald-100 flex items-center space-x-2 shadow-sm">
             <ShieldCheck className="w-5 h-5" />
             <span className="text-[10px] font-black uppercase tracking-widest">Usuário: {currentUser.name}</span>
          </div>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex bg-slate-100 p-1.5 rounded-[2rem] w-fit mx-auto shadow-inner border border-slate-200 mb-8">
        <button 
          onClick={() => setActiveTab('export')}
          className={`flex items-center space-x-2 px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'export' 
            ? 'bg-white text-slate-900 shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Exportar Backup</span>
        </button>
        <button 
          onClick={() => setActiveTab('import')}
          className={`flex items-center space-x-2 px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'import' 
            ? 'bg-white text-slate-900 shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Importar Backup</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'export' ? (
          <div className="bg-[#0a1120] p-10 rounded-[3.5rem] text-white border border-white/5 relative overflow-hidden group shadow-2xl min-h-[400px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4a853]/5 rounded-full blur-[120px] -mr-64 -mt-64 transition-all group-hover:bg-[#d4a853]/10"></div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-6 mb-10">
                <div className="w-20 h-20 gold-gradient rounded-[2rem] flex items-center justify-center shadow-2xl">
                  <Download className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Gerar Arquivo de Backup</h3>
                  <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">Crie uma cópia de segurança local de todos os dados</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-10">
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-4">
                  <div className="flex items-center text-[#d4a853] space-x-3">
                    <Info className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-wider">O que está incluído no backup?</span>
                  </div>
                  <ul className="space-y-2 text-[12px] text-slate-400">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                      <span>Todos os Clientes e Leads cadastrados</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                      <span>Histórico de Atividades e Logs</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                      <span>Imóveis, Vendas e Comissões</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                      <span>Configurações da Unidade e Corretores</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                    <div className="flex items-center text-emerald-400 space-x-3 mb-3">
                      <Save className="w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-wider">Gravação em Disco</span>
                    </div>
                    <p className="text-[12px] text-slate-300 leading-relaxed mb-6">
                      Ao clicar no botão abaixo, o sistema irá gerar um arquivo <strong>.vettus</strong>. Salve este arquivo na pasta de backup configurada para garantir a segurança dos dados.
                    </p>
                    
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                      <div className="flex items-center space-x-3 mb-2">
                         <div className="p-2 bg-[#d4a853]/20 rounded-lg">
                            <Monitor className="w-4 h-4 text-[#d4a853]" />
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">Pasta de Destino Recomendada:</span>
                      </div>
                      <div className="flex items-center justify-between group/path">
                        <code className="text-[10px] text-[#d4a853] font-mono break-all">{adminPath}</code>
                        <button 
                          onClick={handleCopyPath}
                          className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-[#d4a853]"
                          title="Copiar Caminho"
                        >
                          {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleDownloadBackup}
                      className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.15em] text-xs shadow-xl transition-all flex items-center justify-center space-x-3 ${
                        downloadSuccess 
                        ? 'bg-emerald-600 text-white shadow-emerald-900/40' 
                        : 'gold-gradient text-white shadow-yellow-900/40 hover:scale-[1.02] active:scale-95'
                      }`}
                    >
                      {downloadSuccess ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Backup Gerado com Sucesso!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span>Baixar Backup Completo Agora</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-8 relative z-10">
              <div className="flex items-center space-x-4">
                <Clock className="w-6 h-6 text-[#d4a853] opacity-60" />
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Último Backup Local</p>
                  <p className="text-sm font-bold text-white">{lastBackup || 'Nenhum backup realizado recentemente'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Base de Dados Integrada</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[80px] -mr-32 -mt-32"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:rotate-6">
                      <RotateCcw className="w-10 h-10 text-[#d4a853]" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Restaurar do Arquivo</h3>
                      <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">Recupere seu sistema a partir de um backup</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setShowPasteMode(!showPasteMode)}
                      className={`px-6 py-3 rounded-2xl transition-all flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest ${showPasteMode ? 'bg-[#d4a853] text-[#0a1120] shadow-lg shadow-yellow-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {showPasteMode ? <FileCheck className="w-4 h-4" /> : <ClipboardPaste className="w-4 h-4" />}
                      <span>{showPasteMode ? 'Modo Arquivo' : 'Modo Texto/JSON'}</span>
                    </button>
                  </div>
                </div>

                {!showPasteMode ? (
                  <div className="grid md:grid-cols-2 gap-10">
                    <div 
                      onClick={() => !isRestoring && fileInputRef.current?.click()}
                      className={`h-64 border-4 border-dashed rounded-[3rem] transition-all flex flex-col items-center justify-center cursor-pointer group/restore relative ${
                        isRestoring ? 'bg-slate-50 border-slate-200 cursor-wait' : 'bg-slate-50/50 border-slate-100 hover:border-[#d4a853]/40 hover:bg-slate-100/80'
                      }`}
                    >
                      <input type="file" ref={fileInputRef} className="hidden" accept=".vettus,.json" onChange={handleRestore} />
                      {isRestoring ? (
                        <div className="flex flex-col items-center animate-pulse">
                          <RefreshCw className="w-16 h-16 text-[#d4a853] animate-spin mb-4" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Reconstruindo Base...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-4 group-hover/restore:scale-110 group-hover/restore:rotate-3 transition-all duration-500">
                            <UploadCloud className="w-10 h-10 text-[#d4a853]" />
                          </div>
                          <p className="text-md font-black text-slate-900 text-center px-10">Arraste ou Selecione o Arquivo .vettus</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-widest">Suporta arquivos de backup do Vettus v3</p>
                        </>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-8">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                            <ShieldQuestion className="w-6 h-6 text-amber-600" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-[0.15em] text-amber-900">Segurança de Dados</span>
                        </div>
                        <p className="text-[12px] text-amber-800 leading-relaxed font-medium mb-6">
                          ⚠️ <strong>Atenção:</strong> Restaurar um backup irá <strong>apagar</strong> todos os dados que existem atualmente neste dispositivo e substituí-los pelos dados do arquivo.
                        </p>
                        
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Chave de Descriptografia</label>
                              <span className="text-[9px] text-slate-400 font-bold italic">(Opcional)</span>
                           </div>
                           <input 
                            type="password"
                            value={decryptionKey}
                            onChange={(e) => setDecryptionKey(e.target.value)}
                            placeholder="Insira a chave se o arquivo for master..."
                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs focus:ring-2 focus:ring-[#d4a853] focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="relative">
                      <textarea 
                        value={pasteData}
                        onChange={(e) => setPasteData(e.target.value)}
                        placeholder="Cole aqui o conteúdo JSON do seu backup..."
                        className="w-full h-64 bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 text-xs font-mono focus:ring-4 focus:ring-[#d4a853]/10 focus:border-[#d4a853] outline-none transition-all resize-none shadow-inner"
                      />
                      <button 
                        onClick={() => setPasteData('')}
                        className="absolute top-6 right-6 p-3 bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 transition-all hover:scale-110"
                        title="Limpar Área de Transferência"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                          <Lock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-amber-900 uppercase tracking-[0.1em] mb-0.5">Validação Master</p>
                          <p className="text-[11px] text-amber-700/80 font-medium">Use a chave master caso o código acima seja de outro node master.</p>
                        </div>
                      </div>
                      <input 
                        type="password"
                        value={decryptionKey}
                        onChange={(e) => setDecryptionKey(e.target.value)}
                        placeholder="Chave de descriptografia..."
                        className="bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-amber-500 outline-none transition-all w-full md:w-64"
                      />
                    </div>

                    <button 
                      onClick={handlePasteRestore}
                      disabled={!pasteData || isRestoring}
                      className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                    >
                      {isRestoring ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                      <span>Executar Restauração Imediata</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {currentUser.role === 'Admin' && (
              <div className="bg-red-50 p-10 rounded-[3.5rem] border border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-8 group">
                <div className="flex items-center space-x-6">
                   <div className="w-16 h-16 bg-red-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                      <AlertTriangle className="w-8 h-8" />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-red-900 uppercase tracking-tight">Zona de Risco: Zeramento Total</h3>
                      <p className="text-[11px] text-red-600/70 font-bold uppercase tracking-widest mt-0.5">Esta ação apagará permanentemente todos os registros localmente</p>
                   </div>
                </div>
                <button 
                  onClick={handleResetSystem}
                  className="px-10 py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-red-200 hover:bg-red-700 hover:scale-105 active:scale-95 transition-all flex items-center space-x-3"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Zerar Banco de Dados</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
