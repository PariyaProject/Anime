import { ref, readonly, onUnmounted } from 'vue'
import type { WatchRecord } from '@/types/history.types'
import { historyService, type AnimeInfo, type EpisodeInfo } from '@/services/history.service'

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

  /**
   * Save watch position with anime and episode information.
   * @param animeInfo - Anime information (id, title, cover)
   * @param episodeInfo - Episode information (season, episode, optional title and duration)
   * @param position - Current playback position in seconds
   */
  async function savePosition(
    animeInfo: AnimeInfo,
    episodeInfo: EpisodeInfo,
    position: number
  ) {
    try {
      await historyService.saveWatchPosition(animeInfo, episodeInfo, position)
    } catch (err: any) {
      error.value = err.message || 'Failed to save position'
      throw err
    }
  }

  /**
   * @deprecated Use savePosition(animeInfo, episodeInfo, position) instead.
   */
  async function savePositionLegacy(
    animeId: string,
    season: number,
    episode: number,
    position: number
  ) {
    console.warn('savePositionLegacy is deprecated. Use savePosition with animeInfo and episodeInfo instead.')
    // This doesn't call the backend since we don't have animeInfo/episodeInfo
    // Kept for backward compatibility during transition
  }

  async function saveHistory(record: WatchRecord) {
    try {
      await historyService.saveHistoryRecord(record)
    } catch (err: any) {
      error.value = err.message || 'Failed to save history'
      throw err
    }
  }

  /**
   * Start auto-save interval with anime and episode information.
   * @param animeInfo - Anime information (id, title, cover)
   * @param episodeInfo - Episode information (season, episode, optional title and duration)
   * @param getPosition - Function that returns current playback position
   */
  function startAutoSave(
    animeInfo: AnimeInfo,
    episodeInfo: EpisodeInfo,
    getPosition: () => number
  ) {
    if (saveInterval) return

    saveInterval = window.setInterval(() => {
      const position = getPosition()
      if (position > 0) {
        savePosition(animeInfo, episodeInfo, position)
      }
    }, autoSaveInterval)
  }

  /**
   * @deprecated Use startAutoSave with animeInfo and episodeInfo instead.
   */
  function startAutoSaveLegacy(
    animeId: string,
    season: number,
    episode: number,
    getPosition: () => number
  ) {
    console.warn('startAutoSaveLegacy is deprecated. Use startAutoSave with animeInfo and episodeInfo instead.')
    if (saveInterval) return

    saveInterval = window.setInterval(() => {
      const position = getPosition()
      if (position > 0) {
        // Can't save without animeInfo/episodeInfo
        console.warn('Cannot auto-save without animeInfo and episodeInfo. Please migrate to new API.')
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
    savePositionLegacy,
    saveHistory,
    startAutoSave,
    startAutoSaveLegacy,
    stopAutoSave
  }
}
