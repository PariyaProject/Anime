# Migration Guide: Bootstrap to Vue.js Frontend

This guide helps contributors understand the migration from the legacy Bootstrap frontend to the new Vue.js frontend.

## Overview

The frontend in this repository has been migrated from a server-rendered Bootstrap application to a modern Single Page Application (SPA) built with Vue 3.

## Key Changes

### Architecture

| Aspect | Old (Bootstrap) | New (Vue.js) |
|--------|----------------|--------------|
| Framework | Bootstrap 5 + jQuery | Vue 3 + TypeScript |
| State Management | Server-side | Pinia stores |
| Routing | Server routes | Vue Router (history mode) |
| Build | N/A | Vite |
| Styling | Bootstrap CSS | Element Plus + Bootstrap + Tailwind |
| Testing | N/A | Vitest (unit) + Playwright (E2E) |

## File Structure Comparison

### Old Structure (public/)
```
public/
├── index.html          # Server-rendered
├── css/
├── js/
└── assets/
```

### New Structure (frontend/)
```
frontend/
├── src/
│   ├── components/     # Reusable components
│   ├── composables/    # Vue composition functions
│   ├── stores/         # Pinia state management
│   ├── services/       # API calls
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Helper functions
│   └── views/          # Page components
├── dist/               # Built output (served by Express)
└── public/             # Static assets
```

## Component Migration

### Example: Anime Card

**Old (Bootstrap + jQuery):**
```html
<div class="card anime-card" data-id="123">
  <img src="..." class="card-img-top" alt="...">
  <div class="card-body">
    <h5 class="card-title">Anime Title</h5>
    <button class="btn btn-primary">Watch</button>
  </div>
</div>
```

**New (Vue 3):**
```vue
<script setup lang="ts">
import type { Anime } from '@/types/anime.types'

interface Props {
  anime: Anime
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [anime: Anime]
}>()
</script>

<template>
  <article class="anime-card" @click="emit('select', anime)">
    <img :src="anime.cover" :alt="anime.title" />
    <h5>{{ anime.title }}</h5>
    <button @click.stop="emit('select', anime)">Watch</button>
  </article>
</template>
```

## State Management

### Old Approach (Server-side)
- Data stored in JSON files on server
- API endpoints return pre-filtered data
- No client-side state persistence

### New Approach (Pinia)
```typescript
// stores/anime.ts
import { defineStore } from 'pinia'

export const useAnimeStore = defineStore('anime', () => {
  const animeList = ref<Anime[]>([])
  const loading = ref(false)

  async function loadAnimeList(params?: FilterParams) {
    loading.value = true
    try {
      const data = await animeService.getAnimeList(params)
      animeList.value = data.animeList
    } finally {
      loading.value = false
    }
  }

  return { animeList, loading, loadAnimeList }
})
```

## API Integration

### Service Pattern
All API calls are centralized in service files:

```typescript
// services/anime.service.ts
import api from '@/services/api'

export const animeService = {
  async getAnimeList(params?: FilterParams) {
    const response = await api.get<{ data: AnimeListResponse }>(
      '/api/anime-list',
      { params }
    )
    return response.data.data
  }
}
```

## Routing Changes

### Old (Server Routes)
```
GET /                    → index.html
GET /watch/:id           → watch.html
GET /history             → history.html
```

### New (Vue Router)
```typescript
// router/index.ts
const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/watch/:animeId', name: 'Watch', component: WatchView },
  { path: '/history', name: 'History', component: HistoryView }
]
```

**Express fallback** (server.js):
```javascript
// SPA fallback for Vue Router history mode
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next()
  }
  res.sendFile(path.join(distPath, 'index.html'))
})
```

## Styling Migration

### CSS Frameworks
- **Element Plus**: Primary UI component library
- **Bootstrap 5**: Grid system and utility classes
- **Tailwind CSS**: Additional utility classes
- **Bootstrap Icons**: Icon set

### Example: Button
```html
<!-- Old -->
<button class="btn btn-primary">Click</button>

<!-- New (Element Plus) -->
<el-button type="primary">Click</el-button>

<!-- Or still use Bootstrap -->
<button class="btn btn-primary">Click</button>
```

## Testing

### Unit Tests (Vitest)
```typescript
// components/anime/AnimeCard.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnimeCard from '@/components/anime/AnimeCard.vue'

describe('AnimeCard', () => {
  it('renders anime title', () => {
    const wrapper = mount(AnimeCard, {
      props: { anime: { id: '1', title: 'Test' } }
    })
    expect(wrapper.text()).toContain('Test')
  })
})
```

### E2E Tests (Playwright)
```typescript
// e2e/anime-list.spec.ts
test('displays anime list', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.anime-card')
  const cards = await page.locator('.anime-card').count()
  expect(cards).toBeGreaterThan(0)
})
```

## Development Workflow

### Old Workflow
1. Edit HTML in `public/`
2. Refresh browser
3. Changes visible immediately

### New Workflow
1. Edit Vue component in `src/`
2. Vite HMR updates automatically
3. Run tests: `npm test`
4. Build for production: `npm run build`

## Deployment

### Build Command
```bash
cd frontend
npm run build
```

Output goes to `../dist/` directory, which is served by Express.

### Express Configuration
```javascript
// server.js
const distPath = path.join(__dirname, '..', 'dist')
const useVueFrontend = fs.existsSync(distPath)

if (useVueFrontend) {
  app.use(express.static(distPath))
} else {
  app.use(express.static(path.join(__dirname, '..', 'public')))
}
```

## Common Tasks

### Add New Component
```bash
# Create component file
touch src/components/my-component/MyComponent.vue

# Add tests
touch src/components/my-component/MyComponent.test.ts
```

### Add New Store
```bash
# Create store file
touch src/stores/mystore.ts

# Use in component
import { useMyStore } from '@/stores/mystore'
const store = useMyStore()
```

### Add New Route
```typescript
// router/index.ts
{ path: '/new-route', name: 'NewRoute', component: NewView }
```

## Migration Checklist

When migrating a feature from old to new frontend:

- [ ] Create Vue component
- [ ] Add TypeScript types
- [ ] Implement API service call
- [ ] Add Pinia store (if state needed)
- [ ] Add routing (if new page)
- [ ] Add unit tests
- [ ] Add E2E tests (for critical flows)
- [ ] Add accessibility attributes
- [ ] Test on mobile/desktop
- [ ] Update documentation

## Troubleshooting

### HMR Not Working
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Build Fails
```bash
# Clear dist and rebuild
rm -rf ../dist
npm run build
```

### Tests Failing
```bash
# Run tests in watch mode to see errors
npm test -- --watch
```

## Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Element Plus Documentation](https://element-plus.org/)
