# Design Document: Vue.js Frontend Migration

## Overview

This document details the technical design for migrating the cycani-proxy frontend from vanilla JavaScript to Vue.js 3.

## Architecture

### Directory Structure

```
cycani-proxy/
├── frontend/                          # New Vue.js frontend
│   ├── src/
│   │   ├── assets/                    # Static assets
│   │   │   ├── styles/
│   │   │   │   ├── main.css
│   │   │   │   └── variables.css
│   │   │   └── images/
│   │   ├── components/                # Vue components
│   │   │   ├── layout/
│   │   │   │   ├── AppNavbar.vue
│   │   │   │   ├── AppContainer.vue
│   │   │   │   └── AppFooter.vue
│   │   │   ├── anime/
│   │   │   │   ├── AnimeCard.vue
│   │   │   │   ├── AnimeGrid.vue
│   │   │   │   ├── AnimeFilters.vue
│   │   │   │   └── AnimePagination.vue
│   │   │   ├── player/
│   │   │   │   ├── VideoPlayer.vue
│   │   │   │   ├── EpisodeList.vue
│   │   │   │   ├── EpisodeItem.vue
│   │   │   │   └── PlayerControls.vue
│   │   │   ├── history/
│   │   │   │   ├── HistoryCard.vue
│   │   │   │   ├── HistoryDropdown.vue
│   │   │   │   └── ContinueWatching.vue
│   │   │   └── common/
│   │   │       ├── LoadingSpinner.vue
│   │   │       ├── ErrorMessage.vue
│   │   │       ├── EmptyState.vue
│   │   │       └── ModalDialog.vue
│   │   ├── composables/               # Reusable composition functions
│   │   │   ├── useAnimeApi.ts
│   │   │   ├── usePlayer.ts
│   │   │   ├── useHistory.ts
│   │   │   ├── useDarkMode.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   └── useNotification.ts
│   │   ├── stores/                    # Pinia stores
│   │   │   ├── anime.ts
│   │   │   ├── player.ts
│   │   │   ├── history.ts
│   │   │   └── ui.ts
│   │   ├── services/                  # API services
│   │   │   ├── api.ts
│   │   │   ├── anime.service.ts
│   │   │   ├── episode.service.ts
│   │   │   └── history.service.ts
│   │   ├── types/                     # TypeScript types
│   │   │   ├── anime.types.ts
│   │   │   ├── episode.types.ts
│   │   │   ├── history.types.ts
│   │   │   └── api.types.ts
│   │   ├── utils/                     # Utility functions
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── constants.ts
│   │   ├── router/                    # Vue Router
│   │   │   └── index.ts
│   │   ├── App.vue                    # Root component
│   │   └── main.ts                    # Entry point
│   ├── public/
│   │   └── favicon.ico
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── tailwind.config.js
├── src/                               # Existing Express backend
│   └── server.js
└── public/                            # Legacy frontend (deprecated)
    ├── index.html
    ├── app.js
    └── style.css
```

## Component Design

### 1. AnimeCard Component

**Purpose**: Display individual anime information

**Props**:
```typescript
interface AnimeCardProps {
  anime: Anime
}
```

**Emits**:
```typescript
interface AnimeCardEmits {
  select: [anime: Anime]
  details: [anime: Anime]
}
```

**Template**:
```vue
<template>
  <div class="anime-card">
    <div class="anime-cover" @click="handleSelect">
      <img
        :src="anime.cover || placeholderImage"
        :alt="anime.title"
        loading="lazy"
        @error="handleImageError"
      />
      <div class="anime-overlay">
        <div class="anime-rating">⭐ {{ anime.score || 'N/A' }}</div>
        <div class="anime-status">{{ anime.status || '连载中' }}</div>
      </div>
    </div>
    <div class="anime-info">
      <h6 class="anime-title" :title="anime.title">{{ anime.title }}</h6>
      <div class="anime-meta">
        <span class="badge bg-secondary me-1">{{ anime.type || 'TV' }}</span>
        <span class="badge bg-info me-1">{{ anime.year || '未知' }}</span>
        <span class="badge bg-warning text-dark">{{ anime.episodes || '?' }}集</span>
      </div>
      <div class="anime-actions">
        <button class="btn btn-success" @click.stop="handleSelect">
          选择播放
        </button>
        <button class="btn btn-secondary" @click.stop="handleDetails">
          查看详情
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Anime } from '@/types/anime.types'

interface Props {
  anime: Anime
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [anime: Anime]
  details: [anime: Anime]
}>()

const placeholderImage = 'https://via.placeholder.com/200x280/f8f9fa/6c757d?text=无封面'

const handleSelect = () => {
  emit('select', props.anime)
}

const handleDetails = () => {
  emit('details', props.anime)
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = 'https://via.placeholder.com/200x280/f8f9fa/6c757d?text=加载失败'
}
</script>

<style scoped>
.anime-card {
  /* Scoped styles */
}
</style>
```

