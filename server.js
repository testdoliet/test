// server.js - SEM FALLBACK
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Executa exatamente como no console - SEM FALLBACK',
    endpoint: '/extract?id=VIDEO_ID',
    example: 'http://localhost:3000/extract?id=juscu'
  });
});

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`🎮 Executando fluxo EXATO do console para: ${videoId}`);
  
  let browser = null;
  try {
    // 1. Abrir navegador
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Headers
    await page.setExtraHTTPHeaders({
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com'
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Navegar
    console.log(`🌐 Indo para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Aguardar
    await page.waitForTimeout(3000);
    
    // PASSO 1: document.querySelector('#player-button').click();
    console.log('🖱️  Executando: document.querySelector("#player-button").click()');
    
    const clickResult = await page.evaluate(() => {
      try {
        const button = document.querySelector('#player-button');
        if (button) {
          button.click();
          return { success: true, message: 'Clicou em #player-button' };
        }
        return { success: false, message: '#player-button não encontrado' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    });
    
    console.log(`Click: ${clickResult.success ? '✅' : '❌'} ${clickResult.message}`);
    
    // Aguardar após clique
    await page.waitForTimeout(2000);
    
    // PASSO 2: jwplayer().getPlaylist()
    console.log('💻 Executando: jwplayer().getPlaylist()');
    
    const playerData = await page.evaluate(() => {
      const result = { jwplayerAvailable: false };
      
      // Verificar se jwplayer existe
      if (typeof jwplayer === 'function') {
        try {
          const player = jwplayer();
          if (player) {
            result.jwplayerAvailable = true;
            
            // getPlaylist()
            try {
              result.playlist = player.getPlaylist();
            } catch (e) {
              result.playlistError = e.message;
            }
            
            // getConfig()
            try {
              result.config = player.getConfig();
            } catch (e) {
              result.configError = e.message;
            }
            
            // getPlaylistItem()
            try {
              result.playlistItem = player.getPlaylistItem();
            } catch (e) {
              result.playlistItemError = e.message;
            }
          }
        } catch (e) {
          result.error = e.message;
        }
      }
      
      return result;
    });
    
    console.log(`JW Player disponível: ${playerData.jwplayerAvailable ? '✅' : '❌'}`);
    
    // VERIFICAÇÃO: Se jwplayer não está disponível, ERRO
    if (!playerData.jwplayerAvailable) {
      await browser.close();
      throw new Error('jwplayer não encontrado na página');
    }
    
    // Extrair URL - PRECISA existir
    let videoUrl = null;
    
    // Prioridade 1: playlist
    if (playerData.playlist && playerData.playlist[0]) {
      const item = playerData.playlist[0];
      if (item.file) {
        videoUrl = item.file;
        console.log('✅ URL encontrada em playlist.file');
      } else if (item.sources && item.sources[0] && item.sources[0].file) {
        videoUrl = item.sources[0].file;
        console.log('✅ URL encontrada em playlist.sources[0].file');
      }
    }
    
    // Prioridade 2: playlistItem
    if (!videoUrl && playerData.playlistItem) {
      const item = playerData.playlistItem;
      if (item.file) {
        videoUrl = item.file;
        console.log('✅ URL encontrada em playlistItem.file');
      } else if (item.sources && item.sources[0]) {
        videoUrl = item.sources[0].file;
        console.log('✅ URL encontrada em playlistItem.sources[0].file');
      }
    }
    
    // Prioridade 3: config
    if (!videoUrl && playerData.config) {
      const config = playerData.config;
      if (config.playlist && config.playlist[0] && config.playlist[0].file) {
        videoUrl = config.playlist[0].file;
        console.log('✅ URL encontrada em config.playlist[0].file');
      } else if (config.sources && config.sources[0]) {
        videoUrl = config.sources[0].file;
        console.log('✅ URL encontrada em config.sources[0].file');
      }
    }
    
    // VERIFICAÇÃO FINAL: Se não encontrou URL, ERRO
    if (!videoUrl) {
      await browser.close();
      throw new Error('URL do vídeo não encontrada no jwplayer');
    }
    
    await browser.close();
    
    // RESPOSTA DE SUCESSO
    res.json({
      success: true,
      videoId: videoId,
      url: videoUrl,
      extractedAt: new Date().toISOString(),
      
      // Info de debug
      debug: {
        clickedPlayButton: clickResult.success,
        jwplayerAvailable: true,
        foundInPlaylist: !!(playerData.playlist && playerData.playlist[0]),
        foundInPlaylistItem: !!playerData.playlistItem,
        foundInConfig: !!playerData.config
      },
      
      // Headers necessários
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com'
      }
    });
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    
    if (browser) await browser.close();
    
    // ERRO SEM FALLBACK
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'Execução falhou - SEM FALLBACK'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  console.log(`🔗 Teste: http://localhost:${PORT}/extract?id=juscu`);
});
