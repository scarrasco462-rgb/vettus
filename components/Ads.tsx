
import React, { useState } from 'react';
import { 
  Sparkles, 
  ImageIcon, 
  Layout, 
  Share2, 
  Instagram, 
  MessageCircle, 
  ExternalLink, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  Copy, 
  Palette,
  FileText
} from 'lucide-react';
import { Property, Broker } from '../types';
import { getAISuggestions } from '../services/gemini';

interface AdsViewProps {
  properties: Property[];
  currentUser: Broker;
}

export const AdsView: React.FC<AdsViewProps> = ({ properties, currentUser }) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [adTone, setAdTone] = useState<'Luxury' | 'Urgency' | 'Informative'>('Luxury');
  const [isGenerating, setIsGenerating] = useState(false);
  const [adContent, setAdContent] = useState<any>(null);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const generateAd = async () => {
    if (!selectedProperty) return;
    setIsGenerating(true);
    
    const prompt = `Crie um anúncio imobiliário para o imóvel: ${selectedProperty.title}. 
    Local: ${selectedProperty.neighborhood}. Preço: ${selectedProperty.price}. 
    Diferenciais: ${selectedProperty.description}. 
    Tom: ${adTone === 'Luxury' ? 'Extremamente sofisticado e exclusivo' : adTone === 'Urgency' ? 'Oportunidade única e escassez' : 'Factual e direto'}.
    Retorne o texto formatado para Instagram (com hashtags) e WhatsApp.`;

    const result = await getAISuggestions(prompt);
    
    setAdContent({
      text: result,
      date: new Date().toLocaleDateString('pt-BR')
    });
    setIsGenerating(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Estúdio de Anúncios AI</h1>
          <p className="text-slate-500 font-medium">Transforme captações em campanhas de alta conversão.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
             <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center shadow-lg">
                   <Palette className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-black uppercase text-slate-900">Configuração Criativa</h3>
             </div>

             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Selecionar Imóvel</label>
                   <select 
                     value={selectedPropertyId} 
                     onChange={e => setSelectedPropertyId(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 outline-none focus:border-[#d4a853]"
                   >
                      <option value="">Selecione para anunciar...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.title} ({p.code})</option>)}
                   </select>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tom do Anúncio</label>
                   <div className="grid grid-cols-3 gap-2">
                      {['Luxury', 'Urgency', 'Informative'].map(tone => (
                        <button 
                          key={tone}
                          onClick={() => setAdTone(tone as any)}
                          className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                            adTone === tone ? 'bg-slate-900 text-[#d4a853] border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-[#d4a853]'
                          }`}
                        >
                          {tone}
                        </button>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={generateAd}
                  disabled={!selectedPropertyId || isGenerating}
                  className="w-full gold-gradient text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                   {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                   <span>Gerar Kit de Anúncio</span>
                </button>
             </div>
          </div>

          {selectedProperty && (
            <div className="bg-[#0a1120] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
               <img src={selectedProperty.imageUrl} className="w-full h-40 object-cover opacity-60" />
               <div className="p-6">
                  <p className="text-[9px] font-black text-[#d4a853] uppercase tracking-widest mb-1">{selectedProperty.type}</p>
                  <h4 className="text-white font-bold text-sm truncate">{selectedProperty.title}</h4>
                  <p className="text-slate-400 text-xs mt-1">{selectedProperty.neighborhood}</p>
               </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
           {adContent ? (
             <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
                   <div className="navy-gradient p-8 text-white flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                            <Smartphone className="w-6 h-6 text-[#d4a853]" />
                         </div>
                         <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Social Media Kit</h2>
                            <p className="text-[#d4a853] text-[9px] font-black uppercase tracking-[0.3em]">IA Vettus-Intelligence</p>
                         </div>
                      </div>
                      <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">
                        <Share2 className="w-5 h-5" />
                      </button>
                   </div>

                   <div className="p-10 space-y-8">
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center">
                               <Instagram className="w-4 h-4 mr-2 text-pink-500" /> Instagram & WhatsApp
                            </h4>
                            <button onClick={() => {navigator.clipboard.writeText(adContent.text); alert("Copiado!")}} className="text-[9px] font-black text-[#d4a853] uppercase hover:underline flex items-center">
                               <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Tudo
                            </button>
                         </div>
                         <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium shadow-inner">
                            {adContent.text}
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                         <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Instagram className="w-12 h-12" /></div>
                            <p className="text-[10px] font-black uppercase text-[#d4a853] mb-4">Sugestão de Visual</p>
                            <p className="text-[11px] leading-relaxed opacity-80">"Utilize fotos do entardecer com filtros quentes. Destaque a metragem e a localização no primeiro slide."</p>
                         </div>
                         <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><MessageCircle className="w-12 h-12 text-emerald-600" /></div>
                            <p className="text-[10px] font-black uppercase text-emerald-600 mb-4">Estratégia WhatsApp</p>
                            <p className="text-[11px] leading-relaxed text-emerald-800">"Envie como lista de transmissão para clientes com perfil 'Hot'. Finalize com o link direto da captação."</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mb-6">
                   <ImageIcon className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Aguardando Seleção</h3>
                <p className="text-slate-400 text-sm mt-2 max-w-xs font-medium">Escolha um imóvel à esquerda e defina o tom de voz para que a IA gere seus anúncios premium.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
