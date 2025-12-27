import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export interface FilterState {
  search: string
  genre: string
  year: string
  month: string
  sort: 'time' | 'hits' | 'score'
}

export const useUiStore = defineStore('ui', () => {
  // State
  const darkMode = ref(false)
  const sidebarOpen = ref(false)
  const filters = ref<FilterState>({
    search: '',
    genre: '',
    year: '',
    month: '',
    sort: 'time'
  })
  const notifications = ref<Notification[]>([])

  // Actions
  function toggleDarkMode() {
    darkMode.value = !darkMode.value
  }

  function setSidebarOpen(open: boolean) {
    sidebarOpen.value = open
  }

  function updateFilters(newFilters: Partial<FilterState>) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function resetFilters() {
    filters.value = {
      search: '',
      genre: '',
      year: '',
      month: '',
      sort: 'time'
    }
  }

  function addNotification(notification: Omit<Notification, 'id'>) {
    const id = Date.now().toString()
    notifications.value.push({ ...notification, id })

    const duration = notification.duration || 3000
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index >= 0) {
      notifications.value.splice(index, 1)
    }
  }

  function clearNotifications() {
    notifications.value = []
  }

  // Convenience function for showing notifications
  function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration?: number) {
    addNotification({ message, type, duration })
  }

  // Persistence
  let isLoadingPreference = true

  function loadDarkModePreference() {
    isLoadingPreference = true
    const saved = localStorage.getItem('darkMode')
    if (saved === 'enabled') {
      darkMode.value = true
    } else if (saved === 'disabled') {
      darkMode.value = false
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      darkMode.value = true
    } else {
      darkMode.value = false
    }
    // Update DOM immediately on load
    if (darkMode.value) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
    isLoadingPreference = false
  }

  // Watch dark mode changes and persist (skip during preference loading)
  watch(darkMode, (value) => {
    if (isLoadingPreference) return

    // Update DOM
    if (value) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
    // Persist to localStorage
    localStorage.setItem('darkMode', value ? 'enabled' : 'disabled')
  }, { immediate: true })

  return {
    // State
    darkMode,
    sidebarOpen,
    filters,
    notifications,
    // Actions
    toggleDarkMode,
    setSidebarOpen,
    updateFilters,
    resetFilters,
    addNotification,
    removeNotification,
    clearNotifications,
    showNotification,
    loadDarkModePreference
  }
})
