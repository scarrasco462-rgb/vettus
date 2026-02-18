
import React from 'react';
import { 
  MapPin, 
  Building2, 
  Phone, 
  ShieldCheck,
  ImageIcon,
  Pencil,
  Trash2,
  Lock
} from 'lucide-react';
import { Property, Broker } from './types.ts';

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
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfólio de Imóveis</h1>
          <p className="text-slate-500">Gestão estratégica e curadoria Vettus.</p>
        </div>
        <button 
          onClick={onOpenAddModal} 
          className="gold-gradient text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-yellow-600/20 hover:scale-105 transition-transform flex items-center space-x-2"
        >
          <Building2 className="w-5 h-5" />
          <span>Nova Captação</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {safeProperties.map((property) => {
          const authorizedEdit = canEdit(property);
          const hasGallery = property.gallery && property.gallery.length > 0;
          
          return (
            <div 
              key={property.id} 
              onClick={() => authorizedEdit && onEditProperty(property)}
              className={`bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group hover:shadow-xl transition-all duration-500 flex flex-col relative ${authorizedEdit ? 'cursor-pointer' : ''}`}
            >
              <div className="relative h-64 overflow-hidden shrink-0">
                <img src={property.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                
                {authorizedEdit && (
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                    <div className="bg-white text-slate-900 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center space-x-2 shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                       <Pencil className="w-3.5 h-3.5" />
                       <span>Editar Captação</span>
                    </div>
                  </div>
                )}

                <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
                  <div className="bg-slate-900 text-[#d4a853] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-[#d4a853]/20">
                    REF: {property.code}
                  </div>
                </div>

                <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 z-10">
                  {currentUser.role === 'Admin' && (
                    <button 
                      onClick={(e) => handleDelete(e, property)}
                      className="bg-red-600 text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-slate-900 uppercase tracking-widest border border-white shadow-sm">
                    {property.type}
                  </div>
                  {hasGallery && (
                    <div className="bg-[#d4a853] text-white px-2 py-1 rounded-lg text-[9px] font-black flex items-center space-x-1 shadow-md">
                      <ImageIcon className="w-3 h-3" />
                      <span>{property.gallery?.length} FOTOS</span>
                    </div>
                  )}
                </div>
                
                <div className="absolute bottom-4 left-4 text-white z-10 space-y-1">
                  {property.price > 0 && (
                    <div className="bg-emerald-600/90 backdrop-blur-sm px-3 py-1 rounded-lg">
                      <p className="text-[10px] uppercase font-bold opacity-80">Venda</p>
                      <p className="text-lg font-bold">{formatCurrency(property.price)}</p>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center space-x-2 mb-2">
                   <MapPin className="w-3 h-3 text-[#d4a853]" />
                   <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest truncate">
                    {property.neighborhood ? `${property.neighborhood} • ` : ''}{property.address}
                   </p>
                </div>

                <h3 className="text-xl font-bold text-slate-900 truncate group-hover:text-[#d4a853] transition-colors mb-4">{property.title}</h3>
                
                <div className={`p-4 rounded-2xl border transition-all mb-4 ${authorizedEdit ? 'bg-slate-50 border-slate-100' : 'bg-red-50/30 border-red-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-1 text-[#d4a853]" />
                      Proprietário
                    </span>
                    {!authorizedEdit && <Lock className="w-3 h-3 text-red-300" />}
                  </div>
                  
                  {authorizedEdit ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900">{property.ownerName}</p>
                      {property.ownerPhone && (
                        <p className="text-xs font-medium text-[#d4a853] flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {property.ownerPhone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-red-400 italic">Dados Privados (Reservado ao Captador)</p>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                   <div className="text-center">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Área</p>
                      <p className="text-xs font-bold text-slate-900">{property.area}m²</p>
                   </div>
                   <div className="text-center border-x border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Corretor</p>
                      <p className="text-[10px] font-bold text-slate-600 truncate px-1">{property.brokerName}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Status</p>
                      <p className="text-[9px] font-black text-[#d4a853] uppercase">{property.status}</p>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
        {safeProperties.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
             <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-medium">Nenhum imóvel disponível no portfólio.</p>
          </div>
        )}
      </div>
    </div>
  );
};
