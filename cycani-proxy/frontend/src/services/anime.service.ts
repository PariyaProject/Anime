import api from './api'
import type {
  Anime,
  AnimeListResponse,
  AnimeDetails,
  FilterParams
} from '@/types/anime.types'

export const animeService = {
  async getAnimeList(params: FilterParams = {}): Promise<AnimeListResponse> {
    const response = await api.get<AnimeListResponse>('/api/anime-list', { params })
    return response.data
  },

  async getAnimeById(id: string | number): Promise<AnimeDetails> {
    const response = await api.get<{ success: boolean; data: AnimeDetails }>(`/api/anime/${id}`)
    return response.data.data
  }
}
