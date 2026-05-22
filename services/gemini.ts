/**
 * Funções de serviço para conversação com o Google Gemini API (Via Provedor Seguro express).
 * Toda a computação pesada do SDK @google/genai é gerenciada no back-end.
 */

export const getAISuggestions = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) {
      throw new Error(`Erro na resposta do servidor: ${response.status}`);
    }
    const data = await response.json();
    return data.text || "Sem sugestões no momento.";
  } catch (error: any) {
    console.error("AI Error:", error);
    return "O assistente de IA está temporariamente ocupado. Por favor, tente novamente em instantes.";
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
      throw new Error(`Erro na resposta do servidor: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("AI Extraction Error:", error);
    throw error;
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
      throw new Error(`Erro na resposta do servidor: ${response.status}`);
    }
    const data = await response.json();
    return data.image;
  } catch (error: any) {
    console.error("AI Image Edit Error:", error);
    throw error;
  }
};