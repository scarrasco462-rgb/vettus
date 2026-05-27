import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'database.json');

app.use(express.json({ limit: '100mb' }));

let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Formata erros do SDK Gemini em mensagens amigáveis em português
function formatGeminiError(err: any): { status: number; message: string; code: string } {
  const errMsg = err?.message || '';
  const errStr = String(err);
  
  if (
    errStr.includes('503') || 
    errMsg.includes('503') || 
    errStr.toUpperCase().includes('UNAVAILABLE') || 
    errMsg.toUpperCase().includes('UNAVAILABLE') || 
    errStr.toLowerCase().includes('high demand') || 
    errMsg.toLowerCase().includes('high demand') ||
    errStr.toLowerCase().includes('service unavailable') || 
    errMsg.toLowerCase().includes('service unavailable')
  ) {
    return {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'O servidor do Gemini está temporariamente indisponível devido a alta demanda (503 Service Unavailable). Seus geradores locais de contingência foram ativados com sucesso na interface.'
    };
  }

  if (
    errStr.includes('429') || 
    errMsg.includes('429') || 
    errStr.toLowerCase().includes('quota') || 
    errMsg.toLowerCase().includes('quota') || 
    errStr.includes('RESOURCE_EXHAUSTED') || 
    errMsg.includes('RESOURCE_EXHAUSTED')
  ) {
    return {
      status: 429,
      code: 'QUOTA_EXCEEDED',
      message: 'A cota de requisições de Inteligência Artificial foi excedida para esta chave do Gemini. Por favor, configure uma chave API paga no painel Settings do AI Studio ou aguarde um pouco para novas consultas.'
    };
  }
  
  if (
    errStr.toLowerCase().includes('api key') || 
    errMsg.toLowerCase().includes('api key') || 
    errStr.includes('API_KEY') || 
    errMsg.includes('API_KEY') ||
    errStr.includes('key is required') ||
    errMsg.includes('key is required')
  ) {
    return {
      status: 401,
      code: 'INVALID_API_KEY',
      message: 'Chave de API do Gemini não configurada ou inválida no servidor. Por favor, configure uma chave de API válida no painel Settings do AI Studio.'
    };
  }

  if (
    errStr.toLowerCase().includes('blocked') || 
    errMsg.toLowerCase().includes('blocked') || 
    errStr.toLowerCase().includes('safety') || 
    errMsg.toLowerCase().includes('safety')
  ) {
    return {
      status: 400,
      code: 'SAFETY_BLOCKED',
      message: 'O conteúdo solicitado foi bloqueado pelos filtros de segurança automáticos da Inteligência Artificial. Por favor, tente reformular a requisição.'
    };
  }
  
  return {
    status: 500,
    code: 'AI_ERROR',
    message: errMsg || 'Ocorreu um erro ao processar a requisição de Inteligência Artificial.'
  };
}

