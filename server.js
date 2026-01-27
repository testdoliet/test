const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// SEU TOKEN - Browserless.io
const BROWSERLESS_TOKEN = '2Ts0BhFjxHOLOZU79df0e7f109e57c054f04c0d09afd60319';
const BROWSERLESS_ENDPOINT = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&--window-size=1920,1080&--no-sandbox`;

// Função para criar painel de logs - executar ANTES de qualquer coisa
async function injectDebugScript(page) {
  await page.evaluateOnNewDocument(() => {
    // Injetar função debugLog GLOBALMENTE antes da página carregar
    window._debugLogs = [];
    
    window.debugLog = function(message, type = 'info') {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] ${message}`;
      
      // Armazenar localmente
      window._debugLogs.push({ time: timestamp, message, type });
      
      // Log no console também
      const consoleMethod = type === 'error' ? 'error' : 
                           type === 'success' ? 'log' : 'info';
      console[consoleMethod](`[DEBUG] ${message}`);
      
      // Se o painel já existir, atualizar
      if (window.debugPanel) {
        const logArea = document.getElementById('debug-logs');
        if (logArea) {
          const logElement = document.createElement('div');
          const color = type === 'error' ? '#f00' : 
                       type === 'success' ? '#0f0' : '#0ff';
          
          logElement.textContent = logEntry;
          logElement.style.cssText = `margin: 3px 0; padding: 2px; color: ${color}; 
                                     border-bottom: 1px solid #333; font-family: monospace;`;
          
          logArea.appendChild(logElement);
          logArea.scrollTop = logArea.scrollHeight;
          
          // Manter apenas últimos 50 logs
          if (logArea.children.length > 50) {
            logArea.removeChild(logArea.firstChild);
          }
        }
      }
    };
    
    // Função para criar o painel visual
    window.createDebugPanel = function() {
      if (window.debugPanel) return;
      
      const panel = document.createElement('div');
      panel.id = 'debug-panel';
      panel.style.cssText = `
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
      panel.appendChild(title);
      
      // Área de logs
      const logArea = document.createElement('div');
      logArea.id = 'debug-logs';
      panel.appendChild(logArea);
      
      document.body.appendChild(panel);
      window.debugPanel = panel;
      
      window.debugLog('✅ Painel de debug criado', 'success');
      
      // Adicionar logs anteriores
      if (window._debugLogs.length > 0) {
        window._debugLogs.forEach(log => {
          const logElement = document.createElement('div');
          const color = log.type === 'error' ? '#f00' : 
                       log.type === 'success' ? '#0f0' : '#0ff';
          
          logElement.textContent = `[${log.time}] ${log.message}`;
          logElement.style.cssText = `margin: 3px 0; padding: 2px; color: ${color}; 
                                     border-bottom: 1px solid #333; font-family: monospace;`;
          logArea.appendChild(logElement);
        });
      }
    };
    
    window.debugLog('🔧 Script de debug injetado', 'success');
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
    
    // 1. INJETAR SCRIPT DE DEBUG ANTES de navegar
    await injectDebugScript(page);
    
    // 2. Navegar
    console.log(`🌐 Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 3. CRIAR PAINEL VISÍVEL após a página carregar
    await page.evaluate(() => {
      window.createDebugPanel();
      window.debugLog('Página carregada com sucesso', 'success');
      window.debugLog(`URL: ${window.location.href}`);
    });
    
    console.log('✅ Página carregada');
    
    // 4. AGUARDAR um pouco
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. ANÁLISE INICIAL
    console.log('🔍 Analisando página...');
    const pageAnalysis = await page.evaluate(() => {
      window.debugLog('=== ANÁLISE INICIAL ===');
      
      const analysis = {
        button: null,
        jwplayer: null,
        timestamp: new Date().toISOString()
      };
      
      // Verificar botão
      analysis.button = document.querySelector('#player-button');
      analysis.buttonExists = !!analysis.button;
      
      if (analysis.buttonExists) {
        window.debugLog(`✅ #player-button encontrado`, 'success');
        window.debugLog(`Tag: ${analysis.button.tagName}, Classes: ${analysis.button.className}`);
        
        // Verificar visibilidade
        const rect = analysis.button.getBoundingClientRect();
        analysis.buttonVisible = rect.width > 0 && rect.height > 0;
        window.debugLog(`Visível: ${analysis.buttonVisible ? '✅' : '❌'}`);
      } else {
        window.debugLog('❌ #player-button NÃO encontrado', 'error');
      }
      
      // Verificar JW Player
      analysis.jwplayerType = typeof jwplayer;
      analysis.jwplayerIsFunction = analysis.jwplayerType === 'function';
      
      window.debugLog(`JW Player tipo: ${analysis.jwplayerType}`);
      
      if (analysis.jwplayerIsFunction) {
        try {
          const player = jwplayer();
          analysis.playerExists = !!player;
          
          if (player) {
            const methods = Object.getOwnPropertyNames(player)
              .filter(key => typeof player[key] === 'function');
            
            analysis.methods = methods;
            window.debugLog(`✅ JW Player instanciado`, 'success');
            window.debugLog(`Métodos disponíveis (${methods.length}): ${methods.join(', ')}`);
            
            // Verificar métodos específicos
            analysis.hasGetPlaylist = methods.includes('getPlaylist');
            analysis.hasGetConfig = methods.includes('getConfig');
            
            window.debugLog(`Tem getPlaylist: ${analysis.hasGetPlaylist ? '✅' : '❌'}`);
            window.debugLog(`Tem getConfig: ${analysis.hasGetConfig ? '✅' : '❌'}`);
          }
        } catch (e) {
          window.debugLog(`❌ Erro ao acessar jwplayer: ${e.message}`, 'error');
        }
      } else {
        window.debugLog('❌ JW Player não está disponível como função', 'error');
      }
      
      return analysis;
    });
    
    console.log('📊 Análise:', pageAnalysis);
    
    // 6. EXECUTAR CLIQUE
    console.log('🖱️ Executando clique...');
    
    const clickResult = await page.evaluate((analysis) => {
      window.debugLog('=== EXECUTANDO CLIQUE ===');
      
      const result = { success: false };
      
      if (!analysis.buttonExists) {
        window.debugLog('❌ Não é possível clicar - botão não existe', 'error');
        return result;
      }
      
      try {
        const button = document.querySelector('#player-button');
        window.debugLog('Clicando em #player-button...');
        
        // Primeiro focar
        button.focus();
        window.debugLog('✅ Foco aplicado');
        
        // Clique normal
        button.click();
        window.debugLog('✅ Click() executado');
        
        // Eventos de mouse para ser mais realista
        ['mousedown', 'mouseup'].forEach(eventType => {
          button.dispatchEvent(new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            view: window
          }));
        });
        
        window.debugLog('✅ Eventos de mouse disparados', 'success');
        result.success = true;
        
      } catch (e) {
        window.debugLog(`❌ Erro no clique: ${e.message}`, 'error');
        result.error = e.message;
      }
      
      return result;
    }, pageAnalysis);
    
    console.log(`Clique: ${clickResult.success ? '✅' : '❌'}`);
    
    // 7. AGUARDAR APÓS CLIQUE
    await page.evaluate(() => {
      window.debugLog('Aguardando 3 segundos após clique...');
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 8. EXECUTAR COMANDOS DO JW PLAYER
    console.log('💻 Executando jwplayer().getPlaylist()...');
    
    const extractionResult = await page.evaluate(() => {
      window.debugLog('=== EXECUTANDO COMANDOS DO CONSOLE ===');
      
      const result = { success: false, attempts: [] };
      
      // Verificar se jwplayer está disponível
      if (typeof jwplayer !== 'function') {
        window.debugLog('❌ jwplayer não é uma função', 'error');
        result.error = 'jwplayer não disponível';
        return result;
      }
      
      try {
        const player = jwplayer();
        window.debugLog('✅ jwplayer() acessado', 'success');
        
        // TENTATIVA 1: getPlaylist()
        if (typeof player.getPlaylist === 'function') {
          window.debugLog('📋 Tentando: jwplayer().getPlaylist()');
          
          try {
            const playlist = player.getPlaylist();
            result.attempts.push({ method: 'getPlaylist', success: true, data: playlist });
            window.debugLog(`✅ getPlaylist() executado`, 'success');
            
            if (playlist && playlist[0]) {
              window.debugLog(`📦 Playlist com ${playlist.length} itens`, 'success');
              
              const item = playlist[0];
              window.debugLog(`Item 0: ${JSON.stringify(item).substring(0, 150)}...`);
              
              // Extrair URL
              let url = null;
              if (item.file) {
                url = item.file;
                window.debugLog(`🎯 URL via item.file: ${url}`, 'success');
              } else if (item.sources && item.sources[0] && item.sources[0].file) {
                url = item.sources[0].file;
                window.debugLog(`🎯 URL via item.sources[0].file: ${url}`, 'success');
              }
              
              if (url) {
                result.success = true;
                result.url = url;
                result.method = 'getPlaylist';
                window.debugLog(`🎉 URL EXTRAÍDA COM SUCESSO!`, 'success');
                return result;
              } else {
                window.debugLog('❌ URL não encontrada no item da playlist', 'error');
              }
            } else {
              window.debugLog('❌ Playlist vazia ou inválida', 'error');
            }
          } catch (e) {
            result.attempts.push({ method: 'getPlaylist', success: false, error: e.message });
            window.debugLog(`❌ getPlaylist() erro: ${e.message}`, 'error');
          }
        } else {
          window.debugLog('❌ getPlaylist() não está disponível', 'error');
        }
        
        // TENTATIVA 2: getConfig()
        if (typeof player.getConfig === 'function') {
          window.debugLog('📋 Tentando: jwplayer().getConfig()');
          
          try {
            const config = player.getConfig();
            result.attempts.push({ method: 'getConfig', success: true, data: config });
            window.debugLog(`✅ getConfig() executado`, 'success');
            
            if (config && config.playlist && config.playlist[0]) {
              const item = config.playlist[0];
              const url = item.file || (item.sources && item.sources[0] && item.sources[0].file);
              
              if (url) {
                result.success = true;
                result.url = url;
                result.method = 'getConfig';
                window.debugLog(`🎯 URL via getConfig: ${url}`, 'success');
                return result;
              }
            } else {
              window.debugLog('❌ Config playlist vazia ou inválida', 'error');
            }
          } catch (e) {
            result.attempts.push({ method: 'getConfig', success: false, error: e.message });
            window.debugLog(`❌ getConfig() erro: ${e.message}`, 'error');
          }
        } else {
          window.debugLog('❌ getConfig() não está disponível', 'error');
        }
        
        // TENTATIVA 3: getPlaylistItem()
        if (typeof player.getPlaylistItem === 'function') {
          window.debugLog('📋 Tentando: jwplayer().getPlaylistItem()');
          
          try {
            const playlistItem = player.getPlaylistItem();
            result.attempts.push({ method: 'getPlaylistItem', success: true, data: playlistItem });
            window.debugLog(`✅ getPlaylistItem() executado`, 'success');
            
            if (playlistItem) {
              const url = playlistItem.file || 
                         (playlistItem.sources && playlistItem.sources[0] && playlistItem.sources[0].file);
              
              if (url) {
                result.success = true;
                result.url = url;
                result.method = 'getPlaylistItem';
                window.debugLog(`🎯 URL via getPlaylistItem: ${url}`, 'success');
                return result;
              }
            }
          } catch (e) {
            result.attempts.push({ method: 'getPlaylistItem', success: false, error: e.message });
            window.debugLog(`❌ getPlaylistItem() erro: ${e.message}`, 'error');
          }
        }
        
        // Se chegou aqui, todos os métodos falharam
        window.debugLog('💥 TODOS OS MÉTODOS FALHARAM!', 'error');
        result.error = 'Todos os métodos de extração falharam';
        
      } catch (e) {
        window.debugLog(`💥 ERRO GERAL: ${e.message}`, 'error');
        result.error = e.message;
      }
      
      return result;
    });
    
    console.log('📊 Resultado:', extractionResult);
    
    // 9. CAPTURAR LOGS
    const debugLogs = await page.evaluate(() => {
      return window._debugLogs || [];
    });
    
    // 10. CAPTURAR ESTADO FINAL
    const finalState = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        jwplayerType: typeof jwplayer,
        buttonExists: !!document.querySelector('#player-button'),
        debugLogsCount: window._debugLogs ? window._debugLogs.length : 0
      };
    });
    
    await browser.disconnect();
    
    if (extractionResult.success) {
      console.log(`🎉 SUCESSO! URL: ${extractionResult.url}`);
      
      return {
        success: true,
        videoId: videoId,
        url: extractionResult.url,
        method: extractionResult.method,
        debugLogs: debugLogs,
        pageAnalysis: pageAnalysis,
        extractionResult: extractionResult,
        finalState: finalState
      };
    } else {
      console.log(`❌ FALHA: ${extractionResult.error}`);
      
      throw new Error(
        `EXTRAÇÃO FALHOU:\n` +
        `- Erro: ${extractionResult.error}\n` +
        `- JW Player: ${finalState.jwplayerType}\n` +
        `- Botão: ${finalState.buttonExists ? 'Existe' : 'Não existe'}\n` +
        `- Tentativas: ${JSON.stringify(extractionResult.attempts)}\n` +
        `- Logs: ${debugLogs.length} entradas`
      );
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
    message: 'Extrator SEM FALLBACK com logs visíveis',
    endpoint: '/extract?id=VIDEO_ID',
    example: '/extract?id=juscu',
    warning: 'SEM FALLBACK - apenas sucesso ou erro'
  });
});

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🔥 EXTRAÇÃO SEM FALLBACK: ${videoId}`);
  
  try {
    const result = await extractVideoUrl(videoId);
    
    console.log(`✅ EXTRAÇÃO CONCLUÍDA COM SUCESSO!`);
    
    res.json({
      success: true,
      videoId: videoId,
      url: result.url,
      method: result.method,
      extractedAt: new Date().toISOString(),
      debugLogs: result.debugLogs.slice(-20), // últimos 20 logs
      attempts: result.extractionResult?.attempts || [],
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com'
      }
    });
    
  } catch (error) {
    console.error(`💥 ERRO DEFINITIVO: ${error.message}`);
    
    // SEM FALLBACK - apenas erro detalhado
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'EXTRAÇÃO FALHOU - SEM FALLBACK',
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  console.log(`🔗 Teste: http://localhost:${PORT}/extract?id=juscu`);
});
