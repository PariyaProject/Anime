import { ref, readonly, onUnmounted } from 'vue'
import type { WatchRecord } from '@/types/history.types'
import { historyService } from '@/services/history.service'

export function useHistory(autoSaveInterval = 30000) {
  const loading = ref(false)
  const error = ref<string | null>(null)

  let saveInterval: number | null = null

  async function loadHistory() {
    loading.value = true
    error.value = null
    try {
      const history = await historyService.getWatchHistory()
      return history
    } catch (err: any) {
      error.value = err.message || 'Failed to load history'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadContinueWatching() {
    loading.value = true
    error.value = null
    try {
      const continueWatching = await historyService.getContinueWatching()
      return continueWatching
    } catch (err: any) {
      error.value = err.message || 'Failed to load continue watching'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function savePosition(
    animeId: string,
    season: number,
    episode: number,
    position: number
  ) {
    try {
      await historyService.saveWatchPosition(animeId, season, episode, position)
    } catch (err: any) {
      error.value = err.message || 'Failed to save position'
      throw err
    }
  }

  async function saveHistory(record: WatchRecord) {
    try {
      await historyService.saveHistoryRecord(record)
    } catch (err: any) {
      error.value = err.message || 'Failed to save history'
      throw err
    }
  }

  function startAutoSave(
    animeId: string,
    season: number,
    episode: number,
    getPosition: () => number
  ) {
    if (saveInterval) return

    saveInterval = window.setInterval(() => {
      const position = getPosition()
      if (position > 0) {
        savePosition(animeId, season, episode, position)
      }
    }, autoSaveInterval)
  }

  function stopAutoSave() {
    if (saveInterval) {
      clearInterval(saveInterval)
      saveInterval = null
    }
  }

  onUnmounted(() => {
    stopAutoSave()
  })

  return {
    loading: readonly(loading),
    error: readonly(error),
    loadHistory,
    loadContinueWatching,
    savePosition,
    saveHistory,
    startAutoSave,
    stopAutoSave
  }
}
