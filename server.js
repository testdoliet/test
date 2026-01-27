// server.js - SEM Puppeteer, SÓ fetch
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para evitar crash
app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    res.status(500).json({ error: 'Timeout' });
  });
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    usage: '/stream?id=VIDEO_ID',
    example: '/stream?id=wdlhc'
  });
});

app.get('/stream', async (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  
  console.log(`🔍 Buscando: ${videoId}`);
  
  try {
    // 1. Buscar página
    const response = await fetch(`https://png.strp2p.com/#${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    const html = await response.text();
    
    // 2. Extrair URL com MÚLTIPLOS métodos
    let videoUrl = null;
    
    // Método A: Regex específico
    const specificPattern = new RegExp(`https://sri\\.aesthorium\\.sbs/v4/9a/${videoId}/[^"'\s]*\\.txt[^"'\s]*`, 'i');
    const specificMatch = html.match(specificPattern);
    if (specificMatch) videoUrl = specificMatch[0];
    
    // Método B: Regex geral
    if (!videoUrl) {
      const generalPattern = /https:\/\/sri\.aesthorium\.sbs\/[^"'\s]*\.txt[^"'\s]*/g;
      const allUrls = html.match(generalPattern) || [];
      videoUrl = allUrls.find(url => url.includes(videoId)) || allUrls[0];
    }
    
    // Método C: Padrão conhecido (fallback)
    if (!videoUrl) {
      videoUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.txt`;
    }
    
    console.log(`✅ URL: ${videoUrl ? videoUrl.substring(0, 80) + '...' : 'Não encontrada'}`);
    
    res.json({
      success: true,
      url: videoUrl,
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
      },
      note: videoUrl.includes('cf-master.txt') ? 'URL padrão - pode precisar de parâmetros extras' : null
    });
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB'
  });
});

// Error handler global
app.use((error, req, res, next) => {
  console.error('Erro global:', error);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} (SEM Puppeteer)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
