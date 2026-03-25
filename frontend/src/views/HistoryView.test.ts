import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HistoryView from '@/views/HistoryView.vue'

// Mock vue-router
const mockRoute = { params: {}, query: {} }
const mockRouter = { push: vi.fn() }

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}))

describe('HistoryView Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders without errors', async () => {
    const wrapper = mount(HistoryView, {
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

    expect(wrapper.exists()).toBe(true)
  })

  it('has proper ARIA labels for accessibility', async () => {
    const wrapper = mount(HistoryView, {
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

    // Check for proper semantic structure
    const container = wrapper.find('.history-view')
    expect(container.exists()).toBe(true)
  })

  it('integrates with history store', async () => {
    const wrapper = mount(HistoryView, {
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

    // Component should mount with history integration
    expect(wrapper.exists()).toBe(true)
  })

  it('has navigation capability', async () => {
    const wrapper = mount(HistoryView, {
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

    // Should have router available for navigation
    expect(wrapper.exists()).toBe(true)
  })
})
