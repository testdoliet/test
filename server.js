const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// SEU TOKEN - Browserless.io
const BROWSERLESS_TOKEN = '2Ts0BhFjxHOLOZU79df0e7f109e57c054f04c0d09afd60319';
const BROWSERLESS_ENDPOINT = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&--window-size=1920,1080&--no-sandbox`;

// Função para criar painel de logs VISÍVEL na página
async function createDebugPanel(page) {
  await page.evaluate(() => {
    // Criar painel de debug
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.9);
      color: #0f0;
      padding: 15px;
      z-index: 999999;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      border: 2px solid #0f0;
      border-radius: 5px;
      max-width: 500px;
      max-height: 400px;
      overflow: auto;
      box-shadow: 0 0 20px #0f0;
    `;
    
    // Título
    const title = document.createElement('div');
    title.textContent = '=== DEBUG CONSOLE ===';
    title.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #fff;';
    debugPanel.appendChild(title);
    
    // Área de logs
    const logArea = document.createElement('div');
    logArea.id = 'debug-logs';
    debugPanel.appendChild(logArea);
    
    document.body.appendChild(debugPanel);
    
    // Função para adicionar logs
    window.debugLog = function(message, type = 'info') {
      const logEntry = document.createElement('div');
      const timestamp = new Date().toLocaleTimeString();
      const color = type === 'error' ? '#f00' : type === 'success' ? '#0f0' : '#0ff';
      
      logEntry.textContent = `[${timestamp}] ${message}`;
      logEntry.style.cssText = `margin: 3px 0; padding: 2px; color: ${color}; border-bottom: 1px solid #333;`;
      logEntry.style.fontFamily = "'Courier New', monospace";
      
      logArea.appendChild(logEntry);
      logArea.scrollTop = logArea.scrollHeight;
      
      // Manter apenas últimos 50 logs
      if (logArea.children.length > 50) {
        logArea.removeChild(logArea.firstChild);
      }
      
      console.log(`[DEBUG] ${message}`);
    };
    
    window.debugLog('Painel de debug iniciado');
  });
}

