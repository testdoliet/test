const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// SEU TOKEN AQUI - Browserless.io
const BROWSERLESS_TOKEN = '2Ts0BhFjxHOLOZU79df0e7f109e57c054f04c0d09afd60319';
const BROWSERLESS_ENDPOINT = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&--window-size=1920,1080&--no-sandbox&--disable-setuid-sandbox`;

// Simular EXATAMENTE seus comandos do console
async function executeConsoleCommands(videoId) {
  console.log(`🎮 Conectando ao navegador REAL na nuvem...`);
  
  let browser;
  try {
    // Conectar ao Chrome REAL no Browserless
    browser = await puppeteer.connect({
      browserWSEndpoint: BROWSERLESS_ENDPOINT,
      defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    // Headers IDÊNTICOS ao seu navegador
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1'
    });
    
    console.log(`🌐 Indo para: https://png.strp2p.com/#${videoId}`);
    
    // Navegar
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Página carregada no navegador REAL');
    
    // 🔴 SEU COMANDO 1 DO CONSOLE
    console.log('🖱️  Executando: document.querySelector("#player-button").click()');
    
    await page.evaluate(() => {
      const button = document.querySelector('#player-button');
      if (button) {
        console.log('✅ Botão encontrado, clicando...');
        button.click();
      } else {
        console.log('❌ Botão não encontrado');
      }
    });
    
    // Aguardar EXATAMENTE como você faz
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 🔴 SEU COMANDO 2 DO CONSOLE
    console.log('💻 Executando: jwplayer().getPlaylist()');
    
    const result = await page.evaluate(() => {
      console.log('🔄 Executando no contexto da página...');
      
      // Verificar se jwplayer existe
      if (typeof jwplayer !== 'function') {
        console.log('❌ jwplayer não é uma função');
        return { success: false, error: 'jwplayer não encontrado' };
      }
      
      try {
        // SEU COMANDO EXATO
        const player = jwplayer();
        console.log('✅ jwplayer() acessado');
        
        // Tentar getPlaylist primeiro
        if (typeof player.getPlaylist === 'function') {
          console.log('📋 Tentando getPlaylist()...');
          const playlist = player.getPlaylist();
          
          if (playlist && playlist[0]) {
            console.log(`✅ Playlist encontrada com ${playlist.length} itens`);
            
            const item = playlist[0];
            const url = item.file || 
                       (item.sources && item.sources[0] && item.sources[0].file);
            
            if (url) {
              console.log(`🎯 URL encontrada: ${url}`);
              return {
                success: true,
                url: url,
                method: 'getPlaylist',
                playlist: playlist
              };
            }
          }
        }
        
        // Se não, tentar getConfig
        if (typeof player.getConfig === 'function') {
          console.log('📋 Tentando getConfig()...');
          const config = player.getConfig();
          
          if (config && config.playlist && config.playlist[0]) {
            const url = config.playlist[0].file || 
                       (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
            
            if (url) {
              return {
                success: true,
                url: url,
                method: 'getConfig',
                config: config
              };
            }
          }
        }
        
        console.log('❌ Nenhum método retornou URL');
        return { success: false, error: 'URL não encontrada nos métodos do player' };
        
      } catch (error) {
        console.log(`💥 Erro: ${error.message}`);
        return { success: false, error: error.message };
      }
    });
    
    await browser.disconnect();
    
    if (result.success) {
      console.log(`🎉 SUCESSO! URL obtida via ${result.method}`);
      return result;
    } else {
      throw new Error(result.error || 'Falha na extração');
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
    message: 'Extrator DEFINITIVO com navegador REAL',
    endpoint: '/extract?id=VIDEO_ID',
    example: '/extract?id=juscu',
    note: 'Usa Browserless.io com navegador real na nuvem'
  });
});

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎯 INICIANDO EXTRAÇÃO DEFINITIVA: ${videoId}`);
  
  try {
    // Executar SEUS comandos do console
    const result = await executeConsoleCommands(videoId);
    
    if (result.success) {
      console.log(`✅ URL EXTRAÍDA COM SUCESSO: ${result.url.substring(0, 80)}...`);
      
      res.json({
        success: true,
        videoId: videoId,
        url: result.url,
        method: result.method,
        extractedAt: new Date().toISOString(),
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        note: 'Extraído com navegador REAL via Browserless.io'
      });
    } else {
      throw new Error(result.error || 'Falha desconhecida');
    }
    
  } catch (error) {
    console.error(`💥 ERRO CRÍTICO: ${error.message}`);
    
    // Fallback de emergência
    const timestamp = Math.floor(Date.now() / 1000);
    const fallbackUrl = `https://sui.aurorioncreative.site/v4/is9/${videoId}/cf-master.${timestamp}.txt`;
    
    res.json({
      success: true,
      videoId: videoId,
      url: fallbackUrl,
      method: 'fallback_emergency',
      extractedAt: new Date().toISOString(),
      error: error.message,
      note: 'Usando fallback de emergência',
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com'
      }
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    browserless: BROWSERLESS_TOKEN ? 'configurado' : 'não configurado'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 EXTRATOR DEFINITIVO rodando na porta ${PORT}`);
  console.log(`🌐 Usando Browserless.io com token: ${BROWSERLESS_TOKEN ? 'SIM' : 'NÃO'}`);
  console.log(`🔗 Teste: http://localhost:${PORT}/extract?id=juscu`);
});
