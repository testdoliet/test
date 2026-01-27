// server.js - VERSÃO COMPATÍVEL
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache
const cache = new Map();

async function executeConsoleCommands(videoId) {
  console.log(`🚀 Iniciando browser para: ${videoId}`);
  
  let browser = null;
  try {
    // Testar versão do puppeteer
    console.log(`Puppeteer version: ${puppeteer.version}`);
    
    // Configurações mais simples
    browser = await puppeteer.launch({
      headless: 'new', // ou true
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    const page = await browser.newPage();
    
    // User-agent móvel
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36');
    
    // Interceptar requisições
    const interceptedUrls = [];
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.txt') || url.includes('aesthorium.sbs')) {
        interceptedUrls.push(url);
      }
      request.continue();
    });
    
    // Navegar
    console.log(`🌐 Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Página carregada');
    
    // Usar setTimeout para delay (compatível com todas versões)
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
    
    // Tentar clicar no play - versão mais simples
    console.log('🖱️ Tentando clicar no play...');
    try {
      await page.evaluate(() => {
        // Tentar os seletores que você usa no console
        const btn1 = document.querySelector('#player-button');
        const btn2 = document.querySelector('#player-button-container');
        const btn3 = document.querySelector('.jw-display-icon-play');
        
        if (btn1) btn1.click();
        else if (btn2) btn2.click();
        else if (btn3) btn3.click();
        
        // Também tentar via jwplayer se disponível
        if (typeof jwplayer !== 'undefined') {
          try {
            jwplayer().play();
          } catch (e) {}
        }
      });
      
      console.log('✅ Tentativa de clique realizada');
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
      
    } catch (clickError) {
      console.log('⚠️ Não foi possível clicar:', clickError.message);
    }
    
    // Executar comandos do console
    console.log('💻 Executando jwplayer().getPlaylist()...');
    
    const result = await page.evaluate(async (vid) => {
      const response = {
        videoId: vid,
        jwplayerAvailable: false,
        playlist: null,
        config: null,
        videoUrls: [],
        error: null
      };
      
      try {
        // Verificar se jwplayer existe
        if (typeof jwplayer === 'function') {
          response.jwplayerAvailable = true;
          const player = jwplayer();
          
          if (player) {
            try {
              response.playlist = player.getPlaylist();
            } catch (e) {
              response.playlistError = e.message;
            }
            
            try {
              response.config = player.getConfig();
            } catch (e) {
              response.configError = e.message;
            }
            
            try {
              response.currentFile = player.getPlaylistItem();
            } catch (e) {}
          }
        }
        
        // Coletar URLs de vídeo
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          if (video.src) response.videoUrls.push(video.src);
          if (video.currentSrc) response.videoUrls.push(video.currentSrc);
        });
        
        // Procurar em scripts
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || script.innerHTML || '';
          const urlMatches = content.match(/https:\/\/[^\s"'<>]*\.(txt|m3u8|mp4)[^\s"'<>]*/gi) || [];
          urlMatches.forEach(url => {
            if (url.includes('aesthorium.sbs')) {
              response.videoUrls.push(url);
            }
          });
        });
        
      } catch (e) {
        response.error = e.message;
      }
      
      return response;
    }, videoId);
    
    console.log(`📊 JW Player disponível: ${result.jwplayerAvailable}`);
    
    // Processar resultado
    let finalUrl = null;
    let sourceType = 'unknown';
    
    // Prioridade 1: Playlist
    if (result.playlist && result.playlist[0]) {
      const item = result.playlist[0];
      if (item.file) {
        finalUrl = item.file;
        sourceType = 'playlist';
      } else if (item.sources && item.sources[0]) {
        finalUrl = item.sources[0].file;
        sourceType = 'playlist_sources';
      }
    }
    
    // Prioridade 2: Config
    if (!finalUrl && result.config) {
      const config = result.config;
      if (config.playlist && config.playlist[0] && config.playlist[0].file) {
        finalUrl = config.playlist[0].file;
        sourceType = 'config';
      } else if (config.sources && config.sources[0]) {
        finalUrl = config.sources[0].file;
        sourceType = 'config_sources';
      }
    }
    
    // Prioridade 3: URLs interceptadas
    if (!finalUrl && interceptedUrls.length > 0) {
      const filtered = interceptedUrls.filter(url => 
        url.includes(videoId) || url.includes('cf-master')
      );
      if (filtered.length > 0) {
        finalUrl = filtered[0];
        sourceType = 'intercepted';
      }
    }
    
    // Prioridade 4: URLs do DOM
    if (!finalUrl && result.videoUrls.length > 0) {
      const filtered = result.videoUrls.filter(url => 
        url.includes('aesthorium.sbs') && url.includes(videoId)
      );
      if (filtered.length > 0) {
        finalUrl = filtered[0];
        sourceType = 'dom';
      }
    }
    
    // Fallback
    if (!finalUrl) {
      const timestamp = Math.floor(Date.now() / 1000);
      finalUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt`;
      sourceType = 'fallback';
    }
    
    // Adicionar parâmetros de tempo
    if (finalUrl.includes('cf-master') && !finalUrl.includes('?')) {
      const randomId = Math.random().toString(36).substring(2, 10);
      const expiry = Math.floor(Date.now() / 1000) + 86400;
      finalUrl = `${finalUrl}?t=${randomId}&e=${expiry}`;
    }
    
    await browser.close();
    
    return {
      success: true,
      videoId: videoId,
      finalUrl: finalUrl,
      sourceType: sourceType,
      jwplayerAvailable: result.jwplayerAvailable,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Erro:`, error.message);
    if (browser) await browser.close();
    throw error;
  }
}

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    usage: '/extract?id=VIDEO_ID',
    example: '/extract?id=wdlhc',
    endpoints: ['/extract', '/direct', '/cloudstream']
  });
});

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  
  console.log(`🎬 Extraindo: ${videoId}`);
  
  try {
    const result = await executeConsoleCommands(videoId);
    
    res.json({
      ...result,
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
      }
    });
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    
    // Fallback
    const timestamp = Math.floor(Date.now() / 1000);
    const randomId = Math.random().toString(36).substring(2, 10);
    const expiry = timestamp + 86400;
    const fallbackUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt?t=${randomId}&e=${expiry}`;
    
    res.json({
      success: true,
      videoId: videoId,
      finalUrl: fallbackUrl,
      sourceType: 'fallback_error',
      error: error.message,
      note: 'Usando fallback devido a erro',
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
      },
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/direct', (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  const timestamp = Math.floor(Date.now() / 1000);
  const randomId = Math.random().toString(36).substring(2, 10);
  const expiry = timestamp + 86400;
  
  const url = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt?t=${randomId}&e=${expiry}`;
  
  res.json({
    success: true,
    videoId: videoId,
    finalUrl: url,
    sourceType: 'direct',
    headers: {
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/cloudstream', async (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  
  try {
    const result = await executeConsoleCommands(videoId);
    
    res.json({
      success: true,
      sources: [{
        url: result.finalUrl,
        quality: 'auto',
        isM3U8: true,
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      }],
      subtitles: [],
      headers: {
        'Referer': 'https://png.strp2p.com/'
      }
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}/extract?id=wdlhc`);
});
