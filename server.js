// server.js - BYPASS MANUAL SEM STEALTH PLUGIN
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// TÉCNICAS DE BYPASS MANUAIS
async function configurePageForBypass(page) {
  // 1. Esconder WebDriver
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
    
    // 2. Sobrescrever chrome
    window.chrome = {
      runtime: {},
      loadTimes: () => {},
      csi: () => {},
      app: {}
    };
    
    // 3. Sobrescrever permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return originalQuery(parameters);
    };
    
    // 4. Sobrescrever plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
    
    // 5. Sobrescrever languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en']
    });
    
    // 6. Sobrescrever userAgent
    Object.defineProperty(navigator, 'userAgent', {
      get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
  });
}

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Proxy com bypass manual',
    endpoint: '/extract?id=VIDEO_ID',
    example: 'http://localhost:3000/extract?id=juscu'
  });
});

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎯 BYPASS MANUAL PARA: ${videoId}`);
  
  let browser = null;
  try {
    // Configuração para evitar detecção
    browser = await puppeteer.launch({
      headless: 'new', // 'new' headless é menos detectável
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configurar bypass
    await configurePageForBypass(page);
    
    // Headers realistas
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });
    
    // Viewport realista
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    console.log(`🌐 Navegando (com bypass) para: https://png.strp2p.com/#${videoId}`);
    
    // Navegar de forma mais natural
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Verificar se não foi bloqueado
    const content = await page.content();
    if (content.includes('Headless Browser is not allowed')) {
      throw new Error('Site ainda detectou headless mesmo com bypass');
    }
    
    console.log('✅ Bypass funcionou! Página carregada');
    
    // Aguardar de forma mais inteligente
    await page.waitForFunction(() => {
      return document.querySelector('#player-button') || document.querySelector('.jwplayer');
    }, { timeout: 10000 });
    
    console.log('🎯 Elementos do player carregados');
    
    // Fazer screenshot para debug (opcional)
    // await page.screenshot({ path: 'debug.png' });
    
    // Tentar clique múltiplas vezes
    console.log('🖱️  Tentando cliques múltiplos...');
    
    for (let i = 0; i < 3; i++) {
      try {
        await page.evaluate(() => {
          const btn = document.querySelector('#player-button');
          if (btn) {
            // Clique com eventos completos
            btn.focus();
            btn.click();
            
            // Disparar eventos manualmente também
            ['mousedown', 'mouseup', 'click'].forEach(eventType => {
              btn.dispatchEvent(new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                view: window
              }));
            });
            
            console.log(`✅ Clique ${i + 1} realizado`);
          }
        });
        
        await delay(1000);
      } catch (e) {
        console.log(`⚠️  Tentativa ${i + 1} falhou: ${e.message}`);
      }
    }
    
    console.log('⏳ Aguardando inicialização do player...');
    await delay(3000);
    
    // Verificar se o JW Player agora tem os métodos
    console.log('🔍 Verificando métodos do JW Player...');
    
    const playerState = await page.evaluate(() => {
      const state = {};
      
      if (typeof jwplayer === 'function') {
        try {
          const player = jwplayer();
          state.exists = true;
          
          // Listar métodos disponíveis
          const allProps = Object.getOwnPropertyNames(player);
          state.methods = allProps.filter(prop => typeof player[prop] === 'function');
          
          console.log('Métodos disponíveis:', state.methods);
          
          // Tentar getPlaylist
          if (state.methods.includes('getPlaylist')) {
            try {
              state.playlist = player.getPlaylist();
              console.log('✅ getPlaylist funcionou');
              
              if (state.playlist && state.playlist[0]) {
                state.url = state.playlist[0].file || 
                           (state.playlist[0].sources && state.playlist[0].sources[0] && state.playlist[0].sources[0].file);
              }
            } catch (e) {
              console.log('❌ getPlaylist erro:', e.message);
            }
          }
          
          // Se não, tentar getConfig
          if (!state.url && state.methods.includes('getConfig')) {
            try {
              state.config = player.getConfig();
              console.log('✅ getConfig funcionou');
              
              if (state.config && state.config.playlist && state.config.playlist[0]) {
                state.url = state.config.playlist[0].file || 
                           (state.config.playlist[0].sources && state.config.playlist[0].sources[0] && state.config.playlist[0].sources[0].file);
              }
            } catch (e) {
              console.log('❌ getConfig erro:', e.message);
            }
          }
          
        } catch (e) {
          state.error = e.message;
        }
      } else {
        state.exists = false;
      }
      
      return state;
    });
    
    console.log(`📊 Estado do player: ${playerState.exists ? '✅ Existe' : '❌ Não existe'}`);
    console.log(`Métodos: ${playerState.methods ? playerState.methods.join(', ') : 'nenhum'}`);
    
    if (playerState.url) {
      console.log(`🎉 URL EXTRAÍDA: ${playerState.url}`);
      
      await browser.close();
      
      res.json({
        success: true,
        videoId: videoId,
        url: playerState.url,
        extractedAt: new Date().toISOString(),
        playerMethods: playerState.methods,
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
    } else {
      // Última tentativa: procurar URLs manualmente
      console.log('🔄 Última tentativa: procurar URLs manualmente...');
      
      const manualSearch = await page.evaluate(() => {
        const urls = [];
        
        // 1. Procurar em scripts
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || script.innerHTML || '';
          const matches = content.match(/https:\/\/[^\s"']*aesthorium[^\s"']*/g) || 
                         content.match(/https:\/\/[^\s"']*cf-master[^\s"']*/g);
          if (matches) {
            urls.push(...matches);
          }
        });
        
        // 2. Procurar em elementos de vídeo
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          if (video.src) urls.push(video.src);
          if (video.currentSrc) urls.push(video.currentSrc);
        });
        
        // 3. Procurar em iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const iframeVideos = iframeDoc.querySelectorAll('video');
            iframeVideos.forEach(video => {
              if (video.src) urls.push(video.src);
            });
          } catch (e) {}
        });
        
        return urls.filter(url => url.includes('aesthorium') || url.includes('cf-master'));
      });
      
      console.log(`🔍 URLs encontradas manualmente: ${manualSearch.length}`);
      
      if (manualSearch.length > 0) {
        console.log(`🎉 URL encontrada manualmente: ${manualSearch[0]}`);
        
        await browser.close();
        
        res.json({
          success: true,
          videoId: videoId,
          url: manualSearch[0],
          extractedAt: new Date().toISOString(),
          method: 'busca manual',
          note: 'URL encontrada via busca manual (JW Player não inicializou)',
          headers: {
            'Referer': 'https://png.strp2p.com/',
            'Origin': 'https://png.strp2p.com'
          }
        });
      } else {
        throw new Error('Não foi possível extrair URL mesmo com bypass');
      }
    }
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'Bypass manual pode não ter sido suficiente'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor com bypass manual: http://localhost:${PORT}/extract?id=juscu`);
});
