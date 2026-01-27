const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Cache simples (10 minutos)
const cache = new Map();

// Rota principal
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Strp2p Video Proxy',
    version: '1.0.0',
    endpoints: {
      stream: 'GET /stream?id=VIDEO_ID',
      health: 'GET /health',
      example: '/stream?id=wdlhc'
    },
    usage: 'https://your-service.onrender.com/stream?id=VIDEO_ID'
  });
});

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cacheSize: cache.size
  });
});

// ROTA PRINCIPAL - Extrai URL do vídeo
app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  
  if (!videoId || videoId.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Parâmetro "id" é obrigatório',
      example: 'https://your-service.onrender.com/stream?id=wdlhc'
    });
  }
  
  console.log(`🎬 [${new Date().toLocaleTimeString()}] Buscando vídeo: ${videoId}`);
  
  // Verificar cache (5 minutos)
  const cacheKey = `video_${videoId}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
    console.log(`📦 [${videoId}] Retornando do cache`);
    return res.json({
      ...cached.data,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString()
    });
  }
  
  let browser = null;
  
  try {
    // Configurar Puppeteer para Render
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ],
      timeout: 30000
    });
    
    const page = await browser.newPage();
    
    // User-Agent de Android
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36');
    
    // Headers importantes
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com',
      'DNT': '1'
    });
    
    // Ir para a página
    const pageUrl = `https://png.strp2p.com/#${videoId}`;
    console.log(`🌐 [${videoId}] Acessando: ${pageUrl}`);
    
    await page.goto(pageUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Aguardar página carregar
    await page.waitForTimeout(2000);
    
    // ✅ COMANDO QUE FUNCIONA - Clicar no botão de play
    console.log(`🖱️ [${videoId}] Procurando botão de play...`);
    
    try {
      await page.waitForSelector('#player-button, #player-button-container', { 
        timeout: 8000 
      });
      
      console.log(`✅ [${videoId}] Botão encontrado, clicando...`);
      
      // COMANDO EXATO QUE VOCÊ USOU NO CONSOLE
      await page.evaluate(() => {
        const btn = document.querySelector('#player-button') || 
                   document.querySelector('#player-button-container');
        if (btn) {
          btn.click();
          console.log('✅ Botão clicado via Puppeteer');
        }
      });
      
    } catch (error) {
      console.log(`⚠️ [${videoId}] Botão não encontrado, continuando...`);
    }
    
    // Aguardar JW Player carregar
    console.log(`⏳ [${videoId}] Aguardando JW Player...`);
    
    try {
      await page.waitForFunction(() => typeof jwplayer !== 'undefined', { 
        timeout: 10000 
      });
    } catch (error) {
      console.log(`⚠️ [${videoId}] JW Player não carregou, tentando extrair URL diretamente...`);
    }
    
    // Aguardar mais um pouco
    await page.waitForTimeout(3000);
    
    // Extrair URL do vídeo
    console.log(`🔍 [${videoId}] Extraindo URL do vídeo...`);
    
    const videoData = await page.evaluate((vid) => {
      try {
        // Método 1: Via JW Player
        if (window.jwplayer) {
          const player = jwplayer();
          if (player && player.getPlaylist) {
            const playlist = player.getPlaylist();
            if (playlist && playlist[0] && playlist[0].file) {
              return {
                url: playlist[0].file,
                source: 'jwplayer',
                playlist: playlist[0]
              };
            }
          }
        }
        
        // Método 2: Procurar no DOM
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || script.innerText;
          if (content.includes('aesthorium.sbs') && content.includes(vid)) {
            const urlMatch = content.match(/https:\/\/sri\.aesthorium\.sbs[^"'\s]*/);
            if (urlMatch) {
              return {
                url: urlMatch[0],
                source: 'script_extraction'
              };
            }
          }
        }
        
        // Método 3: Procurar em atributos
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          ['data-url', 'data-src', 'data-file'].forEach(attr => {
            const val = el.getAttribute(attr);
            if (val && val.includes('aesthorium.sbs') && val.includes(vid)) {
              return {
                url: val,
                source: 'attribute'
              };
            }
          });
        }
        
        return null;
      } catch (error) {
        console.error('Erro na extração:', error);
        return null;
      }
    }, videoId);
    
    if (!videoData || !videoData.url) {
      throw new Error('Não foi possível encontrar URL do vídeo');
    }
    
    console.log(`✅ [${videoId}] URL encontrada: ${videoData.url.substring(0, 80)}...`);
    
    // Verificar se é master playlist (.txt)
    let finalUrl = videoData.url;
    let isMasterPlaylist = videoData.url.includes('.txt') && !videoData.url.includes('.m3u8');
    
    if (isMasterPlaylist) {
      console.log(`📑 [${videoId}] É master playlist, obtendo melhor qualidade...`);
      
      try {
        const playlistContent = await page.evaluate(async (url) => {
          const response = await fetch(url);
          return await response.text();
        }, videoData.url);
        
        // Parsear playlist para melhor qualidade
        const lines = playlistContent.split('\n');
        let bestUrl = null;
        let maxBandwidth = 0;
        let currentBandwidth = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line.includes('BANDWIDTH=')) {
            const match = line.match(/BANDWIDTH=(\d+)/);
            if (match) currentBandwidth = parseInt(match[1]);
          } else if (line && !line.startsWith('#') && currentBandwidth > 0) {
            if (currentBandwidth > maxBandwidth) {
              maxBandwidth = currentBandwidth;
              if (line.startsWith('http')) {
                bestUrl = line;
              } else {
                const baseUrl = videoData.url.substring(0, videoData.url.lastIndexOf('/') + 1);
                bestUrl = baseUrl + line;
              }
            }
            currentBandwidth = 0;
          }
        }
        
        if (bestUrl) {
          finalUrl = bestUrl;
          console.log(`🏆 [${videoId}] Melhor qualidade: ${maxBandwidth} bps`);
        }
      } catch (error) {
        console.log(`⚠️ [${videoId}] Erro ao processar playlist: ${error.message}`);
      }
    }
    
    // Preparar resposta
    const result = {
      success: true,
      url: finalUrl,
      isHls: finalUrl.includes('.m3u8') || finalUrl.includes('.txt'),
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36'
      },
      metadata: {
        videoId: videoId,
        source: videoData.source,
        isMasterPlaylist: isMasterPlaylist,
        extractedAt: new Date().toISOString()
      }
    };
    
    // Salvar no cache
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    // Limpar cache antigo
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > 10 * 60 * 1000) { // 10 minutos
        cache.delete(key);
      }
    }
    
    res.json(result);
    
  } catch (error) {
    console.error(`❌ [${videoId}] ERRO: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      tip: 'Verifique se o ID do vídeo está correto'
    });
    
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log(`🔒 [${videoId}] Browser fechado`);
      } catch (e) {
        console.log(`⚠️ [${videoId}] Erro ao fechar browser: ${e.message}`);
      }
    }
  }
});

// Limpeza de cache a cada hora
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > 30 * 60 * 1000) { // 30 minutos
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cache limpo: ${cleaned} itens removidos`);
  }
}, 60 * 60 * 1000); // A cada hora

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Strp2p Proxy rodando na porta ${PORT}`);
  console.log(`📞 Endpoint: http://localhost:${PORT}/stream?id=VIDEO_ID`);
  console.log(`❤️  Saúde: http://localhost:${PORT}/health`);
});
