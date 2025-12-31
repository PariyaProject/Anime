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

# Install javascript-obfuscator for obfuscation stage only
RUN npm install javascript-obfuscator

# Copy backend source code
COPY cycani-proxy/src/ ./src/

# Obfuscate JavaScript files using the locally installed package
# Using npx to run the locally installed javascript-obfuscator
RUN for file in $(find ./src -name "*.js" -type f); do \
    echo "🔒 Obfuscating: $file" && \
    npx javascript-obfuscator "$file" --output "$file.obf" \
    --compact true \
    --control-flow-flattening true \
    --control-flow-flattening-threshold 0.75 \
    --dead-code-injection true \
    --dead-code-injection-threshold 0.4 \
    --debug-protection false \
    --disable-console-output false \
    --identifier-names-generator hexadecimal \
    --log false \
    --rename-globals false \
    --rotate-string-array true \
    --self-defending false \
    --shuffle-string-array true \
    --split-strings true \
    --split-strings-chunk-length 10 \
    --string-array true \
    --string-array-encoding '["base64"]' \
    --string-array-threshold 0.75 \
    --transform-object-keys false \
    --unicode-escape-sequence false && \
    mv "$file.obf" "$file"; \
    if [ $? -ne 0 ]; then \
        echo "❌ Failed to obfuscate: $file" && \
        exit 1; \
    fi; \
done && \
echo "✅ All JavaScript files obfuscated successfully"

# Verify obfuscation worked - show first few lines (should be minified/obfuscated)
RUN echo "=== Obfuscation Verification ===" && \
    echo "First 10 lines of server.js (should be obfuscated):" && \
    head -10 /app/src/server.js && \
    echo "================================" && \
    wc -l /app/src/*.js && \
    echo "=== Obfuscation Complete ==="

# Now install production dependencies (after obfuscation to keep node_modules clean)
RUN rm -rf node_modules package-lock.json && \
    npm ci --production

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

# Config directory will be created by the application and mounted as volume
VOLUME ["/app/config"]

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
