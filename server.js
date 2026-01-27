const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const execPromise = promisify(exec);

// Verificar se xvfb está instalado
async function checkSystem() {
  console.log('🔍 Verificando sistema...');
  
  try {
    // Verificar xvfb
    await execPromise('which xvfb-run');
    console.log('✅ xvfb-run encontrado');
    
    // Verificar Chrome
    await execPromise('which google-chrome || which chromium-browser || which chrome');
    console.log('✅ Navegador encontrado');
    
    return true;
  } catch (error) {
    console.log('❌ Dependências faltando:');
    console.log('   Para instalar no Ubuntu/Debian:');
    console.log('   sudo apt-get update');
    console.log('   sudo apt-get install -y xvfb google-chrome-stable');
    return false;
  }
}

// Executar extração com Chrome REAL
async function extractWithRealBrowser(videoId) {
  return new Promise((resolve, reject) => {
    console.log(`🎬 Iniciando Chrome REAL para: ${videoId}`);
    
    // Script de extração que roda DENTRO do xvfb
    const scriptContent = `
const puppeteer = require('puppeteer');
const videoId = '${videoId}';

(async () => {
  console.log('🚀 Chrome REAL iniciando (headless: false)...');
  
  try {
    const browser = await puppeteer.launch({
      headless: false, // FALSE = COM INTERFACE GRÁFICA!
      executablePath: process.env.CHROME_PATH || 
                     (await puppeteer.executablePath()),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1280,800',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-dev-shm-usage',
        '--remote-debugging-port=9222'
      ],
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    
    // Headers
    await page.setExtraHTTPHeaders({
      'Referer': 'https://png.strp2p.com/',
      'Origin': 'https://png.strp2p.com',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    console.log('🌐 Navegando para: https://png.strp2p.com/#' + videoId);
    
    await page.goto('https://png.strp2p.com/#' + videoId, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Página carregada');
    
    // Aguardar
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verificar se não foi bloqueado
    const pageContent = await page.content();
    if (pageContent.includes('Headless Browser is not allowed')) {
      throw new Error('Ainda detectado como headless!');
    }
    
    // Clique
    console.log('🖱️ Procurando botão de play...');
    const buttonExists = await page.evaluate(() => {
      return !!document.querySelector('#player-button');
    });
    
    if (buttonExists) {
      console.log('✅ Botão encontrado, clicando...');
      await page.click('#player-button');
      console.log('✅ Clique realizado');
    } else {
      console.log('❌ Botão não encontrado');
    }
    
    // Aguardar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extrair URL
    console.log('💻 Executando jwplayer().getPlaylist()...');
    const result = await page.evaluate(() => {
      if (typeof jwplayer !== 'function') {
        return { success: false, error: 'jwplayer não encontrado' };
      }
      
      try {
        const player = jwplayer();
        console.log('Métodos disponíveis:', Object.keys(player));
        
        // getPlaylist
        if (typeof player.getPlaylist === 'function') {
          const playlist = player.getPlaylist();
          if (playlist && playlist[0]) {
            const url = playlist[0].file || 
                       (playlist[0].sources && playlist[0].sources[0] && playlist[0].sources[0].file);
            return { success: true, url: url, method: 'getPlaylist' };
          }
        }
        
        // getConfig
        if (typeof player.getConfig === 'function') {
          const config = player.getConfig();
          if (config && config.playlist && config.playlist[0]) {
            const url = config.playlist[0].file || 
                       (config.playlist[0].sources && config.playlist[0].sources[0] && config.playlist[0].sources[0].file);
            return { success: true, url: url, method: 'getConfig' };
          }
        }
        
        return { success: false, error: 'Métodos não retornaram URL' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    
    await browser.close();
    
    console.log('📊 Resultado:', result);
    
    // Retornar resultado
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro no script:', error.message);
    process.stdout.write(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
  }
})();
`;
    
    // Salvar script temporário
    const scriptPath = path.join(__dirname, `extract-${Date.now()}.js`);
    fs.writeFileSync(scriptPath, scriptContent);
    
    // Comando para executar COM XVFB (interface gráfica virtual)
    const command = `xvfb-run --auto-servernum --server-args="-screen 0 1280x800x24" node ${scriptPath}`;
    
    console.log(`📝 Executando: ${command.substring(0, 100)}...`);
    
    const child = exec(command, { maxBuffer: 1024 * 1024 * 10 });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`📤 Saída: ${data.toString().trim()}`);
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`📥 Erros: ${data.toString().trim()}`);
    });
    
    child.on('close', (code) => {
      // Limpar arquivo
      try { fs.unlinkSync(scriptPath); } catch (e) {}
      
      if (code === 0) {
        try {
          const jsonMatch = stdout.match(/\{.*\}/s);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            reject(new Error('Saída inválida'));
          }
        } catch (e) {
          reject(new Error(`Erro ao parsear: ${e.message}`));
        }
      } else {
        reject(new Error(`Processo falhou (${code}): ${stderr}`));
      }
    });
    
    // Timeout
    setTimeout(() => {
      child.kill();
      reject(new Error('Timeout (60s)'));
    }, 60000);
    
  });
}

// Rotas
app.get('/', (req, res) => {
  res.json({
    message: 'Chrome REAL com interface gráfica (xvfb)',
    endpoint: '/extract?id=VIDEO_ID',
    example: 'http://localhost:3000/extract?id=juscu',
    requirements: 'xvfb e Chrome instalados'
  });
});

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎯 EXTRAÇÃO COM INTERFACE GRÁFICA: ${videoId}`);
  
  try {
    // Verificar sistema
    const systemReady = await checkSystem();
    if (!systemReady) {
      throw new Error('Sistema não configurado para xvfb');
    }
    
    // Executar extração
    const result = await extractWithRealBrowser(videoId);
    
    if (result.success) {
      console.log(`🎉 SUCESSO: ${result.url}`);
      
      res.json({
        success: true,
        videoId: videoId,
        url: result.url,
        method: result.method || 'jwplayer',
        extractedAt: new Date().toISOString(),
        headers: {
          'Referer': 'https://png.strp2p.com/',
          'Origin': 'https://png.strp2p.com'
        }
      });
    } else {
      throw new Error(result.error || 'Extração falhou');
    }
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      videoId: videoId,
      note: 'Falha na extração com interface gráfica'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor com interface gráfica: http://localhost:${PORT}`);
  console.log(`🔗 Teste: http://localhost:${PORT}/extract?id=juscu`);
  console.log(`📦 Para instalar dependências:`);
  console.log(`   npm run install-deps`);
});
