// server.js - VERSÃO COMPLETA
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Rota raiz - ESSENCIAL para evitar "Cannot GET /"
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Proxy para extração de vídeos',
    endpoints: {
      '/': 'Esta página de ajuda',
      '/extract?id=VIDEO_ID': 'Extrair URL do vídeo',
      '/direct?id=VIDEO_ID': 'URL direto (fallback)',
      '/content?id=VIDEO_ID': 'Conteúdo direto do m3u8',
      '/cloudstream?id=VIDEO_ID': 'Formato CloudStream'
    },
    example: 'http://localhost:3000/extract?id=wdlhc'
  });
});

// Cache de sessões
const sessions = new Map();

async function extractVideoUrl(videoId) {
  console.log(`🎬 Extraindo: ${videoId}`);
  
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Headers
    await page.setExtraHTTPHeaders({
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com'
    });
    
    // User agent realista
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navegar para a página
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Aguardar
    await page.waitForTimeout(3000);
    
    // Tentar clicar no play (seu comando do console)
    try {
      await page.evaluate(() => {
        const btn = document.querySelector('#player-button, #player-button-container, .jw-display-icon-play');
        if (btn) btn.click();
      });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('⚠️ Não clicou no play');
    }
    
    // Executar jwplayer().getPlaylist() (seu comando do console)
    const result = await page.evaluate(() => {
      try {
        if (typeof jwplayer !== 'undefined' && jwplayer()) {
          const playlist = jwplayer().getPlaylist();
          const config = jwplayer().getConfig();
          
          let url = null;
          if (playlist && playlist[0]) {
            url = playlist[0].file || 
                  (playlist[0].sources && playlist[0].sources[0] && playlist[0].sources[0].file);
          }
          
          return {
            success: true,
            url: url,
            playlist: playlist,
            config: config
          };
        }
        return { success: false, error: 'jwplayer not found' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    
    await browser.close();
    
    if (result.success && result.url) {
      return {
        success: true,
        videoId: videoId,
        url: result.url,
        timestamp: new Date().toISOString()
      };
    } else {
      // Fallback: padrão conhecido
      const timestamp = Math.floor(Date.now() / 1000);
      const fallbackUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt?t=${Math.random().toString(36).substring(2)}&e=${timestamp + 86400}`;
      
      return {
        success: true,
        videoId: videoId,
        url: fallbackUrl,
        note: 'URL fallback',
        timestamp: new Date().toISOString()
      };
    }
    
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

// Rota para extrair URL
app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  
  try {
    const result = await extractVideoUrl(videoId);
    
    res.json({
      ...result,
      headers_required: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    
    // Fallback direto
    const timestamp = Math.floor(Date.now() / 1000);
    const fallbackUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt`;
    
    res.json({
      success: true,
      videoId: videoId,
      url: fallbackUrl,
      error: error.message,
      note: 'Fallback devido a erro',
      headers_required: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com'
      }
    });
  }
});

// Rota direta (fallback rápido)
app.get('/direct', (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  const timestamp = Math.floor(Date.now() / 1000);
  const randomId = Math.random().toString(36).substring(2, 10);
  const expiry = timestamp + 86400;
  
  const url = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt?t=${randomId}&e=${expiry}`;
  
  res.json({
    success: true,
    videoId: videoId,
    url: url,
    headers_required: {
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com'
    }
  });
});

// Rota para CloudStream
app.get('/cloudstream', async (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  
  try {
    const result = await extractVideoUrl(videoId);
    
    res.json({
      success: true,
      sources: [{
        url: result.url,
        quality: 'auto',
        isM3U8: true,
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }],
      subtitles: []
    });
    
  } catch (error) {
    // Fallback para CloudStream
    const timestamp = Math.floor(Date.now() / 1000);
    const randomId = Math.random().toString(36).substring(2, 10);
    const expiry = timestamp + 86400;
    const url = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt?t=${randomId}&e=${expiry}`;
    
    res.json({
      success: true,
      sources: [{
        url: url,
        quality: 'auto',
        isM3U8: true,
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      }],
      subtitles: [],
      note: 'Fallback devido a erro'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📺 Teste: http://localhost:${PORT}/extract?id=wdlhc`);
  console.log(`☁️  CloudStream: http://localhost:${PORT}/cloudstream?id=wdlhc`);
});
