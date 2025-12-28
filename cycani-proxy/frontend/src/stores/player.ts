import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Episode, EpisodeData } from '@/types/episode.types'
import { episodeService } from '@/services/episode.service'

export const usePlayerStore = defineStore('player', () => {
  // State
  const currentEpisodeData = ref<EpisodeData | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const autoPlay = ref(true)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const refreshing = ref(false) // Track if currently refreshing video URL

  // Getters
  const hasEpisode = computed(() => currentEpisodeData.value !== null)
  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })
  const hasNextEpisode = computed(
    () => currentEpisodeData.value?.nextEpisode !== undefined
  )
  const currentVideoUrl = computed(() => currentEpisodeData.value?.realVideoUrl || null)
  const expiresAt = computed(() => {
    if (!currentVideoUrl.value) return null
    return episodeService.parseUrlExpiration(currentVideoUrl.value)
  })
  const timeUntilExpiration = computed(() => {
    if (!currentVideoUrl.value) return Infinity
    return episodeService.getTimeUntilExpiration(currentVideoUrl.value)
  })

  // Actions
  async function loadEpisode(animeId: string, season: number, episode: number) {
    loading.value = true
    error.value = null
    try {
      currentEpisodeData.value = await episodeService.getEpisode(animeId, season, episode)
    } catch (err: any) {
      error.value = err.message || 'Failed to load episode'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh the current video URL (handles expired URLs)
   * Returns the refreshed video URL
   */
  async function refreshVideoUrl(): Promise<string> {
    if (!currentEpisodeData.value) {
      throw new Error('No episode loaded')
    }

    const animeId = currentEpisodeData.value.animeId || currentEpisodeData.value.bangumiId
    const { season, episode } = currentEpisodeData.value

    refreshing.value = true
    try {
      const result = await episodeService.refreshVideoUrl(animeId, season, episode)

      // Update the episode data with the refreshed URL
      if (currentEpisodeData.value) {
        currentEpisodeData.value.realVideoUrl = result.realVideoUrl
      }

      return result.realVideoUrl
    } catch (err: any) {
      error.value = err.message || 'Failed to refresh video URL'
      throw err
    } finally {
      refreshing.value = false
    }
  }

  function play() {
    isPlaying.value = true
  }

  function pause() {
    isPlaying.value = false
  }

  function seekTo(time: number) {
    currentTime.value = time
  }

  function updateTime(time: number) {
    currentTime.value = time
  }

  function updateDuration(time: number) {
    duration.value = time
  }

  function setAutoPlay(enabled: boolean) {
    autoPlay.value = enabled
  }

  function toggleAutoPlay() {
    autoPlay.value = !autoPlay.value
  }

  async function loadNextEpisode() {
    if (!currentEpisodeData.value || !currentEpisodeData.value.nextEpisode) {
      throw new Error('No next episode available')
    }

    const { season, episode } = currentEpisodeData.value.nextEpisode
    const animeId = currentEpisodeData.value.animeId || currentEpisodeData.value.bangumiId

    await loadEpisode(animeId, season, episode)
    return currentEpisodeData.value
  }

  function clearPlayer() {
    currentEpisodeData.value = null
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
  }

  return {
    // State
    currentEpisodeData,
    isPlaying,
    currentTime,
    duration,
    autoPlay,
    loading,
    error,
    refreshing,
    // Getters
    hasEpisode,
    progress,
    hasNextEpisode,
    currentVideoUrl,
    expiresAt,
    timeUntilExpiration,
    // Actions
    loadEpisode,
    refreshVideoUrl,
    play,
    pause,
    seekTo,
    updateTime,
    updateDuration,
    setAutoPlay,
    toggleAutoPlay,
    loadNextEpisode,
    clearPlayer
  }
})
