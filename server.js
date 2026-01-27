// server.js - COM STEALTH (importação correta)
const express = require('express');
const puppeteer = require('puppeteer-extra'); // MUDOU AQUI!
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Usar plugin stealth
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎯 BYPASS DETECÇÃO HEADLESS PARA: ${videoId}`);
  
  let browser = null;
  try {
    // CONFIGURAÇÃO AVANÇADA PARA BYPASS
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    const page = await browser.newPage();
    
    // EVITAR DETECÇÃO: Esconder WebDriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });
    
    // EVITAR DETECÇÃO: Esconder languages
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en-US', 'en']
      });
    });
    
    // EVITAR DETECÇÃO: Chrome runtime
    await page.evaluateOnNewDocument(() => {
      window.chrome = {
        runtime: {}
      };
    });
    
    // Headers realistas
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
      'Sec-Fetch-User': '?1'
    });
    
    // Viewport realista
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: false,
      isMobile: false
    });
    
    console.log(`🌐 Navegando com stealth para: https://png.strp2p.com/#${videoId}`);
    
    // Navegar SEM waitUntil (mais natural)
    await page.goto(`https://png.strp2p.com/#${videoId}`);
    
    console.log('⏳ Aguardando de forma natural (sem delays fixos)...');
    
    // Esperar de forma mais natural
    await page.waitForFunction(() => {
      return document.readyState === 'complete' && 
             document.body && 
             document.body.children.length > 0;
    }, { timeout: 30000 });
    
    console.log('✅ Página carregada naturalmente');
    
    // Verificar se não foi bloqueado
    const pageContent = await page.content();
    if (pageContent.includes('Headless Browser is not allowed')) {
      throw new Error('Site ainda detectou headless browser');
    }
    
    console.log('✅ Bypass da detecção funcionou!');
    
    // AGORA fazer o que você faz no console
    console.log('🖱️  Executando: document.querySelector("#player-button").click()');
    
    // Usar waitForSelector para garantir que o botão está realmente lá
    await page.waitForSelector('#player-button', { timeout: 10000 });
    
    // Clique com mais naturalidade
    await page.click('#player-button', {
      delay: 100, // Delay humano entre mouse down e up
      button: 'left'
    });
    
    console.log('✅ Clique realizado');
    
    // Esperar resposta natural do player
    await delay(3000);
    
    console.log('💻 Executando: jwplayer().getPlaylist()');
    
    // Executar seus comandos
    const result = await page.evaluate(() => {
      console.log('🔄 Executando comandos no console da página...');
      
      // Verificar estado
      console.log('JW Player disponível:', typeof jwplayer === 'function');
      console.log('Métodos disponíveis:', typeof jwplayer === 'function' ? Object.keys(jwplayer()) : 'n/a');
      
      if (typeof jwplayer === 'function') {
        try {
          const playlist = jwplayer().getPlaylist();
          console.log('getPlaylist resultado:', playlist);
          
          if (playlist && playlist[0]) {
            const url = playlist[0].file || 
                       (playlist[0].sources && playlist[0].sources[0] && playlist[0].sources[0].file);
            return {
              success: true,
              url: url,
              playlist: playlist
            };
          }
        } catch (e) {
          console.log('Erro getPlaylist:', e.message);
          
          // Tentar getConfig
          try {
            const config = jwplayer().getConfig();
            console.log('getConfig resultado:', config);
            
            if (config && config.playlist && config.playlist[0]) {
              const url = config.playlist[0].file || 
                         (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
              return {
                success: true,
                url: url,
                config: config
              };
            }
          } catch (e2) {
            console.log('Erro getConfig:', e2.message);
          }
        }
      }
      
      return {
        success: false,
        error: 'Não conseguiu extrair URL'
      };
    });
    
    await browser.close();
    
    if (result.success && result.url) {
      console.log(`🎉 URL EXTRAÍDA: ${result.url}`);
      
      res.json({
        success: true,
        videoId: videoId,
        url: result.url,
        extractedAt: new Date().toISOString(),
        method: 'jwplayer().getPlaylist()',
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
    } else {
      throw new Error(result.error || 'URL não encontrada');
    }
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'Bypass da detecção pode ter falhado'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor com stealth plugin: http://localhost:${PORT}/extract?id=juscu`);
  console.log(`📦 Instale as dependências: npm install puppeteer-extra puppeteer-extra-plugin-stealth`);
});
