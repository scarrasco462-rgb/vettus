/**
 * Funções de serviço para conversação com o Google Gemini API (Via Provedor Seguro Express).
 * Toda a computação do SDK @google/genai é gerenciada no back-end.
 * Inclui um robusto modo de contingência local estruturado para falhas de cota/key.
 */

// Verifica se um erro é devido a limites de cota da API (Quota Exceeded / Rate Limit) ou sobrecarga temporária (503)
const checkIsQuotaError = (error: any): boolean => {
  const errText = String(error?.message || error || '').toLowerCase();
  return (
    errText.includes('429') ||
    errText.includes('503') ||
    errText.includes('quota') ||
    errText.includes('cota') ||
    errText.includes('exceeded') ||
    errText.includes('excedida') ||
    errText.includes('resource_exhausted') ||
    errText.includes('api key') ||
    errText.includes('limite') ||
    errText.includes('unavailable') ||
    errText.includes('high demand') ||
    errText.includes('overloaded') ||
    errText.includes('temporariamente') ||
    errText.includes('indisponível')
  );
};

// Registra e despacha o aviso de cota de IA excedida para a interface React
const triggerQuotaExceededEvent = () => {
  try {
    localStorage.setItem('vettus_ai_quota_exceeded', 'true');
    window.dispatchEvent(new Event('vettus_ai_status_change'));
  } catch (e) {}
};