// Wrapper seguro para chamadas da API Gemini com Retry Automático exponencial/estratégico sob indisponibilidade
async function safeGenerateContent(ai: any, params: { model: string, contents: any, config?: any }, retryCount = 1): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (err: any) {
    const errStr = String(err).toLowerCase();
    const isTransient = errStr.includes('503') || errStr.includes('unavailable') || errStr.includes('high demand') || errStr.includes('overloaded');
    if (isTransient && retryCount > 0) {
      console.warn(`[Gemini Transient Retry] Erro temporário (503/Indisponível). Tentando novamente em 1.5s (Retries restantes: ${retryCount})...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return await safeGenerateContent(ai, params, retryCount - 1);
    }
    throw err;
  }
}

// API: Gemini suggestions
app.post('/api/gemini/suggestions', async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt é obrigatório' });
  }
  try {
    const ai = getAI();
    let response;
    try {
      response = await safeGenerateContent(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: "Você é um assistente de IA especialista em mercado imobiliário de luxo no Brasil da Vettus Imóveis. Ajude corretores a criar descrições persuasivas, analisar leads e sugerir estratégias de fechamento.",
        }
      });
    } catch (modelErr: any) {
      const errStr = String(modelErr).toLowerCase();
      if (errStr.includes('not found') || errStr.includes('404') || errStr.includes('unsupported')) {
        console.warn('[Gemini Model Fallback] gemini-3.5-flash returned 404 or unsupported; retrying with gemini-flash-latest...');
        response = await safeGenerateContent(ai, {
          model: 'gemini-flash-latest',
          contents: prompt,
          config: {
            systemInstruction: "Você é um assistente de IA especialista em mercado imobiliário de luxo no Brasil da Vettus Imóveis. Ajude corretores a criar descrições persuasivas, analisar leads e sugerir estratégias de fechamento.",
          }
        });
      } else {
        throw modelErr;
      }
    }
    res.json({ text: response.text || "Sem sugestões no momento." });
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    if (formatted.status === 429) {
      console.warn(`[Gemini Quota Exceeded] Suggestions api rate-limited gracefully: ${formatted.message}`);
    } else if (formatted.status === 503) {
      console.warn(`[Gemini Unavailable] Suggestions api transient 503 handled gracefully: ${formatted.message}`);
    } else {
      console.error('Erro em suggestions:', err);
    }
    res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
  }
});

// API: Gemini property extraction
app.post('/api/gemini/extract-property', async (req, res) => {
  const { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }
  try {
    const ai = getAI();
    let response;
    try {
      response = await safeGenerateContent(ai, {
        model: 'gemini-3.5-flash',
        contents: `Extraia detalhadamente as informações do imóvel deste link: ${url}. Retorne APENAS um objeto JSON válido contendo: title, type (Apartamento|Casa|Cobertura|Terreno), price (número), address, area (número), bedrooms (número), bathrooms (número), description, status (Disponível|Lançamento).`,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });
    } catch (modelErr: any) {
      const errStr = String(modelErr).toLowerCase();
      if (errStr.includes('not found') || errStr.includes('404') || errStr.includes('unsupported')) {
        console.warn('[Gemini Model Fallback] gemini-3.5-flash returned 404 or unsupported; retrying extraction with gemini-flash-latest...');
        response = await safeGenerateContent(ai, {
          model: 'gemini-flash-latest',
          contents: `Extraia detalhadamente as informações do imóvel deste link: ${url}. Retorne APENAS um objeto JSON válido contendo: title, type (Apartamento|Casa|Cobertura|Terreno), price (número), address, area (número), bedrooms (número), bathrooms (número), description, status (Disponível|Lançamento).`,
          config: {
            tools: [{ googleSearch: {} }],
          }
        });
      } else {
        throw modelErr;
      }
    }
    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
    res.json(JSON.parse(jsonStr));
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    if (formatted.status === 429) {
      console.warn(`[Gemini Quota Exceeded] Extract-property rate-limited gracefully: ${formatted.message}`);
    } else if (formatted.status === 503) {
      console.warn(`[Gemini Unavailable] Extract-property api transient 503 handled gracefully: ${formatted.message}`);
    } else {
      console.error('Erro em extract-property:', err);
    }
    res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
  }
});

// API: Gemini edit image
app.post('/api/gemini/edit-image', async (req, res) => {
  const { base64Image, prompt } = req.body || {};
  if (!base64Image || !prompt) {
    return res.status(400).json({ error: 'base64Image e prompt são obrigatórios' });
  }
  try {
    const ai = getAI();
    const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Formato de imagem inválido' });
    }
    const mimeType = matches[1];
    const data = matches[2];

    const response = await safeGenerateContent(ai, {
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
          return res.json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
        }
      }
    }
    throw new Error('A IA não retornou uma imagem editada');
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    if (formatted.status === 429) {
      console.warn(`[Gemini Quota Exceeded] Edit-image rate-limited gracefully: ${formatted.message}`);
    } else if (formatted.status === 503) {
      console.warn(`[Gemini Unavailable] Edit-image api transient 503 handled gracefully: ${formatted.message}`);
    } else {
      console.error('Erro em edit-image:', err);
    }
    res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
  }
});

// Helper para unificar corretores duplicados por e-mail e remapear referências
function deduplicateAndUnifyBrokers(db: any): any {
  if (!db || !Array.isArray(db.brokers)) return db;

  const brokers: any[] = db.brokers;
  const emailMap = new Map<string, any[]>();

  // Agrupa corretores por e-mail (normalizado, minúsculo, sem espaços extras)
  brokers.forEach(b => {
    if (!b || !b.email) return;
    const emailClean = b.email.toLowerCase().trim();
    if (!emailMap.has(emailClean)) {
      emailMap.set(emailClean, []);
    }
    emailMap.get(emailClean)!.push(b);
  });

  const unifiedBrokers: any[] = [];
  const idRedirectionMap = new Map<string, string>(); // obsoleteId -> masterId
  const masterIdToBrokerName = new Map<string, string>();

  emailMap.forEach((group, email) => {
    if (group.length === 1) {
      unifiedBrokers.push(group[0]);
      masterIdToBrokerName.set(group[0].id, group[0].name);
      return;
    }

    // Se houver múltiplos cadastros para o mesmo e-mail, elege o "Master"
    // Critérios para ordenação (o melhor/mais ativo fica em primeiro lugar [0]):
    group.sort((a, b) => {
      const aDel = a.deleted === true ? 1 : 0;
      const bDel = b.deleted === true ? 1 : 0;
      if (aDel !== bDel) return aDel - bDel; // Não deletados primeiro

      const aBlocked = a.blocked === true ? 1 : 0;
      const bBlocked = b.blocked === true ? 1 : 0;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked; // Não bloqueados primeiro

      const aAdmin = a.role === 'Admin' ? 1 : 0;
      const bAdmin = b.role === 'Admin' ? 1 : 0;
      if (aAdmin !== bAdmin) return bAdmin - aAdmin; // Administrador primeiro

      const aHasPass = a.password ? 1 : 0;
      const bHasPass = b.password ? 1 : 0;
      if (aHasPass !== bHasPass) return bHasPass - aHasPass; // Usuários com senha configurada primeiro

      const aTime = new Date(a.updatedAt || a.joinDate || 0).getTime();
      const bTime = new Date(b.updatedAt || b.joinDate || 0).getTime();
      return bTime - aTime; // Registro mais recentemente atualizado primeiro
    });

    const master = { ...group[0] };
    
    // Se o master escolhido estiver marcado como deletado por engano de merge antigo, restaura
    if (master.deleted) {
      const activeOne = group.find(item => !item.deleted);
      if (activeOne) {
        master.deleted = false;
        if (activeOne.password) master.password = activeOne.password;
        if (activeOne.role) master.role = activeOne.role;
      }
    }

    // Mescla permissões e outras informações dos duplicados
    group.forEach((dup, index) => {
      if (index === 0) return;
      
      idRedirectionMap.set(dup.id, master.id);
      
      if (Array.isArray(dup.permissions) && Array.isArray(master.permissions)) {
        master.permissions = Array.from(new Set([...master.permissions, ...dup.permissions]));
      }

      if (!master.password && dup.password) {
        master.password = dup.password;
      }

      const dupTime = new Date(dup.updatedAt || 0).getTime();
      const masterTime = new Date(master.updatedAt || 0).getTime();
      if (dup.password && dupTime > masterTime) {
        master.password = dup.password;
      }
    });

    master.updatedAt = new Date().toISOString();
    unifiedBrokers.push(master);
    masterIdToBrokerName.set(master.id, master.name);
  });

  db.brokers = unifiedBrokers;

  // Atualiza as referências em outras tabelas se houve alguma unificação
  if (idRedirectionMap.size > 0) {
    console.log(`[Deduplicador Central] Redirecionando ${idRedirectionMap.size} IDs obsoletos da equipe para seus respectivos cadastros unificados.`);

    // 1. Clientes (Lead / Fila / Atendimento)
    if (Array.isArray(db.clients)) {
      db.clients = db.clients.map((c: any) => {
        if (c && c.brokerId && idRedirectionMap.has(c.brokerId)) {
          const newId = idRedirectionMap.get(c.brokerId)!;
          const name = masterIdToBrokerName.get(newId) || c.assignedAgent;
          return { ...c, brokerId: newId, assignedAgent: name, updatedAt: new Date().toISOString() };
        }
        return c;
      });
    }

    // 2. Imóveis
    if (Array.isArray(db.properties)) {
      db.properties = db.properties.map((p: any) => {
        if (p && p.brokerId && idRedirectionMap.has(p.brokerId)) {
          const newId = idRedirectionMap.get(p.brokerId)!;
          const name = masterIdToBrokerName.get(newId) || p.brokerName;
          return { ...p, brokerId: newId, brokerName: name, updatedAt: new Date().toISOString() };
        }
        return p;
      });
    }

    // 3. Atividades / Agenda de histórico
    if (Array.isArray(db.activities)) {
      db.activities = db.activities.map((a: any) => {
        if (a && a.brokerId && idRedirectionMap.has(a.brokerId)) {
          const newId = idRedirectionMap.get(a.brokerId)!;
          const name = masterIdToBrokerName.get(newId) || a.brokerName;
          return { ...a, brokerId: newId, brokerName: name, updatedAt: new Date().toISOString() };
        }
        return a;
      });
    }

    // 4. Lembretes
    if (Array.isArray(db.reminders)) {
      db.reminders = db.reminders.map((r: any) => {
        if (r && r.brokerId && idRedirectionMap.has(r.brokerId)) {
          const newId = idRedirectionMap.get(r.brokerId)!;
          const name = masterIdToBrokerName.get(newId) || r.brokerName;
          return { ...r, brokerId: newId, brokerName: name, updatedAt: new Date().toISOString() };
        }
        return r;
      });
    }

    // 5. Comissões / Fluxo de Vendas
    if (Array.isArray(db.commissions)) {
      db.commissions = db.commissions.map((c: any) => {
        if (c && c.brokerId && idRedirectionMap.has(c.brokerId)) {
          const newId = idRedirectionMap.get(c.brokerId)!;
          return { ...c, brokerId: newId, updatedAt: new Date().toISOString() };
        }
        return c;
      });
    }

    // 6. Despesas
    if (Array.isArray(db.expenses)) {
      db.expenses = db.expenses.map((e: any) => {
        if (e && e.brokerId && idRedirectionMap.has(e.brokerId)) {
          const newId = idRedirectionMap.get(e.brokerId)!;
          return { ...e, brokerId: newId, updatedAt: new Date().toISOString() };
        }
        return e;
      });
    }

    // 7. Contratos de Locação
    if (Array.isArray(db.rentals)) {
      db.rentals = db.rentals.map((r: any) => {
        if (r && r.brokerId && idRedirectionMap.has(r.brokerId)) {
          const newId = idRedirectionMap.get(r.brokerId)!;
          return { ...r, brokerId: newId, updatedAt: new Date().toISOString() };
        }
        return r;
      });
    }
  }

  return db;
}

// Helper para ler o banco de dados
function readDB(): any {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const db = JSON.parse(data);
      
      // Auto-reduplica corretores duplicados ao ler e executa migração automática caso necessário
      const initialBrokersCount = (db.brokers || []).length;
      const deduplicatedDB = deduplicateAndUnifyBrokers(db);
      const finalBrokersCount = (deduplicatedDB.brokers || []).length;
      
      if (initialBrokersCount !== finalBrokersCount) {
        console.log(`[Deduplicador Central] Unificação preventiva executada na inicialização (${initialBrokersCount} -> ${finalBrokersCount} corretores). Salvando base limpa...`);
        writeDB(deduplicatedDB);
      }
      
      return deduplicatedDB;
    }
  } catch (e) {
    console.error('Erro ao ler database.json:', e);
  }
  return {};
}

// Helper para escrever no banco de dados de maneira atômica e segura
function writeDB(data: any) {
  const tempPath = DB_PATH + '.tmp';
  try {
    const cleanData = deduplicateAndUnifyBrokers(data);
    fs.writeFileSync(tempPath, JSON.stringify(cleanData, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (e) {
    console.error('Erro ao gravar database.json:', e);
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (_) {}
  }
}

// Helper para mesclar coleções individuais baseado em timestamps
function mergeCollections(prev: any[] = [], next: any[] = []): any[] {
  if (!next || !Array.isArray(next)) return prev;
  if (!prev || !Array.isArray(prev)) return next;
  
  const map = new Map(prev.map(item => [item.id, item]));
  
  next.forEach(item => {
    if (!item || !item.id) return;
    const existing = map.get(item.id);
    const itemDate = new Date(item.updatedAt || item.date || 0).getTime();
    const existingDate = existing ? new Date(existing.updatedAt || existing.date || 0).getTime() : -1;

    if (!existing || itemDate > existingDate || (itemDate === existingDate && JSON.stringify(item) !== JSON.stringify(existing))) {
      map.set(item.id, item);
    }
  });
  
  return Array.from(map.values());
}

// API: Retorna o estado atual
app.get('/api/data', (req, res) => {
  const db = readDB();
  res.json(db);
});

function filterPayloadForPeerServer(payload: any, identity: { id: string, name: string, role: string }) {
  if (!payload || identity.role === 'Admin') return payload;

  const filtered: any = { ...payload };
  const uid = identity.id;
  const nameStr = identity.name?.toLowerCase().trim() || '';

  if (filtered.clients) {
    filtered.clients = filtered.clients.filter((c: any) => {
      if (c.brokerId === uid) return true;
      if (!c.assignedAgent) return false;
      const agentClean = c.assignedAgent.toLowerCase().trim();
      if (agentClean === nameStr) return true;
      
      // Inteligência de correspondência flexível: ex. "adriana bortoli ribeiro" e "adriana ribeiro"
      const agentParts = agentClean.split(' ');
      const identityParts = nameStr.split(' ');
      if (agentParts.includes('adriana') && identityParts.includes('adriana')) {
        if (agentParts.includes('ribeiro') || identityParts.includes('ribeiro')) {
          return true;
        }
      }
      return false;
    });
  }
  if (filtered.properties) filtered.properties = filtered.properties.filter((p: any) => p.brokerId === uid);
  if (filtered.activities) {
    filtered.activities = filtered.activities.filter((a: any) => {
      if (a.brokerId === uid) return true;
      return filtered.clients?.some((c: any) => c.name === a.clientName);
    });
  }
  if (filtered.reminders) filtered.reminders = filtered.reminders.filter((r: any) => r.brokerId === uid);
  if (filtered.commissions) filtered.commissions = filtered.commissions.filter((c: any) => c.brokerId === uid);
  if (filtered.expenses) filtered.expenses = filtered.expenses.filter((e: any) => e.brokerId === uid);
  if (filtered.brokers) filtered.brokers = filtered.brokers.filter((b: any) => b.id === uid || b.role === 'Admin');

  return filtered;
}

// API: Autenticação Centralizada
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email é obrigatório' });
  }

  const db = readDB();
  const emailClean = email.toLowerCase().trim();
  const passwordClean = (password || '').trim();

  const brokersList = db.brokers || [];
  const broker = brokersList.find((b: any) => b.email && b.email.toLowerCase().trim() === emailClean && !b.deleted);

  if (broker) {
    if (broker.password === passwordClean || (!broker.password && !passwordClean)) {
      if (broker.blocked) {
        return res.json({ success: false, message: 'ACESSO SUSPENSO: Seu usuário está marcado como "Bloqueado" no sistema.' });
      } else {
        const filteredData = filterPayloadForPeerServer(db, broker);
        return res.json({ success: true, user: broker, fullData: filteredData });
      }
    } else {
      return res.json({ success: false, message: 'Senha incorreta para este e-mail.' });
    }
  } else {
    return res.json({ success: false, message: 'E-mail não cadastrado nesta Unidade.' });
  }
});

// Lista conexões SSE ativas para sincronização em tempo real
const sseClients: any[] = [];

// Função de broadcast instantâneo
function notifyClientsOfUpdate(payload: any) {
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify({ type: 'DATA_UPDATE', payload })}\n\n`);
    } catch (e) {
      // Conexão pode estar quebrada, será removida pelo evento de close ou ping subsequente
    }
  });
}

