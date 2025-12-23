import api from './api'
import type { WatchRecord, HistoryResponse, PositionRecord } from '@/types/history.types'

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

  async saveWatchPosition(
    animeId: string,
    season: number,
    episode: number,
    position: number
  ): Promise<void> {
    await api.post('/api/last-position', {
      animeId,
      season,
      episode,
      position
    })
  },

  async getLastPosition(
    animeId: string,
    season: number,
    episode: number
  ): Promise<PositionRecord | null> {
    const response = await api.get<{ success: boolean; data: PositionRecord | null }>(
      `/api/last-position/${animeId}/${season}/${episode}`
    )
    return response.data.data
  }
}
