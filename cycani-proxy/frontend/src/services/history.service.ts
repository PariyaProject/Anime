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
   * @deprecated Use saveWatchPosition(animeInfo, episodeInfo, position) instead.
   * This method is kept for backward compatibility but will be removed.
   */
  async saveWatchPositionLegacy(
    animeId: string,
    season: number,
    episode: number,
    position: number
  ): Promise<void> {
    // This legacy method requires animeInfo and episodeInfo which we don't have.
    // Callers should migrate to the new saveWatchPosition method.
    console.warn(
      'saveWatchPositionLegacy is deprecated. ' +
      'Please use saveWatchPosition(animeInfo, episodeInfo, position) instead.'
    )
    throw new Error(
      'saveWatchPositionLegacy requires animeInfo and episodeInfo. ' +
      'Please migrate to saveWatchPosition method.'
    )
  },

  async getLastPosition(
    animeId: string,
    season: number,
    episode: number
  ): Promise<PositionRecord | null> {
    const response = await api.get<BackendResponse<PositionRecord | null>>(
      `/api/last-position/${animeId}/${season}/${episode}`
    )
    return response.data.data
  }
}
