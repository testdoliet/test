// server.js - CLONANDO EXATAMENTE O CONSOLE
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎮 CLONANDO SEU CONSOLE PARA: ${videoId}`);
  
  let browser = null;
  try {
    // 1. Abrir navegador
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 2. Ir para a página
    console.log(`🌐 Indo para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 3. Aguardar TUDO carregar
    await delay(5000);
    console.log('⏳ Aguardou 5 segundos para carregamento completo');
    
    // 4. EXECUTAR SEU COMANDO EXATO do console
    console.log('🖱️  EXECUTANDO SEU COMANDO: document.querySelector("#player-button").click()');
    
    const clickResult = await page.evaluate(() => {
      console.log('📋 Iniciando clique no console da página...');
      
      // SEU COMANDO EXATO
      const button = document.querySelector('#player-button');
      if (!button) {
        console.log('❌ #player-button não encontrado');
        return { success: false, found: false };
      }
      
      console.log('✅ #player-button encontrado, clicando...');
      button.click();
      console.log('✅ Clique realizado');
      
      return { 
        success: true, 
        found: true,
        buttonText: button.textContent || button.innerHTML.substring(0, 50)
      };
    });
    
    console.log(`📊 Resultado do clique: ${clickResult.success ? '✅ SUCESSO' : '❌ FALHA'}`);
    
    if (!clickResult.success) {
      throw new Error('Botão #player-button não encontrado');
    }
    
    // 5. Aguardar EXATAMENTE como você faz
    console.log('⏳ Aguardando 3 segundos (como você faz no console)...');
    await delay(3000);
    
    // 6. EXECUTAR SEU SEGUNDO COMANDO: jwplayer().getPlaylist()
    console.log('💻 EXECUTANDO: jwplayer().getPlaylist()');
    
    const playlistResult = await page.evaluate(() => {
      console.log('📋 Tentando jwplayer().getPlaylist() no console da página...');
      
      // Verificar se jwplayer existe
      if (typeof jwplayer !== 'function') {
        console.log('❌ jwplayer não é uma função');
        return { success: false, error: 'jwplayer não encontrado' };
      }
      
      try {
        const player = jwplayer();
        console.log('✅ jwplayer() acessado');
        
        // Verificar se getPlaylist existe
        if (typeof player.getPlaylist !== 'function') {
          console.log('❌ player.getPlaylist não é uma função');
          console.log('📋 Métodos disponíveis:', Object.keys(player));
          return { success: false, error: 'getPlaylist não disponível', methods: Object.keys(player) };
        }
        
        // SEU COMANDO
        const playlist = player.getPlaylist();
        console.log('✅ getPlaylist() executado, itens:', playlist ? playlist.length : 0);
        
        if (!playlist || playlist.length === 0) {
          return { success: false, error: 'Playlist vazia' };
        }
        
        // Extrair URL (seguindo seu exemplo)
        const item = playlist[0];
        const url = item.file || (item.sources && item.sources[0] && item.sources[0].file);
        
        if (!url) {
          return { success: false, error: 'URL não encontrada no playlist' };
        }
        
        return {
          success: true,
          url: url,
          playlist: playlist,
          item: item
        };
        
      } catch (e) {
        console.log('❌ Erro:', e.message);
        return { success: false, error: e.message };
      }
    });
    
    console.log(`📊 Resultado do getPlaylist: ${playlistResult.success ? '✅ SUCESSO' : '❌ FALHA'}`);
    
    if (!playlistResult.success) {
      // Tentar jwplayer().getConfig() como alternativa
      console.log('🔄 Tentando jwplayer().getConfig() como alternativa...');
      
      const configResult = await page.evaluate(() => {
        try {
          const config = jwplayer().getConfig();
          if (config && config.playlist && config.playlist[0]) {
            const url = config.playlist[0].file || 
                       (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
            return { success: !!url, url: url, config: config };
          }
          return { success: false };
        } catch (e) {
          return { success: false, error: e.message };
        }
      });
      
      if (configResult.success) {
        playlistResult.success = true;
        playlistResult.url = configResult.url;
        playlistResult.source = 'getConfig';
      }
    }
    
    // 7. VERIFICAÇÃO FINAL
    if (!playlistResult.success || !playlistResult.url) {
      await browser.close();
      throw new Error(`Falha após clique: ${playlistResult.error || 'URL não encontrada'}`);
    }
    
    await browser.close();
    
    console.log(`🎉 URL EXTRAÍDA: ${playlistResult.url.substring(0, 80)}...`);
    
    // 8. RETORNAR RESULTADO
    res.json({
      success: true,
      videoId: videoId,
      url: playlistResult.url,
      source: playlistResult.source || 'getPlaylist',
      extractedAt: new Date().toISOString(),
      steps: [
        'document.querySelector("#player-button").click()',
        'jwplayer().getPlaylist()'
      ],
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com'
      }
    });
    
  } catch (error) {
    console.error(`❌ ERRO FINAL: ${error.message}`);
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'Fluxo do console falhou'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}/extract?id=juscu`);
  console.log(`📋 Este código tenta EXATAMENTE seus comandos do console`);
});