### 2. VideoPlayer Component

**Purpose**: Video playback with Plyr integration

**Props**:
```typescript
interface VideoPlayerProps {
  videoUrl: string
  title: string
  autoplay?: boolean
  startTime?: number
}
```

**Emits**:
```typescript
interface VideoPlayerEmits {
  ready: [player: any]
  play: []
  pause: [currentTime: number]
  ended: []
  error: [error: Error]
}
```

**Key Features**:
- Plyr.js integration wrapped in Vue component
- Reactive video URL changes
- Autoplay handling with browser restrictions
- Position saving on pause/end

### 3. EpisodeList Component

**Purpose**: Display episode selection grid

**Props**:
```typescript
interface EpisodeListProps {
  episodes: Episode[]
  currentEpisode: { season: number; episode: number }
  completedEpisodes: Set<string>
  animeId: string
}
```

**Emits**:
```typescript
interface EpisodeListEmits {
  select: [episode: Episode]
}
```

**Key Features**:
- Virtual scrolling for large episode counts
- Visual distinction for current/completed episodes
- Keyboard navigation

## State Management (Pinia)

### animeStore

**State**:
```typescript
interface AnimeState {
  animeList: Anime[]
  currentAnime: Anime | null
  totalCount: number
  currentPage: number
  totalPages: number
  loading: boolean
  error: string | null
}
```

**Actions**:
```typescript
actions: {
  loadAnimeList(params: FilterParams): Promise<void>
  loadAnimeById(id: string): Promise<Anime>
  setCurrentAnime(anime: Anime): void
  clearError(): void
}
```

### playerStore

**State**:
```typescript
interface PlayerState {
  currentEpisode: Episode | null
  currentVideoUrl: string
  isPlaying: boolean
  currentTime: number
  duration: number
  autoPlay: boolean
  lastPosition: number
}
```

**Actions**:
```typescript
actions: {
  loadEpisode(animeId: string, season: number, episode: number): Promise<void>
  play(): void
  pause(): void
  seekTo(time: number): void
  setAutoPlay(enabled: boolean): void
  loadNextEpisode(): Promise<void>
}
```

### historyStore

**State**:
```typescript
interface HistoryState {
  watchHistory: WatchRecord[]
  continueWatching: WatchRecord[]
  lastPositions: Record<string, PositionRecord>
}
```

**Actions**:
```typescript
actions: {
  loadWatchHistory(): Promise<void>
  loadContinueWatching(): Promise<void>
  addToHistory(record: WatchRecord): Promise<void>
  savePosition(animeId: string, season: number, episode: number, position: number): Promise<void>
  getLastPosition(animeId: string, season: number, episode: number): number
}
```

### uiStore

**State**:
```typescript
interface UIState {
  darkMode: boolean
  sidebarOpen: boolean
  filters: FilterState
  notifications: Notification[]
}
```

**Actions**:
```typescript
actions: {
  toggleDarkMode(): void
  setSidebarOpen(open: boolean): void
  updateFilters(filters: Partial<FilterState>): void
  addNotification(notification: Notification): void
  removeNotification(id: string): void
}
```

## Composables

### useAnimeApi

**Purpose**: Encapsulate all anime-related API calls

```typescript
export function useAnimeApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchAnimeList = async (params: FilterParams) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<AnimeListResponse>('/api/anime-list', { params })
      return response.data
    } catch (e) {
      error.value = 'Failed to load anime list'
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchAnimeById = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<AnimeResponse>(`/api/anime/${id}`)
      return response.data
    } catch (e) {
      error.value = 'Failed to load anime details'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    fetchAnimeList,
    fetchAnimeById
  }
}
```

### usePlayer

