import { describe, it, expect, vi, beforeEach } from 'vitest'
import { historyService } from '@/services/history.service'
import type { WatchRecord, PositionRecord } from '@/types/history.types'

// Mock the api module
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

import api from '@/services/api'

const mockApiGet = vi.mocked(api.get)
const mockApiPost = vi.mocked(api.post)

describe('History Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getWatchHistory', () => {
    it('fetches watch history', async () => {
      const mockHistory: WatchRecord[] = [
        {
          animeId: '123',
          animeTitle: 'Test Anime',
          season: 1,
          episode: 1,
          position: 100,
          watchDate: '2024-01-01T00:00:00.000Z',
          completed: false
        }
      ]

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockHistory
        }
      } as any)

      const result = await historyService.getWatchHistory()

      expect(mockApiGet).toHaveBeenCalledWith('/api/watch-history')
      expect(result).toEqual(mockHistory)
    })

    it('returns empty array when no history', async () => {
      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: []
        }
      } as any)

      const result = await historyService.getWatchHistory()

      expect(result).toEqual([])
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to fetch history')
      mockApiGet.mockRejectedValueOnce(error)

      await expect(historyService.getWatchHistory()).rejects.toThrow('Failed to fetch history')
    })
  })

  describe('getContinueWatching', () => {
    it('fetches continue watching list', async () => {
      const mockContinueWatching: WatchRecord[] = [
        {
          animeId: '456',
          animeTitle: 'Continue Anime',
          season: 1,
          episode: 5,
          position: 300,
          watchDate: '2024-01-01T00:00:00.000Z',
          completed: false
        }
      ]

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockContinueWatching
        }
      } as any)

      const result = await historyService.getContinueWatching()

      expect(mockApiGet).toHaveBeenCalledWith('/api/continue-watching')
      expect(result).toEqual(mockContinueWatching)
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to fetch continue watching')
      mockApiGet.mockRejectedValueOnce(error)

      await expect(historyService.getContinueWatching()).rejects.toThrow('Failed to fetch continue watching')
    })
  })

  describe('saveHistoryRecord', () => {
    it('saves history record', async () => {
      const record: WatchRecord = {
        animeId: '789',
        animeTitle: 'New Anime',
        season: 1,
        episode: 1,
        position: 0,
        watchDate: new Date().toISOString(),
        completed: false
      }

      mockApiPost.mockResolvedValueOnce({ data: { success: true } } as any)

      await historyService.saveHistoryRecord(record)

      expect(mockApiPost).toHaveBeenCalledWith('/api/watch-history', record)
    })

    it('propagates API errors', async () => {
      const record: WatchRecord = {
        animeId: '789',
        animeTitle: 'New Anime',
        season: 1,
        episode: 1,
        position: 0,
        watchDate: new Date().toISOString(),
        completed: false
      }

      const error = new Error('Failed to save history')
      mockApiPost.mockRejectedValueOnce(error)

      await expect(historyService.saveHistoryRecord(record)).rejects.toThrow('Failed to save history')
    })
  })

  describe('saveWatchPosition', () => {
    it('saves watch position with animeInfo and episodeInfo', async () => {
      mockApiPost.mockResolvedValueOnce({ data: { success: true } } as any)

      const animeInfo = {
        id: '123',
        title: 'Test Anime',
        cover: 'https://example.com/cover.jpg'
      }
      const episodeInfo = {
        season: 1,
        episode: 1,
        title: 'Episode 1',
        duration: 1440
      }

      await historyService.saveWatchPosition(animeInfo, episodeInfo, 150)

      expect(mockApiPost).toHaveBeenCalledWith('/api/watch-history', {
        animeInfo,
        episodeInfo,
        position: 150
      })
    })

    it('handles position of 0', async () => {
      mockApiPost.mockResolvedValueOnce({ data: { success: true } } as any)

      const animeInfo = {
        id: '123',
        title: 'Test Anime',
        cover: 'https://example.com/cover.jpg'
      }
      const episodeInfo = {
        season: 1,
        episode: 1,
        title: 'Episode 1',
        duration: 1440
      }

      await historyService.saveWatchPosition(animeInfo, episodeInfo, 0)

      expect(mockApiPost).toHaveBeenCalledWith('/api/watch-history', {
        animeInfo,
        episodeInfo,
        position: 0
      })
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to save position')
      mockApiPost.mockRejectedValueOnce(error)

      const animeInfo = {
        id: '123',
        title: 'Test Anime',
        cover: 'https://example.com/cover.jpg'
      }
      const episodeInfo = {
        season: 1,
        episode: 1,
        title: 'Episode 1',
        duration: 1440
      }

      await expect(historyService.saveWatchPosition(animeInfo, episodeInfo, 150))
        .rejects.toThrow('Failed to save position')
    })
  })

  describe('getLastPosition', () => {
    it('fetches last position', async () => {
      const mockPosition: PositionRecord = {
        position: 200,
        lastUpdated: '2024-01-01T00:00:00.000Z'
      }

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockPosition
        }
      } as any)

      const result = await historyService.getLastPosition('123', 1, 1)

      expect(mockApiGet).toHaveBeenCalledWith('/api/last-position/123/1/1')
      expect(result).toEqual(mockPosition)
    })

    it('returns null when no position exists', async () => {
      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: null
        }
      } as any)

      const result = await historyService.getLastPosition('999', 1, 1)

      expect(result).toBeNull()
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to fetch position')
      mockApiGet.mockRejectedValueOnce(error)

      await expect(historyService.getLastPosition('123', 1, 1)).rejects.toThrow('Failed to fetch position')
    })
  })
})
