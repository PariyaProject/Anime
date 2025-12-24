import api from './api'
import type {
  Anime,
  AnimeListResponse,
  AnimeDetails,
  FilterParams,
  SearchResponse
} from '@/types/anime.types'
import type { BackendResponse } from '@/types/api.types'

export const animeService = {
  async getAnimeList(params: FilterParams = {}): Promise<AnimeListResponse['data']> {
    const response = await api.get<AnimeListResponse>('/api/anime-list', { params })
    return response.data.data
  },

  async getAnimeById(id: string | number): Promise<AnimeDetails> {
    const response = await api.get<BackendResponse<AnimeDetails>>(`/api/anime/${id}`)
    return response.data.data
  },

  /**
   * Search for anime using the dedicated search endpoint.
   * @param query - Search query string (minimum 2 characters)
   * @returns Search results with matching anime list
   */
  async searchAnime(query: string): Promise<SearchResponse> {
    if (!query || query.trim().length < 2) {
      return {
        animeList: [],
        searchQuery: query,
        totalCount: 0
      }
    }
    const response = await api.get<BackendResponse<SearchResponse>>('/api/search-anime', {
      params: { q: query.trim() }
    })
    return response.data.data
  },

  /**
   * Get properly proxied image URL for external images.
   * Returns proxy URL for external images, null for invalid URLs.
   * @param originalUrl - Original image URL (can be http, https, or already proxied)
   * @returns Proxied URL or null
   */
  getImageProxyUrl(originalUrl: string | null | undefined): string | null {
    if (!originalUrl) return null
    if (originalUrl.startsWith('/api/')) return originalUrl // Already proxied
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`
    }
    return null
  }
}
