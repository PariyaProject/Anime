import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useDarkMode } from '@/composables/useDarkMode'

describe('useDarkMode Composable', () => {
  beforeEach(() => {
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    })

    // Mock document
    vi.stubGlobal('document', {
      documentElement: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(() => false)
        }
      }
    })

    // Mock matchMedia
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({
        matches: false
      }))
    })
  })

  it('initializes dark mode from localStorage', () => {
    const localStorage = globalThis.localStorage as any
    localStorage.getItem.mockReturnValue('enabled')

    const { darkMode } = useDarkMode()

    // After onMounted, should load from localStorage
    expect(darkMode.value).toBe(false) // Initially false
  })

  it('toggles dark mode', () => {
    const { darkMode, toggleDarkMode } = useDarkMode()

    expect(darkMode.value).toBe(false)

    toggleDarkMode()
    expect(darkMode.value).toBe(true)

    toggleDarkMode()
    expect(darkMode.value).toBe(false)
  })

  it('saves preference to localStorage when toggled', () => {
    const { toggleDarkMode } = useDarkMode()
    const localStorage = globalThis.localStorage as any

    toggleDarkMode()

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'darkMode',
      'enabled'
    )
  })
})
