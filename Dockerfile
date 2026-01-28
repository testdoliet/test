FROM node:18-slim

# Instalar apenas o essencial
RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
