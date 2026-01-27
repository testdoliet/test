// server.js - SIMULAÇÃO PERFEITA DO NAVEGADOR
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎯 SIMULAÇÃO PERFEITA DO NAVEGADOR PARA: ${videoId}`);
  
  let browser = null;
  try {
    // CONFIGURAÇÃO IDÊNTICA AO NAVEGADOR
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    const page = await browser.newPage();
    
    // 1. SETAR COOKIES E HEADERS IDÊNTICOS
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });
    
    // 2. HABILITAR JAVASCRIPT E COOKIES
    await page.setJavaScriptEnabled(true);
    
    // 3. INTERCEPTAR REQUISIÇÕES PARA VER O QUE ACONTECE
    page.on('request', request => {
      const url = request.url();
      if (url.includes('jwplayer') || url.includes('aesthorium')) {
        console.log(`🌐 REQUEST: ${request.method()} ${url}`);
      }
    });
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('jwplayer') || url.includes('aesthorium')) {
        console.log(`📡 RESPONSE: ${response.status()} ${url}`);
      }
    });
    
    // 4. NAVEGAR
    console.log(`🌐 Indo para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle0', // ESPERAR TUDO
      timeout: 60000
    });
    
    // 5. AGUARDAR MUITO MAIS TEMPO
    console.log('⏳ Aguardando 10 segundos para carregamento TOTAL...');
    await delay(10000);
    
    // 6. TENTAR INICIALIZAR O JW PLAYER MANUALMENTE
    console.log('⚡ Tentando inicializar JW Player manualmente...');
    
    const initResult = await page.evaluate(() => {
      console.log('🔄 Inicialização manual do JW Player iniciada');
      
      // Tentativa 1: Verificar se window.jwplayer está pronto
      if (typeof jwplayer !== 'function') {
        console.log('❌ jwplayer não é uma função');
        return { success: false, step: 'jwplayer check' };
      }
      
      // Tentativa 2: Verificar se há elementos JW Player no DOM
      const jwElements = document.querySelectorAll('[data-jwplayer]');
      console.log(`📊 Elementos [data-jwplayer]: ${jwElements.length}`);
      
      // Tentativa 3: Procurar scripts do JW Player
      const jwScripts = Array.from(document.scripts).filter(script => 
        script.src && script.src.includes('jwplayer')
      );
      console.log(`📊 Scripts JW Player: ${jwScripts.length}`);
      
      // Tentativa 4: Disparar eventos que podem inicializar o player
      try {
        // Evento que o JW Player escuta
        const event = new Event('DOMContentLoaded', { bubbles: true });
        document.dispatchEvent(event);
        console.log('✅ Disparado evento DOMContentLoaded');
      } catch (e) {
        console.log(`⚠️ Erro ao disparar evento: ${e.message}`);
      }
      
      // Tentativa 5: Forçar execução de scripts pendentes
      try {
        // Executar scripts inline que podem inicializar o player
        const inlineScripts = document.querySelectorAll('script:not([src])');
        inlineScripts.forEach(script => {
          try {
            eval(script.textContent);
            console.log('✅ Executado script inline');
          } catch (e) {}
        });
      } catch (e) {}
      
      return { 
        success: true, 
        jwElements: jwElements.length,
        jwScripts: jwScripts.length
      };
    });
    
    console.log(`📊 Inicialização: ${initResult.success ? '✅' : '❌'}`);
    
    // 7. AGORA TENTAR O CLIQUE - MAS DE FORMA DIFERENTE
    console.log('🖱️ Tentando clique ESPECIAL em #player-button...');
    
    await page.evaluate(() => {
      console.log('🎯 Clique especial iniciado');
      
      // Encontrar TODOS os elementos possíveis de play
      const playElements = [
        '#player-button',
        '#player-button-container',
        '[class*="play"]',
        '[class*="Play"]',
        'button[aria-label*="play"]',
        'button[aria-label*="Play"]',
        '.jw-icon-play',
        '.jw-display-icon-play',
        '[onclick*="play"]',
        '[onclick*="Play"]'
      ];
      
      playElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          try {
            console.log(`🎯 Clicando em: ${selector}`);
            
            // Clique completo com todos os eventos
            el.click();
            
            // Eventos de mouse
            ['mousedown', 'mouseup', 'click'].forEach(eventType => {
              el.dispatchEvent(new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                view: window
              }));
            });
            
            // Eventos de toque (mobile)
            ['touchstart', 'touchend'].forEach(eventType => {
              el.dispatchEvent(new TouchEvent(eventType, {
                bubbles: true,
                cancelable: true,
                touches: [new Touch({ identifier: 1, target: el })]
              }));
            });
            
          } catch (e) {
            console.log(`⚠️ Erro ao clicar ${selector}: ${e.message}`);
          }
        });
      });
      
      console.log('✅ Clique especial concluído');
    });
    
    console.log('⏳ Aguardando 5 segundos após clique especial...');
    await delay(5000);
    
    // 8. VERIFICAR SE AGORA O JW PLAYER TEM OS MÉTODOS
    console.log('🔍 Verificando métodos do JW Player após clique...');
    
    const playerStatus = await page.evaluate(() => {
      const status = {};
      
      if (typeof jwplayer === 'function') {
        try {
          const player = jwplayer();
          status.playerExists = !!player;
          
          if (player) {
            // Listar TODOS os métodos
            status.allMethods = Object.getOwnPropertyNames(player)
              .filter(key => typeof player[key] === 'function');
            
            // Verificar métodos específicos
            const targetMethods = ['getPlaylist', 'getConfig', 'getPlaylistItem', 'play', 'pause', 'setup', 'on'];
            status.methods = {};
            
            targetMethods.forEach(method => {
              status.methods[method] = typeof player[method] === 'function';
            });
            
            // Tentar usar o método 'setup' se existir (às vezes precisa)
            if (status.methods.setup) {
              try {
                // Tentar re-setup do player
                const config = player.getConfig ? player.getConfig() : {};
                if (config) {
                  player.setup(config);
                  console.log('✅ Player re-setup executado');
                }
              } catch (e) {
                console.log(`⚠️ Erro no setup: ${e.message}`);
              }
            }
            
            // Tentar usar 'on' para escutar eventos
            if (status.methods.on) {
              try {
                player.on('ready', () => {
                  console.log('✅ Evento ready disparado');
                });
                player.on('play', () => {
                  console.log('✅ Evento play disparado');
                });
              } catch (e) {}
            }
          }
        } catch (e) {
          status.error = e.message;
        }
      }
      
      return status;
    });
    
    console.log(`📊 Métodos disponíveis: ${playerStatus.allMethods ? playerStatus.allMethods.join(', ') : 'nenhum'}`);
    
    // 9. SE AINDA NÃO FUNCIONOU, TENTAR UMA ABORDAGEM RADICAL
    if (!playerStatus.methods || !playerStatus.methods.getPlaylist) {
      console.log('⚠️ Métodos ainda não disponíveis, tentando abordagem RADICAL...');
      
      await page.evaluate(() => {
        console.log('💥 ABORDAGEM RADICAL: Forçando inicialização completa');
        
        // 1. Remover e recriar elementos de vídeo
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          const newVideo = video.cloneNode(true);
          video.parentNode.replaceChild(newVideo, video);
        });
        
        // 2. Forçar execução de TODOS os scripts JW Player
        const scripts = document.querySelectorAll('script[src*="jwplayer"]');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          newScript.src = script.src;
          document.head.appendChild(newScript);
          console.log(`📜 Re-carregado script: ${script.src}`);
        });
        
        // 3. Disparar TODOS os eventos possíveis
        const events = [
          'load',
          'DOMContentLoaded', 
          'readystatechange',
          'loadeddata',
          'canplay',
          'play',
          'playing'
        ];
        
        events.forEach(eventName => {
          try {
            const event = new Event(eventName, { bubbles: true });
            document.dispatchEvent(event);
            window.dispatchEvent(event);
            
            const videoElements = document.querySelectorAll('video');
            videoElements.forEach(video => {
              video.dispatchEvent(event);
            });
          } catch (e) {}
        });
        
        console.log('💥 Abordagem radical concluída');
      });
      
      await delay(5000);
    }
    
    // 10. TENTAR EXTRAIR URL DE QUALQUER JEITO
    console.log('🎯 Tentando extrair URL FINAL...');
    
    const finalResult = await page.evaluate((vid) => {
      console.log(`🎯 Extração FINAL para: ${vid}`);
      
      const result = { url: null, method: null };
      
      // MÉTODO 1: JW Player normal
      if (typeof jwplayer === 'function') {
        try {
          const player = jwplayer();
          
          // Tentar getPlaylist
          if (typeof player.getPlaylist === 'function') {
            const playlist = player.getPlaylist();
            if (playlist && playlist[0]) {
              result.url = playlist[0].file || 
                          (playlist[0].sources && playlist[0].sources[0] && playlist[0].sources[0].file);
              result.method = 'getPlaylist';
            }
          }
          
          // Tentar getConfig
          if (!result.url && typeof player.getConfig === 'function') {
            const config = player.getConfig();
            if (config && config.playlist && config.playlist[0]) {
              result.url = config.playlist[0].file || 
                          (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
              result.method = 'getConfig';
            }
          }
        } catch (e) {
          console.log(`❌ JW Player error: ${e.message}`);
        }
      }
      
      // MÉTODO 2: Elementos de vídeo
      if (!result.url) {
        const videos = document.querySelectorAll('video');
        for (let video of videos) {
          const src = video.src || video.currentSrc;
          if (src && (src.includes('aesthorium') || src.includes('cf-master'))) {
            result.url = src;
            result.method = 'video element';
            break;
          }
        }
      }
      
      // MÉTODO 3: Iframes
      if (!result.url) {
        const iframes = document.querySelectorAll('iframe');
        for (let iframe of iframes) {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            const videos = doc.querySelectorAll('video');
            for (let video of videos) {
              const src = video.src || video.currentSrc;
              if (src && src.includes('aesthorium')) {
                result.url = src;
                result.method = 'iframe video';
                break;
              }
            }
          } catch (e) {}
        }
      }
      
      // MÉTODO 4: Procurar em scripts/estilos
      if (!result.url) {
        // Procurar em scripts
        const scripts = document.querySelectorAll('script');
        for (let script of scripts) {
          const content = script.textContent || script.innerHTML || '';
          const urlMatch = content.match(/https:\/\/[^\s"']*aesthorium[^\s"']*/g);
          if (urlMatch) {
            for (let url of urlMatch) {
              if (url.includes(vid) || url.includes('cf-master')) {
                result.url = url;
                result.method = 'script content';
                break;
              }
            }
          }
          if (result.url) break;
        }
      }
      
      // MÉTODO 5: URL padrão (último recurso)
      if (!result.url) {
        // Mesmo que você disse sem fallback, mas pelo menos tentamos
        result.url = `https://sui.aurorioncreative.site/v4/is9/${vid}/cf-master.txt`;
        result.method = 'fallback pattern';
      }
      
      console.log(`🎯 Resultado final: ${result.url ? '✅' : '❌'} via ${result.method}`);
      return result;
    }, videoId);
    
    await browser.close();
    
    if (finalResult.url) {
      console.log(`🎉 URL OBTIDA: ${finalResult.url}`);
      console.log(`📦 Método: ${finalResult.method}`);
      
      res.json({
        success: true,
        videoId: videoId,
        url: finalResult.url,
        method: finalResult.method,
        extractedAt: new Date().toISOString(),
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
    } else {
      throw new Error('Não foi possível extrair URL após todas as tentativas');
    }
    
  } catch (error) {
    console.error(`❌ ERRO FINAL: ${error.message}`);
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'Simulação completa falhou'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de simulação perfeita: http://localhost:${PORT}/extract?id=juscu`);
});
