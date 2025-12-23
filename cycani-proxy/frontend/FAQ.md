# Frequently Asked Questions (FAQ)

Common questions about the cycani-proxy Vue.js frontend.

## Table of Contents

1. [General Questions](#general-questions)
2. [Development Questions](#development-questions)
3. [Deployment Questions](#deployment-questions)
4. [Feature Questions](#feature-questions)
5. [Technical Questions](#technical-questions)

---

## General Questions

### Q: What is this project?

**A:** This is a modern Vue.js 3 frontend for cycani-proxy, a Node.js proxy server that provides a web interface for browsing and watching anime from cycani.org. The frontend offers features like watch history, position memory, and a responsive design.

### Q: Why migrate from Bootstrap to Vue.js?

**A:** The Vue.js SPA provides:
- Better user experience with smooth navigation
- Client-side routing for faster page transitions
- Modern development with TypeScript
- Component reusability
- Better state management with Pinia
- Comprehensive testing with Vitest and Playwright

### Q: Can I use the old Bootstrap frontend?

**A:** Yes! The Express server automatically detects which frontend to use:
- If `dist/` exists → Serves Vue.js frontend
- If `dist/` doesn't exist → Serves Bootstrap frontend from `public/`

### Q: What browsers are supported?

**A:**
- Chrome 90+ (primary development)
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Development Questions

### Q: How do I start the development server?

**A:**
```bash
cd frontend
npm run dev
```
The app will be available at `http://localhost:3000`

### Q: Why is the dev server on port 3000 instead of 5173?

**A:** Vite's default port is 5173, but we've configured it to use 3000 to match the development conventions of this project. You can change this in `vite.config.ts`.

### Q: How do I run tests?

**A:**
```bash
# Unit tests (108 tests)
npm test

# E2E tests (requires browser install)
npm run test:e2e

# With coverage
npm run test:coverage
```

### Q: Why are my changes not showing up?

**A:** Try these steps:
1. Check if HMR is working (should see "HMR update" in terminal)
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Q: How do I add a new component?

**A:** Follow these steps:
1. Create component file: `src/components/my-component/MyComponent.vue`
2. Use `<script setup lang="ts">` syntax
3. Add TypeScript interfaces for props
4. Create test file: `MyComponent.test.ts`
5. Export from index if needed

Example:
```vue
<script setup lang="ts">
interface Props {
  title: string
}

const props = defineProps<Props>()
</script>

<template>
  <div>{{ title }}</div>
</template>
```

### Q: How do I debug Vue components?

**A:**
1. **Vue DevTools**: Install Vue DevTools browser extension
2. **Pinia DevTools**: Stores are exposed at `window.__PINIA_STORES__`
3. **Console logging**: Use `console.log()` for debugging
4. **VS Code debugger**: Set breakpoints in `.vue` files

---

## Deployment Questions

### Q: How do I build for production?

**A:**
```bash
cd frontend
npm run build
```
Output goes to `../dist/` directory.

### Q: How do I deploy?

**A:**

**Option 1: Express Server (Recommended)**
```bash
# Build frontend
cd frontend && npm run build

# Start server (serves dist/ automatically)
cd .. && npm start
```

**Option 2: Static Hosting**
Upload `dist/` contents to any static hosting service (Netlify, Vercel, GitHub Pages).

### Q: What's the bundle size?

**A:**
- Total JS + CSS (gzipped): **~497 KB**
- Vendor JS: ~111 KB
- UI JS: ~237 KB (Element Plus)
- Player JS: ~31 KB (Plyr)

### Q: How do I enable source maps?

**A:** Source maps are already enabled in `vite.config.ts`:
```javascript
build: {
  sourcemap: true
}
```

### Q: Why is my deployed site showing a blank page?

**A:** Common causes:
1. **Missing assets** - Check console for 404 errors
2. **Wrong base path** - Ensure `base: '/'` in vite.config.ts
3. **Missing SPA fallback** - Ensure Express has fallback route (already configured)
4. **Build didn't complete** - Check build output for errors

---

## Feature Questions

### Q: Does dark mode persist?

**A:** Yes! Dark mode preference is saved to `localStorage` and persists across sessions.

### Q: How does watch history work?

**A:**
- Watch position is saved every 30 seconds during playback
- Positions are stored on the server in `data/proxy/watch-history.json`
- History persists across browsers and devices

### Q: Can I use this without the Express server?

**A:** No, the Vue frontend requires the Express proxy server because:
- It proxies API requests to cycani.org (handles CORS)
- It stores watch history on the server
- It provides the anime data API

### Q: How do keyboard shortcuts work?

**A:**
- **Space**: Play/pause video
- **Ctrl + →**: Next episode
- **Escape**: Close modals (where applicable)

### Q: Why is the video not playing automatically?

**A:** Browsers block autoplay with sound. The video plays muted first. Click anywhere on the page or press a key to enable audio.

---

## Technical Questions

### Q: What's the difference between `public/` and `dist/`?

**A:**
- `public/` - Legacy Bootstrap frontend (fallback)
- `dist/` - Built Vue.js frontend (production build)

### Q: Why do we use both Element Plus and Bootstrap?

**A:**
- **Element Plus**: Rich UI components (tables, forms, modals)
- **Bootstrap**: Grid system and utility classes
- They work well together without conflicts

### Q: How does routing work?

**A:** Vue Router handles client-side routing:
- `http://localhost:3000/` → Home page
- `http://localhost:3000/watch/123` → Watch page
- Express has SPA fallback to serve `index.html` for all routes

### Q: What's the difference between `.vue`, `.ts`, and `.js` files?

**A:**
- `.vue` - Vue single-file components (template + script + style)
- `.ts` - TypeScript files (with types)
- `.js` - JavaScript files (no types)

We use TypeScript everywhere for type safety.

### Q: How do I update dependencies?

**A:**
```bash
# Check for updates
npm outdated

# Update a specific package
npm install package-name@latest

# Update all packages (use with caution)
npm update

# Dependabot will automatically create PRs for updates
```

### Q: Why are there so many files in `node_modules/`?

**A:** Modern JavaScript projects have many dependencies. This is normal. Key dependencies:
- `vue` - Core framework (~200 KB)
- `element-plus` - UI library (~700 KB)
- `plyr` - Video player (~50 KB)
- And their transitive dependencies

### Q: What's the purpose of the `@/` alias?

**A:** `@/` is an alias for the `src/` directory. It makes imports cleaner:
```typescript
// Instead of:
import { foo } from '../../../utils/foo'

// Use:
import { foo } from '@/utils/foo'
```

---

## Troubleshooting Questions

### Q: My tests are failing. What do I do?

**A:** See `TROUBLESHOOTING.md` for detailed debugging steps. Quick checks:
1. Are all dependencies installed? (`npm install`)
2. Is the test config correct? (`vitest.config.ts`)
3. Run with verbose output: `npm test -- --reporter=verbose`

### Q: Playwright browser install is timing out

**A:** This happens in some regions due to network restrictions. Solutions:
```bash
# Use a mirror (China)
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
npm run test:e2e:install
```

### Q: The build is slower than expected

**A:** First build takes longer (~30s). Subsequent builds use Vite's cache and are faster (~5s). To speed up:
- Use `esbuild` for minification (already configured)
- Disable source maps if not needed for debugging
- Use fewer chunks (modify `manualChunks` config)

---

## Migration Questions

### Q: How do I migrate from the old frontend?

**A:** See `MIGRATION.md` for detailed migration guide. Summary:
1. Install Node.js dependencies
2. Build Vue frontend (`npm run build`)
3. Restart Express server
4. Vue frontend will be served automatically

### Q: Will my watch history be preserved?

**A:** Yes! The watch history is stored on the server and is shared between both frontends.

### Q: Can I customize the Vue frontend?

**A:** Absolutely! The code is well-structured and documented. See `CONTRIBUTING.md` for guidelines.

---

## Security Questions

### Q: Is my watch history private?

**A:** Watch history is stored locally on your server in `data/proxy/watch-history.json`. It's not shared with any external services.

### Q: Does this collect any personal data?

**A:** No. The only data stored is:
- Anime IDs you've watched
- Episode numbers
- Playback positions
- Timestamps

No personally identifiable information is collected.

---

## Performance Questions

### Q: Why is the first load slower than the old site?

**A:** The Vue SPA loads all JavaScript upfront (~497 KB gzipped). Subsequent navigation is instant because it doesn't require page reloads.

### Q: How can I improve performance?

**A:**
1. Use a CDN for static assets
2. Enable gzip compression (already configured)
3. Implement service worker for offline support
4. Use lazy loading for images (already implemented)

---

## License Questions

### Q: Can I use this code in my project?

**A:** This project is for personal/educational use to enhance the cycani.org experience. Please respect the website's terms of service.

---

## Getting Help

### Q: Where can I get help?

**A:**
1. **Documentation**: Check `README.md`, `TESTING.md`, `TROUBLESHOOTING.md`
2. **GitHub Issues**: Search or create new issues
3. **Vue.js Docs**: https://vuejs.org/
4. **Element Plus Docs**: https://element-plus.org/

### Q: How do I report a bug?

**A:** Create a GitHub issue with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Screenshots if applicable

---

## Still Have Questions?

If your question isn't answered here, please:

1. Check the documentation files in the `frontend/` directory
2. Search existing GitHub issues
3. Create a new issue with the `question` label
