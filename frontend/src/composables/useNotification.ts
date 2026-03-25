import { ref } from 'vue'
import type { Notification } from '@/stores/ui'
import { useUiStore } from '@/stores/ui'

export function useNotification() {
  const uiStore = useUiStore()

  function showSuccess(message: string, duration = 3000) {
    return uiStore.addNotification({
      type: 'success',
      message,
      duration
    })
  }

  function showError(message: string, duration = 5000) {
    return uiStore.addNotification({
      type: 'error',
      message,
      duration
    })
  }

  function showWarning(message: string, duration = 4000) {
    return uiStore.addNotification({
      type: 'warning',
      message,
      duration
    })
  }

  function showInfo(message: string, duration = 3000) {
    return uiStore.addNotification({
      type: 'info',
      message,
      duration
    })
  }

  function remove(id: string) {
    uiStore.removeNotification(id)
  }

  function clear() {
    uiStore.clearNotifications()
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    remove,
    clear
  }
}