// API: Live Sync SSE (Server-Sent Events) - Conexão persistente de tempo real
app.get('/api/live-sync', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const client = { id: Date.now(), res };
  sseClients.push(client);

  console.log(`[SSE Live Sync] Novo corretor ou administrador conectado (Total ativos: ${sseClients.length})`);

  // Ping a cada 10 segundos para manter conexões Cloud Run ativas e prevenir timeout
  const pingInterval = setInterval(() => {
    try {
      // 1. Envia o tick de comentário padrão para o proxy/nginx
      res.write(':\n\n');
      // 2. Envia um evento explícito JSON PING para que o cliente monitorize a atividade real da rede
      res.write(`data: ${JSON.stringify({ type: 'PING' })}\n\n`);
    } catch (_) {}
  }, 10000);

  req.on('close', () => {
    clearInterval(pingInterval);
    const index = sseClients.findIndex(c => c.id === client.id);
    if (index !== -1) {
      sseClients.splice(index, 1);
      console.log(`[SSE Live Sync] Conexão encerrada (Total restantes: ${sseClients.length})`);
    }
  });
});

// API: Recebe atualizações e faz merge inteligente
app.post('/api/data', (req, res) => {
  const incoming = req.body || {};
  const current = readDB();
  const updated: any = {};

  const collections = [
    'brokers', 'properties', 'clients', 'activities', 'reminders', 
    'commissions', 'commissionForecasts', 'documents', 
    'constructionCompanies', 'launches', 'campaigns', 'rentals', 'expenses'
  ];

  collections.forEach(key => {
    updated[key] = mergeCollections(current[key] || [], incoming[key] || []);
  });

  writeDB(updated);
  
  // Propaga em tempo real para todos os outros notebooks conectados
  notifyClientsOfUpdate(updated);
  
  res.json({ success: true, payload: updated });
});

