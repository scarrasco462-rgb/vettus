import React, { useState } from 'react';
import { Key, ShieldCheck, AlertCircle, Save, RefreshCw, Lock } from 'lucide-react';
import { Broker } from '../types.ts';

interface PasswordUpdateViewProps {
  currentUser: Broker;
  onUpdateBroker: (broker: Broker) => void;
}

export const PasswordUpdateView: React.FC<PasswordUpdateViewProps> = ({ currentUser, onUpdateBroker }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRequestUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 4) {
      alert("A senha deve ter pelo menos 4 dígitos.");
      return;
    }

    setLoading(true);
    // Simular processamento do rádio P2P
    setTimeout(() => {
      const updatedBroker: Broker = {
        ...currentUser,
        pendingPassword: newPassword,
        updatedAt: new Date().toISOString()
      };
      onUpdateBroker(updatedBroker);
      setLoading(false);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center">
          <Key className="w-8 h-8 mr-4 text-[#d4a853]" />
          Segurança de Acesso
        </h1>
        <p className="text-slate-500 font-medium italic">Atualização de credenciais individuais da Unidade.</p>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="navy-gradient p-10 text-white flex items-center space-x-5">
           <div className="w-16 h-16 gold-gradient rounded-[2rem] flex items-center justify-center shadow-xl">
              <Lock className="w-8 h-8 text-[#0a1120]" />
           </div>
           <div>
              <h2 className="text-xl font-black uppercase">Nova Senha Master</h2>
              <p className="text-[#d4a853] text-[9px] font-black uppercase tracking-[0.3em]">Protocolo de Troca Assistida</p>
           </div>
        </div>

        <div className="p-10 space-y-8 bg-slate-50/30">
           {success ? (
             <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] text-center space-y-4 animate-in zoom-in duration-500">
                <ShieldCheck className="w-16 h-16 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-black text-emerald-900 uppercase">Solicitação Enviada!</h3>
                <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                  Sua nova senha foi registrada na rede. Por segurança, ela entrará em vigor assim que o **Administrador Sergio** realizar a liberação manual do seu acesso.
                </p>
                <button onClick={() => setSuccess(false)} className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all">Fazer nova solicitação</button>
             </div>
           ) : (
             <form onSubmit={handleRequestUpdate} className="space-y-6">
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start space-x-4">
                   <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                   <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                     **Regra Vettus:** Alterações de senha são retidas para auditoria administrativa. Após salvar, aguarde a autorização do Gestor para realizar o próximo login com a nova credencial.
                   </p>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nova Senha</label>
                      <input 
                        type="password" 
                        required 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 outline-none focus:border-[#d4a853] shadow-sm" 
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Confirmar Senha</label>
                      <input 
                        type="password" 
                        required 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 outline-none focus:border-[#d4a853] shadow-sm" 
                      />
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full gold-gradient text-[#0a1120] py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-4 disabled:opacity-50"
                >
                   {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                   <span>Solicitar Atualização</span>
                </button>
             </form>
           )}
        </div>
      </div>
    </div>
  );
};