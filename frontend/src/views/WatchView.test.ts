import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import WatchView from '@/views/WatchView.vue'

const { mockPlyrInstances } = vi.hoisted(() => ({
  mockPlyrInstances: [] as any[]
}))

const mockRoute = reactive({
  params: reactive({ animeId: '123' }),
  query: reactive<Record<string, string>>({ season: '1', episode: '1' })
})

const mockRouter = {
  push: vi.fn(async (location: any) => {
    const nextQuery = location.query || {}

    if (location.params?.animeId) {
      mockRoute.params.animeId = String(location.params.animeId)
    }

    for (const key of Object.keys(mockRoute.query)) {
      delete mockRoute.query[key]
    }

    for (const [key, value] of Object.entries(nextQuery)) {
      mockRoute.query[key] = String(value)
    }

    await nextTick()
  })
}

type MockPlyrHandler = (event?: any) => void

const autoplayPreference = ref(true)

const mockPlayerStore = reactive({
  currentEpisodeData: null as any,
  currentVideoUrl: null as any,
  expiresAt: null as number | null,
  timeUntilExpiration: Infinity,
  loadEpisode: vi.fn(async (animeId: string, season: number, episode: number) => {
    mockPlayerStore.currentEpisodeData = {
      animeId,
      bangumiId: animeId,
      season,
      episode,
      title: `第 ${episode} 集`,
      realVideoUrl: `https://cdn.example.com/${animeId}/${season}/${episode}.mp4`
    }
  }),
  refreshVideoUrl: vi.fn(async () => ({
    realVideoUrl: 'https://cdn.example.com/refreshed.mp4',
    videoUrlCacheHit: false,
    videoUrlExpiresAt: null,
    videoUrlFetchedAt: null
  })),
  updateTime: vi.fn(),
  updateDuration: vi.fn()
})

const mockHistoryStore = {
  getLastPosition: vi.fn(async () => null),
  savePosition: vi.fn(async () => undefined),
  savePositionImmediate: vi.fn(async () => undefined)
}

const mockUiStore = {
  darkMode: false,
  loadDarkModePreference: vi.fn(),
  showNotification: vi.fn()
}

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter,
  onBeforeRouteLeave: vi.fn()
}))

vi.mock('plyr', () => ({
  default: class MockPlyr {
    onHandlers = new Map<string, MockPlyrHandler[]>()
    onceHandlers = new Map<string, MockPlyrHandler[]>()
    play = vi.fn(async () => {
      this.playing = true
    })
    pause = vi.fn(() => {
      this.playing = false
    })
    destroy = vi.fn()
    on = vi.fn((event: string, handler: MockPlyrHandler) => {
      const handlers = this.onHandlers.get(event) || []
      handlers.push(handler)
      this.onHandlers.set(event, handlers)
    })
    once = vi.fn((event: string, handler: MockPlyrHandler) => {
      const handlers = this.onceHandlers.get(event) || []
      handlers.push(handler)
      this.onceHandlers.set(event, handlers)
    })
    playing = false
    muted = false
    currentTime = 0
    duration = 0
    sourceValue: any = null
    elements = {
      container: document.createElement('div'),
      video: document.createElement('video')
    }

    constructor() {
      mockPlyrInstances.push(this)
    }

    set source(value: any) {
      this.sourceValue = value
    }

    get source() {
      return this.sourceValue
    }

    emit(event: string) {
      const payload = { detail: { plyr: this } }
      const handlers = this.onHandlers.get(event) || []
      const onceHandlers = this.onceHandlers.get(event) || []

      for (const handler of handlers) {
        handler(payload)
      }

      for (const handler of onceHandlers) {
        handler(payload)
      }

      if (onceHandlers.length > 0) {
        this.onceHandlers.delete(event)
      }
    }
  }
}))

vi.mock('@/composables/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(() => vi.fn())
}))

vi.mock('@/composables/useAutoplay', () => ({
  useAutoplay: () => ({
    autoplay: autoplayPreference,
    toggleAutoplay: vi.fn(() => {
      autoplayPreference.value = !autoplayPreference.value
    })
  })
}))

