
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Building2, MapPin, DollarSign, Save, Zap, Loader2, Link as LinkIcon, 
  ShieldCheck, Tag, ImageIcon, Plus, Sparkles, UploadCloud, Pencil, CheckCircle2,
  FileText, HardHat, ChevronRight, ChevronLeft, RefreshCw
} from 'lucide-react';
import { Property, Broker, PropertyStatus } from './types.ts';
import { extractPropertyFromUrl } from './services/gemini.ts';

interface NewPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProperty: (property: Property) => void;
  onUpdateProperty?: (property: Property) => void;
  propertyToEdit?: Property | null;
  currentUser: Broker;
  brokers: Broker[];
  availableTypes: string[];
  availableStatuses: string[];
}

export const NewPropertyModal: React.FC<NewPropertyModalProps> = ({
  isOpen, onClose, onAddProperty, onUpdateProperty, propertyToEdit, currentUser, brokers = [], availableTypes = [], availableStatuses = [],
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayPrice, setDisplayPrice] = useState('0,00');
  const [displayRentPrice, setDisplayRentPrice] = useState('0,00');
  const [gallery, setGallery] = useState<string[]>([]);

  const LISTING_TYPES = ['LANÇAMENTO', 'APTO TERCEIRO', 'CASA TERCEIROS', 'CASA CONDOMINIO', 'TERRENOS TERCEIROS', 'TERRENO LANÇAMENTO', 'TERRENOS EM CONDOMINIO'];

  const generateCode = (type: string) => {
    const prefix = type ? type.charAt(0).toUpperCase() : 'I';
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  };

  const initialFormData: Partial<Property> = {
    code: '', title: '', projectName: '', constructionCompany: '', type: availableTypes?.[0] || 'Apartamento',
    listingType: LISTING_TYPES[0], transactionType: 'Ambos', description: '', address: '', neighborhood: '',
    referencePoint: '', price: 0, rentPrice: 0, bedrooms: 0, bathrooms: 0, area: 0,
    status: availableStatuses?.[0] || PropertyStatus.AVAILABLE, imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    acceptsExchange: false, ownerName: '', ownerPhone: '', watermarkText: 'VETTUS IMÓVEIS', applyWatermark: false,
    brokerId: currentUser?.id || ''
  };

  const [formData, setFormData] = useState<Partial<Property>>(initialFormData);

  const formatCurrencyBRL = (value: number | string) => {
    const amount = typeof value === 'string' ? value.replace(/\D/g, '') : Math.round(Number(value) * 100).toString();
    const numericValue = parseInt(amount || '0') / 100;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numericValue);
  };

  const parseCurrencyToNumber = (formattedValue: string): number => {
    const cleanValue = formattedValue.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const handlePriceChange = (value: string, setter: (v: string) => void, field: 'price' | 'rentPrice') => {
    const formatted = formatCurrencyBRL(value);
    setter(formatted);
    setFormData(prev => ({ ...prev, [field]: parseCurrencyToNumber(formatted) }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProcessingImages(true);
    // Fix: Explicitly cast to File[] to ensure 'file' in map is recognized as a Blob for readAsDataURL on line 85
    const fileList = Array.from(files) as File[];
    try {
      const uploadPromises = fileList.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          // Correct: reader.readAsDataURL(file) now receives a File (Blob) instead of unknown
          reader.readAsDataURL(file);
        });
      });
      const results = await Promise.all(uploadPromises);
      setGallery(prev => [...prev, ...results]);
    } finally {
      setProcessingImages(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (propertyToEdit) {
        setFormData({ ...propertyToEdit });
        setDisplayPrice(formatCurrencyBRL(propertyToEdit.price));
        setDisplayRentPrice(formatCurrencyBRL(propertyToEdit.rentPrice || 0));
        setGallery(propertyToEdit.gallery || []);
      } else {
        const defaultType = availableTypes?.[0] || 'Apartamento';
        setFormData({ ...initialFormData, brokerId: currentUser?.id || '', type: defaultType, code: generateCode(defaultType) });
        setDisplayPrice('0,00');
        setDisplayRentPrice('0,00');
        setGallery([]);
        setCurrentStep(1);
      }
    }
  }, [isOpen, propertyToEdit, currentUser]);

  const handleExtract = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const data: any = await extractPropertyFromUrl(url);
      if (data && typeof data === 'object') {
        setFormData(prev => ({ ...prev, ...data, code: data.type ? generateCode(data.type) : prev.code }));
        if ('price' in data) setDisplayPrice(formatCurrencyBRL(data.price));
        setCurrentStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const selectedBroker = brokers.find(b => b.id === formData.brokerId) || currentUser;
      const propertyData: Property = {
        id: propertyToEdit?.id || Math.random().toString(36).substr(2, 9),
        brokerId: selectedBroker.id,
        brokerName: selectedBroker.name,
        code: formData.code || generateCode(formData.type || 'A'),
        title: formData.title || 'Captação sem Título',
        projectName: formData.projectName || '',
        constructionCompany: formData.constructionCompany || '',
        type: formData.type || 'Apartamento',
        listingType: formData.listingType || '',
        transactionType: 'Ambos',
        description: formData.description || '',
        address: formData.address || 'Endereço não informado',
        neighborhood: formData.neighborhood || '',
        price: Number(formData.price) || 0,
        rentPrice: Number(formData.rentPrice) || 0,
        bedrooms: Number(formData.bedrooms) || 0,
        bathrooms: Number(formData.bathrooms) || 0,
        area: Number(formData.area) || 0,
        status: formData.status || PropertyStatus.AVAILABLE,
        imageUrl: gallery.length > 0 ? gallery[0] : (formData.imageUrl || ''),
        gallery: gallery,
        acceptsExchange: !!formData.acceptsExchange,
        ownerName: formData.ownerName || '',
        ownerPhone: formData.ownerPhone || '',
        updatedAt: new Date().toISOString(),
        coordinates: { lat: 0, lng: 0 }
      };
      if (propertyToEdit && onUpdateProperty) onUpdateProperty(propertyData);
      else onAddProperty(propertyData);
      onClose();
    } finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0a1120]/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] p-0 relative z-10 shadow-2xl border border-white/10 flex flex-col max-h-[95vh] overflow-hidden">
        <div className="navy-gradient p-8 text-white shrink-0">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center shadow-lg"><Building2 className="w-6 h-6" /></div>
              <h2 className="text-xl font-bold uppercase tracking-tight">{propertyToEdit ? 'Editar Imóvel' : 'Nova Captação'}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex justify-between max-w-2xl mx-auto px-4">
            {[1, 2, 3, 4].map(s => (
              <div key={s} onClick={() => setCurrentStep(s)} className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all ${currentStep === s ? 'bg-[#d4a853]' : 'bg-slate-800 text-slate-500'}`}>{s}</div>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto p-8 bg-slate-50 flex-1 no-scrollbar">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
                <label className="text-[9px] font-black uppercase text-[#d4a853] mb-2 block">Link Externo (IA)</label>
                <div className="flex gap-2">
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-4 text-xs" />
                  <button onClick={handleExtract} disabled={loading} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">{loading ? '...' : 'Extrair'}</button>
                </div>
              </div>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Título do Anúncio" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm" />
            </div>
          )}
          <button onClick={handleSubmit} className="w-full gold-gradient text-white py-4 rounded-2xl mt-6 font-black uppercase shadow-xl">{isSubmitting ? 'Salvando...' : 'Consolidar'}</button>
        </div>
      </div>
    </div>
  );
};
