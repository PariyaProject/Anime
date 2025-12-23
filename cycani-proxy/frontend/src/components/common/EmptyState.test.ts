import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '@/components/common/EmptyState.vue'

describe('EmptyState Component', () => {
  it('renders title and description correctly', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No Data',
        description: 'There is no data to display'
      }
    })

    expect(wrapper.text()).toContain('No Data')
    expect(wrapper.text()).toContain('There is no data to display')
  })

  it('uses default icon when not provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'Test',
        description: 'Test description'
      }
    })

    expect(wrapper.find('.bi-inbox').exists()).toBe(true)
  })

  it('uses custom icon when provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        icon: 'bi bi-search',
        title: 'Test',
        description: 'Test description'
      }
    })

    expect(wrapper.find('.bi-search').exists()).toBe(true)
    expect(wrapper.find('.bi-inbox').exists()).toBe(false)
  })

  it('renders slot content', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'Test',
        description: 'Test description'
      },
      slots: {
        default: '<button class="action-btn">Action Button</button>'
      }
    })

    expect(wrapper.find('.action-btn').exists()).toBe(true)
    expect(wrapper.text()).toContain('Action Button')
  })

  it('has proper CSS classes', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'Test',
        description: 'Test description'
      }
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-icon').exists()).toBe(true)
    expect(wrapper.find('.empty-title').exists()).toBe(true)
    expect(wrapper.find('.empty-description').exists()).toBe(true)
  })
})
