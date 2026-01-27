// server.js - CÓDIGO COMPLETO COM STEALTH
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Usar plugin stealth
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ROTA RAIZ - ESSENCIAL
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Proxy com Stealth Plugin',
    endpoints: {
      '/extract?id=VIDEO_ID': 'Extrair URL do vídeo (com bypass)',
      '/test?id=VIDEO_ID': 'Testar extração',
      '/health': 'Health check'
    },
    example: 'http://localhost:3000/extract?id=juscu'
  });
});

// ROTA DE EXTRACÇÃO COM STEALTH
app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🔓 EXTRACÇÃO COM STEALTH PARA: ${videoId}`);
  
  let browser = null;
  try {
    // Configuração stealth
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--window-size=1920,1080'
      ]
    });
    
    const page = await browser.newPage();
    
    // Headers realistas
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    console.log(`🌐 Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('✅ Página carregada');
    
    // Verificar se não foi bloqueado
    const pageContent = await page.content();
    if (pageContent.includes('Headless Browser is not allowed')) {
      throw new Error('Site detectou navegador headless');
    }
    
    console.log('🔓 Bypass da detecção funcionou!');
    
    // Aguardar
    await delay(3000);
    
    // Executar clique
    console.log('🖱️  Clicando em #player-button...');
    await page.waitForSelector('#player-button', { timeout: 10000 });
    await page.click('#player-button');
    
    console.log('✅ Clique realizado');
    await delay(2000);
    
    // Executar comandos do console
    console.log('💻 Executando jwplayer().getPlaylist()...');
    
    const result = await page.evaluate(() => {
      console.log('🔄 Executando no console da página...');
      
      if (typeof jwplayer !== 'function') {
        return { success: false, error: 'jwplayer não encontrado' };
      }
      
      try {
        // Tentar getPlaylist()
        const playlist = jwplayer().getPlaylist();
        console.log('Playlist encontrada:', playlist);
        
        if (playlist && playlist[0]) {
          const url = playlist[0].file || 
                     (playlist[0].sources && playlist[0].sources[0] && playlist[0].sources[0].file);
          return { success: true, url: url, source: 'getPlaylist' };
        }
      } catch (e) {
        console.log('getPlaylist falhou:', e.message);
        
        // Tentar getConfig()
        try {
          const config = jwplayer().getConfig();
          console.log('Config encontrada:', config);
          
          if (config && config.playlist && config.playlist[0]) {
            const url = config.playlist[0].file || 
                       (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
            return { success: true, url: url, source: 'getConfig' };
          }
        } catch (e2) {
          console.log('getConfig falhou:', e2.message);
        }
      }
      
      return { success: false, error: 'Não conseguiu extrair URL' };
    });
    
    await browser.close();
    
    if (result.success && result.url) {
      console.log(`🎉 URL EXTRAÍDA: ${result.url}`);
      
      res.json({
        success: true,
        videoId: videoId,
        url: result.url,
        source: result.source,
        extractedAt: new Date().toISOString(),
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
    } else {
      throw new Error(result.error || 'URL não encontrada');
    }
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'Stealth pode não ter funcionado'
    });
  }
});

// ROTA DE TESTE
app.get('/test', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  try {
    const response = await fetch(`http://localhost:${PORT}/extract?id=${videoId}`);
    const data = await response.json();
    
    if (data.success && data.url) {
      // Testar o URL
      const testResponse = await fetch(data.url, {
        headers: data.headers
      });
      
      const content = await testResponse.text();
      
      res.json({
        test: 'success',
        url: data.url,
        status: testResponse.status,
        isPlaylist: content.includes('#EXTM3U'),
        contentPreview: content.substring(0, 200)
      });
    } else {
      res.json({
        test: 'failed',
        error: data.error
      });
    }
    
  } catch (error) {
    res.json({
      test: 'error',
      error: error.message
    });
  }
});

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor com Stealth rodando: http://localhost:${PORT}`);
  console.log(`🔗 Teste: http://localhost:${PORT}/extract?id=juscu`);
});
