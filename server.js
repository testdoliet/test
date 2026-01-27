// server.js - COM LOGS VISÍVEIS NA PÁGINA
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para fazer screenshots (debug)
async function takeScreenshot(page, name) {
  await page.screenshot({ path: `debug-${name}-${Date.now()}.png` });
}

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🔍 DEBUG COMPLETO PARA: ${videoId}`);
  
  let browser = null;
  const pageLogs = []; // Logs que aparecem NA PÁGINA
  
  try {
    browser = await puppeteer.launch({
      headless: false, // HEADLESS FALSE para VER a página!
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1200,800']
    });
    
    const page = await browser.newPage();
    
    // Capturar console.log da página
    page.on('console', msg => {
      console.log(`🖥️ PÁGINA DIZ: ${msg.text()}`);
      pageLogs.push(msg.text());
    });
    
    // Ir para a página
    console.log(`🌐 Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // 1. INJETAR um painel de debug VISÍVEL na página
    await page.evaluate(() => {
      // Criar painel de debug
      const debugPanel = document.createElement('div');
      debugPanel.id = 'debug-panel';
      debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 15px;
        z-index: 999999;
        font-family: monospace;
        font-size: 12px;
        border-radius: 5px;
        max-width: 400px;
        max-height: 300px;
        overflow: auto;
      `;
      document.body.appendChild(debugPanel);
      
      // Função para adicionar logs ao painel
      window.addDebugLog = function(text) {
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        logEntry.style.cssText = 'margin: 5px 0; padding: 2px; border-bottom: 1px solid #444;';
        debugPanel.appendChild(logEntry);
        console.log(`[DEBUG] ${text}`);
      };
      
      window.addDebugLog('Painel de debug iniciado');
    });
    
    await delay(5000);
    
    // 2. VERIFICAR ELEMENTOS NA PÁGINA
    console.log('🔎 Verificando elementos na página...');
    
    const pageInfo = await page.evaluate(() => {
      window.addDebugLog('=== VERIFICAÇÃO INICIAL ===');
      
      const info = {};
      
      // Verificar #player-button
      const playButton = document.querySelector('#player-button');
      info.playButton = {
        exists: !!playButton,
        tagName: playButton ? playButton.tagName : null,
        className: playButton ? playButton.className : null,
        isVisible: playButton ? (playButton.offsetWidth > 0 && playButton.offsetHeight > 0) : false,
        isClickable: playButton ? !playButton.disabled && !playButton.style.pointerEvents : false
      };
      
      window.addDebugLog(`#player-button existe: ${info.playButton.exists}`);
      window.addDebugLog(`#player-button visível: ${info.playButton.isVisible}`);
      window.addDebugLog(`#player-button clicável: ${info.playButton.isClickable}`);
      
      // Verificar JW Player
      info.jwplayer = {
        exists: typeof jwplayer === 'function',
        version: typeof jwplayer === 'function' ? jwplayer.version || 'desconhecida' : null
      };
      
      window.addDebugLog(`jwplayer existe: ${info.jwplayer.exists}`);
      window.addDebugLog(`jwplayer versão: ${info.jwplayer.version}`);
      
      // Verificar elementos de vídeo
      info.videoElements = document.querySelectorAll('video').length;
      window.addDebugLog(`Elementos <video>: ${info.videoElements}`);
      
      return info;
    });
    
    console.log('📊 Info da página:', JSON.stringify(pageInfo, null, 2));
    
    // 3. TENTAR CLIQUE DE DIFERENTES FORMAS
    console.log('🖱️ Tentando clique em #player-button...');
    
    const clickMethods = [
      // Método 1: Click simples
      async () => {
        await page.evaluate(() => {
          window.addDebugLog('=== TENTATIVA 1: click() simples ===');
          const btn = document.querySelector('#player-button');
          if (btn) btn.click();
        });
      },
      
      // Método 2: Eventos de mouse
      async () => {
        await page.evaluate(() => {
          window.addDebugLog('=== TENTATIVA 2: Eventos de mouse ===');
          const btn = document.querySelector('#player-button');
          if (btn) {
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        });
      },
      
      // Método 3: Via JavaScript direto
      async () => {
        await page.evaluate(() => {
          window.addDebugLog('=== TENTATIVA 3: element.click() ===');
          const btn = document.querySelector('#player-button');
          if (btn) {
            btn.click();
            // Forçar foco também
            btn.focus();
          }
        });
      },
      
      // Método 4: Via jwplayer.play() se disponível
      async () => {
        await page.evaluate(() => {
          window.addDebugLog('=== TENTATIVA 4: jwplayer().play() ===');
          if (typeof jwplayer === 'function') {
            try {
              jwplayer().play();
            } catch (e) {
              window.addDebugLog(`Erro jwplayer.play(): ${e.message}`);
            }
          }
        });
      }
    ];
    
    // Executar todos os métodos de clique
    for (let i = 0; i < clickMethods.length; i++) {
      console.log(`🔄 Tentando método ${i + 1}...`);
      await clickMethods[i]();
      await delay(1000);
    }
    
    await delay(3000);
    
    // 4. VERIFICAR ESTADO APÓS CLIQUE
    console.log('🔍 Verificando estado após clique...');
    
    const postClickState = await page.evaluate(() => {
      window.addDebugLog('=== ESTADO APÓS CLIQUE ===');
      
      const state = {};
      
      // Verificar jwplayer novamente
      if (typeof jwplayer === 'function') {
        try {
          const player = jwplayer();
          state.player = player;
          state.playerMethods = Object.keys(player).filter(k => typeof player[k] === 'function');
          state.playerProps = Object.keys(player).filter(k => typeof player[k] !== 'function');
          
          window.addDebugLog(`Métodos do player: ${state.playerMethods.join(', ')}`);
          window.addDebugLog(`Propriedades do player: ${state.playerProps.join(', ')}`);
          
          // Tentar getPlaylist
          try {
            state.playlist = player.getPlaylist();
            window.addDebugLog(`getPlaylist funcionou! Itens: ${state.playlist ? state.playlist.length : 0}`);
          } catch (e) {
            window.addDebugLog(`getPlaylist falhou: ${e.message}`);
          }
          
          // Tentar getConfig
          try {
            state.config = player.getConfig();
            window.addDebugLog(`getConfig funcionou!`);
          } catch (e) {
            window.addDebugLog(`getConfig falhou: ${e.message}`);
          }
          
        } catch (e) {
          window.addDebugLog(`Erro ao acessar jwplayer(): ${e.message}`);
        }
      }
      
      return state;
    });
    
    console.log('📊 Estado pós-clique:', JSON.stringify({
      playerMethods: postClickState.playerMethods,
      playerProps: postClickState.playerProps
    }, null, 2));
    
    // 5. TENTAR EXTRAIR URL DE TODAS AS FORMAS POSSÍVEIS
    console.log('🎯 Tentando extrair URL...');
    
    const extractionResult = await page.evaluate(() => {
      window.addDebugLog('=== TENTANDO EXTRAIR URL ===');
      
      const result = { attempts: [] };
      
      // Tentativa 1: Via getPlaylist
      if (typeof jwplayer === 'function') {
        const player = jwplayer();
        
        // Método A: getPlaylist
        try {
          const playlist = player.getPlaylist();
          if (playlist && playlist[0]) {
            const url = playlist[0].file || (playlist[0].sources && playlist[0].sources[0] && playlist[0].sources[0].file);
            if (url) {
              result.attempts.push({ method: 'getPlaylist', success: true, url: url });
              window.addDebugLog(`✅ URL via getPlaylist: ${url.substring(0, 80)}...`);
              result.finalUrl = url;
            }
          }
        } catch (e) {
          result.attempts.push({ method: 'getPlaylist', success: false, error: e.message });
        }
        
        // Método B: getConfig
        try {
          const config = player.getConfig();
          if (config && config.playlist && config.playlist[0]) {
            const url = config.playlist[0].file || (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
            if (url && !result.finalUrl) {
              result.attempts.push({ method: 'getConfig', success: true, url: url });
              window.addDebugLog(`✅ URL via getConfig: ${url.substring(0, 80)}...`);
              result.finalUrl = url;
            }
          }
        } catch (e) {
          result.attempts.push({ method: 'getConfig', success: false, error: e.message });
        }
        
        // Método C: Propriedades internas
        try {
          if (player._playlist && !result.finalUrl) {
            const url = player._playlist[0] && (player._playlist[0].file || player._playlist[0].url);
            if (url) {
              result.attempts.push({ method: '_playlist', success: true, url: url });
              result.finalUrl = url;
            }
          }
        } catch (e) {}
      }
      
      // Tentativa 2: Procurar em elementos <video>
      const videos = document.querySelectorAll('video');
      videos.forEach((video, i) => {
        const src = video.src || video.currentSrc;
        if (src && src.includes('aesthorium') && !result.finalUrl) {
          result.attempts.push({ method: `video[${i}].src`, success: true, url: src });
          result.finalUrl = src;
        }
      });
      
      // Tentativa 3: Procurar em scripts
      const scripts = document.querySelectorAll('script');
      scripts.forEach((script, i) => {
        const content = script.textContent || script.innerHTML || '';
        const urlMatch = content.match(/https:\/\/[^\s"']*aesthorium[^\s"']*/);
        if (urlMatch && !result.finalUrl) {
          result.attempts.push({ method: `script[${i}]`, success: true, url: urlMatch[0] });
          result.finalUrl = urlMatch[0];
        }
      });
      
      window.addDebugLog(`=== RESULTADO: ${result.finalUrl ? 'SUCESSO' : 'FALHA'} ===`);
      if (result.finalUrl) {
        window.addDebugLog(`URL FINAL: ${result.finalUrl}`);
      }
      
      return result;
    });
    
    console.log('📊 Resultado da extração:', JSON.stringify(extractionResult.attempts, null, 2));
    
    // 6. RESULTADO FINAL
    if (extractionResult.finalUrl) {
      console.log(`🎉 URL ENCONTRADA: ${extractionResult.finalUrl}`);
      
      // Tirar screenshot final
      await takeScreenshot(page, 'final');
      
      await browser.close();
      
      res.json({
        success: true,
        videoId: videoId,
        url: extractionResult.finalUrl,
        extractionMethod: extractionResult.attempts.find(a => a.success)?.method,
        attempts: extractionResult.attempts,
        pageLogs: pageLogs,
        pageInfo: pageInfo,
        postClickState: {
          playerMethods: postClickState.playerMethods,
          playerProps: postClickState.playerProps
        },
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
      
    } else {
      // Tirar screenshot do erro
      await takeScreenshot(page, 'error');
      
      await browser.close();
      
      throw new Error(`Nenhum método de extração funcionou. Tentativas: ${JSON.stringify(extractionResult.attempts)}`);
    }
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      pageLogs: pageLogs,
      note: 'Com logs visíveis na página'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor com DEBUG VISÍVEL rodando: http://localhost:${PORT}/extract?id=juscu`);
  console.log(`👀 O navegador vai ABRIR VISÍVEL para você ver o que acontece!`);
  console.log(`📸 Screenshots serão salvas como debug-*.png`);
});
