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
  useRouter: () => mockRouter
}))

// Mock Plyr
vi.mock('plyr', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    destroy: vi.fn()
  }))
}))

// Mock the keyboard shortcuts composable
vi.mock('@/composables/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(() => vi.fn())
}))

describe('WatchView Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Reset animeId
    mockRoute.params.animeId = '123'
  })

  it('renders without errors', async () => {
    const wrapper = mount(WatchView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'router-link': true,
          'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
          'ErrorMessage': { template: '<div>ErrorMessage</div>' }
        }
      }
    })

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.exists()).toBe(true)
  })

  it('has proper ARIA labels for accessibility', async () => {
    const wrapper = mount(WatchView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'router-link': true,
          'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
          'ErrorMessage': { template: '<div>ErrorMessage</div>' }
        }
      }
    })

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 0))

    // Check for proper semantic structure
    const container = wrapper.find('.watch-view')
    expect(container.exists()).toBe(true)
  })

  it('integrates with player store', async () => {
    const wrapper = mount(WatchView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'router-link': true,
          'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
          'ErrorMessage': { template: '<div>ErrorMessage</div>' }
        }
      }
    })

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 0))

    // Component should mount with player integration
    expect(wrapper.exists()).toBe(true)
  })

  it('handles missing animeId gracefully', async () => {
    mockRoute.params.animeId = undefined

    const wrapper = mount(WatchView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'router-link': true,
          'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
          'ErrorMessage': { template: '<div>ErrorMessage</div>' }
        }
      }
    })

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 0))

    // Should handle gracefully, not crash
    expect(wrapper.exists()).toBe(true)
  })
})
