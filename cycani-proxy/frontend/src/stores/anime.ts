import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Anime, AnimeDetails, FilterParams } from '@/types/anime.types'
import { animeService } from '@/services/anime.service'

export const useAnimeStore = defineStore('anime', () => {
  // State
  const animeList = ref<Anime[]>([])
  const currentAnime = ref<AnimeDetails | null>(null)
  const totalCount = ref(0)
  const currentPage = ref(1)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasAnime = computed(() => animeList.value.length > 0)
  const hasNextPage = computed(() => currentPage.value < totalPages.value)
  const hasPrevPage = computed(() => currentPage.value > 1)

  // Actions
  async function loadAnimeList(params: FilterParams = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await animeService.getAnimeList(params)
      animeList.value = response.data.animeList
      totalCount.value = response.data.totalCount
      totalPages.value = response.data.totalPages
      currentPage.value = response.data.currentPage
    } catch (err: any) {
      error.value = err.message || 'Failed to load anime list'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadAnimeById(id: string | number) {
    loading.value = true
    error.value = null
    try {
      currentAnime.value = await animeService.getAnimeById(id)
    } catch (err: any) {
      error.value = err.message || 'Failed to load anime details'
      throw err
    } finally {
      loading.value = false
    }
  }

  function setCurrentAnime(anime: AnimeDetails) {
    currentAnime.value = anime
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    animeList,
    currentAnime,
    totalCount,
    currentPage,
    totalPages,
    loading,
    error,
    // Getters
    hasAnime,
    hasNextPage,
    hasPrevPage,
    // Actions
    loadAnimeList,
    loadAnimeById,
    setCurrentAnime,
    clearError
  }
})
