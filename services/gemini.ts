import { GoogleGenAI, Type } from "@google/genai";

/**
 * Funções de serviço para integração com o Google Gemini API.
 * Seguindo as diretrizes oficiais de desenvolvimento do SDK @google/genai.
 * Adicionado helper de retry para lidar com 429 RESOURCE_EXHAUSTED.
 */

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED'))) {
      console.warn(`Vettus AI: Cota atingida. Tentando novamente em ${delay}ms... (${retries} restantes)`);
      await wait(delay);
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const getAISuggestions = async (prompt: string) => {
  try {
    return await callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Você é um assistente de IA especialista em mercado imobiliário de luxo no Brasil da Vettus Imóveis. Ajude corretores a criar descrições persuasivas, analisar leads e sugerir estratégias de fechamento.",
        }
      });
      return response.text || "Sem sugestões no momento.";
    });
  } catch (error: any) {
    console.error("AI Error:", error);
    return "O assistente de IA está temporariamente ocupado. Por favor, tente novamente em instantes.";
  }
};

export const extractPropertyFromUrl = async (url: string) => {
  try {
    return await callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extraia detalhadamente as informações do imóvel deste link: ${url}. Retorne APENAS um objeto JSON válido contendo: title, type (Apartamento|Casa|Cobertura|Terreno), price (número), address, area (número), bedrooms (número), bathrooms (número), description, status (Disponível|Lançamento).`,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      const text = response.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
      
      return JSON.parse(jsonStr);
    });
  } catch (error: any) {
    console.error("AI Extraction Error:", error);
    throw error;
  }
};

/**
 * Edita uma imagem baseada em um prompt de texto usando Gemini 2.5 Flash Image.
 * @param base64Image Imagem em formato base64 (incluindo o prefixo data:image/...)
 * @param prompt Comando do usuário (ex: "adicione um filtro retrô")
 */
export const editImageWithAI = async (base64Image: string, prompt: string) => {
  try {
    return await callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error("Formato de imagem inválido.");
      }
      
      const mimeType = matches[1];
      const data = matches[2];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: data,
                mimeType: mimeType,
              },
            },
            {
              text: `Edite esta imagem seguindo exatamente esta instrução: ${prompt}. Retorne a imagem editada com a maior fidelidade possível ao pedido.`,
            },
          ],
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      
      throw new Error("A IA não retornou uma imagem editada.");
    });
  } catch (error: any) {
    console.error("AI Image Edit Error:", error);
    throw error;
  }
};