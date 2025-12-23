import api from './api'
import type { EpisodeData, EpisodeResponse } from '@/types/episode.types'

export const episodeService = {
  async getEpisode(
    animeId: string,
    season: number,
    episode: number
  ): Promise<EpisodeData> {
    const response = await api.get<EpisodeResponse>(
      `/api/episode/${animeId}/${season}/${episode}`
    )
    return response.data.data
  },

  /**
   * Parse and validate video URL
   * Handles different URL formats and ensures proper video source
   */
  parseVideoUrl(episodeData: EpisodeData): string | null {
    // Prefer realVideoUrl if available (decrypted URL)
    if (episodeData.realVideoUrl) {
      return episodeData.realVideoUrl
    }

    // Fall back to videoUrl
    if (episodeData.videoUrl) {
      return episodeData.videoUrl
    }

    // If we have an originalUrl, try to use it
    if (episodeData.originalUrl) {
      return episodeData.originalUrl
    }

    return null
  },

  /**
   * Check if video URL is valid and playable
   */
  isValidVideoUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false
    }

    // Check for common video URL patterns
    const validPatterns = [
      /^https?:\/\/.+\.(mp4|webm|ogg|m3u8)(\?.*)?$/i,
      /^https?:\/\/player\./i,
      /^cycani-/i, // Special pattern for cycani proxy URLs
    ]

    return validPatterns.some(pattern => pattern.test(url))
  },

  /**
   * Extract video ID from various URL formats
   */
  extractVideoId(url: string): string | null {
    if (!url) return null

    // Handle cycani proxy URLs
    const cycaniMatch = url.match(/^cycani-[a-z0-9]+-/i)
    if (cycaniMatch) {
      return url.split('-').slice(1, -1).join('-')
    }

    // Handle standard URLs
    try {
      const urlObj = new URL(url)
      return urlObj.pathname.split('/').pop() || null
    } catch {
      return null
    }
  }
}
