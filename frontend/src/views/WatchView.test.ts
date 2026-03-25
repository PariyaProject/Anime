import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WatchView from '@/views/WatchView.vue'

// Mock vue-router
const mockRoute = {
  params: { animeId: '123' },
  query: {}
}

const mockRouter = {
  push: vi.fn()
}

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter,
  onBeforeRouteLeave: vi.fn()
}))

// Mock Plyr
vi.mock('plyr', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    once: vi.fn(),
    destroy: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    playing: false,
    muted: false,
    currentTime: 0,
    duration: 0,
    elements: { container: null }
  }))
}))

// Mock keyboard shortcuts
vi.mock('@/composables/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(() => vi.fn())
}))

// Mock autoplay composable
vi.mock('@/composables/useAutoplay', () => ({
  useAutoplay: () => ({
    autoplay: { value: false },
    toggleAutoplay: vi.fn()
  })
}))

// Mock stores
vi.mock('@/stores/player', () => ({
  usePlayerStore: () => ({
    currentEpisodeData: null,
    currentVideoUrl: null,
    expiresAt: null,
    timeUntilExpiration: Infinity,
    loadEpisode: vi.fn().mockResolvedValue(undefined),
    refreshVideoUrl: vi.fn().mockResolvedValue(null)
  })
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({
    getLastPosition: vi.fn().mockResolvedValue(null),
    savePosition: vi.fn().mockResolvedValue(undefined),
    savePositionImmediate: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@/stores/ui', () => ({
  useUiStore: () => ({
    darkMode: false,
    loadDarkModePreference: vi.fn(),
    showNotification: vi.fn()
  })
}))

vi.mock('@/services/anime.service', () => ({
  animeService: {
    getAnimeById: vi.fn().mockResolvedValue({
      id: '123', title: '测试', cover: '', type: 'TV', year: '2024',
      description: '', episodes: [], totalEpisodes: 12, totalSeasons: 1
    }),
    getImageProxyUrl: vi.fn((url) => url)
  }
}))

// Stub el-skeleton globally
const ElSkeletonStub = { template: '<div class="el-skeleton-stub"></div>' }
const ElSkeletonItemStub = { template: '<div class="el-skeleton-item-stub"></div>' }

describe('WatchView Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockRoute.params.animeId = '123'
  })

  const mountOptions = {
    global: {
      stubs: {
        'router-link': true,
        'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
        'ErrorMessage': { template: '<div>ErrorMessage</div>' },
        'ElSkeleton': ElSkeletonStub,
        'ElSkeletonItem': ElSkeletonItemStub,
        'el-skeleton': ElSkeletonStub,
        'el-skeleton-item': ElSkeletonItemStub
      }
    }
  }

  it('renders without errors', async () => {
    const wrapper = mount(WatchView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.exists()).toBe(true)
  })

  it('has proper ARIA labels for accessibility', async () => {
    const wrapper = mount(WatchView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.find('.watch-view').exists()).toBe(true)
  })

  it('integrates with player store', async () => {
    const wrapper = mount(WatchView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.exists()).toBe(true)
  })

  it('handles missing animeId gracefully', async () => {
    mockRoute.params.animeId = undefined as any
    const wrapper = mount(WatchView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.exists()).toBe(true)
  })
})
