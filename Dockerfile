# ============================================
# Stage 1: Frontend Build
# Platform: linux/amd64 (dist is platform-independent)
# ============================================
FROM --platform=linux/amd64 node:24-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Backend with Obfuscation
# Obfuscates all JavaScript source code
# ============================================
FROM node:24-alpine AS backend-builder
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install javascript-obfuscator for obfuscation stage only
RUN npm install javascript-obfuscator

# Copy backend source code
COPY backend/src/ ./src/

# Copy the obfuscation script
COPY scripts/obfuscate.js ./

# Run the obfuscation script (obfuscates all .js files in src/)
RUN node obfuscate.js

# Verify obfuscation worked - show first few lines (should be minified/obfuscated)
RUN echo "=== Obfuscation Verification ===" && \
    echo "First 3 lines of server.js (should be obfuscated):" && \
    head -3 /app/src/server.js && \
    echo "================================" && \
    echo "File line counts:" && \
    wc -l /app/src/*.js && \
    echo "=== Obfuscation Complete ==="

# Clean install production dependencies (after obfuscation to keep node_modules clean)
RUN rm -rf node_modules && \
    npm install --production --no-package-lock

# ============================================
# Stage 3: Runtime Image
# Final production image with obfuscated code
# ============================================
FROM node:24-alpine

# Install Puppeteer dependencies for Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy obfuscated source and dependencies from backend-builder
COPY --from=backend-builder /app/src ./src
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package.json ./

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /app/dist ./dist/

# Copy legacy public files as fallback
COPY backend/public/ ./public/

# Config directory will be created by the application and mounted as volume
VOLUME ["/app/config"]

EXPOSE 3006

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "src/server.js"]
