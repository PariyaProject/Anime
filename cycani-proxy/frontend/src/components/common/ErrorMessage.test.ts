import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorMessage from '@/components/common/ErrorMessage.vue'

describe('ErrorMessage Component', () => {
  it('renders error message correctly', () => {
    const wrapper = mount(ErrorMessage, {
      props: { message: 'Test error message' }
    })

    expect(wrapper.text()).toContain('Test error message')
  })

  it('has alert role for accessibility', () => {
    const wrapper = mount(ErrorMessage, {
      props: { message: 'Test error' }
    })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('has aria-live attribute for screen readers', () => {
    const wrapper = mount(ErrorMessage, {
      props: { message: 'Test error' }
    })

    expect(wrapper.find('[aria-live="assertive"]').exists()).toBe(true)
  })

  it('does not show retry button by default', () => {
    const wrapper = mount(ErrorMessage, {
      props: { message: 'Test error' }
    })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('shows retry button when showRetry is true', () => {
    const wrapper = mount(ErrorMessage, {
      props: { message: 'Test error', showRetry: true }
    })

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('重试')
  })

  it('emits retry event when retry button is clicked', async () => {
    const wrapper = mount(ErrorMessage, {
      props: { message: 'Test error', showRetry: true }
    })

    const button = wrapper.find('button')
    await button.trigger('click')

    expect(wrapper.emitted('retry')).toBeTruthy()
    expect(wrapper.emitted('retry')?.length).toBe(1)
  })

  it('displays error icon with aria-hidden', () => {
    const wrapper = mount(ErrorMessage, {
      props: { message: 'Test error' }
    })

    const icon = wrapper.find('.bi-exclamation-triangle-fill')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('aria-hidden')).toBe('true')
  })
})
