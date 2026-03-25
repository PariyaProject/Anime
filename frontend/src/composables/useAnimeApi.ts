import { ref, readonly } from 'vue'
import type { AnimeListResponse, AnimeDetails, FilterParams } from '@/types/anime.types'
import { animeService } from '@/services/anime.service'

export function useAnimeApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAnimeList(params: FilterParams = {}) {
    loading.value = true
    error.value = null
    try {
      const data = await animeService.getAnimeList(params)
      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to load anime list'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchAnimeById(id: string | number) {
    loading.value = true
    error.value = null
    try {
      const anime = await animeService.getAnimeById(id)
      return anime
    } catch (err: any) {
      error.value = err.message || 'Failed to load anime details'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    fetchAnimeList,
    fetchAnimeById
  }
}
