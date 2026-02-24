import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  DollarSign, 
  User, 
  Phone, 
  Save, 
  Zap, 
  Loader2, 
  Link as LinkIcon, 
  ShieldCheck, 
  Hash, 
  UserCheck, 
  RefreshCw, 
  Info, 
  Tag, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Sparkles, 
  Type as TypeIcon, 
  SlidersHorizontal, 
  UploadCloud, 
  LayoutPanelTop, 
  Pencil, 
  Layers,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileText,
  HardHat,
  Wand2
} from 'lucide-react';
import { Property, Broker, PropertyStatus } from '../types.ts';
import { extractPropertyFromUrl, editImageWithAI } from '../services/gemini.ts';

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
  isOpen,
  onClose,
  onAddProperty,
  onUpdateProperty,
  propertyToEdit,
  currentUser,
  brokers = [],
  availableTypes = [],
  availableStatuses = [],
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

  // Estados para Edição de Imagem com IA
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiEditIndex, setAiEditIndex] = useState<number | null>(null);
  const [aiEditPrompt, setAiEditPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const LISTING_TYPES = [
    'LANÇAMENTO',
    'APTO TERCEIRO',
    'CASA TERCEIROS',
    'CASA CONDOMINIO',
    'TERRENOS TERCEIROS',
    'TERRENO LANÇAMENTO',
    'TERRENOS EM CONDOMINIO'
  ];

  const generateCode = (type: string) => {
    const prefix = type ? type.charAt(0).toUpperCase() : 'I';
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  };

  const initialFormData: Partial<Property> = {
    code: '',
    title: '',
    projectName: '',
    constructionCompany: '',
    type: availableTypes?.[0] || 'Apartamento',
    listingType: LISTING_TYPES[0], 
    transactionType: 'Ambos',
    description: '',
    address: '',
    neighborhood: '',
    referencePoint: '',
    price: 0,
    rentPrice: 0,
    bedrooms: 0,
    bathrooms: 0, 
    area: 0,      
    status: availableStatuses?.[0] || PropertyStatus.AVAILABLE,
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    acceptsExchange: false,
    ownerName: '',
    ownerPhone: '',
    watermarkText: 'VETTUS IMÓVEIS',
    watermarkImage: '',
    watermarkOpacity: 0.5,
    applyWatermark: false,
    brokerId: currentUser?.id || ''
  };

  const [formData, setFormData] = useState<Partial<Property>>(initialFormData);

  const formatCurrencyBRL = (value: number | string) => {
    const amount = typeof value === 'string' ? value.replace(/\D/g, '') : Math.round(Number(value) * 100).toString();
    const numericValue = parseInt(amount || '0') / 100;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
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

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');
        
        ctx.drawImage(img, 0, 0, width, height);

        // Aplicação de Marca d'Água (Regra 3.11.2)
        if (formData.applyWatermark) {
          ctx.save();
          const fontSize = Math.max(20, width / 20);
          ctx.font = `black ${fontSize}px "Inter", sans-serif`;
          ctx.fillStyle = `rgba(212, 168, 83, ${formData.watermarkOpacity || 0.5})`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          
          // Texto da Marca d'Água
          const text = formData.watermarkText || 'VETTUS IMÓVEIS';
          ctx.fillText(text, width - 20, height - 20);
          
          // Linha decorativa
          ctx.strokeStyle = `rgba(212, 168, 83, ${(formData.watermarkOpacity || 0.5) / 2})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width - 20, height - 15);
          ctx.lineTo(width - 20 - ctx.measureText(text).width, height - 15);
          ctx.stroke();
          
          ctx.restore();
        }

        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => resolve('');
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessingImages(true);
    const fileList = Array.from(files) as File[];
    
    try {
      const uploadPromises = fileList.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            if (!base64) return resolve('');
            const compressed = await compressImage(base64);
            resolve(compressed);
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(uploadPromises);
      const validImages = results.filter(img => img !== '');
      
      if (validImages.length > 0) {
        setGallery(prev => [...prev, ...validImages]);
      }
    } catch (err) {
      console.error("Erro no processamento de imagens:", err);
    } finally {
      setProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index));
  };

  const handleAiEdit = async () => {
    if (aiEditIndex === null || !aiEditPrompt.trim()) return;
    
    setIsAiProcessing(true);
    try {
      const originalImage = gallery[aiEditIndex];
      const editedImage = await editImageWithAI(originalImage, aiEditPrompt);
      
      const newGallery = [...gallery];
      newGallery[aiEditIndex] = editedImage;
      setGallery(newGallery);
      
      setIsAiEditing(false);
      setAiEditPrompt('');
      setAiEditIndex(null);
      alert("Imagem editada com sucesso pela Vettus AI!");
    } catch (error) {
      alert("Erro ao editar imagem com IA. Tente novamente.");
    } finally {
      setIsAiProcessing(false);
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
        setFormData({
          ...initialFormData,
          brokerId: currentUser?.id || '',
          type: defaultType,
          code: generateCode(defaultType)
        });
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
        const newCode = data.type ? generateCode(data.type) : formData.code;
        setFormData(prev => ({
          ...prev,
          ...data,
          code: newCode
        }));
        if ('price' in data) setDisplayPrice(formatCurrencyBRL(data.price));
        if ('rentPrice' in data) setDisplayRentPrice(formatCurrencyBRL(data.rentPrice));
        setCurrentStep(2);
      }
    } catch (error) {
      console.error("Erro na extração:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const safeBrokers = brokers || [];
      const selectedBroker = safeBrokers.find(b => b.id === formData.brokerId) || currentUser;

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
        referencePoint: formData.referencePoint || '',
        price: Number(formData.price) || 0,
        rentPrice: Number(formData.rentPrice) || 0,
        bedrooms: Number(formData.bedrooms) || 0,
        bathrooms: Number(formData.bathrooms) || 0,
        area: Number(formData.area) || 0,
        status: formData.status || PropertyStatus.AVAILABLE,
        imageUrl: gallery.length > 0 ? gallery[0] : (formData.imageUrl || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'),
        gallery: gallery,
        watermarkText: formData.watermarkText || 'VETTUS IMÓVEIS',
        watermarkImage: formData.watermarkImage || '',
        watermarkOpacity: formData.watermarkOpacity || 0.5,
        applyWatermark: !!formData.applyWatermark,
        coordinates: formData.coordinates || { lat: -23.5505, lng: -46.6333 },
        acceptsExchange: !!formData.acceptsExchange,
        ownerName: formData.ownerName || '',
        ownerPhone: formData.ownerPhone || '',
        updatedAt: new Date().toISOString()
      };
      
      if (propertyToEdit && onUpdateProperty) {
        onUpdateProperty(propertyData);
      } else {
        onAddProperty(propertyData);
      }
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { id: 1, title: 'Identificação', icon: Tag },
    { id: 2, title: 'Detalhes', icon: FileText },
    { id: 3, title: 'Proprietário', icon: ShieldCheck },
    { id: 4, title: 'Mídia', icon: ImageIcon },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0a1120]/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] p-0 relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden max-h-[95vh] flex flex-col border border-white/10">
        
        <div className="navy-gradient p-8 text-white shrink-0 border-b border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center shadow-lg">
                {propertyToEdit ? <Pencil className="w-6 h-6 text-white" /> : <Building2 className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">{propertyToEdit ? 'Editar Imóvel' : 'Nova Captação'}</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{propertyToEdit ? `REF: ${propertyToEdit.code}` : 'Cadastro Vettus (Todos os campos opcionais)'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center justify-between max-w-2xl mx-auto relative px-4">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2 -z-0"></div>
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-[#d4a853] -translate-y-1/2 transition-all duration-500 -z-0"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            ></div>
            
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center">
                  <div 
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      isActive ? 'bg-[#d4a853] text-white scale-110 shadow-[0_0_15px_rgba(212,168,83,0.4)]' : 
                      isCompleted ? 'bg-emerald-50 text-white' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`absolute -bottom-6 text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${isActive ? 'text-[#d4a853]' : 'text-slate-500'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-y-auto p-8 bg-slate-50 flex-1 no-scrollbar pt-12">
          
          {currentStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                 <div className="flex items-center space-x-3 mb-2">
                    <Sparkles className="w-5 h-5 text-[#d4a853]" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Origem e Identificação</h3>
                 </div>

                 {!propertyToEdit && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <label className="text-[9px] font-black uppercase text-[#d4a853] tracking-widest mb-2 block">Célula de Inteligência (Link Externo)</label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          value={url}
                          onChange={e => setUrl(e.target.value)}
                          placeholder="Cole link de referência (opcional)..."
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-slate-900 outline-none focus:border-[#d4a853]"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={handleExtract}
                        disabled={loading || !url}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center space-x-2 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        <span>Extrair</span>
                      </button>
                    </div>
                  </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Classificação</label>
                      <select 
                        value={formData.listingType}
                        onChange={e => setFormData({...formData, listingType: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none"
                      >
                        {LISTING_TYPES.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo de Unidade</label>
                      <select 
                        value={formData.type}
                        onChange={e => {
                          const newType = e.target.value;
                          const newCode = generateCode(newType);
                          setFormData({...formData, type: newType, code: newCode});
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none"
                      >
                        {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-black text-[#d4a853] uppercase ml-1 flex items-center">
                        <HardHat className="w-3 h-3 mr-1" /> Construtora (Opcional)
                      </label>
                      <input 
                        type="text" 
                        value={formData.constructionCompany} 
                        onChange={e => setFormData({...formData, constructionCompany: e.target.value})} 
                        placeholder="Ex: Vectra, Plaenge..."
                        className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d4a853]/20" 
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Corretor Captador</label>
                      <select 
                        value={formData.brokerId}
                        onChange={e => setFormData({...formData, brokerId: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none"
                      >
                        {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Título do Anúncio (Opcional)</label>
                      <input 
                        type="text" 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        placeholder="Ex: Cobertura Duplex com Vista Mar..."
                        className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d4a853]/20" 
                      />
                    </div>
                 </div>
               </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor Venda</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input type="text" value={displayPrice} onChange={e => handlePriceChange(e.target.value, setDisplayPrice, 'price')} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 text-sm font-black text-slate-900" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor Locação</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                        <input type="text" value={displayRentPrice} onChange={e => handlePriceChange(e.target.value, setDisplayRentPrice, 'rentPrice')} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 text-sm font-black text-slate-900" />
                      </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 text-center block">Área m²</label>
                      <input type="number" value={formData.area || ''} onChange={e => setFormData({...formData, area: e.target.value === '' ? 0 : Number(e.target.value)})} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 text-center text-sm font-black text-slate-900 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 text-center block">Quartos</label>
                      <input type="number" value={formData.bedrooms || ''} onChange={e => setFormData({...formData, bedrooms: e.target.value === '' ? 0 : Number(e.target.value)})} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 text-center text-sm font-black text-slate-900 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 text-center block">Suítes</label>
                      <input type="number" value={formData.bathrooms || ''} onChange={e => setFormData({...formData, bathrooms: e.target.value === '' ? 0 : Number(e.target.value)})} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 text-center text-sm font-black text-slate-900 outline-none" />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descrição Comercial</label>
                    <textarea 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      placeholder="Descreva os diferenciais deste imóvel..." 
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#d4a853]/20 resize-none"
                    />
                 </div>
               </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                 <div className="flex items-center space-x-3 mb-2">
                    <MapPin className="w-5 h-5 text-[#d4a853]" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Geolocalização</h3>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Endereço Público (Opcional)</label>
                      <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Rua, Número, CEP" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Bairro</label>
                        <input type="text" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} placeholder="Ex: Jardins" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Condomínio</label>
                        <input type="text" value={formData.projectName} onChange={e => setFormData({...formData, projectName: e.target.value})} placeholder="Nome do Edifício" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none" />
                      </div>
                    </div>
                 </div>
               </div>

               <div className="bg-[#0a1120] p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Dados Confidenciais (Opcionais)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome Proprietário</label>
                      <input type="text" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} placeholder="Para controle interno" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-[#d4a853]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Contato/WhatsApp</label>
                      <input type="tel" value={formData.ownerPhone} onChange={e => setFormData({...formData, ownerPhone: e.target.value})} placeholder="Telefone do proprietário" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-[#d4a853]" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mt-4 px-2">
                    <input type="checkbox" checked={formData.acceptsExchange} onChange={e => setFormData({...formData, acceptsExchange: e.target.checked})} className="w-4 h-4 rounded border-white/10 bg-white/5 text-[#d4a853]" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aceita Permuta / Troca</span>
                  </div>
               </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                       <ImageIcon className="w-5 h-5 text-[#d4a853]" />
                       <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Galeria de Fotos</h3>
                    </div>
                    <div className="flex items-center space-x-3">
                      {processingImages && <Loader2 className="w-4 h-4 text-[#d4a853] animate-spin" />}
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={processingImages}
                        className="text-[9px] font-black uppercase text-[#d4a853] bg-[#d4a853]/5 px-4 py-2 rounded-full border border-[#d4a853]/10 hover:bg-[#d4a853] hover:text-white transition-all disabled:opacity-50"
                      >
                         <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Fotos
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {gallery.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100">
                        <img src={img} alt={`Foto ${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
                           <button 
                             type="button" 
                             onClick={() => { setAiEditIndex(idx); setIsAiEditing(true); }} 
                             className="bg-[#d4a853] text-white p-2 rounded-lg shadow-lg hover:scale-110 transition-transform"
                             title="Editar com IA"
                           >
                             <Wand2 className="w-4 h-4" />
                           </button>
                           <button 
                             type="button" 
                             onClick={() => removeImage(idx)} 
                             className="bg-red-50 text-white p-2 rounded-lg shadow-lg hover:scale-110 transition-transform"
                             title="Remover"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                        {idx === 0 && <div className="absolute bottom-0 inset-x-0 bg-emerald-500 text-white text-[7px] font-black uppercase text-center py-0.5 z-10">Capa</div>}
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:text-[#d4a853] hover:border-[#d4a853] transition-all bg-slate-50/50"
                    >
                      <Plus className="w-6 h-6 mb-1" />
                      <span className="text-[8px] font-bold uppercase">Upload</span>
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    multiple 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
               </div>

               {/* Painel de Edição com IA (Overlay) */}
               {isAiEditing && aiEditIndex !== null && (
                 <div className="bg-[#0a1120] p-8 rounded-[2.5rem] border border-white/10 space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-3 text-[#d4a853]">
                          <Sparkles className="w-6 h-6" />
                          <h3 className="text-sm font-black uppercase tracking-widest">Nano Banana Image Editor</h3>
                       </div>
                       <button onClick={() => setIsAiEditing(false)} className="text-white opacity-40 hover:opacity-100"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="aspect-video rounded-2xl overflow-hidden border border-white/5 bg-black/20">
                          <img src={gallery[aiEditIndex]} className="w-full h-full object-contain" />
                       </div>
                       <div className="space-y-4">
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                            A tecnologia <strong>Gemini 2.5 Flash Image</strong> permite modificar suas fotos instantaneamente. Descreva o que deseja mudar:
                          </p>
                          <textarea 
                            value={aiEditPrompt}
                            onChange={e => setAiEditPrompt(e.target.value)}
                            placeholder="Ex: Adicione um filtro retrô sofisticado, remova a pessoa ao fundo, melhore a iluminação do pôr do sol..."
                            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-[#d4a853] resize-none"
                          />
                          <button 
                            onClick={handleAiEdit}
                            disabled={isAiProcessing || !aiEditPrompt.trim()}
                            className="w-full gold-gradient text-black py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center space-x-3 disabled:opacity-50"
                          >
                            {isAiProcessing ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>IA Processando...</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4" />
                                <span>Aplicar Alteração com IA</span>
                              </>
                            )}
                          </button>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}
        </div>

        <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <button 
            type="button"
            onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
            className={`flex items-center space-x-2 text-xs font-black uppercase tracking-widest transition-all ${currentStep === 1 ? 'opacity-0' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="flex space-x-3">
             {currentStep < 4 && (
               <button 
                 type="button"
                 onClick={() => setCurrentStep(currentStep + 1)}
                 className="gold-gradient text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-yellow-900/20 hover:scale-[1.05] active:scale-95 transition-all flex items-center space-x-2"
               >
                 <span>Próximo Passo</span>
                 <ChevronRight className="w-4 h-4" />
               </button>
             )}
             
             {(currentStep >= 2 || propertyToEdit) && (
               <button 
                 type="button"
                 onClick={handleSubmit}
                 disabled={isSubmitting || processingImages || isAiProcessing}
                 className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
               >
                 {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                 <span>{isSubmitting ? 'Salvando...' : (propertyToEdit ? 'Atualizar Captação' : 'Consolidar Captação')}</span>
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};