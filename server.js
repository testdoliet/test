// server.js - CORRIGIDO
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    usage: '/stream?id=VIDEO_ID',
    example: '/stream?id=wdlhc'
  });
});

app.get('/stream', async (req, res) => {
  const videoId = req.query.id || 'wdlhc';
  
  console.log(`🔍 Buscando: ${videoId}`);
  
  try {
    // 1. Buscar página COM FETCH NATIVO
    const response = await fetch(`https://png.strp2p.com/#${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const html = await response.text();
    
    // 2. Extrair URL
    let videoUrl = null;
    
    // Método A: Regex específico
    const specificPattern = new RegExp(`https://sri\\.aesthorium\\.sbs/v4/9a/${videoId}/[^"'\s]*\\.txt[^"'\s]*`, 'i');
    const specificMatch = html.match(specificPattern);
    if (specificMatch) videoUrl = specificMatch[0];
    
    // Método B: Regex geral
    if (!videoUrl) {
      const generalPattern = /https:\/\/sri\.aesthorium\.sbs\/[^"'\s]*\.txt[^"'\s]*/g;
      const allUrls = html.match(generalPattern) || [];
      videoUrl = allUrls.find(url => url.includes(videoId)) || allUrls[0];
    }
    
    // Método C: Padrão conhecido
    if (!videoUrl) {
      videoUrl = `https://sri.aesthorium.sbs/v4/9a/${videoId}/cf-master.txt`;
    }
    
    res.json({
      success: true,
      url: videoUrl,
      headers: {
        'Referer': 'https://png.strp2p.com/',
        'Origin': 'https://png.strp2p.com'
      }
    });
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    res.json({
      success: false,
      error: error.message,
      videoId: videoId
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
