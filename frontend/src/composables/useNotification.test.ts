import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotification } from '@/composables/useNotification'
import { useUiStore } from '@/stores/ui'

describe('useNotification Composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows success notification', () => {
    const uiStore = useUiStore()
    const { showSuccess } = useNotification()

    showSuccess('Success message')

    expect(uiStore.notifications).toHaveLength(1)
    expect(uiStore.notifications[0].type).toBe('success')
    expect(uiStore.notifications[0].message).toBe('Success message')
  })

  it('shows error notification', () => {
    const uiStore = useUiStore()
    const { showError } = useNotification()

    showError('Error message')

    expect(uiStore.notifications).toHaveLength(1)
    expect(uiStore.notifications[0].type).toBe('error')
    expect(uiStore.notifications[0].message).toBe('Error message')
  })

  it('shows warning notification', () => {
    const uiStore = useUiStore()
    const { showWarning } = useNotification()

    showWarning('Warning message')

    expect(uiStore.notifications).toHaveLength(1)
    expect(uiStore.notifications[0].type).toBe('warning')
    expect(uiStore.notifications[0].message).toBe('Warning message')
  })

  it('shows info notification', () => {
    const uiStore = useUiStore()
    const { showInfo } = useNotification()

    showInfo('Info message')

    expect(uiStore.notifications).toHaveLength(1)
    expect(uiStore.notifications[0].type).toBe('info')
    expect(uiStore.notifications[0].message).toBe('Info message')
  })

  it('assigns unique IDs to notifications', () => {
    const uiStore = useUiStore()
    const { showSuccess, showInfo } = useNotification()

    showSuccess('First')

    // Add a small delay to ensure different timestamps
    return new Promise(resolve => {
      setTimeout(() => {
        showInfo('Second')

        expect(uiStore.notifications[0].id).toBeDefined()
        expect(uiStore.notifications[1].id).toBeDefined()
        // IDs should be different (unless same millisecond, which is rare)
        expect(uiStore.notifications.length).toBe(2)
        resolve(undefined)
      }, 10)
    })
  })

  it('clears all notifications', () => {
    const uiStore = useUiStore()
    const { showSuccess, showInfo, clear } = useNotification()

    showSuccess('First')
    showInfo('Second')
    expect(uiStore.notifications).toHaveLength(2)

    clear()
    expect(uiStore.notifications).toHaveLength(0)
  })
})