**Purpose**: Video player logic and lifecycle

```typescript
export function usePlayer() {
  const player = ref<Plyr | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)

  const initPlayer = (element: string) => {
    player.value = new Plyr(element, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'pip', 'fullscreen'],
      autoplay: false
    })

    player.value.on('play', () => {
      isPlaying.value = true
    })

    player.value.on('pause', () => {
      isPlaying.value = false
      currentTime.value = player.value?.currentTime || 0
    })

    player.value.on('timeupdate', () => {
      currentTime.value = player.value?.currentTime || 0
    })

    player.value.on('loadedmetadata', () => {
      duration.value = player.value?.duration || 0
    })

    return player.value
  }

  const loadVideo = async (url: string, autoplay = false) => {
    if (!player.value) return

    player.value.source = {
      type: 'video',
      sources: [{ src: url, type: 'video/mp4' }]
    }

    if (autoplay) {
      await player.value.play()
    }
  }

  const destroy = () => {
    player.value?.destroy()
    player.value = null
  }

  return {
    player: readonly(player),
    isPlaying: readonly(isPlaying),
    currentTime: readonly(currentTime),
    duration: readonly(duration),
    initPlayer,
    loadVideo,
    play: () => player.value?.play(),
    pause: () => player.value?.pause(),
    seek: (time: number) => {
      if (player.value) player.value.currentTime = time
    },
    destroy
  }
}
```

### useDarkMode

**Purpose**: Dark mode toggle with localStorage persistence

```typescript
export function useDarkMode() {
  const darkMode = ref(false)

  const toggleDarkMode = () => {
    darkMode.value = !darkMode.value
    updateDocumentClass()
    savePreference()
  }

  const updateDocumentClass = () => {
    if (darkMode.value) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }

  const savePreference = () => {
    localStorage.setItem('darkMode', darkMode.value ? 'enabled' : 'disabled')
  }

  const loadPreference = () => {
    const saved = localStorage.getItem('darkMode')
    if (saved === 'enabled' || (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      darkMode.value = true
    }
    updateDocumentClass()
  }

  onMounted(() => {
    loadPreference()
  })

  return {
    darkMode: readonly(darkMode),
    toggleDarkMode
  }
}
```

### useKeyboardShortcuts

**Purpose**: Keyboard shortcuts handler

```typescript
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  const handleKeydown = (event: KeyboardEvent) => {
    const key = event.code
    const ctrl = event.ctrlKey
    const meta = event.metaKey

    // Don't trigger when typing in input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    const shortcutKey = `${ctrl || meta ? 'Ctrl+' : ''}${key}`

    if (shortcutKey in shortcuts) {
      event.preventDefault()
      shortcuts[shortcutKey]()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    handleKeydown
  }
}
```

## API Service Layer

### Axios Configuration

```typescript
// src/services/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add loading state
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 404) {
      error.message = 'Resource not found'
    } else if (error.response?.status === 500) {
      error.message = 'Server error'
    }
    return Promise.reject(error)
  }
)
```

### Service Classes

```typescript
// src/services/anime.service.ts
import { api } from './api'
import type { Anime, AnimeListResponse, FilterParams } from '@/types/anime.types'

export const animeService = {
  async getAnimeList(params: FilterParams): Promise<AnimeListResponse> {
    const response = await api.get<AnimeListResponse>('/api/anime-list', { params })
    return response.data
  },

  async getAnimeById(id: string): Promise<Anime> {
    const response = await api.get<{ success: boolean; data: Anime }>(`/api/anime/${id}`)
    return response.data.data
  }
}
```

## TypeScript Types

### Anime Types

```typescript
// src/types/anime.types.ts
export interface Anime {
  id: number | string
  title: string
  cover: string
  type?: string
  year?: string
  episodes?: number
  score?: number
  status?: string
  description?: string
  genres?: string[]
}

export interface AnimeListResponse {
  success: boolean
  data: {
    animeList: Anime[]
    totalCount: number
    totalPages: number
    currentPage: number
  }
}

export interface FilterParams {
  page?: number
  limit?: number
  search?: string
  genre?: string
  year?: string
  month?: string
  sort?: 'time' | 'hits' | 'score'
}
```

### Episode Types

