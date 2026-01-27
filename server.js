// server.js - APENAS LOGS, SEM FALLBACK
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🔴🔴🔴 INÍCIO SEM FALLBACK PARA: ${videoId} 🔴🔴🔴`);
  
  let browser = null;
  const ALL_LOGS = [];
  
  const LOG = (msg, type = 'INFO') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type}] ${msg}`;
    ALL_LOGS.push(logEntry);
    console.log(logEntry);
  };
  
  try {
    LOG('1. Abrindo navegador');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capturar TUDO do console da página
    page.on('console', msg => {
      const text = `PÁGINA CONSOLE: ${msg.text()}`;
      LOG(text, 'PAGE');
    });
    
    // Capturar erros da página
    page.on('pageerror', error => {
      const text = `PÁGINA ERRO: ${error.message}`;
      LOG(text, 'ERROR');
    });
    
    // Capturar requests
    page.on('request', request => {
      if (request.url().includes('jwplayer') || request.url().includes('aesthorium')) {
        LOG(`REQUEST: ${request.method()} ${request.url()}`, 'NETWORK');
      }
    });
    
    LOG(`2. Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    LOG('3. Página carregada. Aguardando 10 segundos...');
    await delay(10000);
    
    // 🔴 PASSO CRÍTICO 1: ANÁLISE ANTES DO CLIQUE
    LOG('🔴🔴🔴 ANÁLISE ANTES DO CLIQUE 🔴🔴🔴');
    
    const preClickAnalysis = await page.evaluate(() => {
      const analysis = {};
      
      // Salvar logs da página
      window._myLogs = [];
      const originalLog = console.log;
      console.log = function(...args) {
        originalLog.apply(console, args);
        window._myLogs.push(args.join(' '));
      };
      
      // 1. Botão de play
      analysis.button = {};
      const button = document.querySelector('#player-button');
      if (button) {
        analysis.button.exists = true;
        analysis.button.tagName = button.tagName;
        analysis.button.innerHTML = button.innerHTML;
        analysis.button.outerHTML = button.outerHTML.substring(0, 200);
        analysis.button.classList = Array.from(button.classList);
        analysis.button.style = button.style.cssText;
        analysis.button.disabled = button.disabled;
        analysis.button.hidden = button.hidden;
        analysis.button.offsetParent = !!button.offsetParent;
        
        console.log('✅ #player-button encontrado:', analysis.button);
      } else {
        analysis.button.exists = false;
        console.log('❌ #player-button NÃO encontrado');
      }
      
      // 2. JW Player
      analysis.jwplayer = {};
      analysis.jwplayer.exists = typeof jwplayer === 'function';
      console.log(`JW Player é função: ${analysis.jwplayer.exists}`);
      
      if (analysis.jwplayer.exists) {
        try {
          const player = jwplayer();
          analysis.jwplayer.player = !!player;
          console.log(`JW Player instanciado: ${analysis.jwplayer.player}`);
          
          if (player) {
            // Listar TUDO do player
            analysis.jwplayer.allProperties = Object.getOwnPropertyNames(player);
            analysis.jwplayer.methods = analysis.jwplayer.allProperties.filter(p => typeof player[p] === 'function');
            analysis.jwplayer.properties = analysis.jwplayer.allProperties.filter(p => typeof player[p] !== 'function');
            
            console.log(`Métodos disponíveis: ${analysis.jwplayer.methods.length}`);
            console.log(`Métodos: ${analysis.jwplayer.methods.join(', ')}`);
            console.log(`Propriedades: ${analysis.jwplayer.properties.join(', ')}`);
            
            // Testar métodos específicos
            const testMethods = ['getPlaylist', 'getConfig', 'play', 'setup', 'on', 'ready'];
            analysis.jwplayer.methodTests = {};
            
            testMethods.forEach(method => {
              analysis.jwplayer.methodTests[method] = typeof player[method] === 'function';
              console.log(`${method}: ${analysis.jwplayer.methodTests[method] ? '✅ DISPONÍVEL' : '❌ NÃO DISPONÍVEL'}`);
            });
          }
        } catch (e) {
          analysis.jwplayer.error = e.message;
          console.log(`❌ Erro ao acessar jwplayer(): ${e.message}`);
        }
      }
      
      // 3. Elementos de vídeo
      analysis.videos = [];
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video, i) => {
        analysis.videos.push({
          index: i,
          src: video.src,
          currentSrc: video.currentSrc,
          readyState: video.readyState,
          paused: video.paused,
          duration: video.duration
        });
        console.log(`Video ${i}: src="${video.src}", paused=${video.paused}`);
      });
      
      // 4. Estado da página
      analysis.pageState = {
        title: document.title,
        url: window.location.href,
        readyState: document.readyState
      };
      
      return {
        analysis: analysis,
        logs: window._myLogs
      };
    });
    
    LOG('📊 ANÁLISE PRÉ-CLIQUE COMPLETA');
    LOG(`Botão existe: ${preClickAnalysis.analysis.button.exists}`);
    LOG(`JW Player existe: ${preClickAnalysis.analysis.jwplayer.exists}`);
    LOG(`Vídeos encontrados: ${preClickAnalysis.analysis.videos.length}`);
    
    // Mostrar logs da página
    preClickAnalysis.logs.forEach(log => LOG(`PÁGINA: ${log}`, 'DEBUG'));
    
    // 🔴 PASSO CRÍTICO 2: O CLIQUE
    LOG('🔴🔴🔴 EXECUTANDO O CLIQUE 🔴🔴🔴');
    
    const clickResult = await page.evaluate(() => {
      window._clickLogs = ['=== INICIANDO CLIQUE ==='];
      
      const result = { success: false, logs: window._clickLogs };
      
      try {
        const button = document.querySelector('#player-button');
        window._clickLogs.push(`Botão encontrado: ${!!button}`);
        
        if (button) {
          window._clickLogs.push(`Tipo: ${button.tagName}, Classes: ${button.className}`);
          
          // Tentar DIVERSAS formas de clique
          const clickMethods = [
            () => {
              window._clickLogs.push('Método 1: button.click()');
              button.click();
            },
            () => {
              window._clickLogs.push('Método 2: MouseEvent click');
              button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            },
            () => {
              window._clickLogs.push('Método 3: mousedown + mouseup + click');
              ['mousedown', 'mouseup', 'click'].forEach(type => {
                button.dispatchEvent(new MouseEvent(type, { bubbles: true }));
              });
            },
            () => {
              window._clickLogs.push('Método 4: focus + click');
              button.focus();
              button.click();
            }
          ];
          
          // Executar todos os métodos
          clickMethods.forEach(method => {
            try {
              method();
              window._clickLogs.push('✅ Método executado');
            } catch (e) {
              window._clickLogs.push(`❌ Erro: ${e.message}`);
            }
          });
          
          result.success = true;
          window._clickLogs.push('=== CLIQUE CONCLUÍDO ===');
          
        } else {
          window._clickLogs.push('❌ Botão não encontrado para clique');
        }
      } catch (e) {
        window._clickLogs.push(`❌ ERRO GERAL: ${e.message}`);
      }
      
      result.logs = window._clickLogs;
      return result;
    });
    
    clickResult.logs.forEach(log => LOG(`CLIQUE: ${log}`, 'CLICK'));
    LOG(`Clique bem-sucedido: ${clickResult.success ? '✅' : '❌'}`);
    
    // Aguardar após clique
    LOG('Aguardando 5 segundos após clique...');
    await delay(5000);
    
    // 🔴 PASSO CRÍTICO 3: ANÁLISE APÓS CLIQUE
    LOG('🔴🔴🔴 ANÁLISE APÓS CLIQUE 🔴🔴🔴');
    
    const postClickAnalysis = await page.evaluate(() => {
      window._postLogs = ['=== ANÁLISE PÓS-CLIQUE ==='];
      
      const analysis = {};
      
      // 1. Verificar JW Player APÓS clique
      analysis.jwplayer = {};
      analysis.jwplayer.exists = typeof jwplayer === 'function';
      window._postLogs.push(`JW Player é função: ${analysis.jwplayer.exists}`);
      
      if (analysis.jwplayer.exists) {
        try {
          const player = jwplayer();
          analysis.jwplayer.player = !!player;
          window._postLogs.push(`JW Player instanciado: ${analysis.jwplayer.player}`);
          
          if (player) {
            // Métodos disponíveis AGORA
            const allProps = Object.getOwnPropertyNames(player);
            analysis.jwplayer.methods = allProps.filter(p => typeof player[p] === 'function');
            analysis.jwplayer.properties = allProps.filter(p => typeof player[p] !== 'function');
            
            window._postLogs.push(`Métodos AGORA: ${analysis.jwplayer.methods.length}`);
            window._postLogs.push(`Métodos: ${analysis.jwplayer.methods.join(', ')}`);
            
            // Testar getPlaylist ESPECIFICAMENTE
            if (analysis.jwplayer.methods.includes('getPlaylist')) {
              try {
                analysis.playlist = player.getPlaylist();
                window._postLogs.push(`✅ getPlaylist() FUNCIONOU! Itens: ${analysis.playlist ? analysis.playlist.length : 0}`);
                
                if (analysis.playlist && analysis.playlist[0]) {
                  const item = analysis.playlist[0];
                  analysis.url = item.file || (item.sources && item.sources[0] && item.sources[0].file);
                  window._postLogs.push(`✅ URL ENCONTRADA: ${analysis.url}`);
                }
              } catch (e) {
                window._postLogs.push(`❌ getPlaylist() ERRO: ${e.message}`);
              }
            } else {
              window._postLogs.push('❌ getPlaylist() NÃO disponível');
            }
            
            // Testar getConfig
            if (analysis.jwplayer.methods.includes('getConfig')) {
              try {
                analysis.config = player.getConfig();
                window._postLogs.push('✅ getConfig() FUNCIONOU!');
              } catch (e) {
                window._postLogs.push(`❌ getConfig() ERRO: ${e.message}`);
              }
            }
          }
        } catch (e) {
          analysis.jwplayer.error = e.message;
          window._postLogs.push(`❌ Erro jwplayer(): ${e.message}`);
        }
      }
      
      // 2. Verificar elementos de vídeo APÓS clique
      analysis.videos = [];
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video, i) => {
        analysis.videos.push({
          index: i,
          src: video.src,
          currentSrc: video.currentSrc,
          paused: video.paused,
          readyState: video.readyState
        });
        window._postLogs.push(`Video ${i}: src="${video.src}", paused=${video.paused}`);
      });
      
      // 3. Estado da página
      analysis.pageState = {
        title: document.title,
        url: window.location.href
      };
      
      return {
        analysis: analysis,
        logs: window._postLogs
      };
    });
    
    postClickAnalysis.logs.forEach(log => LOG(`PÓS-CLIQUE: ${log}`, 'DEBUG'));
    
    LOG('📊 RESUMO PÓS-CLIQUE:');
    LOG(`Métodos JW Player disponíveis: ${postClickAnalysis.analysis.jwplayer.methods ? postClickAnalysis.analysis.jwplayer.methods.length : 0}`);
    LOG(`URL encontrada: ${postClickAnalysis.analysis.url ? '✅' : '❌'}`);
    
    // 🔴 PASSO CRÍTICO 4: VERIFICAÇÃO FINAL
    if (!postClickAnalysis.analysis.url) {
      LOG('❌❌❌ NENHUMA URL ENCONTRADA APÓS CLIQUE ❌❌❌', 'ERROR');
      
      // Derrubar TUDO para análise
      const pageContent = await page.content();
      LOG(`🔍 Conteúdo da página (primeiros 2000 chars): ${pageContent.substring(0, 2000)}`, 'DEBUG');
      
      await browser.close();
      
      res.status(500).json({
        success: false,
        error: 'URL NÃO ENCONTRADA após clique',
        videoId: videoId,
        logs: ALL_LOGS,
        preClick: {
          buttonExists: preClickAnalysis.analysis.button.exists,
          jwplayerExists: preClickAnalysis.analysis.jwplayer.exists,
          jwplayerMethods: preClickAnalysis.analysis.jwplayer.methods,
          videos: preClickAnalysis.analysis.videos.length
        },
        click: {
          success: clickResult.success,
          logs: clickResult.logs
        },
        postClick: {
          jwplayerMethods: postClickAnalysis.analysis.jwplayer.methods,
          urlFound: !!postClickAnalysis.analysis.url,
          videos: postClickAnalysis.analysis.videos
        }
      });
      return;
    }
    
    // 🔴 SUCESSO!
    LOG(`🎉🎉🎉 URL EXTRAÍDA COM SUCESSO: ${postClickAnalysis.analysis.url}`, 'SUCCESS');
    
    await browser.close();
    
    res.json({
      success: true,
      videoId: videoId,
      url: postClickAnalysis.analysis.url,
      extractedAt: new Date().toISOString(),
      logs: ALL_LOGS,
      method: 'jwplayer().getPlaylist()',
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com'
      }
    });
    
  } catch (error) {
    LOG(`❌❌❌ ERRO FATAL: ${error.message}`, 'ERROR');
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      logs: ALL_LOGS,
      note: 'Erro durante execução SEM FALLBACK'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor SEM FALLBACK rodando: http://localhost:${PORT}/extract?id=juscu`);
  console.log(`⚠️  ATENÇÃO: NÃO HÁ FALLBACK - ou funciona ou dá erro`);
});
