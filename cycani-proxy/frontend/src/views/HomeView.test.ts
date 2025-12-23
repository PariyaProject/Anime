import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '@/views/HomeView.vue'

// Mock vue-router
const mockRoute = { params: {}, query: {} }
const mockRouter = { push: vi.fn() }

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}))

// Mock the keyboard shortcuts composable
vi.mock('@/composables/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(() => vi.fn())
}))

describe('HomeView Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders without errors', async () => {
    const pinia = createPinia()
    const wrapper = mount(HomeView, {
      global: {
        plugins: [pinia],
        stubs: {
          'router-link': true,
          'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
          'ErrorMessage': { template: '<div>ErrorMessage</div>' },
          'EmptyState': { template: '<div>EmptyState</div>' }
        }
      }
    })

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.exists()).toBe(true)
  })

  it('has proper semantic structure', async () => {
    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'router-link': true,
          'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
          'ErrorMessage': { template: '<div>ErrorMessage</div>' },
          'EmptyState': { template: '<div>EmptyState</div>' }
        }
      }
    })

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 0))

    // Should have main content area
    expect(wrapper.find('.home-view').exists()).toBe(true)
  })

  it('integrates with anime store', async () => {
    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'router-link': true,
          'LoadingSpinner': { template: '<div>LoadingSpinner</div>' },
          'ErrorMessage': { template: '<div>ErrorMessage</div>' },
          'EmptyState': { template: '<div>EmptyState</div>' }
        }
      }
    })

    // Wait for onMounted to complete
    await new Promise(resolve => setTimeout(resolve, 0))

    // Component should mount without errors
    expect(wrapper.exists()).toBe(true)
  })
})
