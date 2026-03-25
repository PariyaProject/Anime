import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAnimeStore } from '@/stores/anime'
import type { Anime, FilterParams } from '@/types/anime.types'

// Mock the anime service
vi.mock('@/services/anime.service', () => ({
  animeService: {
    getAnimeList: vi.fn(() => Promise.resolve({
      data: {
        success: true,
        data: {
          animeList: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 1
        }
      }
    })),
    getAnimeById: vi.fn(() => Promise.resolve({
      data: {
        success: true,
        data: {
          id: '1',
          title: 'Test Anime'
        }
      }
    }))
  }
}))

describe('Anime Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has correct initial state', () => {
    const store = useAnimeStore()
    expect(store.animeList).toEqual([])
    expect(store.currentAnime).toBeNull()
    expect(store.totalCount).toBe(0)
    expect(store.currentPage).toBe(1)
    expect(store.totalPages).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('hasAnime returns false when list is empty', () => {
    const store = useAnimeStore()
    expect(store.hasAnime).toBe(false)
  })

  it('computes hasNextPage and hasPrevPage correctly', () => {
    const store = useAnimeStore()
    store.currentPage = 2
    store.totalPages = 5

    expect(store.hasNextPage).toBe(true)
    expect(store.hasPrevPage).toBe(true)

    store.currentPage = 5
    expect(store.hasNextPage).toBe(false)
    expect(store.hasPrevPage).toBe(true)

    store.currentPage = 1
    expect(store.hasNextPage).toBe(true)
    expect(store.hasPrevPage).toBe(false)
  })

  it('setCurrentAnime updates currentAnime', () => {
    const store = useAnimeStore()
    const anime: Anime = {
      id: '123',
      title: 'Test'
    } as any

    store.setCurrentAnime(anime as any)
    expect(store.currentAnime).toEqual(anime)
  })

  it('clearError clears the error state', () => {
    const store = useAnimeStore()
    store.error = 'Test error'
    expect(store.error).toBe('Test error')

    store.clearError()
    expect(store.error).toBeNull()
  })
})
