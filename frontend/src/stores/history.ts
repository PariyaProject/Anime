import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WatchRecord, PositionRecord, HistoryImportMode } from '@/types/history.types'
import { historyService, type AnimeInfo, type EpisodeInfo } from '@/services/history.service'

export const useHistoryStore = defineStore('history', () => {
  // State
  const watchHistory = ref<WatchRecord[]>([])
  const continueWatching = ref<WatchRecord[]>([])
  const lastPositions = ref<Record<string, PositionRecord>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Track last saved position to avoid duplicate saves
  const lastSavedPositions = ref<Record<string, number>>({})

  // Getters
  const hasHistory = computed(() => watchHistory.value.length > 0)
  const hasContinueWatching = computed(() => continueWatching.value.length > 0)

  // Actions
  async function loadWatchHistory() {
    loading.value = true
    error.value = null
    try {
      watchHistory.value = await historyService.getWatchHistory()
    } catch (err: any) {
      error.value = err.message || 'Failed to load watch history'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadContinueWatching() {
    loading.value = true
    error.value = null
    try {
      continueWatching.value = await historyService.getContinueWatching()
    } catch (err: any) {
      error.value = err.message || 'Failed to load continue watching'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function exportWatchHistory() {
    return historyService.exportWatchHistory()
  }

  async function importWatchHistory(payload: unknown, mode: HistoryImportMode = 'merge') {
    const result = await historyService.importWatchHistory(payload, mode)
    await Promise.allSettled([
      loadWatchHistory(),
      loadContinueWatching()
    ])
    return result
  }

  async function syncLocalPositionsToBackend() {
    try {
      await historyService.syncLocalPositionsToBackend()
    } catch (err: any) {
      if (err?.status === 401) {
        return
      }
      throw err
    }
  }

  async function addToHistory(record: WatchRecord) {
    try {
      await historyService.saveHistoryRecord(record)

      // Update local state
      const existingIndex = watchHistory.value.findIndex(
        (r) =>
          r.animeId === record.animeId &&
          r.season === record.season &&
          r.episode === record.episode
      )

      if (existingIndex >= 0) {
        watchHistory.value[existingIndex] = record
      } else {
        watchHistory.value.unshift(record)
      }

      // Update continue watching if not completed
      if (!record.completed) {
        const existingContinueIndex = continueWatching.value.findIndex(
          (r) => r.animeId === record.animeId
        )
        if (existingContinueIndex >= 0) {
          continueWatching.value[existingContinueIndex] = record
        } else {
          continueWatching.value.unshift(record)
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to save history'
      throw err
    }
  }

  /**
   * Save watch position with anime and episode information.
   * This replaces the old savePosition(animeId, season, episode, position) method.
   */
  async function savePosition(
    animeInfo: AnimeInfo,
    episodeInfo: EpisodeInfo,
    position: number
  ) {
    try {
      await historyService.saveWatchPosition(animeInfo, episodeInfo, position)

      const key = `${animeInfo.id}_${episodeInfo.season}_${episodeInfo.episode}`
      lastPositions.value[key] = {
        position,
        lastUpdated: new Date().toISOString()
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to save position'
      throw err
    }
  }

  /**
   * Save watch position immediately to localStorage and backend.
   * This is the new event-driven save method that replaces interval-based saves.
   *
   * - localStorage: Saved synchronously and immediately (always available)
   * - Backend: Saved asynchronously (non-blocking)
   *
   * @param animeInfo - Anime information (id, title, cover)
   * @param episodeInfo - Episode information (season, episode, optional title and duration)
   * @param position - Current playback position in seconds
   * @param skipThreshold - Minimum position change to trigger save (default: 5 seconds)
   */
  function savePositionImmediate(
    animeInfo: AnimeInfo,
    episodeInfo: EpisodeInfo,
    position: number,
    skipThreshold = 5
  ) {
    // Validate animeId presence before processing save
    if (!animeInfo?.id) {
      console.error('❌ Cannot save: animeInfo.id is missing', { animeInfo, episodeInfo, position })
      return
    }

    const key = `${animeInfo.id}_${episodeInfo.season}_${episodeInfo.episode}`

    // Check if position changed significantly (avoid duplicate saves)
    const lastSaved = lastSavedPositions.value[key]
    const knownPosition = Math.max(
      Number(lastPositions.value[key]?.position || 0),
      Number(lastSaved ?? 0)
    )
    const incomingDuration = Number(episodeInfo.duration || 0)
    const suspiciousEarlyOverwrite = incomingDuration <= 0 && position <= 5 && knownPosition > 5

    // Ignore suspicious near-zero regressions when we already know a valid resume point.
    if ((position <= 1 && knownPosition > 5) || suspiciousEarlyOverwrite) {
      console.warn('⏭️ Skipping suspicious near-zero position overwrite', {
        key,
        incoming: position,
        knownPosition,
        incomingDuration
      })
      return
    }

    if (lastSaved !== undefined && Math.abs(position - lastSaved) < skipThreshold) {
      return // Skip save if position hasn't changed much
    }

    // Save to localStorage immediately (synchronous)
    const localSaved = historyService.saveWatchPositionToLocal(animeInfo, episodeInfo, position)
    if (localSaved) {
      console.log('💾 Position saved to localStorage')
    }

    // Update local state
    lastPositions.value[key] = {
      position,
      lastUpdated: new Date().toISOString()
    }
    lastSavedPositions.value[key] = position

    // Backend sync (async, non-blocking - no debounce to avoid build issues)
    historyService.saveWatchPosition(animeInfo, episodeInfo, position).then(() => {
      console.log('✅ Synced position to backend')
    }).catch((err) => {
      if (err?.status === 401) {
        return
      }
      console.warn('⚠️ Backend sync failed (data safe in localStorage):', err)
    })
  }

  /**
   * @deprecated Use savePosition(animeInfo, episodeInfo, position) instead.
   * This method will be removed in a future version.
   */
  async function savePositionLegacy(
    animeId: string,
    season: number,
    episode: number,
    position: number
  ) {
    console.warn('savePositionLegacy is deprecated. Use savePosition with animeInfo and episodeInfo instead.')
    const key = `${animeId}_${season}_${episode}`
    lastPositions.value[key] = {
      position,
      lastUpdated: new Date().toISOString()
    }
  }

  async function loadLastPosition(animeId: string, season: number, episode: number) {
    try {
      const positionRecord = await historyService.getLastPosition(animeId, season, episode)

      if (positionRecord) {
        const key = `${animeId}_${season}_${episode}`
        lastPositions.value[key] = positionRecord
        return positionRecord.position
      }

      return 0
    } catch (err: any) {
      error.value = err.message || 'Failed to load last position'
      return 0
    }
  }

  /**
   * Get last saved position for an episode without updating local state.
   * Returns null if no position exists or API call fails.
   */
  async function getLastPosition(
    animeId: string,
    season: number,
    episode: number
  ): Promise<number | null> {
    try {
      const positionRecord = await historyService.getLastPosition(animeId, season, episode)
      return positionRecord?.position || null
    } catch (err) {
      console.error('Failed to get last position:', err)
      return null
    }
  }

  function getPosition(animeId: string, season: number, episode: number): number {
    const key = `${animeId}_${season}_${episode}`
    return lastPositions.value[key]?.position || 0
  }

  function clearError() {
    error.value = null
  }

  function resetState() {
    watchHistory.value = []
    continueWatching.value = []
    lastPositions.value = {}
    lastSavedPositions.value = {}
    loading.value = false
    error.value = null
  }

  return {
    // State
    watchHistory,
    continueWatching,
    lastPositions,
    loading,
    error,
    // Getters
    hasHistory,
    hasContinueWatching,
    // Actions
    loadWatchHistory,
    loadContinueWatching,
    exportWatchHistory,
    importWatchHistory,
    syncLocalPositionsToBackend,
    addToHistory,
    savePosition,
    savePositionImmediate,
    savePositionLegacy,
    loadLastPosition,
    getLastPosition,
    getPosition,
    clearError,
    resetState
  }
})
