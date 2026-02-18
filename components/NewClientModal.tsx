
import React, { useState, useEffect } from 'react';
import { X, User, DollarSign, Target, Shield, Pencil, UserPlus, CheckCircle2, RefreshCw, Globe, Phone } from 'lucide-react';
import { Client, ClientStatus, Broker } from '../types';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
  clientToEdit?: Client | null;
  currentUser: Broker;
  brokers: Broker[];
}

const formatDisplayNumber = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrencyToNumber = (value: string): number => {
  const cleanValue = value.replace(/[^\d]/g, '');
  return cleanValue ? parseFloat(cleanValue) / 100 : 0;
};

export const NewClientModal: React.FC<NewClientModalProps> = ({ 
  isOpen, onClose, onAddClient, onUpdateClient, clientToEdit, currentUser, brokers 
}) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    status: ClientStatus.LEAD,
    budget: 0,
    desiredPropertyType: 'Apartamento',
    brokerId: currentUser.id
  });

  const [ddi, setDdi] = useState('+55');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setFormData({ ...clientToEdit });
        if (clientToEdit.phone.startsWith('+')) {
          const parts = clientToEdit.phone.split(' ');
          if (parts.length > 1) {
            setDdi(parts[0]);
            setPhoneNumber(parts.slice(1).join(' '));
          } else {
            setDdi('+55');
            setPhoneNumber(clientToEdit.phone);
          }
        } else {
          setDdi('+55');
          setPhoneNumber(clientToEdit.phone);
        }
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          status: ClientStatus.LEAD,
          budget: 0,
          desiredPropertyType: 'Apartamento',
          brokerId: currentUser.id
        });
        setDdi('+55');
        setPhoneNumber('');
      }
    }
  }, [isOpen, clientToEdit, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const fullPhone = `${ddi} ${phoneNumber}`.trim();

    if (!formData.name || !phoneNumber) {
      alert("Nome e Celular são obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedBroker = brokers.find(b => b.id === formData.brokerId) || currentUser;
      const clientData: Client = {
        id: clientToEdit?.id || Math.random().toString(36).substr(2, 9),
        brokerId: selectedBroker.id,
        name: formData.name || '',
        email: formData.email || '',
        phone: fullPhone,
        status: formData.status as ClientStatus,
        lastContact: clientToEdit?.lastContact || new Date().toISOString().split('T')[0],
        budget: formData.budget || 0,
        assignedAgent: selectedBroker.name,
        desiredPropertyType: formData.desiredPropertyType || 'Apartamento',
        updatedAt: new Date().toISOString()
      };
      
      if (clientToEdit && onUpdateClient) {
        onUpdateClient(clientData);
      } else {
        onAddClient(clientData);
      }
      
      // Fecha o modal automaticamente após o sucesso
      onClose();
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      alert("Erro ao salvar cadastro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0a1120]/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden max-h-[90vh] flex flex-col border border-white/20">
        <div className="navy-gradient p-8 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center shadow-lg">
                {clientToEdit ? <Pencil className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight">{clientToEdit ? 'Editar Cliente' : 'Novo Cadastro'}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-7 h-7" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-8 bg-slate-50 space-y-6 no-scrollbar flex-1">
          <section className="space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
               <User className="w-4 h-4 text-[#d4a853]" />
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dados do Lead</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome Completo *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d4a853]/20" placeholder="Nome do cliente" />
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">DDI</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d4a853]" />
                    <input type="text" value={ddi} onChange={e => setDdi(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-9 pr-2 text-sm font-black text-slate-900 outline-none" placeholder="+55" />
                  </div>
                </div>
                <div className="space-y-1 col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Celular *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4a853]" />
                    <input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d4a853]/20" placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">E-mail</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-sm font-bold text-slate-900 outline-none" placeholder="cliente@email.com" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
               <Shield className="w-4 h-4 text-[#d4a853]" />
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pipeline de Vendas</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Corretor Vettus</label>
                <select value={formData.brokerId} onChange={e => setFormData({...formData, brokerId: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 outline-none">
                  {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Status Comercial</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ClientStatus})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 outline-none">
                  <option value={ClientStatus.LEAD}>📩 Lead</option>
                  <option value={ClientStatus.COLD}>❄️ Frio</option>
                  <option value={ClientStatus.WARM}>⚡ Morno</option>
                  <option value={ClientStatus.HOT}>🔥 Quente</option>
                  <option value={ClientStatus.WON}>🎉 Ganho</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
               <Target className="w-4 h-4 text-[#d4a853]" />
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Potencial de Negócio</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Interesse</label>
                <select value={formData.desiredPropertyType} onChange={e => setFormData({...formData, desiredPropertyType: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-xs font-bold text-slate-900 outline-none">
                  <option value="Apartamento">Apartamento</option>
                  <option value="Casa">Casa</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Cobertura">Cobertura</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Orçamento Estimado</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                  <input type="text" value={formatDisplayNumber(formData.budget || 0)} onChange={e => setFormData({...formData, budget: parseCurrencyToNumber(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-10 pr-4 text-sm font-black text-slate-900 outline-none" />
                </div>
              </div>
            </div>
          </section>

          <button type="submit" disabled={isSubmitting} className="w-full gold-gradient text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2 active:scale-95 transition-all">
            {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>{isSubmitting ? 'Processando...' : (clientToEdit ? 'Atualizar Dados' : 'Consolidar Lead')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
