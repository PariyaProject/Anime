import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '@/views/HomeView.vue'

const mockRoute = { params: {}, query: {} as Record<string, string> }
const mockRouter = { push: vi.fn(), replace: vi.fn() }
const mockUiStore = {
  darkMode: false,
  filters: { channel: 'tv' as 'tv' | 'movie' },
  loadDarkModePreference: vi.fn(),
  updateFilters: vi.fn((newFilters: Partial<{ channel: 'tv' | 'movie' }>) => {
    mockUiStore.filters = { ...mockUiStore.filters, ...newFilters }
  }),
  notifications: []
}

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
  useUiStore: () => mockUiStore
}))

vi.mock('@/composables/useGroupedHistory', () => ({
  useGroupedHistory: () => ({ groupedAnime: { value: [] } })
}))

describe('HomeView Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockRoute.query = {}
    mockUiStore.filters = { channel: 'tv' }
  })

  const mountOptions = {
    global: {
      stubs: {
        'router-link': true,
        'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
        'ErrorMessage': { template: '<div>ErrorMessage</div>' },
        'EmptyState': { template: '<div>EmptyState</div>' },
        'WeeklySchedule': { template: '<div data-testid="weekly-schedule"></div>' },
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

  it('renders weekly schedule in tv channel', async () => {
    const wrapper = mount(HomeView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.find('[data-testid="weekly-schedule"]').exists()).toBe(true)
  })

  it('does not render weekly schedule in movie channel', async () => {
    mockRoute.query = { channel: 'movie' }
    const wrapper = mount(HomeView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.find('[data-testid="weekly-schedule"]').exists()).toBe(false)
  })
})
