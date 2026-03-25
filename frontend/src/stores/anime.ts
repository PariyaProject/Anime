import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Anime, AnimeDetails, FilterParams } from '@/types/anime.types'
import { animeService } from '@/services/anime.service'

const ANIME_LIST_CACHE_TTL_MS = 5 * 60 * 1000

interface CachedAnimeListEntry {
  animeList: Anime[]
  totalCount: number
  totalPages: number
  currentPage: number
  fetchedAt: number
}

function normalizeFilterParams(params: FilterParams = {}) {
  return {
    search: params.search?.trim() || '',
    genre: params.genre || '',
    year: params.year || '',
    month: params.month || '',
    sort: params.sort || 'time',
    channel: params.channel || 'tv',
    page: params.page || 1,
    limit: params.limit || 48
  }
}

function getCacheKey(params: FilterParams = {}): string {
  return JSON.stringify(normalizeFilterParams(params))
}

export const useAnimeStore = defineStore('anime', () => {
  // State
  const animeList = ref<Anime[]>([])
  const currentAnime = ref<AnimeDetails | null>(null)
  const totalCount = ref(0)
  const currentPage = ref(1)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const listCache = ref<Record<string, CachedAnimeListEntry>>({})

  function applyAnimeList(entry: Omit<CachedAnimeListEntry, 'fetchedAt'> | CachedAnimeListEntry) {
    animeList.value = entry.animeList
    totalCount.value = entry.totalCount
    totalPages.value = entry.totalPages
    currentPage.value = entry.currentPage
  }

  // Getters
  const hasAnime = computed(() => animeList.value.length > 0)
  const hasNextPage = computed(() => currentPage.value < totalPages.value)
  const hasPrevPage = computed(() => currentPage.value > 1)

  // Actions
  async function loadAnimeList(params: FilterParams = {}, options: { force?: boolean } = {}) {
    const cacheKey = getCacheKey(params)
    const cachedEntry = listCache.value[cacheKey]
    const isFresh = cachedEntry && (Date.now() - cachedEntry.fetchedAt) < ANIME_LIST_CACHE_TTL_MS

    if (!options.force && isFresh) {
      applyAnimeList(cachedEntry)
      error.value = null
      return cachedEntry
    }

    loading.value = true
    error.value = null
    try {
      const data = await animeService.getAnimeList(params)
      applyAnimeList(data)
      listCache.value[cacheKey] = {
        ...data,
        fetchedAt: Date.now()
      }
      return data
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

  function clearAnimeListCache() {
    listCache.value = {}
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
    clearError,
    clearAnimeListCache
  }
})
