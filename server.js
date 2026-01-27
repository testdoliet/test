// server.js - HEADLESS COM LOGS DETALHADOS
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎯 EXECUTANDO FLUXO COMPLETO PARA: ${videoId}`);
  
  let browser = null;
  const detailedLogs = [];
  
  const log = (msg, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const formattedMsg = `[${timestamp}] ${msg}`;
    detailedLogs.push({ time: timestamp, type, message: msg });
    
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : '📝';
    console.log(`${emoji} ${formattedMsg}`);
  };
  
  try {
    // 1. ABRIR NAVEGADOR
    log('Abrindo navegador headless...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    log('Navegador aberto com sucesso', 'success');
    
    const page = await browser.newPage();
    
    // 2. CAPTURAR CONSOLE DA PÁGINA
    const pageConsoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      pageConsoleLogs.push(text);
      log(`CONSOLE DA PÁGINA: ${text}`, 'debug');
    });
    
    // 3. NAVEGAR
    log(`Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    log('Página carregada', 'success');
    
    // 4. INJETAR CÓDIGO DE DEBUG NA PÁGINA
    log('Injetando código de debug na página...');
    await page.evaluate(() => {
      // Sobrescrever console.log para capturar tudo
      const originalConsoleLog = console.log;
      console.log = function(...args) {
        originalConsoleLog.apply(console, args);
        // Enviar para o window para o Puppeteer capturar
        window._debugLogs = window._debugLogs || [];
        window._debugLogs.push(args.join(' '));
      };
      
      console.log('[DEBUG] Console.log sobrescrito para captura');
    });
    
    await delay(5000);
    log('Aguardou 5 segundos para carregamento completo');
    
    // 5. ANÁLISE COMPLETA DA PÁGINA
    log('Analisando estrutura da página...');
    const pageAnalysis = await page.evaluate(() => {
      const analysis = {};
      
      // Elementos importantes
      analysis.elements = {
        playerButton: {
          selector: '#player-button',
          element: document.querySelector('#player-button'),
          exists: !!document.querySelector('#player-button'),
          tagName: document.querySelector('#player-button')?.tagName,
          className: document.querySelector('#player-button')?.className,
          innerHTML: document.querySelector('#player-button')?.innerHTML?.substring(0, 100)
        },
        playerButtonContainer: {
          selector: '#player-button-container',
          exists: !!document.querySelector('#player-button-container')
        },
        jwplayerElements: document.querySelectorAll('.jwplayer, [class*="jw-"]').length,
        videoElements: document.querySelectorAll('video').length
      };
      
      // JW Player status
      analysis.jwplayer = {
        exists: typeof jwplayer === 'function',
        isFunction: typeof jwplayer,
        version: typeof jwplayer === 'function' ? (jwplayer.version || 'desconhecida') : null
      };
      
      // Se jwplayer existe, analisar detalhadamente
      if (analysis.jwplayer.exists) {
        try {
          const player = jwplayer();
          analysis.jwplayer.instance = !!player;
          
          if (player) {
            analysis.jwplayer.methods = Object.keys(player).filter(k => typeof player[k] === 'function');
            analysis.jwplayer.properties = Object.keys(player).filter(k => typeof player[k] !== 'function');
            
            // Testar métodos específicos
            const testMethods = ['getPlaylist', 'getConfig', 'getPlaylistItem', 'play', 'pause'];
            analysis.jwplayer.methodTests = {};
            
            testMethods.forEach(method => {
              try {
                if (typeof player[method] === 'function') {
                  const result = player[method]();
                  analysis.jwplayer.methodTests[method] = {
                    exists: true,
                    resultType: typeof result,
                    isArray: Array.isArray(result),
                    isObject: result && typeof result === 'object'
                  };
                } else {
                  analysis.jwplayer.methodTests[method] = { exists: false };
                }
              } catch (e) {
                analysis.jwplayer.methodTests[method] = {
                  exists: true,
                  error: e.message
                };
              }
            });
          }
        } catch (e) {
          analysis.jwplayer.error = e.message;
        }
      }
      
      // Verificar estado da página
      analysis.pageState = {
        title: document.title,
        url: window.location.href,
        readyState: document.readyState,
        bodyChildren: document.body.children.length
      };
      
      console.log('[DEBUG] Análise completa realizada:', analysis);
      return analysis;
    });
    
    log(`Análise: #player-button existe: ${pageAnalysis.elements.playerButton.exists ? '✅' : '❌'}`);
    log(`Análise: JW Player existe: ${pageAnalysis.jwplayer.exists ? '✅' : '❌'}`);
    log(`Análise: Elementos JW Player: ${pageAnalysis.elements.jwplayerElements}`);
    log(`Análise: Elementos <video>: ${pageAnalysis.elements.videoElements}`);
    
    if (pageAnalysis.jwplayer.methods) {
      log(`Métodos JW Player disponíveis: ${pageAnalysis.jwplayer.methods.join(', ')}`);
    }
    
    // 6. TENTAR O CLIQUE
    log('Tentando clique em #player-button...');
    
    const clickResults = [];
    
    // Método 1: Clique normal
    try {
      log('Tentativa 1: click() normal');
      const result1 = await page.evaluate(() => {
        console.log('[DEBUG] Tentando click() normal em #player-button');
        const btn = document.querySelector('#player-button');
        if (btn) {
          btn.click();
          return { success: true, method: 'click() normal' };
        }
        return { success: false, method: 'click() normal', error: 'Botão não encontrado' };
      });
      clickResults.push(result1);
      await delay(1000);
    } catch (e) {
      clickResults.push({ success: false, method: 'click() normal', error: e.message });
    }
    
    // Método 2: Eventos de mouse
    try {
      log('Tentativa 2: Eventos de mouse');
      const result2 = await page.evaluate(() => {
        console.log('[DEBUG] Tentando eventos de mouse em #player-button');
        const btn = document.querySelector('#player-button');
        if (btn) {
          // Disparar todos os eventos
          ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            btn.dispatchEvent(new MouseEvent(eventType, {
              view: window,
              bubbles: true,
              cancelable: true
            }));
          });
          return { success: true, method: 'eventos de mouse' };
        }
        return { success: false, method: 'eventos de mouse', error: 'Botão não encontrado' };
      });
      clickResults.push(result2);
      await delay(1000);
    } catch (e) {
      clickResults.push({ success: false, method: 'eventos de mouse', error: e.message });
    }
    
    // Método 3: Via JavaScript (HTMLElement.click)
    try {
      log('Tentativa 3: HTMLElement.click()');
      const result3 = await page.evaluate(() => {
        console.log('[DEBUG] Tentando HTMLElement.click()');
        const btn = document.querySelector('#player-button');
        if (btn && btn.click) {
          // Chamar o método click do próprio elemento
          btn.click();
          return { success: true, method: 'HTMLElement.click()' };
        }
        return { success: false, method: 'HTMLElement.click()', error: 'Botão ou método não disponível' };
      });
      clickResults.push(result3);
      await delay(1000);
    } catch (e) {
      clickResults.push({ success: false, method: 'HTMLElement.click()', error: e.message });
    }
    
    // Método 4: Se jwplayer existe, tentar play()
    if (pageAnalysis.jwplayer.exists) {
      try {
        log('Tentativa 4: jwplayer().play()');
        const result4 = await page.evaluate(() => {
          console.log('[DEBUG] Tentando jwplayer().play()');
          if (typeof jwplayer === 'function') {
            try {
              jwplayer().play();
              return { success: true, method: 'jwplayer().play()' };
            } catch (e) {
              return { success: false, method: 'jwplayer().play()', error: e.message };
            }
          }
          return { success: false, method: 'jwplayer().play()', error: 'jwplayer não é função' };
        });
        clickResults.push(result4);
        await delay(1000);
      } catch (e) {
        clickResults.push({ success: false, method: 'jwplayer().play()', error: e.message });
      }
    }
    
    log(`Resultados do clique: ${clickResults.filter(r => r.success).length}/${clickResults.length} sucessos`);
    
    await delay(3000);
    log('Aguardou 3 segundos após tentativas de clique');
    
    // 7. VERIFICAR SE O JW PLAYER AGORA TEM OS MÉTODOS
    log('Verificando estado do JW Player após clique...');
    const postClickAnalysis = await page.evaluate(() => {
      const analysis = {};
      
      if (typeof jwplayer === 'function') {
        try {
          const player = jwplayer();
          analysis.player = !!player;
          
          if (player) {
            analysis.methods = Object.keys(player).filter(k => typeof player[k] === 'function');
            
            // Testar getPlaylist especificamente
            try {
              analysis.getPlaylistResult = player.getPlaylist();
              analysis.getPlaylistSuccess = true;
              console.log('[DEBUG] getPlaylist() funcionou!');
            } catch (e) {
              analysis.getPlaylistError = e.message;
              analysis.getPlaylistSuccess = false;
              console.log(`[DEBUG] getPlaylist() falhou: ${e.message}`);
            }
            
            // Testar getConfig
            try {
              analysis.getConfigResult = player.getConfig();
              analysis.getConfigSuccess = true;
            } catch (e) {
              analysis.getConfigError = e.message;
              analysis.getConfigSuccess = false;
            }
          }
        } catch (e) {
          analysis.error = e.message;
        }
      }
      
      return analysis;
    });
    
    log(`getPlaylist disponível após clique: ${postClickAnalysis.getPlaylistSuccess ? '✅' : '❌'}`);
    log(`getConfig disponível após clique: ${postClickAnalysis.getConfigSuccess ? '✅' : '❌'}`);
    
    // 8. EXTRAIR URL
    log('Tentando extrair URL do vídeo...');
    const extractionResult = await page.evaluate(() => {
      const result = { attempts: [], url: null };
      
      // Método A: Via getPlaylist
      if (typeof jwplayer === 'function') {
        try {
          const playlist = jwplayer().getPlaylist();
          if (playlist && playlist[0]) {
            const url = playlist[0].file || 
                       (playlist[0].sources && playlist[0].sources[0] && playlist[0].sources[0].file);
            if (url) {
              result.attempts.push({ method: 'getPlaylist', success: true, url: url });
              result.url = url;
              console.log(`[DEBUG] URL via getPlaylist: ${url}`);
            }
          }
        } catch (e) {
          result.attempts.push({ method: 'getPlaylist', success: false, error: e.message });
        }
        
        // Método B: Via getConfig
        try {
          const config = jwplayer().getConfig();
          if (config && config.playlist && config.playlist[0] && !result.url) {
            const url = config.playlist[0].file || 
                       (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
            if (url) {
              result.attempts.push({ method: 'getConfig', success: true, url: url });
              result.url = url;
              console.log(`[DEBUG] URL via getConfig: ${url}`);
            }
          }
        } catch (e) {
          result.attempts.push({ method: 'getConfig', success: false, error: e.message });
        }
      }
      
      // Método C: Procurar em elementos video
      const videos = document.querySelectorAll('video');
      videos.forEach((video, i) => {
        const src = video.src || video.currentSrc;
        if (src && src.includes('aesthorium') && !result.url) {
          result.attempts.push({ method: `video[${i}]`, success: true, url: src });
          result.url = src;
          console.log(`[DEBUG] URL via video element: ${src}`);
        }
      });
      
      return result;
    });
    
    log(`Resultado da extração: ${extractionResult.url ? '✅ SUCESSO' : '❌ FALHA'}`);
    
    if (extractionResult.url) {
      log(`URL extraída: ${extractionResult.url.substring(0, 100)}...`, 'success');
      
      await browser.close();
      
      res.json({
        success: true,
        videoId: videoId,
        url: extractionResult.url,
        extractionMethod: extractionResult.attempts.find(a => a.success)?.method,
        detailedLogs: detailedLogs,
        pageConsoleLogs: pageConsoleLogs,
        pageAnalysis: {
          playerButtonExists: pageAnalysis.elements.playerButton.exists,
          jwplayerExists: pageAnalysis.jwplayer.exists,
          jwplayerMethods: pageAnalysis.jwplayer.methods,
          jwplayerMethodTests: pageAnalysis.jwplayer.methodTests
        },
        clickResults: clickResults,
        postClickAnalysis: {
          getPlaylistSuccess: postClickAnalysis.getPlaylistSuccess,
          getConfigSuccess: postClickAnalysis.getConfigSuccess
        },
        extractionAttempts: extractionResult.attempts,
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
      
    } else {
      await browser.close();
      
      log('Nenhum método de extração funcionou', 'error');
      
      res.status(500).json({
        success: false,
        error: 'Não foi possível extrair URL após múltiplas tentativas',
        videoId: videoId,
        detailedLogs: detailedLogs,
        pageConsoleLogs: pageConsoleLogs,
        pageAnalysis: pageAnalysis,
        clickResults: clickResults,
        postClickAnalysis: postClickAnalysis,
        extractionAttempts: extractionResult.attempts,
        note: 'Fluxo completo executado, mas extração falhou'
      });
    }
    
  } catch (error) {
    log(`ERRO CRÍTICO: ${error.message}`, 'error');
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      detailedLogs: detailedLogs,
      note: 'Erro durante execução do fluxo'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor com logs detalhados rodando: http://localhost:${PORT}/extract?id=juscu`);
});
