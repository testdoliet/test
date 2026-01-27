const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// SEU TOKEN - Browserless.io
const BROWSERLESS_TOKEN = '2Ts0BhFjxHOLOZU79df0e7f109e57c054f04c0d09afd60319';
const BROWSERLESS_ENDPOINT = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&--window-size=1920,1080&--no-sandbox`;

app.get('/extract', async (req, res) => {
  const videoId = req.query.id || 'juscu';
  
  console.log(`\n🎯 EXTRAÇÃO COM LOGS: ${videoId}`);
  
  let browser;
  const ALL_LOGS = [];
  
  const log = (message, type = 'info') => {
    const entry = { timestamp: new Date().toISOString(), message, type };
    ALL_LOGS.push(entry);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };
  
  try {
    log('1. Conectando ao Browserless...');
    browser = await puppeteer.connect({
      browserWSEndpoint: BROWSERLESS_ENDPOINT,
      defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    // Capturar console da página
    page.on('console', msg => {
      const text = msg.text();
      log(`CONSOLE: ${text}`, 'console');
    });
    
    // Monitorar navegações
    page.on('framenavigated', frame => {
      log(`📄 Frame navegado: ${frame.url()}`, 'navigation');
    });
    
    // Monitorar fechamento de frames
    page.on('framedetached', frame => {
      log(`⚠️ Frame desanexado: ${frame.name() || 'sem nome'}`, 'warning');
    });
    
    // Navegar
    log(`2. Navegando para: https://png.strp2p.com/#${videoId}`);
    await page.goto(`https://png.strp2p.com/#${videoId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    log('3. Página carregada');
    
    // Analisar a página
    log('4. Analisando elementos...');
    const pageAnalysis = await page.evaluate(() => {
      const analysis = {};
      
      // Elementos importantes
      analysis.elements = {
        playerButton: document.querySelector('#player-button'),
        playerButtonContainer: document.querySelector('#player-button-container'),
        jwplayerElements: document.querySelectorAll('.jwplayer, [class*="jw-"]').length,
        videoElements: document.querySelectorAll('video').length,
        bodyContent: document.body.innerHTML.length
      };
      
      // JW Player
      analysis.jwplayer = {
        exists: typeof jwplayer === 'function',
        type: typeof jwplayer
      };
      
      if (analysis.jwplayer.exists) {
        try {
          const player = jwplayer();
          analysis.jwplayer.player = !!player;
          
          if (player) {
            analysis.jwplayer.methods = Object.getOwnPropertyNames(Object.getPrototypeOf(player))
              .filter(k => typeof player[k] === 'function');
          }
        } catch (e) {
          analysis.jwplayer.error = e.message;
        }
      }
      
      // Estado da página
      analysis.pageState = {
        title: document.title,
        url: window.location.href,
        readyState: document.readyState
      };
      
      return analysis;
    });
    
    log(`📊 Análise: Botão existe: ${!!pageAnalysis.elements.playerButton}`);
    log(`📊 Análise: JW Player existe: ${pageAnalysis.jwplayer.exists}`);
    log(`📊 Análise: Métodos JW Player: ${pageAnalysis.jwplayer.methods ? pageAnalysis.jwplayer.methods.length : 0}`);
    
    // Verificar se o site está bloqueando
    const pageContent = await page.content();
    const hasHeadlessMessage = pageContent.includes('Headless Browser is not allowed');
    
    if (hasHeadlessMessage) {
      throw new Error('SITE BLOQUEADO: Headless Browser is not allowed');
    }
    
    log('5. Tentando clicar no botão...');
    
    // SALVAR O ESTADO ANTES DO CLIQUE
    const originalUrl = page.url();
    let clickSuccess = false;
    
    try {
      await page.click('#player-button');
      log('✅ Clique realizado');
      clickSuccess = true;
      
      // Aguardar mudanças após clique (MAS SEM PERDER A PÁGINA)
      await page.waitForTimeout(2000);
      
    } catch (clickError) {
      log(`❌ Erro ao clicar: ${clickError.message}`);
    }
    
    // VERIFICAR SE A PÁGINA MUDOU
    const currentUrl = page.url();
    if (currentUrl !== originalUrl) {
      log(`⚠️ Página redirecionada após clique: ${currentUrl}`);
      
      // Se foi redirecion
