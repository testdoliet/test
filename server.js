const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// SEU TOKEN - Browserless.io
const BROWSERLESS_TOKEN = '2Ts0BhFjxHOLOZU79df0e7f109e57c054f04c0d09afd60319';
const BROWSERLESS_ENDPOINT = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&--window-size=1920,1080&--no-sandbox`;

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎯 EXTRAÇÃO COM LOGS: ${videoId}`);
  
  let browser;
  const ALL_LOGS = [];
  
  const log = (message, type = 'info') => {
    const entry = { timestamp: new Date().toISOString(), message, type };
    ALL_LOGS.push(entry);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };
  
  try {
    log('1. Conectando ao Browserless...');
    browser = await puppeteer.connect({
      browserWSEndpoint: BROWSERLESS_ENDPOINT,
      defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    // Capturar console da página
    page.on('console', msg => {
      const text = msg.text();
      log(`CONSOLE: ${text}`, 'console');
    });
    
    // Navegar
    log(`2. Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    log('3. Página carregada');
    
    // Analisar a página
    log('4. Analisando elementos...');
    const pageAnalysis = await page.evaluate(() => {
      const analysis = {};
      
      // Elementos importantes
      analysis.elements = {
        playerButton: document.querySelector('#player-button'),
        playerButtonContainer: document.querySelector('#player-button-container'),
        jwplayerElements: document.querySelectorAll('.jwplayer, [class*="jw-"]').length,
        videoElements: document.querySelectorAll('video').length,
        bodyContent: document.body.innerHTML.length
      };
      
      // JW Player
      analysis.jwplayer = {
        exists: typeof jwplayer === 'function',
        type: typeof jwplayer
      };
      
      if (analysis.jwplayer.exists) {
        try {
          const player = jwplayer();
          analysis.jwplayer.player = !!player;
          
          if (player) {
            analysis.jwplayer.methods = Object.getOwnPropertyNames(player)
              .filter(k => typeof player[k] === 'function');
            
            console.log('Métodos JW Player:', analysis.jwplayer.methods);
          }
        } catch (e) {
          analysis.jwplayer.error = e.message;
        }
      }
      
      // Estado da página
      analysis.pageState = {
        title: document.title,
        url: window.location.href,
        readyState: document.readyState
      };
      
      return analysis;
    });
    
    log(`📊 Análise: Botão existe: ${!!pageAnalysis.elements.playerButton}`);
    log(`📊 Análise: JW Player existe: ${pageAnalysis.jwplayer.exists}`);
    log(`📊 Análise: Métodos JW Player: ${pageAnalysis.jwplayer.methods ? pageAnalysis.jwplayer.methods.length : 0}`);
    
    // Tentar clicar mesmo se o botão não existir
    log('5. Tentando interação com a página...');
    
    // Primeiro, verificar o conteúdo real da página
    const pageContent = await page.content();
    const hasHeadlessMessage = pageContent.includes('Headless Browser is not allowed');
    const hasPlayerButton = pageContent.includes('player-button');
    
    log(`🔍 Headless detectado: ${hasHeadlessMessage ? 'SIM' : 'NÃO'}`);
    log(`🔍 player-button no HTML: ${hasPlayerButton ? 'SIM' : 'NÃO'}`);
    
    // Se detectou headless, o site está bloqueando
    if (hasHeadlessMessage) {
      log('❌ Site está bloqueando navegador headless', 'error');
      
      // Pegar mais informações
      const blockedInfo = await page.evaluate(() => {
        return {
          title: document.title,
          bodyText: document.body.textContent.substring(0, 500),
          bodyChildren: document.body.children.length
        };
      });
      
      log(`📄 Título: ${blockedInfo.title}`);
      log(`📄 Conteúdo (500 chars): ${blockedInfo.bodyText}`);
      
      throw new Error('SITE BLOQUEADO: Headless Browser is not allowed');
    }
    
    // Tentar cliques diferentes
    log('6. Tentando cliques...');
    const clickAttempts = [];
    
    // Tentativa 1: #player-button
    try {
      await page.click('#player-button');
      clickAttempts.push({ selector: '#player-button', success: true });
      log('✅ Clique em #player-button');
    } catch (e) {
      clickAttempts.push({ selector: '#player-button', success: false, error: e.message });
      log(`❌ Clique #player-button: ${e.message}`);
    }
    
    // Tentativa 2: Qualquer botão
    try {
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"], [onclick]');
        buttons.forEach(btn => {
          try {
            btn.click();
            console.log('Clicado em:', btn.tagName, btn.className);
          } catch (e) {}
        });
      });
      log('✅ Clique em botões genéricos');
    } catch (e) {
      log(`❌ Clique genérico: ${e.message}`);
    }
    
    // Aguardar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Executar comandos do console
    log('7. Executando comandos do console...');
    
    const extractionResult = await page.evaluate(() => {
      console.log('=== INICIANDO EXTRAÇÃO ===');
      
      const result = { attempts: [] };
      
      // Verificar JW Player
      if (typeof jwplayer !== 'function') {
        console.log('❌ jwplayer não é função');
        result.error = 'jwplayer não disponível';
        return result;
      }
      
      try {
        const player = jwplayer();
        console.log('✅ jwplayer() acessado');
        
        // Método 1: getPlaylist
        if (typeof player.getPlaylist === 'function') {
          console.log('Tentando getPlaylist()...');
          try {
            const playlist = player.getPlaylist();
            console.log('getPlaylist resultado:', playlist);
            
            if (playlist && playlist[0]) {
              const url = playlist[0].file || 
                         (playlist[0].sources && playlist[0].sources[0] && playlist[0].sources[0].file);
              
              if (url) {
                result.success = true;
                result.url = url;
                result.method = 'getPlaylist';
                console.log('✅ URL via getPlaylist:', url);
                return result;
              }
            }
          } catch (e) {
            console.log('❌ getPlaylist erro:', e.message);
          }
        }
        
        // Método 2: getConfig
        if (typeof player.getConfig === 'function') {
          console.log('Tentando getConfig()...');
          try {
            const config = player.getConfig();
            console.log('getConfig resultado:', config);
            
            if (config && config.playlist && config.playlist[0]) {
              const url = config.playlist[0].file || 
                         (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
              
              if (url) {
                result.success = true;
                result.url = url;
                result.method = 'getConfig';
                console.log('✅ URL via getConfig:', url);
                return result;
              }
            }
          } catch (e) {
            console.log('❌ getConfig erro:', e.message);
          }
        }
        
        console.log('❌ Todos os métodos falharam');
        result.error = 'Nenhum método funcionou';
        
      } catch (e) {
        console.log('💥 Erro geral:', e.message);
        result.error = e.message;
      }
      
      return result;
    });
    
    log(`📊 Resultado extração: ${extractionResult.success ? 'SUCESSO' : 'FALHA'}`);
    
    await browser.disconnect();
    
    if (extractionResult.success) {
      log(`🎉 URL EXTRAÍDA: ${extractionResult.url}`, 'success');
      
      res.json({
        success: true,
        videoId: videoId,
        url: extractionResult.url,
        method: extractionResult.method,
        extractedAt: new Date().toISOString(),
        logs: ALL_LOGS,
        pageAnalysis: pageAnalysis,
        clickAttempts: clickAttempts,
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
    } else {
      // Capturar estado final da página
      const finalState = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyHTML: document.body.innerHTML.substring(0, 1000),
          jwplayerStatus: typeof jwplayer
        };
      });
      
      log(`❌ FALHA: ${extractionResult.error}`, 'error');
      
      throw new Error(
        `EXTRAÇÃO FALHOU:\n` +
        `- Erro: ${extractionResult.error}\n` +
        `- JW Player status: ${finalState.jwplayerStatus}\n` +
        `- Botão no HTML: ${hasPlayerButton ? 'SIM' : 'NÃO'}\n` +
        `- Título: ${finalState.title}\n` +
        `- HTML (1000 chars): ${finalState.bodyHTML}`
      );
    }
    
  } catch (error) {
    log(`💥 ERRO FINAL: ${error.message}`, 'error');
    
    if (browser) {
      try {
        await browser.disconnect();
      } catch (e) {}
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      logs: ALL_LOGS,
      note: 'SEM FALLBACK - ERRO COMPLETO COM LOGS'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor com logs: http://localhost:${PORT}/extract?id=juscu`);
});
