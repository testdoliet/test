FROM node:18-bullseye-slim

# Instalar dependências mínimas para Puppeteer com display
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \  # ADICIONADO ESTA LINHA
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    xvfb \
    x11vnc \
    fluxbox \
    xterm \
    && rm -rf /var/lib/apt/lists/*

# Instalar Chrome (não Chromium) para melhor compatibilidade
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json primeiro (para cache de layers)
COPY package*.json ./

# Instalar dependências Node.js
RUN npm install --production

# Copiar código da aplicação
COPY . .

# Criar diretório para cache do Chrome
RUN mkdir -p /tmp/chrome-cache

# Expor porta
EXPOSE 3000

# Script de inicialização simplificado
RUN echo '#!/bin/bash\n\
# Iniciar Xvfb (servidor X virtual)\n\
Xvfb :99 -screen 0 1024x768x16 &\n\
export DISPLAY=:99\n\
\n\
# Esperar Xvfb iniciar\n\
sleep 2\n\
\n\
# Iniciar aplicação Node.js\n\
node server.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Comando para iniciar
CMD ["/app/start.sh"]
