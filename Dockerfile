# Stage 1: Build do Frontend React/Vite
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Imagem final de Produção (Hardened)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copiar apenas arquivos e dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Copiar artefatos compilados do builder e arquivos backend necessários
COPY --from=builder /app/dist ./dist
COPY src ./src
COPY bi_data_model_document.md ./bi_data_model_document.md

# Usar usuário não-root por segurança
USER node

EXPOSE 3001

CMD ["node", "src/server.js"]
