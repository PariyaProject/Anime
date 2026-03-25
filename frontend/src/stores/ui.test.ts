import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '@/stores/ui'

describe('UI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    })
  })

  it('has correct initial state', () => {
    const store = useUiStore()
    expect(store.darkMode).toBe(false)
    expect(store.sidebarOpen).toBe(false)
    expect(store.notifications).toEqual([])
    expect(store.filters).toEqual({
      search: '',
      genre: '',
      year: '',
      month: '',
      sort: 'time',
      channel: 'tv'
    })
  })

  it('toggles dark mode', () => {
    const store = useUiStore()
    expect(store.darkMode).toBe(false)

    store.toggleDarkMode()
    expect(store.darkMode).toBe(true)

    store.toggleDarkMode()
    expect(store.darkMode).toBe(false)
  })

  it('sets sidebar open state', () => {
    const store = useUiStore()
    expect(store.sidebarOpen).toBe(false)

    store.setSidebarOpen(true)
    expect(store.sidebarOpen).toBe(true)

    store.setSidebarOpen(false)
    expect(store.sidebarOpen).toBe(false)
  })

  it('updates filters', () => {
    const store = useUiStore()
    store.updateFilters({ search: 'test' })
    expect(store.filters.search).toBe('test')

    store.updateFilters({ genre: 'TV' })
    expect(store.filters.search).toBe('test') // Should preserve previous filter
    expect(store.filters.genre).toBe('TV')
  })

  it('adds notification', () => {
    const store = useUiStore()
    store.addNotification({
      type: 'success',
      message: 'Test notification'
    })

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].type).toBe('success')
    expect(store.notifications[0].message).toBe('Test notification')
    expect(store.notifications[0].id).toBeDefined()
  })

  it('removes notification', () => {
    const store = useUiStore()
    store.addNotification({
      type: 'info',
      message: 'Test'
    })

    const id = store.notifications[0].id
    store.removeNotification(id)

    expect(store.notifications).toHaveLength(0)
  })

  it('auto-dismisses notification after timeout', async () => {
    vi.useFakeTimers()
    const store = useUiStore()

    store.addNotification({
      type: 'info',
      message: 'Auto dismiss test'
    })

    expect(store.notifications).toHaveLength(1)

    // Fast-forward past the default timeout (5000ms)
    vi.advanceTimersByTime(5100)

    await vi.runAllTimersAsync()

    expect(store.notifications).toHaveLength(0)

    vi.useRealTimers()
  })
})
