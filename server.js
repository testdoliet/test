const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

let browser = null;
let page = null;

// Inicializar navegador
async function initBrowser() {
    try {
        console.log('🚀 Iniciando navegador...');
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            executablePath: '/usr/bin/chromium'
        });

        console.log('✅ Navegador iniciado');
        
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36');

        console.log('📄 Página criada');
        return true;

    } catch (error) {
        console.error('❌ Erro ao inicializar navegador:', error);
        return false;
    }
}

// Rota para navegar
app.post('/api/navigate', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }

        if (!browser || !page) {
            const success = await initBrowser();
            if (!success) {
                return res.status(500).json({ error: 'Navegador não pôde ser inicializado' });
            }
        }

        console.log(`🌐 Navegando para: ${url}`);
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        const pageInfo = {
            title: await page.title(),
            url: page.url(),
            html: await page.content()
        };

        res.json({
            success: true,
            data: pageInfo
        });

    } catch (error) {
        console.error('❌ Erro ao navegar:', error.message);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Rota de saúde
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        browser: browser ? 'active' : 'inactive',
        time: new Date().toISOString()
    });
});

// Rota principal
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Browser Server</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                input { padding: 10px; width: 300px; }
                button { padding: 10px 20px; }
                #result { margin-top: 20px; padding: 10px; background: #f0f0f0; }
            </style>
        </head>
        <body>
            <h1>Browser Server</h1>
            <input type="text" id="url" placeholder="https://google.com" value="https://google.com">
            <button onclick="navigate()">Navegar</button>
            <div id="result"></div>
            
            <script>
                async function navigate() {
                    const url = document.getElementById('url').value;
                    const resultDiv = document.getElementById('result');
                    
                    resultDiv.innerHTML = 'Carregando...';
                    
                    try {
                        const response = await fetch('/api/navigate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            resultDiv.innerHTML = \`
                                <h3>\${data.data.title}</h3>
                                <p>URL: \${data.data.url}</p>
                                <textarea readonly style="width:100%;height:200px">
                                    \${data.data.html}
                                </textarea>
                            \`;
                        } else {
                            resultDiv.innerHTML = 'Erro: ' + data.error;
                        }
                    } catch (error) {
                        resultDiv.innerHTML = 'Erro: ' + error.message;
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Iniciar servidor
async function startServer() {
    await initBrowser();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Servidor rodando na porta ${PORT}`);
        console.log(`🌐 Acesse: http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);
