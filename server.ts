import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'database.json');

app.use(express.json({ limit: '100mb' }));

// Helper para ler o banco de dados
function readDB(): any {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Erro ao ler database.json:', e);
  }
  return {};
}

// Helper para escrever no banco de dados
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao gravar database.json:', e);
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
