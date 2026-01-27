// server.js - ENGANAR O SITE (fingir que não é headless)
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// TÉCNICA: Fingir que NÃO é headless
async function makePageLookReal(page) {
  // O segredo: setar '--disable-blink-features=AutomationControlled' NÃO é suficiente
  // Precisamos REMOVER COMPLETAMENTE as assinaturas
  
  await page.evaluateOnNewDocument(() => {
    // 1. Remover a flag window.navigator.webdriver COMPLETAMENTE
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    
    // 2. Sobrescrever o userAgent para parecer real
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // 3. Sobrescrever navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      get: () => userAgent
    });
    
    // 4. Sobrescrever navigator.platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32'
    });
    
    // 5. Sobrescrever navigator.vendor
    Object.defineProperty(navigator, 'vendor', {
      get: () => 'Google Inc.'
    });
    
    // 6. REMOVER chrome.csi
    delete window.chrome.csi;
    
    // 7. REMOVER chrome.loadTimes
    delete window.chrome.loadTimes;
    
    // 8. Adicionar propriedades que navegadores reais têm
    if (!window.chrome) {
      window.chrome = {};
    }
    
    // 9. Adicionar runtime (navegadores reais têm isso)
    if (!window.chrome.runtime) {
      window.chrome.runtime = {};
    }
    
    // 10. Verificação FINAL: se alguém tentar detectar, retorna undefined
    window.callPhantom = undefined;
    window._phantom = undefined;
    window.phantom = undefined;
  });
}

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Proxy fingindo ser navegador real',
    endpoint: '/extract?id=VIDEO_ID',
    example: '/extract?id=juscu',
    note: 'Tentando enganar a detecção de headless'
  });
});

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎭 FINGINDO SER NAVEGADOR REAL PARA: ${videoId}`);
  
  let browser = null;
  try {
    // CONFIGURAÇÃO ULTRA-REALISTA
    browser = await puppeteer.launch({
      headless: true, // Mantemos headless, mas vamos ENGANAR
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        
        // 🚨 ESTAS SÃO AS CHAVES PARA NÃO SER DETECTADO:
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        
        // User agent REAL
        `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`,
        
        // Window size REAL
        '--window-size=1920,1080',
        
        // Desabilitar coisas que bots usam
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        
        // Permitir todos os recursos
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });
    
    const page = await browser.newPage();
    
    // 🎭 FAZER A PÁGINA PARECER REAL
    await makePageLookReal(page);
    
    // Headers SUPER realistas
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
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'TE': 'trailers'
    });
    
    // Viewport real
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: false,
      isMobile: false
    });
    
    // 🎯 PRIMEIRA VERIFICAÇÃO: testar se somos detectados
    console.log('🔍 Testando detecção...');
    const isDetected = await page.evaluate(() => {
      // Testes comuns de detecção
      const tests = {
        webdriver: navigator.webdriver,
        languages: navigator.languages,
        plugins: navigator.plugins.length,
        chrome: typeof window.chrome,
        permissions: typeof navigator.permissions?.query === 'function'
      };
      
      console.log('Testes de detecção:', tests);
      return !!navigator.webdriver;
    });
    
    if (isDetected) {
      console.log('⚠️  Ainda detectado como bot!');
    } else {
      console.log('✅ Parece um navegador real!');
    }
    
    // Navegar
    console.log(`🌐 Navegando: https://png.strp2p.com/#${videoId}`);
    
    // Usar waitUntil diferente para parecer mais humano
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Aguardar como humano
    await delay(2000 + Math.random() * 3000);
    
    // Verificar se não foi bloqueado
    const content = await page.content();
    if (content.includes('Headless Browser is not allowed')) {
      console.log('❌ Ainda detectado como headless!');
      console.log('📄 Primeiros 500 chars:', content.substring(0, 500));
      throw new Error('Site ainda detecta como headless');
    }
    
    console.log('✅ Passou pela detecção!');
    
    // Agora fazer o fluxo normal
    console.log('🎯 Procurando #player-button...');
    
    // Esperar botão aparecer
    try {
      await page.waitForSelector('#player-button', { timeout: 10000 });
      console.log('✅ #player-button encontrado');
    } catch (e) {
      console.log('❌ #player-button não encontrado');
      // Talvez o seletor seja diferente
      const anyPlayButton = await page.evaluate(() => {
        const selectors = [
          '#player-button',
          '#player-button-container',
          '.jw-display-icon-play',
          '[class*="play"]',
          'button[aria-label*="play"]'
        ];
        
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) return selector;
        }
        return null;
      });
      
      if (anyPlayButton) {
        console.log(`✅ Encontrado botão alternativo: ${anyPlayButton}`);
      }
    }
    
    // Clique
    console.log('🖱️  Clicando...');
    await page.evaluate(() => {
      const btn = document.querySelector('#player-button') || 
                  document.querySelector('#player-button-container') ||
                  document.querySelector('.jw-display-icon-play');
      
      if (btn) {
        // Clique humano (com delay)
        const rect = btn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        // Simular eventos de mouse humanos
        btn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        
        console.log('✅ Clique humano simulado');
      }
    });
    
    // Aguardar resposta
    await delay(3000);
    
    // Verificar JW Player
    console.log('🔍 Verificando JW Player...');
    const result = await page.evaluate(() => {
      if (typeof jwplayer !== 'function') {
        return { success: false, error: 'jwplayer não é função' };
      }
      
      try {
        const player = jwplayer();
        console.log('Métodos disponíveis:', Object.keys(player).filter(k => typeof player[k] === 'function'));
        
        // Tentar getPlaylist
        if (typeof player.getPlaylist === 'function') {
          const playlist = player.getPlaylist();
          if (playlist && playlist[0]) {
            const url = playlist[0].file || 
                       (playlist[0].sources && playlist[0].sources[0] && playlist[0].sources[0].file);
            return { success: true, url: url, method: 'getPlaylist' };
          }
        }
        
        // Tentar getConfig
        if (typeof player.getConfig === 'function') {
          const config = player.getConfig();
          if (config && config.playlist && config.playlist[0]) {
            const url = config.playlist[0].file || 
                       (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
            return { success: true, url: url, method: 'getConfig' };
          }
        }
        
        return { success: false, error: 'Métodos não retornaram URL' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    
    await browser.close();
    
    if (result.success && result.url) {
      console.log(`🎉 SUCESSO! URL: ${result.url}`);
      
      res.json({
        success: true,
        videoId: videoId,
        url: result.url,
        method: result.method,
        extractedAt: new Date().toISOString(),
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
    } else {
      console.log(`❌ Falhou: ${result.error}`);
      throw new Error(result.error || 'Não conseguiu extrair URL');
    }
    
  } catch (error) {
    console.error(`💥 ERRO FINAL: ${error.message}`);
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'Site tem proteção muito forte contra bots'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor "não-headless": http://localhost:${PORT}/extract?id=juscu`);
});
