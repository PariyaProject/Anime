import { describe, it, expect, vi, beforeEach } from 'vitest'
import { animeService } from '@/services/anime.service'
import type { Anime, AnimeDetails } from '@/types/anime.types'

// Mock the api module
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn()
  }
}))

// Import the mocked api
import api from '@/services/api'

const mockApiGet = vi.mocked(api.get)

describe('Anime Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAnimeList', () => {
    it('fetches anime list with default parameters', async () => {
      const mockResponse: Anime[] = [
        { id: '1', title: 'Anime 1' } as Anime,
        { id: '2', title: 'Anime 2' } as Anime
      ]

      mockApiGet.mockResolvedValueOnce({
        data: {
          animeList: mockResponse,
          totalCount: 2,
          totalPages: 1,
          currentPage: 1
        }
      } as any)

      const result = await animeService.getAnimeList()

      expect(mockApiGet).toHaveBeenCalledWith('/api/anime-list', { params: {} })
      expect(result.animeList).toEqual(mockResponse)
      expect(result.totalCount).toBe(2)
    })

    it('fetches anime list with filter parameters', async () => {
      const mockResponse: Anime[] = [
        { id: '1', title: 'Anime 1' } as Anime
      ]

      const filterParams = {
        keyword: 'test',
        genre: 'action',
        year: '2024',
        month: '1',
        sortBy: 'title',
        sortOrder: 'asc',
        page: 1,
        pageSize: 20
      }

      mockApiGet.mockResolvedValueOnce({
        data: {
          animeList: mockResponse,
          totalCount: 1,
          totalPages: 1,
          currentPage: 1
        }
      } as any)

      const result = await animeService.getAnimeList(filterParams)

      expect(mockApiGet).toHaveBeenCalledWith('/api/anime-list', { params: filterParams })
      expect(result.animeList).toHaveLength(1)
    })

    it('handles empty response', async () => {
      mockApiGet.mockResolvedValueOnce({
        data: {
          animeList: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 1
        }
      } as any)

      const result = await animeService.getAnimeList()

      expect(result.animeList).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    it('propagates API errors', async () => {
      const error = new Error('Network error')
      mockApiGet.mockRejectedValueOnce(error)

      await expect(animeService.getAnimeList()).rejects.toThrow('Network error')
    })
  })

  describe('getAnimeById', () => {
    it('fetches anime by id', async () => {
      const mockAnime: AnimeDetails = {
        id: '123',
        title: 'Test Anime',
        description: 'A test anime',
        cover: 'https://example.com/cover.jpg',
        episodes: []
      }

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockAnime
        }
      } as any)

      const result = await animeService.getAnimeById('123')

      expect(mockApiGet).toHaveBeenCalledWith('/api/anime/123')
      expect(result).toEqual(mockAnime)
    })

    it('fetches anime by numeric id', async () => {
      const mockAnime: AnimeDetails = {
        id: '456',
        title: 'Numeric ID Anime',
        description: 'Test',
        cover: '',
        episodes: []
      }

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockAnime
        }
      } as any)

      const result = await animeService.getAnimeById(456)

      expect(mockApiGet).toHaveBeenCalledWith('/api/anime/456')
      expect(result).toEqual(mockAnime)
    })

    it('propagates API errors', async () => {
      const error = new Error('Anime not found')
      mockApiGet.mockRejectedValueOnce(error)

      await expect(animeService.getAnimeById('999')).rejects.toThrow('Anime not found')
    })
  })
})
