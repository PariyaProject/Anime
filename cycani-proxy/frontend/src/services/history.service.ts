import api from './api'
import type { WatchRecord, HistoryResponse, PositionRecord } from '@/types/history.types'
import type { BackendResponse } from '@/types/api.types'

/**
 * Information about an anime for history tracking
 */
export interface AnimeInfo {
  id: string
  title: string
  cover: string
}

/**
 * Information about an episode for history tracking
 */
export interface EpisodeInfo {
  season: number
  episode: number
  title?: string
  duration?: number
}

/**
 * LocalStorage position record for offline caching
 */
interface LocalPositionRecord {
  position: number
  lastUpdated: string  // ISO timestamp
  animeId: string
  animeTitle: string
  animeCover: string  // Cover image URL
  season: number
  episode: number
}

// LocalStorage key constants
const LS_KEY_PREFIX = 'watch_position_'
const LS_MAX_AGE = 30 * 24 * 60 * 60 * 1000  // 30 days in milliseconds

/**
 * Generate localStorage key for an episode position
 */
function getLocalKey(animeId: string, season: number, episode: number): string {
  return `${LS_KEY_PREFIX}${animeId}_${season}_${episode}`
}

/**
 * Clear old localStorage entries that exceed the max age
 */
function clearOldPositions(): void {
  try {
    const keysToDelete: string[] = []
    const now = Date.now()

    // Find all localStorage keys with our prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(LS_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const parsed: LocalPositionRecord = JSON.parse(data)
            const age = now - new Date(parsed.lastUpdated).getTime()
            if (age > 60 * 24 * 60 * 60 * 1000) {  // 60 days
              keysToDelete.push(key)
            }
          }
        } catch {
          // Invalid entry, mark for deletion
          keysToDelete.push(key)
        }
      }
    }

    // Delete old entries
    keysToDelete.forEach(key => localStorage.removeItem(key))
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleared ${keysToDelete.length} old localStorage entries`)
    }
  } catch (err) {
    console.error('Failed to clear old positions:', err)
  }
}

/**
 * Save position to localStorage with quota error handling
 * Returns true if save succeeded, false otherwise
 */
function saveToLocal(
  animeId: string,
  season: number,
  episode: number,
  position: number,
  animeTitle: string,
  animeCover: string
): boolean {
  try {
    const key = getLocalKey(animeId, season, episode)
    const data: LocalPositionRecord = {
      position,
      lastUpdated: new Date().toISOString(),
      animeId,
      animeTitle,
      animeCover,
      season,
      episode
    }
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('⚠️ localStorage quota exceeded, clearing old entries')
      clearOldPositions()
      // Retry once
      try {
        const key = getLocalKey(animeId, season, episode)
        const data: LocalPositionRecord = {
          position,
          lastUpdated: new Date().toISOString(),
          animeId,
          animeTitle,
          animeCover,
          season,
          episode
        }
        localStorage.setItem(key, JSON.stringify(data))
        return true
      } catch {
        console.error('❌ localStorage unavailable, using memory-only')
        return false
      }
    }
    console.error('❌ Failed to save to localStorage:', err)
    return false
  }
}

/**
 * Get position from localStorage
 * Returns null if not found or too old
 */
function getFromLocal(
  animeId: string,
  season: number,
  episode: number
): LocalPositionRecord | null {
  try {
    const key = getLocalKey(animeId, season, episode)
    const data = localStorage.getItem(key)
    if (!data) return null

    const parsed: LocalPositionRecord = JSON.parse(data)

    // Check if data is not too old
    const age = Date.now() - new Date(parsed.lastUpdated).getTime()
    if (age > LS_MAX_AGE) {
      console.log('📥 localStorage entry too old, ignoring')
      localStorage.removeItem(key)
      return null
    }

    return parsed
  } catch (err) {
    console.error('❌ Failed to read from localStorage:', err)
    return null
  }
}

/**
 * Clear position from localStorage
 */
function clearFromLocal(animeId: string, season: number, episode: number): void {
  try {
    const key = getLocalKey(animeId, season, episode)
    localStorage.removeItem(key)
  } catch (err) {
    console.error('❌ Failed to clear localStorage:', err)
  }
}

export const historyService = {
  async getWatchHistory(): Promise<WatchRecord[]> {
    const response = await api.get<HistoryResponse>('/api/watch-history')
    return response.data.data
  },

  async getContinueWatching(): Promise<WatchRecord[]> {
    const response = await api.get<HistoryResponse>('/api/continue-watching')
    return response.data.data
  },

  async saveHistoryRecord(record: WatchRecord): Promise<void> {
    await api.post('/api/watch-history', record)
  },

  /**
   * Save watch position using the backend's watch history endpoint.
   * The backend POST /api/watch-history accepts animeInfo and episodeInfo objects.
   *
   * @param animeInfo - Anime information (id, title, cover)
   * @param episodeInfo - Episode information (season, episode, optional title and duration)
   * @param position - Current playback position in seconds
   */
  async saveWatchPosition(
    animeInfo: AnimeInfo,
    episodeInfo: EpisodeInfo,
    position: number
  ): Promise<void> {
    await api.post<BackendResponse<WatchRecord>>('/api/watch-history', {
      animeInfo,
      episodeInfo,
      position
    })
  },

  /**
   * Save watch position to both localStorage and backend.
   * localStorage is synchronous and immediate, backend sync is async.
   *
   * @param animeInfo - Anime information (id, title, cover)
   * @param episodeInfo - Episode information (season, episode, optional title and duration)
   * @param position - Current playback position in seconds
   * @returns true if localStorage save succeeded
   */
  saveWatchPositionToLocal(
    animeInfo: AnimeInfo,
    episodeInfo: EpisodeInfo,
    position: number
  ): boolean {
    return saveToLocal(animeInfo.id, episodeInfo.season, episodeInfo.episode, position, animeInfo.title, animeInfo.cover)
  },

  /**
   * Get last position with priority loading:
   * 1. Try backend first (for cross-device sync)
   * 2. Fall back to localStorage (for offline support)
   * 3. Return null if neither has data
   *
   * @param animeId - Anime ID
   * @param season - Season number
   * @param episode - Episode number
   * @returns PositionRecord if found, null otherwise
   */
  async getLastPosition(
    animeId: string,
    season: number,
    episode: number
  ): Promise<PositionRecord | null> {
    // Priority 1: Try backend first (for cross-device sync)
    try {
      const response = await api.get<BackendResponse<PositionRecord | null>>(
        `/api/last-position/${animeId}/${season}/${episode}`
      )
      if (response.data.data?.position !== undefined) {
        console.log('📥 Loaded position from backend')
        return response.data.data
      }
    } catch (err) {
      console.log('📥 Backend unavailable, trying localStorage...')
    }

    // Priority 2: Fall back to localStorage
    const localData = getFromLocal(animeId, season, episode)
    if (localData) {
      console.log('📥 Loaded position from localStorage')
      return { position: localData.position, lastUpdated: localData.lastUpdated }
    }

    // Priority 3: No saved position found
    console.log('📥 No saved position found')
    return null
  },

  /**
   * Clear position from localStorage
   */
  clearLocalPosition(animeId: string, season: number, episode: number): void {
    clearFromLocal(animeId, season, episode)
  }
}
