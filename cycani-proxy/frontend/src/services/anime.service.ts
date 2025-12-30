import api from './api'
import type {
  Anime,
  AnimeListResponse,
  AnimeDetails,
  FilterParams,
  SearchResponse
} from '@/types/anime.types'
import type { BackendResponse } from '@/types/api.types'
import { useCacheSettings } from '@/composables/useCacheSettings'

export const animeService = {
  /**
   * Get anime list with hybrid search mode support.
   * - If search text is present: uses local search (/api/search-local)
   * - If no search text: uses filter mode (/api/anime-list with filters)
   * @param params - Filter parameters including optional search text
   * @returns Anime list matching the criteria
   */
  async getAnimeList(params: FilterParams = {}): Promise<AnimeListResponse['data']> {
    const { search, channel = 'tv', ...filterParams } = params

    // Hybrid Search Mode: use local search when search text is present
    // Note: search returns results from all channels regardless of current channel filter
    if (search && search.trim().length >= 2) {
      return this.searchAnimeLocal(search.trim())
    }

    // Filter Mode: use anime-list endpoint with filters
    const { isEnabled } = useCacheSettings()
    const response = await api.get<AnimeListResponse>('/api/anime-list', {
      params: {
        ...filterParams,
        channel,  // Pass channel parameter to API
        useCache: isEnabled() ? 'true' : 'false'
      }
    })
    return response.data.data
  },

  async getAnimeById(id: string | number): Promise<AnimeDetails> {
    const response = await api.get<BackendResponse<AnimeDetails>>(`/api/anime/${id}`)
    return response.data.data
  },

  /**
   * Search for anime using the local search endpoint (no CAPTCHA).
   * This is the preferred search method.
   * @param query - Search query string (minimum 2 characters)
   * @returns Search results with matching anime list
   */
  async searchAnimeLocal(query: string): Promise<AnimeListResponse['data']> {
    if (!query || query.trim().length < 2) {
      return {
        animeList: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1
      }
    }

    try {
      const response = await api.get<BackendResponse<SearchResponse & { indexLastUpdated?: string }>>('/api/search-local', {
        params: { q: query.trim() }
      })

      // Transform search response to match AnimeListResponse format
      return {
        animeList: response.data.data.animeList as unknown as Anime[],
        totalCount: response.data.data.totalCount,
        totalPages: 1, // Search results are not paginated
        currentPage: 1
      }
    } catch (error: any) {
      // If local search fails (e.g., index not built), return empty results
      console.warn('Local search failed, returning empty results:', error.message)
      return {
        animeList: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1
      }
    }
  },

  /**
   * Search for anime using the legacy remote search endpoint (requires CAPTCHA).
   * This is kept as a fallback if local search is not available.
   * @param query - Search query string (minimum 2 characters)
   * @returns Search results with matching anime list
   * @deprecated Use searchAnimeLocal instead for better performance and no CAPTCHA
   */
  async searchAnimeLegacy(query: string): Promise<SearchResponse> {
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
   * Get index status for monitoring.
   * @returns Index status information
   */
  async getIndexStatus(): Promise<{ totalAnime: number; lastUpdated: string | null; isBuilding: boolean }> {
    try {
      const response = await api.get<BackendResponse<{ totalAnime: number; lastUpdated: string | null; isBuilding: boolean }>>('/api/index-status')
      return response.data.data
    } catch (error) {
      return { totalAnime: 0, lastUpdated: null, isBuilding: false }
    }
  },

  /**
   * Get image URL directly without proxy.
   * Returns the original URL for direct browser access.
   * @param originalUrl - Original image URL (can be http, https, or already proxied)
   * @returns Original image URL or null
   */
  getImageProxyUrl(originalUrl: string | null | undefined): string | null {
    if (!originalUrl) return null
    // Return original URL directly - no proxy needed
    if (originalUrl.startsWith('/api/')) return originalUrl // Already proxied URL
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      return originalUrl // Use original URL directly
    }
    return null
  }
}
