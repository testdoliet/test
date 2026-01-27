const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIGURAÇÃO ESPECIAL PARA RENDER
const puppeteerOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
    '--disable-accelerated-2d-canvas',
    '--disable-web-security',
    '--window-size=1920,1080'
  ],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 
    (process.platform === 'linux' ? '/usr/bin/google-chrome-stable' : puppeteer.executablePath())
};

// Rota simples de teste
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Strp2p Proxy está funcionando!',
    endpoint: '/stream?id=VIDEO_ID'
  });
});

// Rota principal SIMPLIFICADA
app.get('/stream', async (req, res) => {
  const videoId = req.query.id || 'wdlhc'; // default para teste
  
  console.log(`🔍 Buscando vídeo: ${videoId}`);
  
  let browser;
  
  try {
    // Iniciar browser COM TIMEOUT
    browser = await puppeteer.launch(puppeteerOptions);
    
    const page = await browser.newPage();
    
    // Configurar timeout menor
    page.setDefaultTimeout(15000);
    
    // User-Agent simples
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36');
    
    // Ir para página
    console.log(`📄 Acessando página...`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Aguardar um pouco
    await page.waitForTimeout(2000);
    
    // Tentar clicar no botão
    console.log(`🖱️ Tentando clicar no botão...`);
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('#player-button') || 
                 document.querySelector('#player-button-container');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    console.log(clicked ? '✅ Botão clicado' : '⚠️ Botão não encontrado');
    
    // Aguardar mais um pouco
    await page.waitForTimeout(3000);
    
    // Extrair URL SIMPLIFICADO
    console.log(`🔗 Extraindo URL...`);
    const result = await page.evaluate(() => {
      // Método 1: Procurar URL diretamente
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const text = script.textContent || script.innerHTML || '';
        const match = text.match(/https:\/\/sri\.aesthorium\.sbs[^"'\s]*\.txt[^"'\s]*/);
        if (match) return match[0];
      }
      
      // Método 2: Procurar em toda página
      const html = document.documentElement.innerHTML;
      const matches = html.match(/https:\/\/sri\.aesthorium\.sbs[^"'\s]*/g) || [];
      return matches.find(url => url.includes('.txt')) || matches[0];
    });
    
    await browser.close();
    
    if (result) {
      console.log(`✅ URL encontrada: ${result.substring(0, 80)}...`);
      res.json({
        success: true,
        url: result,
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
    } else {
      res.json({
        success: false,
        error: 'URL não encontrada',
        tip: 'Tente verificar manualmente a página'
      });
    }
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    
    // Retornar erro SIMPLES sem crash
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId
    });
  }
});

// Health check SIMPLES
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage()
  });
});

// Error handler para evitar crash
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Algo deu errado' });
});

// Iniciar
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`👉 Teste: http://localhost:${PORT}/stream?id=wdlhc`);
});