vi.mock('@/stores/player', () => ({
  usePlayerStore: () => mockPlayerStore
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => mockHistoryStore
}))

vi.mock('@/stores/ui', () => ({
  useUiStore: () => mockUiStore
}))

vi.mock('@/services/anime.service', () => ({
  animeService: {
    getAnimeById: vi.fn().mockResolvedValue({
      id: '123',
      title: '测试',
      cover: '',
      type: 'TV',
      year: '2024',
      description: '',
      episodes: Array.from({ length: 12 }, (_, index) => ({
        season: 1,
        episode: index + 1,
        title: `第 ${index + 1} 集`
      })),
      totalEpisodes: 12,
      totalSeasons: 1
    }),
    getImageProxyUrl: vi.fn((url) => url)
  }
}))

const ElSkeletonStub = { template: '<div class="el-skeleton-stub"></div>' }
const ElSkeletonItemStub = { template: '<div class="el-skeleton-item-stub"></div>' }

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

async function flushViewUpdates() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
  await vi.advanceTimersByTimeAsync(0)
  await Promise.resolve()
  await nextTick()
}

async function waitForPlyrInstances(count: number) {
  for (let attempt = 0; attempt < 8; attempt++) {
    await flushViewUpdates()
    if (mockPlyrInstances.length >= count) {
      return
    }
  }

  throw new Error(`Expected ${count} Plyr instance(s), got ${mockPlyrInstances.length}`)
}

describe('WatchView Component', () => {
  let activeWrapper: any = null

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    vi.clearAllMocks()

    autoplayPreference.value = true
    mockRoute.params.animeId = '123'

    for (const key of Object.keys(mockRoute.query)) {
      delete mockRoute.query[key]
    }

    mockRoute.query.season = '1'
    mockRoute.query.episode = '1'

    mockPlyrInstances.length = 0
    mockPlayerStore.currentEpisodeData = null
    mockPlayerStore.currentVideoUrl = null
    mockPlayerStore.expiresAt = null
    mockPlayerStore.timeUntilExpiration = Infinity
    mockHistoryStore.getLastPosition.mockResolvedValue(null)
  })

  afterEach(() => {
    activeWrapper?.unmount()
    activeWrapper = null
    vi.useRealTimers()
  })

  it('renders without errors', async () => {
    const wrapper = mount(WatchView, mountOptions)
    activeWrapper = wrapper
    await flushViewUpdates()
    expect(wrapper.exists()).toBe(true)
  })

  it('autoplays the next episode after a resumed episode when clicking next', async () => {
    mockHistoryStore.getLastPosition.mockImplementation(async (_animeId: string, _season: number, episode: number) => {
      return episode === 1 ? 120 : null
    })

    const wrapper = mount(WatchView, mountOptions)
    activeWrapper = wrapper
    await waitForPlyrInstances(1)

    const firstPlayer = mockPlyrInstances[0]
    firstPlayer.duration = 1500
    firstPlayer.emit('ready')

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(0)

    expect(firstPlayer.currentTime).toBe(120)

    await wrapper.find('button[title="下一集"]').trigger('click')
    await waitForPlyrInstances(2)

    const secondPlayer = mockPlyrInstances[1]
    secondPlayer.emit('ready')

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(0)

    expect(secondPlayer.play).toHaveBeenCalled()
  })

  it('forces playback after manual next even when autoplay preference is off', async () => {
    autoplayPreference.value = false

    const wrapper = mount(WatchView, mountOptions)
    activeWrapper = wrapper
    await waitForPlyrInstances(1)

    const firstPlayer = mockPlyrInstances[0]
    firstPlayer.emit('ready')
    await vi.advanceTimersByTimeAsync(0)

    expect(firstPlayer.play).not.toHaveBeenCalled()

    await wrapper.find('button[title="下一集"]').trigger('click')
    await waitForPlyrInstances(2)

    const secondPlayer = mockPlyrInstances[1]
    secondPlayer.emit('ready')

    await vi.advanceTimersByTimeAsync(0)

    expect(secondPlayer.play).toHaveBeenCalledTimes(1)
  })
})
