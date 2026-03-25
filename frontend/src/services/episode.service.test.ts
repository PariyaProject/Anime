import { describe, it, expect, vi, beforeEach } from 'vitest'
import { episodeService } from '@/services/episode.service'
import type { EpisodeData } from '@/types/episode.types'

// Mock the api module
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn()
  }
}))

import api from '@/services/api'

const mockApiGet = vi.mocked(api.get)

describe('Episode Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEpisode', () => {
    it('fetches episode data', async () => {
      const mockEpisode = { ...({} as any), 
        animeId: '123',
        season: 1,
        episode: 1,
        videoUrl: 'https://example.com/video.mp4',
        realVideoUrl: 'https://example.com/real.mp4'
      }

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockEpisode
        }
      } as any)

      const result = await episodeService.getEpisode('123', 1, 1)

      expect(mockApiGet).toHaveBeenCalledWith('/api/episode/123/1/1')
      expect(result).toEqual(mockEpisode)
    })

    it('propagates API errors', async () => {
      const error = new Error('Episode not found')
      mockApiGet.mockRejectedValueOnce(error)

      await expect(episodeService.getEpisode('999', 1, 1)).rejects.toThrow('Episode not found')
    })
  })

  describe('parseVideoUrl', () => {
    it('returns realVideoUrl when available', () => {
      const episodeData = { ...({} as any), 
        animeId: '123',
        season: 1,
        episode: 1,
        videoUrl: 'https://example.com/video.mp4',
        realVideoUrl: 'https://example.com/real.mp4'
      }

      const result = episodeService.parseVideoUrl(episodeData)

      expect(result).toBe('https://example.com/real.mp4')
    })

    it('falls back to iframeVideoUrl when realVideoUrl is not available', () => {
      const episodeData = { ...({} as any), 
        animeId: '123',
        season: 1,
        episode: 1,
        iframeVideoUrl: 'https://player.example.com/watch?id=123'
      }

      const result = episodeService.parseVideoUrl(episodeData)

      expect(result).toBe('https://player.example.com/watch?id=123')
    })

    it('returns null when neither realVideoUrl nor iframeVideoUrl are available', () => {
      const episodeData = { ...({} as any), 
        animeId: '123',
        season: 1,
        episode: 1,
        originalUrl: 'https://example.com/original.mp4'
      }

      const result = episodeService.parseVideoUrl(episodeData)

      expect(result).toBeNull()
    })
  })

  describe('isValidVideoUrl', () => {
    it('returns true for valid mp4 URLs', () => {
      expect(episodeService.isValidVideoUrl('https://example.com/video.mp4')).toBe(true)
      expect(episodeService.isValidVideoUrl('http://example.com/video.mp4?token=123')).toBe(true)
    })

    it('returns true for valid webm URLs', () => {
      expect(episodeService.isValidVideoUrl('https://example.com/video.webm')).toBe(true)
    })

    it('returns true for valid m3u8 URLs', () => {
      expect(episodeService.isValidVideoUrl('https://example.com/stream.m3u8')).toBe(true)
    })

    it('returns true for player URLs', () => {
      expect(episodeService.isValidVideoUrl('https://player.example.com/video')).toBe(true)
      expect(episodeService.isValidVideoUrl('http://player.cycanime.com/video')).toBe(true)
    })

    it('returns true for cycani proxy URLs', () => {
      expect(episodeService.isValidVideoUrl('cycani-dcd01-7c0057fe4756658131a29301cfc4cf0f1754962525')).toBe(true)
      expect(episodeService.isValidVideoUrl('CYCANI-abc123-xyz')).toBe(true)
    })

    it('returns false for invalid URLs', () => {
      expect(episodeService.isValidVideoUrl('')).toBe(false)
      expect(episodeService.isValidVideoUrl('not-a-url')).toBe(false)
      expect(episodeService.isValidVideoUrl('https://example.com/image.jpg')).toBe(false)
    })

    it('returns false for null or undefined', () => {
      expect(episodeService.isValidVideoUrl(null as any)).toBe(false)
      expect(episodeService.isValidVideoUrl(undefined as any)).toBe(false)
    })

    it('returns false for non-string values', () => {
      expect(episodeService.isValidVideoUrl(123 as any)).toBe(false)
      expect(episodeService.isValidVideoUrl({} as any)).toBe(false)
    })
  })

  describe('extractVideoId', () => {
    it('extracts video ID from cycani proxy URLs', () => {
      const url = 'cycani-dcd01-7c0057fe4756658131a29301cfc4cf0f1754962525'
      const result = episodeService.extractVideoId(url)

      // The ID should be the middle part between cycani- and the final hash
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('extracts video ID from standard URLs', () => {
      const url = 'https://example.com/videos/video-123.mp4'
      const result = episodeService.extractVideoId(url)

      expect(result).toBe('video-123.mp4')
    })

    it('extracts filename from URL path', () => {
      const url = 'https://cdn.example.com/anime/episode1.mp4?token=abc'
      const result = episodeService.extractVideoId(url)

      expect(result).toBe('episode1.mp4')
    })

    it('returns null for empty string', () => {
      const result = episodeService.extractVideoId('')
      expect(result).toBeNull()
    })

    it('returns null for null or undefined', () => {
      expect(episodeService.extractVideoId(null as any)).toBeNull()
      expect(episodeService.extractVideoId(undefined as any)).toBeNull()
    })

    it('returns null for invalid URLs', () => {
      const result = episodeService.extractVideoId('not-a-valid-url')
      // For invalid URLs, it will try to parse and fail, returning null
      expect(result).toBeNull()
    })
  })
})
