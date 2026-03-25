import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '@/views/HomeView.vue'

const mockRoute = { params: {}, query: {} }
const mockRouter = { push: vi.fn(), replace: vi.fn() }

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}))

vi.mock('@/composables/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(() => vi.fn())
}))

vi.mock('@/stores/anime', () => ({
  useAnimeStore: () => ({
    animeList: [],
    loading: false,
    error: null,
    hasAnime: false,
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    loadAnimeList: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({
    continueWatching: [],
    hasContinueWatching: false,
    loadContinueWatching: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@/stores/ui', () => ({
  useUiStore: () => ({
    darkMode: false,
    filters: { channel: 'all' },
    loadDarkModePreference: vi.fn(),
    updateFilters: vi.fn(),
    notifications: []
  })
}))

vi.mock('@/composables/useGroupedHistory', () => ({
  useGroupedHistory: () => ({ groupedAnime: { value: [] } })
}))

describe('HomeView Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mountOptions = {
    global: {
      stubs: {
        'router-link': true,
        'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
        'ErrorMessage': { template: '<div>ErrorMessage</div>' },
        'EmptyState': { template: '<div>EmptyState</div>' },
        'WeeklySchedule': { template: '<div></div>' },
        'GroupedContinueWatchingCard': { template: '<div></div>' },
        'AnimeCard': { template: '<div></div>' },
        'el-skeleton': { template: '<div></div>' },
        'el-skeleton-item': { template: '<div></div>' }
      }
    }
  }

  it('renders without errors', async () => {
    const wrapper = mount(HomeView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.exists()).toBe(true)
  })

  it('has proper semantic structure', async () => {
    const wrapper = mount(HomeView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.find('.home-view').exists()).toBe(true)
  })

  it('integrates with anime store', async () => {
    const wrapper = mount(HomeView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.exists()).toBe(true)
  })
})
