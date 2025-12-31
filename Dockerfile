# Stage 1: Frontend Build (linux/amd64 only, since dist is platform-independent)
FROM --platform=linux/amd64 node:24-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend package files
COPY cycani-proxy/frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY cycani-proxy/frontend/ ./
RUN npm run build && ls -la /app/dist

# Stage 2: Backend with Obfuscation
FROM node:24-alpine AS backend-builder
WORKDIR /app

# Copy backend package files
COPY cycani-proxy/package*.json ./
RUN npm ci --production

# Copy backend source code
COPY cycani-proxy/src/ ./src/

# Install javascript-obfuscator
RUN npm install -g javascript-obfuscator

# Obfuscate JavaScript files
RUN find ./src -name "*.js" -type f -exec sh -c \
    'javascript-obfuscator "$1" --output "$1.obf" && mv "$1.obf" "$1"' _ {} \;

# Stage 3: Runtime Image
FROM node:24-alpine

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy obfuscated source and dependencies
COPY --from=backend-builder /app/src ./src
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package*.json ./

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist/

# Copy legacy public files as fallback
COPY cycani-proxy/public/ ./public/

# Create data directories
RUN mkdir -p /app/config /app/logs

VOLUME ["/app/config", "/app/logs"]

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
