import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

describe('LoadingSpinner Component', () => {
  it('renders correctly', () => {
    const wrapper = mount(LoadingSpinner)
    expect(wrapper.exists()).toBe(true)
  })

  it('contains spinner element', () => {
    const wrapper = mount(LoadingSpinner)
    const spinner = wrapper.find('.spinner-border')
    expect(spinner.exists()).toBe(true)
  })

  it('has correct role attribute', () => {
    const wrapper = mount(LoadingSpinner)
    const spinner = wrapper.find('.spinner-border')
    expect(spinner.attributes('role')).toBe('status')
  })
})
