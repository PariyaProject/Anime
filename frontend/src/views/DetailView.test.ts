import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DetailView from '@/views/DetailView.vue'

const mockRoute = {
  params: { animeId: '123' },
  query: {}
}

const mockRouter = {
  push: vi.fn()
}

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}))

vi.mock('@/services/anime.service', () => ({
  animeService: {
    getAnimeById: vi.fn().mockResolvedValue({
      id: '123',
      title: '测试详情页动画',
      cover: '',
      type: 'TV',
      year: '2025',
      description: '这是一段测试简介。',
      episodes: [
        { season: 1, episode: 1, title: '第1集', url: '' },
        { season: 1, episode: 2, title: '第2集', url: '' }
      ],
      totalEpisodes: 2,
      totalSeasons: 1,
      score: 0,
      status: '未知',
      genres: []
    }),
    getImageProxyUrl: vi.fn(() => null)
  }
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({
    watchHistory: [],
    continueWatching: [],
    loadWatchHistory: vi.fn().mockResolvedValue(undefined),
    loadContinueWatching: vi.fn().mockResolvedValue(undefined)
  })
}))

const ElSkeletonStub = { template: '<div class="el-skeleton-stub"><slot name="template" /></div>' }
const ElSkeletonItemStub = { template: '<div class="el-skeleton-item-stub"></div>' }

describe('DetailView Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockRoute.params.animeId = '123'
  })

  const mountOptions = {
    global: {
      stubs: {
        'router-link': true,
        ErrorMessage: { template: '<div>ErrorMessage</div>' },
        EmptyState: { template: '<div>EmptyState</div>' },
        ElSkeleton: ElSkeletonStub,
        ElSkeletonItem: ElSkeletonItemStub,
        'el-skeleton': ElSkeletonStub,
        'el-skeleton-item': ElSkeletonItemStub
      }
    }
  }

  it('renders loaded anime details', async () => {
    const wrapper = mount(DetailView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.text()).toContain('测试详情页动画')
    expect(wrapper.text()).toContain('选集列表')
  })

  it('navigates to watch view when primary action is clicked', async () => {
    const wrapper = mount(DetailView, mountOptions)
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))

    const primaryButton = wrapper.find('.btn-primary-action')
    await primaryButton.trigger('click')

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'Watch',
      params: { animeId: '123' },
      query: {
        season: '1',
        episode: '1'
      }
    })
  })
})