// Extração SEM FALLBACK
async function extractVideoUrl(videoId) {
  console.log(`\n🎯 EXTRAÇÃO SEM FALLBACK: ${videoId}`);
  
  let browser;
  try {
    // Conectar ao Browserless
    console.log('🔗 Conectando ao Browserless...');
    browser = await puppeteer.connect({
      browserWSEndpoint: BROWSERLESS_ENDPOINT,
      defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    // Criar painel de debug VISÍVEL
    await createDebugPanel(page);
    
    // Headers
    await page.setExtraHTTPHeaders({
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    // Navegar
    console.log(`🌐 Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.evaluate(() => {
      window.debugLog(`Navegando para: ${window.location.href}`);
    });
    
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Página carregada');
    await page.evaluate(() => {
      window.debugLog('Página carregada com sucesso', 'success');
    });
    
    // 🔴 PASSO 1: ANÁLISE DA PÁGINA
    console.log('🔍 Analisando página...');
    const pageAnalysis = await page.evaluate(() => {
      window.debugLog('=== ANÁLISE INICIAL ===');
      
      const analysis = {};
      
      // 1. Botão de play
      analysis.button = document.querySelector('#player-button');
      analysis.buttonExists = !!analysis.button;
      analysis.buttonInfo = analysis.button ? {
        tagName: analysis.button.tagName,
        className: analysis.button.className,
        innerHTML: analysis.button.innerHTML,
        isVisible: analysis.button.offsetWidth > 0 && analysis.button.offsetHeight > 0
      } : null;
      
      window.debugLog(`#player-button existe: ${analysis.buttonExists}`);
      if (analysis.buttonExists) {
        window.debugLog(`Botão info: ${JSON.stringify(analysis.buttonInfo)}`);
      }
      
      // 2. JW Player
      analysis.jwplayer = typeof jwplayer;
      analysis.jwplayerIsFunction = analysis.jwplayer === 'function';
      
      window.debugLog(`JW Player tipo: ${analysis.jwplayer}`);
      window.debugLog(`JW Player é função: ${analysis.jwplayerIsFunction}`);
      
      if (analysis.jwplayerIsFunction) {
        try {
          const player = jwplayer();
          analysis.player = player;
          analysis.playerExists = !!player;
          
          if (player) {
            analysis.methods = Object.getOwnPropertyNames(player)
              .filter(key => typeof player[key] === 'function');
            
            window.debugLog(`Métodos disponíveis: ${analysis.methods.length}`);
            window.debugLog(`Métodos: ${analysis.methods.join(', ')}`);
            
            // Verificar getPlaylist e getConfig especificamente
            analysis.hasGetPlaylist = analysis.methods.includes('getPlaylist');
            analysis.hasGetConfig = analysis.methods.includes('getConfig');
            
            window.debugLog(`Tem getPlaylist: ${analysis.hasGetPlaylist}`);
            window.debugLog(`Tem getConfig: ${analysis.hasGetConfig}`);
          }
        } catch (e) {
          window.debugLog(`Erro ao acessar jwplayer: ${e.message}`, 'error');
        }
      }
      
      return analysis;
    });
    
    console.log('📊 Análise inicial:', pageAnalysis);
    
    // 🔴 PASSO 2: CLIQUE NO BOTÃO
    console.log('🖱️ Executando clique...');
    
    await page.evaluate((analysis) => {
      window.debugLog('=== EXECUTANDO CLIQUE ===');
      
      if (!analysis.buttonExists) {
        window.debugLog('❌ Botão não existe para clique', 'error');
        return;
      }
      
      try {
        const button = document.querySelector('#player-button');
        window.debugLog('Clicando em #player-button...');
        
        // Clique completo
        button.focus();
        button.click();
        
        // Eventos adicionais
        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
          button.dispatchEvent(new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            view: window
          }));
        });
        
        window.debugLog('✅ Clique realizado com sucesso', 'success');
        
      } catch (e) {
        window.debugLog(`❌ Erro no clique: ${e.message}`, 'error');
      }
    }, pageAnalysis);
    
    // Aguardar
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.evaluate(() => {
      window.debugLog('Aguardou 3 segundos após clique');
    });
    
    // 🔴 PASSO 3: EXECUTAR COMANDOS DO JW PLAYER
    console.log('💻 Executando comandos do JW Player...');
    
    const extractionResult = await page.evaluate(() => {
      window.debugLog('=== EXECUTANDO COMANDOS JW PLAYER ===');
      
      const result = { success: false, logs: [] };
      
      if (typeof jwplayer !== 'function') {
        window.debugLog('❌ jwplayer não é uma função', 'error');
        result.error = 'jwplayer não disponível';
        return result;
      }
      
      try {
        const player = jwplayer();
        window.debugLog('✅ jwplayer() acessado', 'success');
        
        // Tentar getPlaylist
        if (typeof player.getPlaylist === 'function') {
          window.debugLog('📋 Executando jwplayer().getPlaylist()...');
          
          try {
            const playlist = player.getPlaylist();
            window.debugLog(`✅ getPlaylist() executado - Itens: ${playlist ? playlist.length : 0}`, 'success');
            
            if (playlist && playlist[0]) {
              window.debugLog('🎯 Playlist item encontrado', 'success');
              
              const item = playlist[0];
              window.debugLog(`Item: ${JSON.stringify(item).substring(0, 200)}...`);
              
              // Extrair URL
              let url = null;
              if (item.file) {
                url = item.file;
                window.debugLog(`✅ URL via item.file: ${url}`, 'success');
              } else if (item.sources && item.sources[0] && item.sources[0].file) {
                url = item.sources[0].file;
                window.debugLog(`✅ URL via item.sources[0].file: ${url}`, 'success');
              }
              
              if (url) {
                result.success = true;
                result.url = url;
                result.method = 'getPlaylist';
                window.debugLog(`🎉 URL EXTRAÍDA COM SUCESSO!`, 'success');
              } else {
                window.debugLog('❌ URL não encontrada no playlist item', 'error');
              }
            } else {
              window.debugLog('❌ Playlist vazia ou inválida', 'error');
            }
          } catch (e) {
            window.debugLog(`❌ getPlaylist() erro: ${e.message}`, 'error');
          }
        } else {
          window.debugLog('❌ getPlaylist() não disponível', 'error');
        }
        
        // Se não conseguiu, tentar getConfig
        if (!result.success && typeof player.getConfig === 'function') {
          window.debugLog('📋 Tentando jwplayer().getConfig()...');
          
          try {
            const config = player.getConfig();
            window.debugLog('✅ getConfig() executado', 'success');
            
            if (config && config.playlist && config.playlist[0]) {
              const item = config.playlist[0];
              const url = item.file || (item.sources && item.sources[0] && item.sources[0].file);
              
              if (url) {
                result.success = true;
                result.url = url;
                result.method = 'getConfig';
                window.debugLog(`🎉 URL via getConfig: ${url}`, 'success');
              }
            }
          } catch (e) {
            window.debugLog(`❌ getConfig() erro: ${e.message}`, 'error');
          }
        }
        
        if (!result.success) {
          window.debugLog('❌ NENHUM MÉTODO FUNCIONOU!', 'error');
          result.error = 'Todos os métodos falharam';
        }
        
      } catch (e) {
        window.debugLog(`💥 ERRO GERAL: ${e.message}`, 'error');
        result.error = e.message;
      }
      
      return result;
    });
    
    console.log('📊 Resultado da extração:', extractionResult);
    
    // 🔴 PASSO 4: CAPTURAR LOGS DO PAINEL
    const debugLogs = await page.evaluate(() => {
      const logs = [];
      const logElements = document.querySelectorAll('#debug-logs div');
      logElements.forEach(el => logs.push(el.textContent));
      return logs;
    });
    
    // Tirar screenshot do painel de debug (opcional)
    // await page.screenshot({ path: 'debug-panel.png', clip: { x: window.innerWidth - 520, y: 10, width: 500, height: 400 } });
    
    await browser.disconnect();
    
    if (extractionResult.success) {
      console.log(`🎉 SUCESSO DEFINITIVO! URL: ${extractionResult.url}`);
      
      return {
        success: true,
        videoId: videoId,
        url: extractionResult.url,
        method: extractionResult.method,
        debugLogs: debugLogs,
        pageAnalysis: pageAnalysis,
        extractionResult: extractionResult
      };
    } else {
      console.log(`❌ FALHA DEFINITIVA: ${extractionResult.error}`);
      
      // CAPTURAR ERRO COMPLETO
      const errorPage = await page.evaluate(() => {
        return {
          html: document.documentElement.outerHTML.substring(0, 5000),
          title: document.title,
          url: window.location.href,
          jwplayerStatus: typeof jwplayer,
          buttonExists: !!document.querySelector('#player-button')
        };
      });
      
      throw new Error(`EXTRAÇÃO FALHOU: ${extractionResult.error}\n` +
                     `JW Player: ${errorPage.jwplayerStatus}\n` +
                     `Botão: ${errorPage.buttonExists}\n` +
                     `Página: ${errorPage.title}`);
    }
    
  } catch (error) {
    if (browser) {
      try {
        await browser.disconnect();
      } catch (e) {}
    }
    throw error;
  }
}

