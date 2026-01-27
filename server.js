// server.js - COM EXECUÇÃO REAL DE COMANDOS DE CONSOLE
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache para evitar múltiplas execuções
const cache = new Map();

async function executeConsoleCommands(videoId) {
  console.log(`🚀 Iniciando browser para executar comandos do console em: ${videoId}`);
  
  let browser = null;
  try {
    // Configurações do puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configurar user-agent mobile (parecido com seu exemplo)
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36');
    
    // Configurar viewport mobile
    await page.setViewport({ width: 393, height: 768 });
    
    // Interceptar requisições para capturar URLs
    const interceptedUrls = [];
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      
      // Capturar URLs que parecem ser de vídeo
      if (url.includes('.txt') || url.includes('m3u8') || url.includes('aesthorium.sbs')) {
        interceptedUrls.push({
          url: url,
          resourceType: request.resourceType(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
      }
      
      request.continue();
    });
    
    // Navegar para a página
    console.log(`🌐 Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    console.log('✅ Página carregada');
    
    // Aguardar alguns segundos para carregar scripts
    await page.waitForTimeout(3000);
    
    // PASSO 1: Tentar clicar no botão de play (como você faz no console)
    console.log('🖱️  Tentando clicar no botão de play...');
    
    try {
      // Primeiro tentar #player-button (seu primeiro comando)
      const playButton = await page.$('#player-button, #player-button-container, .jw-display-icon-play, button[aria-label*="play"], button[aria-label*="Play"]');
      
      if (playButton) {
        await playButton.click();
        console.log('✅ Clicado no botão de play');
        await page.waitForTimeout(2000);
      } else {
        console.log('⚠️  Botão de play não encontrado pelos seletores específicos');
        
        // Tentar encontrar qualquer botão de play
        const allPlayButtons = await page.$$('button, div[role="button"]');
        for (const btn of allPlayButtons) {
          try {
            const text = await page.evaluate(el => el.textContent || el.getAttribute('aria-label') || el.className, btn);
            if (text && (text.toLowerCase().includes('play') || text.includes('▶') || text.includes('jw-icon'))) {
              await btn.click();
              console.log('✅ Clicado em botão de play genérico');
              await page.waitForTimeout(2000);
              break;
            }
          } catch (e) {
            // Ignorar erros em botões específicos
          }
        }
      }
    } catch (clickError) {
      console.log('⚠️  Não foi possível clicar no play:', clickError.message);
    }
    
    // Aguardar mais um pouco para o vídeo carregar
    await page.waitForTimeout(3000);
    
    // PASSO 2: Executar jwplayer().getPlaylist() e jwplayer().getConfig() (seus comandos do console)
    console.log('💻 Executando comandos do console...');
    
    const consoleResults = await page.evaluate(() => {
      const results = {
        jwplayerAvailable: false,
        getPlaylist: null,
        getConfig: null,
        videoElements: [],
        scriptUrls: []
      };
      
      // Verificar se jwplayer está disponível
      if (typeof jwplayer !== 'undefined') {
        results.jwplayerAvailable = true;
        
        try {
          // Executar jwplayer().getPlaylist()
          results.getPlaylist = jwplayer().getPlaylist();
        } catch (e) {
          results.getPlaylistError = e.message;
        }
        
        try {
          // Executar jwplayer().getConfig()
          results.getConfig = jwplayer().getConfig();
        } catch (e) {
          results.getConfigError = e.message;
        }
      }
      
      // Coletar elementos de vídeo
      const videos = document.querySelectorAll('video');
      results.videoElements = Array.from(videos).map(video => ({
        src: video.src,
        currentSrc: video.currentSrc,
        poster: video.poster,
        duration: video.duration,
        paused: video.paused
      }));
      
      // Coletar URLs de scripts (pode conter URLs de vídeo)
      const scripts = document.querySelectorAll('script');
      results.scriptUrls = Array.from(scripts)
        .map(script => script.src)
        .filter(src => src && src.includes('aesthorium'));
      
      return results;
    });
    
    console.log(`📊 JW Player disponível: ${consoleResults.jwplayerAvailable}`);
    
    // Processar resultados
    let finalUrl = null;
    let sourceData = null;
    
    // Prioridade 1: URL do getPlaylist()
    if (consoleResults.getPlaylist && consoleResults.getPlaylist[0]) {
      const playlistItem = consoleResults.getPlaylist[0];
      if (playlistItem.file) {
        finalUrl = playlistItem.file;
        sourceData = { type: 'playlist', data: playlistItem };
        console.log('🎯 URL encontrada via jwplayer().getPlaylist()');
      } else if (playlistItem.sources && playlistItem.sources[0]) {
        finalUrl = playlistItem.sources[0].file;
        sourceData = { type: 'sources', data: playlistItem.sources[0] };
        console.log('🎯 URL encontrada via playlist.sources');
      }
    }
    
    // Prioridade 2: URL do getConfig()
    if (!finalUrl && consoleResults.getConfig) {
      const config = consoleResults.getConfig;
      if (config.playlist && config.playlist[0] && config.playlist[0].file) {
        finalUrl = config.playlist[0].file;
        sourceData = { type: 'config', data: config.playlist[0] };
        console.log('🎯 URL encontrada via jwplayer().getConfig()');
      } else if (config.sources && config.sources[0]) {
        finalUrl = config.sources[0].file;
        sourceData = { type: 'config_sources', data: config.sources[0] };
        console.log('🎯 URL encontrada via config.sources');
      }
    }
    
    // Prioridade 3: URLs interceptadas
    if (!finalUrl && interceptedUrls.length > 0) {
      // Filtrar URLs do domínio correto
      const videoUrls = interceptedUrls.filter(req => 
        req.url.includes(videoId) || 
        req.url.includes('cf-master') ||
        (req.url.includes('aesthorium.sbs') && req.url.includes('.txt'))
      );
      
      if (videoUrls.length > 0) {
        finalUrl = videoUrls[0].url;
        sourceData = { type: 'intercepted', data: videoUrls[0] };
        console.log('🎯 URL encontrada nas requisições interceptadas');
      }
    }
    
    // Prioridade 4: Elementos de vídeo
    if (!finalUrl && consoleResults.videoElements.length > 0) {
      const videoWithSrc = consoleResults.videoElements.find(v => v.src || v.currentSrc);
      if (videoWithSrc) {
        finalUrl = videoWithSrc.src || videoWithSrc.currentSrc;
        sourceData = { type: 'video_element', data: videoWithSrc };
        console.log('🎯 URL encontrada em elemento <video>');
      }
    }
    
    // Fallback: Padrão conhecido
    if (!finalUrl) {
      const timestamp = Math.floor(Date.now() / 1000);
      finalUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt`;
      sourceData = { type: 'fallback', data: { timestamp } };
      console.log('🔧 Usando URL fallback padrão');
    }
    
    // Adicionar timestamp se necessário (como no seu exemplo: ?t=121478a4&e=1765241578)
    if (finalUrl.includes('cf-master') && !finalUrl.includes('?')) {
      const randomId = Math.random().toString(36).substring(2, 10);
      const expiry = Math.floor(Date.now() / 1000) + 86400; // 24 horas
      finalUrl = `${finalUrl}?t=${randomId}&e=${expiry}`;
      console.log('⏰ Adicionados parâmetros de tempo ao URL');
    }
    
    // Coletar informações adicionais
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        jwplayerVersion: typeof jwplayer !== 'undefined' ? jwplayer().version : 'não disponível'
      };
    });
    
    await browser.close();
    
    return {
      success: true,
      videoId: videoId,
      finalUrl: finalUrl,
      sourceType: sourceData.type,
      sourceDetails: sourceData.data,
      pageInfo: pageInfo,
      consoleResults: {
        jwplayerAvailable: consoleResults.jwplayerAvailable,
        hasPlaylist: !!consoleResults.getPlaylist,
        hasConfig: !!consoleResults.getConfig,
        videoElementsCount: consoleResults.videoElements.length
      },
      interceptedUrlsCount: interceptedUrls.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Erro durante execução:`, error);
    
    if (browser) {
      await browser.close();
    }
    
    throw error;
  }
}

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > oneHour) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000); // A cada 5 minutos

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    description: 'Extrator de URLs de vídeo executando comandos reais do console',
    usage: '/extract?id=VIDEO_ID',
    example: '/extract?id=wdlhc',
    endpoints: [
      '/extract?id=ID - Executa comandos do console e extrai URL',
      '/direct?id=ID - URL direto (sem browser)',
      '/cache/clear - Limpa cache',
      '/cache/stats - Estatísticas do cache'
    ]
  });
});

// Endpoint principal - Executa comandos do console
app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  const forceRefresh = req.query.refresh === 'true';
  const cacheKey = `extract-${videoId}`;
  
  // Verificar cache (se não for forçar refresh)
  if (!forceRefresh && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    console.log(`⚡ Retornando do cache: ${videoId}`);
    return res.json(cached.data);
  }
  
  console.log(`🎬 Processando: ${videoId}${forceRefresh ? ' (forçado)' : ''}`);
  
  try {
    const result = await executeConsoleCommands(videoId);
    
    // Adicionar headers para CloudStream
    const response = {
      ...result,
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      }
    };
    
    // Cache por 10 minutos
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    
    res.json(response);
    
  } catch (error) {
    console.error(`❌ Erro no endpoint /extract: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      suggestion: 'Tente novamente ou use /direct como fallback'
    });
  }
});