// API: Reconciliador Geral e Forçado de Segurança (Force push incondicional dos corretores)
app.post('/api/data/force-push', (req, res) => {
  const incoming = req.body || {};
  const current = readDB();
  const updated: any = {};

  const collections = [
    'brokers', 'properties', 'clients', 'activities', 'reminders', 
    'commissions', 'commissionForecasts', 'documents', 
    'constructionCompanies', 'launches', 'campaigns', 'rentals', 'expenses'
  ];

  collections.forEach(key => {
    const prevList = current[key] || [];
    const nextList = incoming[key] || [];
    const map = new Map(prevList.map((item: any) => [item.id, item]));

    nextList.forEach((item: any) => {
      if (!item || !item.id) return;
      // Garante uma reconciliação incondicional atualizando o timestamp local para agora antes de mesclar
      const existing = (map.get(item.id) || {}) as Record<string, any>;
      const updatedItem = {
        ...existing, // preserva dados anteriores se houver
        ...(item as Record<string, any>), // sobrescreve com o do notebook do corretor (Adriana)
        updatedAt: new Date().toISOString() // atualiza o timestamp do registro para derrotar cache/concorrentes
      };
      map.set(item.id, updatedItem);
    });

    updated[key] = Array.from(map.values());
  });

  writeDB(updated);
  
  // Transmite para todo mundo instantaneamente em tempo real
  notifyClientsOfUpdate(updated);

  console.log('[Force Push Reconciliador] Sincronização e transição incondicional dos notebooks executada com sucesso.');
  res.json({ success: true, payload: updated });
});

// Outras utilidades - Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vettus Server Rodando na porta ${PORT}`);
  });
}

bootstrap();
