# Troubleshooting Guide

This guide helps you resolve common issues when developing or deploying the Vue.js frontend.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Development Issues](#development-issues)
3. [Build Issues](#build-issues)
4. [Testing Issues](#testing-issues)
5. [Deployment Issues](#deployment-issues)
6. [Performance Issues](#performance-issues)
7. [Browser-Specific Issues](#browser-specific-issues)

---

## Installation Issues

### Problem: `npm install` fails

**Error:**
```
npm ERR! code ECONNREFUSED
npm ERR! syscall connect
npm ERR! errno ECONNREFUSED
```

**Solutions:**

1. **Check npm registry:**
   ```bash
   npm config get registry
   # If not https://registry.npmjs.org/, set it:
   npm config set registry https://registry.npmjs.org/
   ```

2. **Use a mirror (in China):**
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```

3. **Clear npm cache:**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

### Problem: Node.js version too old

**Error:**
```
ERROR: Node.js version is too old. Minimum required: 18.x
```

**Solution:**
```bash
# Install Node.js 18+ using nvm (recommended)
nvm install 18
nvm use 18

# Or download from https://nodejs.org/
```

---

## Development Issues

### Problem: Dev server won't start

**Error:**
```
Port 3000 is already in use
```

**Solutions:**

1. **Kill the process using port 3000:**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # Linux/Mac
   lsof -ti:3000 | xargs kill -9
   ```

2. **Use a different port:**
   ```bash
   # Modify vite.config.ts
   server: {
     port: 3001  # Change to available port
   }
   ```

### Problem: Hot Module Replacement (HMR) not working

**Symptoms:** Changes don't appear in browser without manual refresh

**Solutions:**

1. **Check if Vite HMR is enabled:**
   ```javascript
   // vite.config.ts
   server: {
     hmr: true  // Should be true (default)
   }
   ```

2. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Check browser console for WebSocket errors:**
   - Open DevTools → Network → WS tab
   - Look for failed WebSocket connections

4. **Disable firewall/antivirus temporarily:**
   - Some security software blocks HMR WebSocket

### Problem: API requests failing in dev

**Error:**
```
Network Error
ERR_CONNECTION_REFUSED
```

**Solutions:**

1. **Verify API server is running:**
   ```bash
   cd ..
   npm start  # Start Express server on port 3017
   ```

2. **Check Vite proxy configuration:**
   ```javascript
   // vite.config.ts
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:3017',
         changeOrigin: true
       }
     }
   }
   ```

3. **Verify API base URL:**
   ```bash
   # Check .env.local
   cat .env.local
   # Should contain: VITE_API_BASE_URL=http://localhost:3017
   ```

---

## Build Issues

### Problem: Build fails with "Cannot find module"

**Error:**
```
Error: Cannot find module '@/components/...'
```

**Solutions:**

1. **Check Vite alias configuration:**
   ```javascript
   // vite.config.ts
   resolve: {
     alias: {
       '@': path.resolve(__dirname, './src')
     }
   }
   ```

2. **Check tsconfig.json paths:**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

3. **Restart TypeScript server:**
   - In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"

### Problem: Build fails with out of memory

**Error:**
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Solutions:**

1. **Increase Node.js memory limit:**
   ```bash
   # Windows
   set NODE_OPTIONS=--max-old-space-size=4096
   npm run build

   # Linux/Mac
   NODE_OPTIONS=--max-old-space-size=4096 npm run build
   ```

2. **Close other applications**

3. **Build without source maps:**
   ```javascript
   // vite.config.ts
   build: {
     sourcemap: false  // Disable temporarily
   }
   ```

### Problem: Chunk size warnings

**Warning:**
```
Some chunks are larger than 600 kB after minification
```

**Solutions:**

1. **This is expected for Element Plus** (UI chunk ~759KB before gzip, ~237KB gzipped)

2. **To reduce chunk size, use dynamic imports:**
   ```javascript
   // Instead of: import ElementPlus from 'element-plus'
   // Use:
   const ElementPlus = await import('element-plus')
   ```

3. **Adjust warning limit:**
   ```javascript
   // vite.config.ts
   build: {
     chunkSizeWarningLimit: 800
   }
   ```

---

## Testing Issues

### Problem: Tests fail with "cannot find module"

**Error:**
```
Cannot find module '@/components/...' from '...'
```

**Solutions:**

1. **Check vitest.config.ts alias:**
   ```javascript
   // vitest.config.ts
   resolve: {
     alias: {
       '@': path.resolve(__dirname, './src')
     }
   }
   ```

2. **Import with full path:**
   ```typescript
   // Instead of: import { foo } from '@/utils/foo'
   import { foo } from '../../utils/foo'
   ```

### Problem: Vue warnings in tests

**Warning:**
```
[Vue warn]: onMounted is called when there is no active component instance
```

**Solution:**
This is expected when testing composables in isolation. The tests still pass. To suppress:

```javascript
// In test setup
import { config } from '@vue/test-utils'

config.global.stubs = {
  // Add stubs if needed
}
```

### Problem: E2E tests won't run

**Error:**
```
Executables don't exist at /path/to/playwright-<browser>
```

**Solutions:**

1. **Install Playwright browsers:**
   ```bash
   npm run test:e2e:install
   ```

2. **If download times out:**
   ```bash
   # Set environment variable for mirror (China)
   set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
   npm run test:e2e:install
   ```

3. **Install specific browser only:**
   ```bash
   npx playwright install chromium
   ```

### Problem: Tests timeout

**Error:**
```
Test timeout of 5000ms exceeded
```

**Solutions:**

1. **Increase timeout in test:**
   ```typescript
   test('slow test', async () => {
     // ...
   }, { timeout: 10000 })
   ```

2. **Increase global timeout:**
   ```javascript
   // vitest.config.ts
   test: {
     testTimeout: 10000
   }
   ```

---

## Deployment Issues

### Problem: Blank page after deployment

**Symptoms:** White screen, no errors in console

**Solutions:**

1. **Check build output:**
   ```bash
   ls -la ../dist/
   # Should contain index.html and assets/ directory
   ```

2. **Verify Express is serving correct directory:**
   ```javascript
   // server.js should check:
   const useVueFrontend = fs.existsSync(distPath)
   console.log('Using Vue frontend:', useVueFrontend)
   ```

3. **Check browser console for errors:**
   - Open DevTools → Console tab
   - Look for 404 errors for assets

4. **Verify base path:**
   ```javascript
   // vite.config.ts
   base: '/'  // Should be '/' for root deployment
   ```

### Problem: Vue Router 404 on refresh

**Symptoms:** Works on first load, but shows 404 when refreshing

**Solution:**

Ensure Express has SPA fallback (already configured in `server.js`):

```javascript
// SPA fallback - must be after all API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next()
  }
  res.sendFile(path.join(distPath, 'index.html'))
})
```

### Problem: API requests fail in production

**Error:**
```
CORS policy: No 'Access-Control-Allow-Origin' header
```

**Solutions:**

1. **Check CORS configuration:**
   ```javascript
   // server.js
   app.use(cors({
     origin: ['http://localhost:3000', 'http://localhost:5173', /* production domains */],
     credentials: true
   }))
   ```

2. **Use relative URLs in production:**
   ```javascript
   // In .env.production
   VITE_API_BASE_URL=/api
   ```

---

## Performance Issues

### Problem: Initial load is slow

**Solutions:**

1. **Check bundle size:**
   ```bash
   npm run build
   # Look at output for chunk sizes
   ```

2. **Enable compression (already configured):**
   ```javascript
   // server.js
   app.use(compression())
   ```

3. **Check for large images:**
   - Use WebP format when possible
   - Enable lazy loading (already implemented)

4. **Use CDN for static assets:**
   ```javascript
   // Upload dist/assets/ to CDN
   // Update base URL in vite.config.ts
   ```

### Problem: Video player is slow to load

**Solutions:**

1. **Lazy load Plyr:**
   ```javascript
   // Already implemented in VideoPlayer.vue
   const Plyr = await import('plyr')
   ```

2. **Preload video metadata:**
   ```html
   <link rel="preload" as="video" href="video-url">
   ```

3. **Use CDN for Plyr styles:**
   ```html
   <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css">
   ```

---

## Browser-Specific Issues

### Firefox

#### Problem: Flexbox not working

**Solution:**
```css
/* Add vendor prefixes if needed */
.anime-card {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
}
```

#### Problem: Grid gaps not showing

**Solution:**
```css
/* Use alternative approach */
.grid {
  display: grid;
  gap: 1rem;  /* Modern browsers */
}
```

### Safari

#### Problem: Video won't play (HLS)

**Solution:**
Safari requires HLS.js for m3u8 streams:

```bash
npm install hls.js
```

```javascript
// In VideoPlayer.vue
import Hls from 'hls.js'

if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
  const hls = new Hls()
  hls.loadSource(videoUrl)
  hls.attachMedia(video)
}
```

#### Problem: 100vh includes address bar

**Solution:**
```css
/* Use dvh (dynamic viewport height) */
.container {
  height: 100dvh;  /* iOS 15+ */
  height: -webkit-fill-available;  /* Fallback */
}
```

#### Problem: Back swipe doesn't work

**Solution:**
Handle `popstate` event:

```javascript
// In router setup
window.addEventListener('popstate', () => {
  // Handle navigation
})
```

### Edge (Legacy)

#### Problem: CSS custom properties not working

**Solution:**
Edge 79+ (Chromium-based) supports CSS custom properties. For older Edge, add fallbacks:

```css
.button {
  background: #1a73e8;  /* Fallback */
  background: var(--primary-color, #1a73e8);
}
```

---

## VS Code Issues

### Problem: TypeScript IntelliSense not working

**Solutions:**

1. **Reload TypeScript server:**
   - Cmd+Shift+P → "TypeScript: Restart TS Server"

2. **Check workspace:**
   - Ensure you're in `frontend/` directory

3. **Check tsconfig.json:**
   ```json
   {
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

### Problem: Vetur IntelliSense conflicts

**Solution:**

Disable Vetur if using Volar (recommended for Vue 3):

1. Install **Volar** extension
2. Add to `.vscode/settings.json`:
   ```json
   {
     "vetur.validation.template": false,
     "vetur.validation.script": false,
     "vetur.validation.style": false
   }
   ```

---

## Getting Help

If you can't resolve your issue:

1. **Check existing documentation:**
   - `README.md` - General information
   - `TESTING.md` - Testing procedures
   - `DEPLOYMENT.md` - Deployment guide
   - `CONTRIBUTING.md` - Development guidelines

2. **Search for similar issues:**
   - GitHub Issues
   - Stack Overflow
   - Vue.js Forums

3. **Create a minimal reproduction:**
   - Fork the repo
   - Create a simple test case
   - Share the link when reporting

4. **When reporting issues, include:**
   - Operating system and version
   - Node.js version (`node -v`)
   - Browser and version
   - Full error message
   - Steps to reproduce
   - Expected vs actual behavior

---

## Quick Fixes

### Reset Everything

```bash
# Clean everything
rm -rf node_modules dist ../dist
rm package-lock.json
npm cache clean --force

# Reinstall
npm install

# Rebuild
npm run build
```

### Reset Vite Cache

```bash
rm -rf node_modules/.vite
npm run dev
```

### Reset Test Environment

```bash
rm -rf node_modules/.vitest
npm test -- --run
```

### Reset Playwright

```bash
npx playwright uninstall --all
npm run test:e2e:install
```