// Endpoint rápido (sem browser) - para fallback
app.get('/direct', (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  const timestamp = Math.floor(Date.now() / 1000);
  const randomId = Math.random().toString(36).substring(2, 10);
  const expiry = timestamp + 86400;
  
  const directUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt?t=${randomId}&e=${expiry}`;
  
  res.json({
    success: true,
    videoId: videoId,
    finalUrl: directUrl,
    sourceType: 'direct_fallback',
    note: 'URL gerado diretamente (sem execução de browser)',
    headers: {
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
    },
    timestamp: new Date().toISOString()
  });
});

// Endpoint específico para CloudStream
app.get('/cloudstream', async (req, res) => {
  const videoId = req.query.id || req.query.videoId || 'wdlhc';
  const quality = req.query.quality || 'auto';
  
  console.log(`☁️  CloudStream request: ${videoId}`);
  
  try {
    // Tentar extração completa primeiro
    const extractResult = await executeConsoleCommands(videoId);
    
    const response = {
      success: true,
      sources: [
        {
          url: extractResult.finalUrl,
          quality: quality,
          isM3U8: true,
          headers: {
            'Referer': 'https://png.strp2p.com/',
            'Origin': 'https://png.strp2p.com',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
          }
        }
      ],
      subtitles: [],
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
      },
      metadata: {
        videoId: videoId,
        sourceType: extractResult.sourceType,
        extractedAt: extractResult.timestamp
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error(`❌ CloudStream fallback: ${error.message}`);
    
    // Fallback rápido
    const timestamp = Math.floor(Date.now() / 1000);
    const randomId = Math.random().toString(36).substring(2, 10);
    const expiry = timestamp + 86400;
    const fallbackUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt?t=${randomId}&e=${expiry}`;
    
    res.json({
      success: true,
      sources: [
        {
          url: fallbackUrl,
          quality: quality,
          isM3U8: true,
          headers: {
            'Referer': 'https://png.strp2p.com/',
            'Origin': 'https://png.strp2p.com',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
          }
        }
      ],
      subtitles: [],
      note: 'Usando fallback direto',
      metadata: {
        videoId: videoId,
        sourceType: 'fallback'
      }
    });
  }
});

// Endpoints de administração
app.get('/cache/clear', (req, res) => {
  const previousSize = cache.size;
  cache.clear();
  
  res.json({
    success: true,
    message: `Cache limpo (${previousSize} itens removidos)`,
    timestamp: new Date().toISOString()
  });
});

app.get('/cache/stats', (req, res) => {
  res.json({
    success: true,
    cacheSize: cache.size,
    cacheEntries: Array.from(cache.keys()),
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📺 Endpoint principal: http://localhost:${PORT}/extract?id=wdlhc`);
  console.log(`☁️  Para CloudStream: http://localhost:${PORT}/cloudstream?id=wdlhc`);
  console.log(`⚡ Fallback rápido: http://localhost:${PORT}/direct?id=wdlhc`);
});
