// server.js - COM LOGS NO TERMINAL E RESPOSTA
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n=== EXECUTANDO PARA: ${videoId} ===`);
  
  let browser = null;
  const logs = [];
  
  const addLog = (msg) => {
    console.log(`📝 ${msg}`);
    logs.push(`${new Date().toISOString().split('T')[1].split('.')[0]} - ${msg}`);
  };
  
  try {
    // PASSO 1: Abrir navegador
    addLog('Abrindo navegador...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    addLog('✅ Navegador aberto');
    
    const page = await browser.newPage();
    
    // Headers
    await page.setExtraHTTPHeaders({
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com'
    });
    
    // PASSO 2: Navegar
    addLog(`Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    addLog('✅ Página carregada');
    
    // Aguardar
    await delay(3000);
    addLog('Aguardou 3 segundos');
    
    // PASSO 3: Tentar clicar
    addLog('Tentando clicar em #player-button...');
    const clickResult = await page.evaluate(() => {
      try {
        const button = document.querySelector('#player-button');
        if (button) {
          button.click();
          return { success: true, message: 'Clicou' };
        }
        return { success: false, message: 'Botão não encontrado' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    });
    
    addLog(`Clique: ${clickResult.success ? '✅' : '❌'} ${clickResult.message}`);
    
    await delay(2000);
    addLog('Aguardou 2 segundos após clique');
    
    // PASSO 4: Verificar jwplayer
    addLog('Verificando jwplayer...');
    const playerInfo = await page.evaluate(() => {
      const info = {};
      
      // Verificar se jwplayer existe
      info.jwplayerExists = typeof jwplayer === 'function';
      
      if (info.jwplayerExists) {
        try {
          const player = jwplayer();
          info.playerExists = !!player;
          
          if (player) {
            // Tentar todos os métodos
            const methods = ['getPlaylist', 'getConfig', 'getPlaylistItem', 'getState', 'getContainer'];
            methods.forEach(method => {
              try {
                info[method] = player[method]();
              } catch (e) {
                info[`${method}Error`] = e.message;
              }
            });
            
            // Verificar propriedades diretas
            try {
              info.playlist = player.getPlaylist();
              info.playlistLength = info.playlist ? info.playlist.length : 0;
              
              if (info.playlist && info.playlist[0]) {
                const item = info.playlist[0];
                info.itemHasFile = !!item.file;
                info.itemHasSources = !!(item.sources && item.sources.length > 0);
                
                if (item.sources && item.sources[0]) {
                  info.sourceHasFile = !!item.sources[0].file;
                }
              }
            } catch (e) {
              info.playlistError = e.message;
            }
          }
        } catch (e) {
          info.error = e.message;
        }
      }
      
      return info;
    });
    
    addLog(`JW Player existe: ${playerInfo.jwplayerExists ? '✅' : '❌'}`);
    addLog(`Player instanciado: ${playerInfo.playerExists ? '✅' : '❌'}`);
    addLog(`Playlist encontrada: ${playerInfo.playlistLength || 0} itens`);
    
    // PASSO 5: Extrair dados detalhados
    addLog('Extraindo dados detalhados...');
    const detailedData = await page.evaluate(() => {
      const data = {};
      
      if (typeof jwplayer === 'function') {
        try {
          const player = jwplayer();
          
          // getPlaylist() - SEU COMANDO
          try {
            data.playlist = player.getPlaylist();
            data.playlistJSON = JSON.stringify(player.getPlaylist());
          } catch (e) {
            data.playlistError = e.message;
          }
          
          // getConfig() - SEU OUTRO COMANDO
          try {
            data.config = player.getConfig();
          } catch (e) {
            data.configError = e.message;
          }
          
          // Verificar o que realmente tem
          data.windowHasJW = !!window.jwplayer;
          data.documentPlayer = document.querySelector('.jwplayer, [class*="jw-"], video') ? 'Sim' : 'Não';
          
          // Procurar URLs em scripts
          data.scriptsWithURLs = [];
          const scripts = document.querySelectorAll('script');
          scripts.forEach(script => {
            const content = script.textContent || script.innerHTML || '';
            if (content.includes('aesthorium') || content.includes('cf-master')) {
              data.scriptsWithURLs.push(content.substring(0, 200));
            }
          });
          
        } catch (e) {
          data.evalError = e.message;
        }
      }
      
      return data;
    });
    
    addLog(`Playlist JSON (primeiros 200 chars): ${detailedData.playlistJSON ? detailedData.playlistJSON.substring(0, 200) + '...' : 'N/A'}`);
    
    // PASSO 6: Tentar extrair URL de todas as formas
    let videoUrl = null;
    let sourceType = null;
    
    // Método 1: Do playlist
    if (detailedData.playlist && detailedData.playlist[0]) {
      const item = detailedData.playlist[0];
      if (item.file) {
        videoUrl = item.file;
        sourceType = 'playlist.file';
        addLog(`✅ URL via playlist.file: ${videoUrl.substring(0, 100)}...`);
      } else if (item.sources && item.sources[0] && item.sources[0].file) {
        videoUrl = item.sources[0].file;
        sourceType = 'playlist.sources[0].file';
        addLog(`✅ URL via playlist.sources[0].file: ${videoUrl.substring(0, 100)}...`);
      }
    }
    
    // Método 2: Do config
    if (!videoUrl && detailedData.config) {
      const config = detailedData.config;
      if (config.playlist && config.playlist[0] && config.playlist[0].file) {
        videoUrl = config.playlist[0].file;
        sourceType = 'config.playlist.file';
        addLog(`✅ URL via config.playlist.file: ${videoUrl.substring(0, 100)}...`);
      } else if (config.sources && config.sources[0]) {
        videoUrl = config.sources[0].file;
        sourceType = 'config.sources.file';
        addLog(`✅ URL via config.sources.file: ${videoUrl.substring(0, 100)}...`);
      }
    }
    
    // VERIFICAÇÃO FINAL
    if (!videoUrl) {
      await browser.close();
      addLog('❌ NENHUM URL ENCONTRADO - FALHA TOTAL');
      
      res.status(500).json({
        success: false,
        error: 'URL não encontrada no jwplayer',
        videoId: videoId,
        debug: {
          logs: logs,
          playerInfo: {
            jwplayerExists: playerInfo.jwplayerExists,
            playerExists: playerInfo.playerExists,
            playlistLength: playerInfo.playlistLength,
            itemHasFile: playerInfo.itemHasFile,
            itemHasSources: playerInfo.itemHasSources,
            sourceHasFile: playerInfo.sourceHasFile
          },
          detailedData: {
            playlist: detailedData.playlist ? 'Existe' : 'Não existe',
            config: detailedData.config ? 'Existe' : 'Não existe',
            playlistError: detailedData.playlistError,
            configError: detailedData.configError,
            scriptsWithURLs: detailedData.scriptsWithURLs?.length || 0
          }
        }
      });
      return;
    }
    
    await browser.close();
    addLog(`✅ EXTRAÇÃO BEM-SUCEDIDA! URL: ${videoUrl.substring(0, 100)}...`);
    
    res.json({
      success: true,
      videoId: videoId,
      url: videoUrl,
      sourceType: sourceType,
      extractedAt: new Date().toISOString(),
      logs: logs,
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com'
      }
    });
    
  } catch (error) {
    console.error(`❌ ERRO CRÍTICO: ${error.message}`);
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      logs: logs,
      note: 'Erro durante execução'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}/extract?id=juscu`);
});
