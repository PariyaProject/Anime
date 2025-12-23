# Deployment Guide

This guide covers deploying the Vue.js frontend for cycani-proxy.

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Access to the target server

## Build Process

### 1. Build the Frontend

```bash
cd cycani-proxy/frontend
npm install
npm run build
```

The build output will be in `cycani-proxy/dist/` directory.

### 2. Build Output

After building, you'll have:
```
dist/
├── index.html                  # Entry HTML
├── assets/
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript bundles
│   └── woff/                   # Font files
└── *.map                       # Source maps (for debugging)
```

### 3. Bundle Size

- **Total JS + CSS (gzipped)**: ~497 KB
- **index.html**: 0.78 KB
- **Vendor JS**: ~111 KB (Vue, Router, Pinia, Axios)
- **UI JS**: ~237 KB (Element Plus)
- **Player JS**: ~31 KB (Plyr video player)
- **CSS**: ~147 KB (Element Plus + Bootstrap)

## Deployment Options

### Option 1: Express Server (Recommended)

The Express server automatically detects and serves the Vue frontend:

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the Express server**
   ```bash
   cd ..
   npm start
   ```

The server will:
- Detect `dist/` directory
- Serve Vue frontend
- Fall back to `public/` if `dist/` doesn't exist
- Support Vue Router history mode with SPA fallback

### Option 2: Static Hosting

Deploy `dist/` contents to any static hosting service:

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### GitHub Pages
1. Build: `npm run build`
2. Push `dist/` contents to `gh-pages` branch
3. Enable GitHub Pages in repository settings

### Option 3: Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/cycani-proxy/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3017;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Environment Variables

### Production Variables

Create `.env.production`:
```bash
# API Base URL (relative for same-origin)
VITE_API_BASE_URL=/api
```

### Development Variables

Create `.env.local` (already in `.gitignore`):
```bash
# API Base URL for development
VITE_API_BASE_URL=http://localhost:3017
```

## Health Checks

### Verify Deployment

1. **Check homepage loads**
   ```bash
   curl -I http://your-domain.com/
   # Should return 200 OK
   ```

2. **Check API works**
   ```bash
   curl http://your-domain.com/api/anime-list
   # Should return JSON data
   ```

3. **Check SPA routing**
   ```bash
   curl -I http://your-domain.com/watch/123
   # Should return 200 OK (served by index.html)
   ```

4. **Check static assets**
   ```bash
   curl -I http://your-domain.com/assets/js/vendor-*.js
   # Should return 200 OK with cache headers
   ```

## Performance Optimization

### 1. Enable Gzip/Brotli

Express compression is already configured in `server.js`:

```javascript
const compression = require('compression')
app.use(compression())
```

### 2. CDN for Static Assets

For better performance, serve static assets from CDN:

```javascript
// In production, use CDN URL
const cdnUrl = process.env.CDN_URL || ''
app.use(express.static(path.join(__dirname, '..', 'dist'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000')
  }
}))
```

### 3. Service Worker (Optional)

For offline support, add a service worker:

```javascript
// public/sw.js
const CACHE_NAME = 'cycani-v1'
const urlsToCache = ['/assets/js/vendor-*.js', '/assets/css/index-*.css']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})
```

## Monitoring

### Lighthouse CI

Run Lighthouse audits in CI/CD:

```bash
npm run lighthouse
```

### Error Tracking

Consider adding Sentry for error tracking:

```bash
npm install @sentry/vue
```

```typescript
// main.ts
import * as Sentry from '@sentry/vue'

if (import.meta.env.PROD) {
  Sentry.init({
    app,
    dsn: process.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE
  })
}
```

## Rollback Procedure

If something goes wrong:

1. **Quick rollback** - Remove `dist/` directory:
   ```bash
   rm -rf dist/
   # Express will fallback to public/ directory
   ```

2. **Restore previous build**:
   ```bash
   git checkout <previous-tag>
   npm run build
   ```

3. **Check logs**:
   ```bash
   pm2 logs cycani-proxy
   # or
   journalctl -u cycani-proxy -f
   ```

## Troubleshooting

### Blank Page After Deployment

- Check browser console for errors
- Verify `dist/` directory exists
- Check Express server is running
- Verify API endpoints are accessible

### API Errors in Production

- Check CORS configuration
- Verify `VITE_API_BASE_URL` is set correctly
- Check Express API routes are working

### 404 on Page Refresh

This is a Vue Router history mode issue. Ensure your server has SPA fallback:

```javascript
// Express SPA fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next()
  }
  res.sendFile(path.join(distPath, 'index.html'))
})
```

## CI/CD Example (GitHub Actions)

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Run tests
        run: cd frontend && npm test -- --run

      - name: Build
        run: cd frontend && npm run build

      - name: Deploy to server
        uses: easingthemes/ssh-deploy@main
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ${{ secrets.REMOTE_USER }}
          TARGET: /var/www/cycani-proxy/dist
          SOURCE: frontend/dist/*
```

## Support

For deployment issues:
- Check logs: `pm2 logs cycani-proxy`
- Review this guide
- Open GitHub issue with error details