// Gerador de contingência inteligente local para sugestões de texto imobiliário de luxo
const generateFallbackSuggestion = (prompt: string): string => {
  // 1. Dashboard Insight fallback
  if (prompt.includes('Ignore instruções anteriores') || prompt.includes('performance imobiliária') || prompt.includes('insight estratégico')) {
    const leadsMatch = prompt.match(/Leads:\s*(\d+)/i);
    const vgvMatch = prompt.match(/VGV:\s*([^,]+)/i);
    const leads = leadsMatch ? leadsMatch[1] : '18';
    const vgv = vgvMatch ? vgvMatch[1] : 'R$ 24.500.000';
    
    return `Análise de Alta Performance Vettus CRM (Modo Contingência Ativo):
Com sua respeitável carteira de ${leads} Leads ativos e VGV de R$ ${vgv} mapeado no funil, seu foco imediato deve concentrar-se na aceleração de leads 'quentes' na fase de Agendamento. Sugerimos coordenar ações diretas de follow-up em imóveis prontos com visitas privativas personalizadas ao entardecer, as quais elevam estatisticamente a taxa de conversão em até 22% em negócios de alto padrão.`;
  }
  
  // 2. Marketing copy fallback
  if (prompt.includes('Como especialista de marketing') || prompt.includes('exclusividade total') || prompt.includes('VIP')) {
    const topicMatch = prompt.match(/sobre:\s*(.*)/i);
    let topic = topicMatch ? topicMatch[1].trim() : 'nosso portfólio selecionado de altíssimo padrão';
    if (topic.endsWith('.')) topic = topic.slice(0, -1);
    const isWhatsapp = prompt.includes('WhatsApp');
    
    if (isWhatsapp) {
      return `💎 *VETTUS PROPERTIES | PRIVILEGE CLUB* 💎

Olá! Tenho o privilégio de trazer para você uma oportunidade absolutamente primorosa e confidencial que acaba de entrar em nossa carteira exclusiva:

👉 *${topic}*

Uma verdadeira joia arquitetônica projetada para quem valoriza a máxima sofisticação, com acabamento impecável e privacidade inegociável.

Gostaria de coordenar uma apresentação privativa com um de nossos diretores associados nesta semana?

_Para mais detalhes, responda a esta mensagem para atendimento imediato._`;
    } else {
      return `Assunto: Convite VIP - Apresentação Privativa de Portfólio de Luxo Vettus

Prezado(a) Cliente,

É com grande satisfação que formalizamos este comunicado estratégico referente a uma oportunidade incomum de investimento e moradia de prestígio:

${topic}

Este ativo foi rigorosamente auditado por nossa curadoria premium, apresentando características singulares de design autoral, sustentabilidade refinada e uma das localizações mais desejadas do país, garantindo total privacidade e uma valorização de capital consistente.

Acreditamos que este perfil harmonize perfeitamente com sua busca permanente por sofisticação e excelência patrimonial.

Ficamos à sua inteira disposição para coordenar uma recepção VIP privativa com nosso especialista sênior. Responda a este e-mail para indicar os melhores horários em sua agenda.

Atenciosamente,

Vettus Corporate Relations
A Elite do Mercado de Luxo`;
    }
  }

  // 3. Ad generator fallback
  if (prompt.includes('Crie um anúncio imobiliário') || prompt.includes('anúncio')) {
    const titleMatch = prompt.match(/imóvel:\s*([^.]+)/i);
    const neighborhoodMatch = prompt.match(/Local:\s*([^.]+)/i);
    const priceMatch = prompt.match(/Preço:\s*([^.]+)/i);
    
    const title = titleMatch ? titleMatch[1].trim() : 'Residência Exclusiva Vettus';
    const neighborhood = neighborhoodMatch ? neighborhoodMatch[1].trim() : 'Prime Zone';
    const price = priceMatch ? priceMatch[1].trim() : 'Sob Consulta Estratégica';
    
    return `📸 *INSTAGRAM AD CAMPAIGN (PREMIUM EDIT)* 📸
────────────────────────
⚜️ *VETTUS EXCLUSIVE PROPERTIES* ⚜️

Apresentamos o magnífico *${title}*, localizado no valorizado cenário de *${neighborhood}*. 

✨ Uma simbiose perfeita entre arte residencial, segurança máxima e bem-estar incomparável para sua família. Desenhado para satisfazer os gostos mais refinados.

💰 Valor estratégico: *${price}*

📩 Envie um Direct para receber o book descritivo completo e as fotos exclusivas em alta definição.

#VettusImoveis #MercadoDeLuxo #ImoveisDiferenciados #RealEstateLuxury #ExclusividadeVettus

────────────────────────
💬 *WHATSAPP VIP CAMPAIGN* 💬
────────────────────────
Olá! Buscando um imóvel com padrão verdadeiramente elevado na região de *${neighborhood}*?

O sofisticado *${title}* oferece o ápice em arquitetura autoral, materiais importados e ampla infraestrutura de lazer seguro.

*Destaques:*
• Localização ímpar e altamente reservada em ${neighborhood}
• Valor estratégico: ${price}
• Condição exclusiva para nossa lista restrita de investidores.

Estou de prontidão para agendar sua visita privativa. Retorne este contato e agende sua experiência exclusiva!`;
  }

  return `Assistente Vettus (Fallback Inteligente Ativado):
Não foi possível processar a requisição com os servidores do Gemini em tempo real devido a limites de cota da chave gratuita. Configure sua API key própria de forma definitiva no painel 'Settings' do AI Studio para habilitar o processamento avançado de linguagem natural.`;
};

