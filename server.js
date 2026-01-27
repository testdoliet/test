// server.js - COM COOKIES E SESSÃO
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache de sessões
const sessions = new Map();

async function getVideoWithSession(videoId) {
  console.log(`🎬 Usando sessão para: ${videoId}`);
  
  let browser = null;
  let page = null;
  
  try {
    // Verificar se já temos sessão para este videoId
    let sessionCookies = sessions.get(videoId);
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Se tem sessão salva, restaurar cookies
    if (sessionCookies) {
      console.log('🔁 Restaurando cookies da sessão...');
      await page.setCookie(...sessionCookies);
    }
    
    // Headers REALISTAS do navegador
    await page.setExtraHTTPHeaders({
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br'
    });
    
    // Ir para o site principal PRIMEIRO (para estabelecer sessão)
    console.log('🌐 Estabelecendo sessão com o site...');
    await page.goto('https://png.strp2p.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Aguardar para passar por possível desafio do Cloudflare
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Agora ir para a página do vídeo
    console.log(`📺 Indo para o vídeo: ${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Salvar cookies da sessão para uso futuro
    const cookies = await page.cookies();
    sessions.set(videoId, cookies);
    console.log(`💾 Sessão salva (${cookies.length} cookies)`);
    
    // Aguardar player carregar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Executar seus comandos do console
    console.log('💻 Executando comandos do console...');
    
    const result = await page.evaluate(() => {
      const response = { success: false };
      
      try {
        // Comando 1: Clicar no play
        const playBtn = document.querySelector('#player-button, #player-button-container');
        if (playBtn) playBtn.click();
        
        // Comando 2: jwplayer().getPlaylist()
        if (typeof jwplayer !== 'undefined' && jwplayer()) {
          response.jwplayer = true;
          response.playlist = jwplayer().getPlaylist();
          response.config = jwplayer().getConfig();
          
          if (response.playlist && response.playlist[0]) {
            response.success = true;
            response.url = response.playlist[0].file || 
                          (response.playlist[0].sources && response.playlist[0].sources[0] && response.playlist[0].sources[0].file);
          }
        }
      } catch (e) {
        response.error = e.message;
      }
      
      return response;
    });
    
    if (result.success && result.url) {
      console.log(`✅ URL obtida: ${result.url}`);
      
      // AGORA A PARTE IMPORTANTE: Pegar o conteúdo REAL do URL
      // usando os MESMOS cookies da sessão
      const videoContent = await page.evaluate(async (videoUrl) => {
        try {
          const response = await fetch(videoUrl, {
            headers: {
              'Referer': 'https://png.strp2p.com/',
              'Origin': 'https://png.strp2p.com'
            },
            credentials: 'include' // Inclui cookies
          });
          
          if (response.ok) {
            return await response.text();
          }
          return null;
        } catch (e) {
          return null;
        }
      }, result.url);
      
      await browser.close();
      
      return {
        success: true,
        videoId: videoId,
        url: result.url,
        content: videoContent ? videoContent.substring(0, 500) + '...' : null,
        hasContent: !!videoContent,
        cookiesUsed: cookies.length,
        fromCache: !!sessionCookies
      };
      
    } else {
      throw new Error('Não conseguiu obter URL do player');
    }
    
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

app.get('/proxy', async (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  
  try {
    const result = await getVideoWithSession(videoId);
    res.json(result);
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    
    // Fallback: padrão conhecido
    const timestamp = Math.floor(Date.now() / 1000);
    const fallbackUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.${timestamp}.txt`;
    
    res.json({
      success: true,
      videoId: videoId,
      url: fallbackUrl,
      note: 'URL fallback (sem sessão)',
      error: error.message
    });
  }
});

app.get('/content', async (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  
  try {
    const result = await getVideoWithSession(videoId);
    
    if (result.url) {
      // Fazer proxy do conteúdo REAL
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      // Restaurar sessão se existir
      const sessionCookies = sessions.get(videoId);
      if (sessionCookies) {
        await page.setCookie(...sessionCookies);
      }
      
      // Ir para o URL com os cookies
      await page.goto(result.url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
      
      // Pegar conteúdo
      const content = await page.content();
      await browser.close();
      
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(content);
      
    } else {
      throw new Error('URL não disponível');
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy rodando: http://localhost:${PORT}/proxy?id=wdlhc`);
});