// Rotas
app.get('/', (req, res) => {
  res.json({
    message: 'Extrator DEFINITIVO - SEM FALLBACK',
    endpoint: '/extract?id=VIDEO_ID',
    example: '/extract?id=juscu',
    warning: 'NÃO TEM FALLBACK - ou funciona ou ERRO'
  });
});

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🔥 INICIANDO EXTRAÇÃO DEFINITIVA SEM FALLBACK: ${videoId}`);
  
  try {
    const result = await extractVideoUrl(videoId);
    
    console.log(`✅ EXTRAÇÃO BEM-SUCEDIDA!`);
    
    res.json({
      success: true,
      videoId: videoId,
      url: result.url,
      method: result.method,
      extractedAt: new Date().toISOString(),
      debugLogs: result.debugLogs,
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com'
      }
    });
    
  } catch (error) {
    console.error(`💥 ERRO DEFINITIVO: ${error.message}`);
    
    // SEM FALLBACK - só erro
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'EXTRAÇÃO FALHOU - SEM FALLBACK'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 EXTRATOR DEFINITIVO SEM FALLBACK: http://localhost:${PORT}`);
  console.log(`🔗 Teste: http://localhost:${PORT}/extract?id=juscu`);
  console.log(`⚠️  ATENÇÃO: NÃO HÁ FALLBACK - ERRO SE FALHAR`);
});