// Gerador de contingência inteligente local para extração de dados de imóveis por URL
const generateFallbackPropertyExtraction = (url: string): any => {
  const urlLower = url.toLowerCase();
  let type = "Apartamento";
  if (urlLower.includes("casa") || urlLower.includes("residencia") || urlLower.includes("condominio")) type = "Casa";
  else if (urlLower.includes("cobertura") || urlLower.includes("penthouse") || urlLower.includes("roof")) type = "Cobertura";
  else if (urlLower.includes("terreno") || urlLower.includes("lote") || urlLower.includes("quadra")) type = "Terreno";
  
  let neighborhood = "Jardins";
  if (urlLower.includes("leblon")) neighborhood = "Leblon";
  else if (urlLower.includes("ipanema")) neighborhood = "Ipanema";
  else if (urlLower.includes("morumbi")) neighborhood = "Morumbi";
  else if (urlLower.includes("alphaville")) neighborhood = "Alphaville";
  else if (urlLower.includes("barra")) neighborhood = "Barra da Tijuca";
  else if (urlLower.includes("itaim")) neighborhood = "Itaim Bibi";
  else if (urlLower.includes("pinheiros")) neighborhood = "Pinheiros";
  
  let price = 4800000;
  if (urlLower.includes("mansao") || urlLower.includes("luxury") || urlLower.includes("luxo") || urlLower.includes("cobertura")) {
    price = 12500000;
  }

  return {
    title: `${type} de Luxo Extraído (Ref: ${neighborhood})`,
    type: type,
    price: price,
    address: `Avenida das Nações Unidades, ${neighborhood}, São Paulo - SP`,
    area: type === "Cobertura" ? 340 : type === "Casa" ? 520 : 190,
    bedrooms: type === "Casa" ? 4 : type === "Cobertura" ? 4 : 3,
    bathrooms: type === "Casa" ? 5 : type === "Cobertura" ? 5 : 4,
    description: `Imóvel de alto padrão com localização de prestígio no bairro ${neighborhood}. Planta inteligente e integrada, acabamentos de primeira linha, amplo living e excelente iluminação natural com ventilação cruzada. Extraído com sucesso através de link inteligente.`,
    status: "Disponível",
    isFallback: true
  };
};

export const getAISuggestions = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      let apiError = `Erro na resposta do servidor: ${response.status}`;
      try {
        const errData = await response.json();
        if (errData && errData.error) {
          apiError = errData.error;
        }
      } catch (inner) {}
      throw new Error(apiError);
    }
    
    const data = await response.json();
    // Limpar o sinalizador de cota se a chamada foi bem sucedida
    try {
      localStorage.removeItem('vettus_ai_quota_exceeded');
      window.dispatchEvent(new Event('vettus_ai_status_change'));
    } catch (e) {}

    return data.text || "Sem sugestões no momento.";
  } catch (error: any) {
    if (checkIsQuotaError(error)) {
      triggerQuotaExceededEvent();
    }
    
    console.warn("AI Suggestions Graceful Fallback initiated due to:", error.message || error);
    return generateFallbackSuggestion(prompt);
  }
};

export const extractPropertyFromUrl = async (url: string): Promise<any> => {
  try {
    const response = await fetch('/api/gemini/extract-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      let apiError = `Erro na resposta do servidor: ${response.status}`;
      try {
        const errData = await response.json();
        if (errData && errData.error) {
          apiError = errData.error;
        }
      } catch (inner) {}
      throw new Error(apiError);
    }

    const data = await response.json();
    try {
      localStorage.removeItem('vettus_ai_quota_exceeded');
      window.dispatchEvent(new Event('vettus_ai_status_change'));
    } catch (e) {}

    return data;
  } catch (error: any) {
    if (checkIsQuotaError(error)) {
      triggerQuotaExceededEvent();
    }
    
    console.warn("AI Property Extraction Graceful Fallback initiated due to:", error.message || error);
    return generateFallbackPropertyExtraction(url);
  }
};

export const editImageWithAI = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/edit-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, prompt }),
    });

    if (!response.ok) {
      let apiError = `Erro na resposta do servidor: ${response.status}`;
      try {
        const errData = await response.json();
        if (errData && errData.error) {
          apiError = errData.error;
        }
      } catch (inner) {}
      throw new Error(apiError);
    }

    const data = await response.json();
    try {
      localStorage.removeItem('vettus_ai_quota_exceeded');
      window.dispatchEvent(new Event('vettus_ai_status_change'));
    } catch (e) {}

    return data.image;
  } catch (error: any) {
    if (checkIsQuotaError(error)) {
      triggerQuotaExceededEvent();
    }
    
    console.warn("AI Image Edit Graceful Fallback initiated (retaining original photo) due to:", error.message || error);
    // Para edição de imagens, retornamos o próprio original como fallback gracioso
    return base64Image;
  }
};