```typescript
// src/types/episode.types.ts
export interface Episode {
  season: number
  episode: number
  title?: string
  duration?: number
}

export interface EpisodeData {
  bangumiId: string
  animeId?: string
  title: string
  season: number
  episode: number
  videoUrl?: string
  realVideoUrl?: string
  iframeVideoUrl?: string
  originalUrl?: string
  nextEpisode?: Episode
}

export interface EpisodeResponse {
  success: boolean
  data: EpisodeData
}
```

### History Types

```typescript
// src/types/history.types.ts
export interface WatchRecord {
  animeId: string
  animeTitle: string
  animeCover: string
  season: number
  episode: number
  episodeTitle: string
  position: number
  duration: number
  watchDate: string
  completed: boolean
}

export interface PositionRecord {
  position: number
  lastUpdated: string
}

export interface HistoryResponse {
  success: boolean
  data: WatchRecord[]
}
```

## Routing

### Vue Router Configuration

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '动画列表' }
  },
  {
    path: '/watch/:animeId',
    name: 'Watch',
    component: () => import('@/views/WatchView.vue'),
    props: true,
    meta: { title: '播放视频' }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryView.vue'),
    meta: { title: '观看历史' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  // Update page title
  document.title = to.meta.title ? `${to.meta.title} - Cycani` : 'Cycani'
  next()
})

export default router
```

## Build Configuration

### Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3017',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'ui': ['element-plus'],
          'player': ['plyr']
        }
      }
    }
  }
})
```

## Performance Optimizations

### 1. Code Splitting
- Lazy load routes
- Dynamic imports for heavy components
- Split vendor bundles

### 2. Virtual Scrolling
- For episode lists (50+ episodes)
- For anime grid (100+ items)

### 3. Image Optimization
- Lazy loading with native `loading="lazy"`
- WebP format support
- Responsive images with srcset

### 4. Caching Strategy
- Service Worker for API caching
- localStorage for user preferences
- IndexedDB for offline support (optional)

### 5. Bundle Size Optimization
- Tree-shaking with Vite
- Import individual Element Plus components
- Gzip/Brotli compression

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// AnimeCard.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnimeCard from '@/components/anime/AnimeCard.vue'

describe('AnimeCard', () => {
  it('renders anime information', () => {
    const wrapper = mount(AnimeCard, {
      props: {
        anime: {
          id: 1,
          title: 'Test Anime',
          cover: 'test.jpg',
          score: 8.5
        }
      }
    })

    expect(wrapper.text()).toContain('Test Anime')
    expect(wrapper.text()).toContain('8.5')
  })

  it('emits select event when cover is clicked', async () => {
    const wrapper = mount(AnimeCard, {
      props: {
        anime: { id: 1, title: 'Test', cover: 'test.jpg' }
      }
    })

    await wrapper.find('.anime-cover').trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
  })
})
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/playback.spec.ts
import { test, expect } from '@playwright/test'

test('plays video when anime is selected', async ({ page }) => {
  await page.goto('/')

  await page.click('[data-testid="anime-card-1"]')
  await page.waitForSelector('video')

  const video = page.locator('video')
  await expect(video).toHaveAttribute('src', /.mp4/)
})
```

## Deployment

### Build Process

1. Development: `npm run dev` - Vite dev server with HMR
2. Build: `npm run build` - Production build to `dist/`
3. Preview: `npm run preview` - Preview production build

### Production Deployment Options

**Option 1: Serve from Express (Recommended)**
```javascript
// In Express server
app.use(express.static(path.join(__dirname, '../dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})
```

**Option 2: Separate Static Server**
- Nginx/Apache for frontend
- Express for API only
- Better caching and CDN support

### CI/CD Pipeline

1. Run tests on push
2. Build production bundle
3. Deploy to staging
4. Run E2E tests
5. Deploy to production

## Migration Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1 | Week 1 | Project setup, infrastructure |
| Phase 2 | Week 2 | Core components (AnimeCard, VideoPlayer) |
| Phase 3 | Week 2 | Pinia stores setup |
| Phase 4 | Week 3 | API integration |
| Phase 5 | Week 4 | Feature parity |
| Phase 6 | Week 5 | Polish, testing, optimization |

**Total Estimated Time**: 5 weeks

## Success Metrics

- Bundle size < 500KB (gzipped)
- Lighthouse Performance score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Zero TypeScript errors
- 70%+ test coverage
- All existing features functional

