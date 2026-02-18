import React from 'react';
import { 
  MapPin, 
  BedDouble, 
  Bath, 
  Maximize, 
  Building2, 
  DollarSign, 
  User, 
  Phone, 
  ShieldCheck,
  Hash,
  Lock,
  Eye,
  Info,
  Tag,
  ImageIcon,
  Sparkles,
  LayoutPanelTop,
  Pencil,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { Property, PropertyStatus, Broker } from '../types.ts';

interface PropertyViewProps {
  properties: Property[];
  onAddProperty: (property: Property) => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (id: string) => void;
  currentUser: Broker;
  brokers: Broker[];
  availableTypes: string[];
  availableStatuses: string[];
  onAddType: (type: string) => void;
  onAddStatus: (status: string) => void;
  onOpenAddModal: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

export const PropertyView: React.FC<PropertyViewProps> = ({ 
  properties, 
  currentUser,
  onOpenAddModal,
  onEditProperty,
  onDeleteProperty
}) => {
  const canEdit = (property: Property) => {
    return currentUser.role === 'Admin' || property.brokerId === currentUser.id;
  };

  const handleDelete = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    if (currentUser.role !== 'Admin') return;
    if (confirm(`DESEJA REALMENTE EXCLUIR O IMÓVEL: ${property.title.toUpperCase()} (REF: ${property.code})? Esta ação é irreversível.`)) {
      onDeleteProperty(property.id);
    }
  };

  const safeProperties = properties || [];

  return (
    <div className="space-y-6 pb-20 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-tight">Portfólio de Imóveis</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium">Gestão estratégica e curadoria de ativos Vettus.</p>
        </div>
        <button 
          onClick={onOpenAddModal} 
          className="gold-gradient text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-yellow-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Building2 className="w-5 h-5 shrink-0" />
          <span className="text-sm">Nova Captação</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {safeProperties.map((property) => {
          const authorizedEdit = canEdit(property);
          const hasGallery = property.gallery && property.gallery.length > 0;
          
          return (
            <div 
              key={property.id} 
              onClick={() => authorizedEdit && onEditProperty(property)}
              className={`bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 group hover:shadow-xl transition-all duration-500 flex flex-col relative ${authorizedEdit ? 'cursor-pointer' : ''}`}
            >
              <div className="relative h-56 md:h-64 overflow-hidden shrink-0">
                <img src={property.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={property.title} />
                
                {authorizedEdit && (
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                    <div className="bg-white text-slate-900 px-4 py-2 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center space-x-2 shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                       <Pencil className="w-3.5 h-3.5" />
                       <span>Editar Unidade</span>
                    </div>
                  </div>
                )}

                <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
                  <div className="bg-slate-900 text-[#d4a853] px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg border border-[#d4a853]/20">
                    REF: {property.code}
                  </div>
                </div>

                <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 z-10">
                  {currentUser.role === 'Admin' && (
                    <button 
                      onClick={(e) => handleDelete(e, property)}
                      className="bg-red-600 text-white p-2.5 rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest border border-white shadow-sm">
                    {property.type}
                  </div>
                  {hasGallery && (
                    <div className="bg-[#d4a853] text-white px-2 py-1 rounded-lg text-[8px] md:text-[9px] font-black flex items-center space-x-1 shadow-md">
                      <ImageIcon className="w-3 h-3" />
                      <span>{property.gallery?.length} FOTOS</span>
                    </div>
                  )}
                </div>
                
                <div className="absolute bottom-4 left-4 text-white z-10 space-y-1">
                  {property.price > 0 && (
                    <div className="bg-emerald-600/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-lg">
                      <p className="text-[8px] md:text-[9px] uppercase font-bold opacity-80">Valor de Venda</p>
                      <p className="text-base md:text-lg font-black">{formatCurrency(property.price)}</p>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
              </div>

              <div className="p-5 md:p-6 flex-1 flex flex-col">
                <div className="flex items-center space-x-2 mb-2">
                   <MapPin className="w-3 h-3 text-[#d4a853] shrink-0" />
                   <p className="text-slate-400 text-[9px] md:text-[10px] uppercase font-bold tracking-widest truncate">
                    {property.neighborhood ? `${property.neighborhood} • ` : ''}{property.address}
                   </p>
                </div>

                <h3 className="text-lg md:text-xl font-bold text-slate-900 truncate group-hover:text-[#d4a853] transition-colors mb-4 uppercase tracking-tighter">{property.title}</h3>
                
                {/* BLINDAGEM DE DADOS DO PROPRIETÁRIO (Regra Solicitada) */}
                <div className={`p-4 md:p-5 rounded-[2rem] border transition-all mb-4 relative overflow-hidden ${authorizedEdit ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100/50'}`}>
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center ${authorizedEdit ? 'text-slate-400' : 'text-red-400'}`}>
                      {authorizedEdit ? <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-[#d4a853]" /> : <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-red-500" />}
                      Dados do Proprietário
                    </span>
                    {!authorizedEdit && <Lock className="w-3.5 h-3.5 text-red-400 opacity-60" />}
                  </div>
                  
                  {authorizedEdit ? (
                    <div className="space-y-1.5 relative z-10">
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs font-black text-slate-900 truncate">{property.ownerName}</p>
                      </div>
                      {property.ownerPhone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-[#d4a853]" />
                          <p className="text-xs font-bold text-slate-700">{property.ownerPhone}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 relative z-10">
                      <p className="text-[10px] font-black text-red-600 uppercase leading-tight">Acesso Bloqueado</p>
                      <p className="text-[9px] text-red-400/80 font-bold italic leading-relaxed">
                        Informações visíveis exclusivamente para o captador do imóvel ou administrador.
                      </p>
                    </div>
                  )}
                  {!authorizedEdit && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                   <div className="text-center">
                      <p className="text-[8px] md:text-[9px] text-slate-400 uppercase font-black tracking-tighter">Área</p>
                      <p className="text-[11px] md:text-xs font-bold text-slate-900">{property.area}m²</p>
                   </div>
                   <div className="text-center border-x border-slate-100">
                      <p className="text-[8px] md:text-[9px] text-slate-400 uppercase font-black tracking-tighter">Corretor</p>
                      <p className="text-[9px] md:text-[10px] font-black text-[#d4a853] uppercase truncate px-1">{property.brokerName?.split(' ')[0] || 'VETTUS'}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[8px] md:text-[9px] text-slate-400 uppercase font-black tracking-tighter">Status</p>
                      <p className={`text-[8px] md:text-[9px] font-black uppercase ${property.status === 'Vendido' ? 'text-red-500' : 'text-emerald-500'}`}>{property.status}</p>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
        {safeProperties.length === 0 && (
          <div className="col-span-full py-16 md:py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white">
             <Building2 className="w-12 h-12 md:w-16 md:h-16 text-slate-100 mx-auto mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum imóvel disponível no portfólio</p>
          </div>
        )}
      </div>
    </div>
  );
};