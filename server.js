const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const puppeteer = require('puppeteer');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Variáveis globais
let browser = null;
let page = null;

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    browser: browser ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API para navegar
app.post('/api/navigate', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    if (!browser || !page) {
      await initBrowser();
    }

    console.log(`🔄 Navegando para: ${url}`);
    
    // Adicionar http:// se não tiver
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Capturar informações
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      html: document.documentElement.innerHTML.substring(0, 5000) + '...'
    }));

    // Tentar capturar screenshot (pode falhar no Railway)
    try {
      const screenshot = await page.screenshot({ 
        encoding: 'base64',
        type: 'jpeg',
        quality: 70
      });
      pageInfo.screenshot = `data:image/jpeg;base64,${screenshot}`;
    } catch (screenshotError) {
      console.log('⚠️ Não foi possível capturar screenshot:', screenshotError.message);
      pageInfo.screenshot = null;
    }

    res.json({
      success: true,
      data: pageInfo
    });

    // Notificar via WebSocket
    io.emit('page_update', {
      url: pageInfo.url,
      title: pageInfo.title,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao navegar:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// API para executar JavaScript
app.post('/api/eval', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Código é obrigatório' });
    }

    if (!page) {
      return res.status(400).json({ error: 'Navegador não inicializado' });
    }

    const result = await page.evaluate(code);
    
    res.json({
      success: true,
      result: result
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// API para fechar navegador
app.post('/api/close', async (req, res) => {
  try {
    await closeBrowser();
    res.json({ success: true, message: 'Navegador fechado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inicializar navegador
async function initBrowser() {
  try {
    console.log('🚀 Iniciando navegador...');
    
    browser = await puppeteer.launch({
      headless: true,  // No Railway é melhor usar headless
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,720',
        '--display=:99'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      defaultViewport: { width: 1280, height: 720 }
    });

    console.log('✅ Navegador iniciado');

    page = await browser.newPage();
    
    // Configurar User-Agent
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Interceptar logs do console
    page.on('console', msg => {
      console.log(`📝 Console da página: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.log(`❌ Erro na página: ${error.message}`);
    });

    return true;

  } catch (error) {
    console.error('❌ Erro ao inicializar navegador:', error);
    browser = null;
    page = null;
    throw error;
  }
}

// Fechar navegador
async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
      console.log('👋 Navegador fechado');
    }
  } catch (error) {
    console.error('Erro ao fechar navegador:', error);
  }
}

// WebSocket
io.on('connection', (socket) => {
  console.log('🔌 Novo cliente conectado:', socket.id);

  socket.on('navigate', async (url) => {
    if (page) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        socket.emit('navigated', { 
          url: await page.url(),
          title: await page.title()
        });
      } catch (error) {
        socket.emit('error', error.message);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Iniciar servidor
async function startServer() {
  try {
    // Inicializar navegador
    await initBrowser();
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Servidor rodando na porta ${PORT}`);
      console.log(`🌐 Acesse: http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    // Mesmo sem navegador, inicia o servidor
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`⚠️ Servidor rodando SEM navegador na porta ${PORT}`);
    });
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Encerrando...');
  await closeBrowser();
  process.exit(0);
});

startServer();
