<template>
  <div class="watch-view">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <LoadingSpinner />
      <p class="mt-3 text-muted">加载中...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-5">
      <ErrorMessage :message="error" @retry="loadEpisode" />
    </div>

    <!-- Theater Mode Layout - True Center -->
    <div v-else class="theater-mode">
      <!-- Centered Video Player -->
      <div class="video-container">
        <div class="video-wrapper">
          <!-- Use iframe for cycani- video IDs (player domain) -->
          <iframe
            v-if="useIframePlayer"
            :src="playerUrl"
            class="video-frame"
            allowfullscreen
            allow="autoplay; fullscreen"
          ></iframe>

          <!-- Use Plyr for direct video URLs -->
          <div v-if="!useIframePlayer" id="plyr-player" ref="playerContainer" class="plyr-wrapper">
            <video
              ref="videoElement"
              controls
              :poster="posterImage"
              class="video-element"
            >
              <source :src="videoUrl || ''" type="video/mp4" />
              您的浏览器不支持视频播放。
            </video>
          </div>
        </div>

        <!-- Video Title Overlay -->
        <div class="video-title-overlay">
          <h1 class="video-title">{{ episodeTitle }}</h1>
          <p class="video-meta">
            <span v-if="animeTitle">{{ animeTitle }}</span>
            <span v-if="season > 0"> · 第 {{ season }} 季</span>
            <span> · 第 {{ episode }} 集</span>
          </p>
        </div>

        <!-- Control Bar -->
        <div class="control-bar">
          <button class="btn-control" @click="playPrevious" :disabled="!hasPrevious" title="上一集">
            ← 上一集
          </button>
          <label class="autoplay-toggle">
            <input type="checkbox" :checked="autoPlayEnabled" @change="toggleAutoplay" />
            <span>自动播放</span>
          </label>
          <button class="btn-control" @click="playNext" :disabled="!hasNext" title="下一集">
            下一集 →
          </button>
          <router-link to="/" class="btn-back">返回列表</router-link>
        </div>
      </div>

      <!-- Side Panel -->
      <div class="side-panel">
        <!-- Anime Info -->
        <div class="panel-section anime-info">
          <img :src="displayCoverImage" :alt="animeTitle" class="anime-cover" @error="handleImageError" />
          <div class="anime-details">
            <h3 class="anime-title">{{ animeTitle || '加载中...' }}</h3>
            <div class="anime-tags">
              <span class="tag">{{ animeType || 'TV' }}</span>
              <span class="tag">{{ animeYear || '未知' }}</span>
              <span class="tag">{{ totalEpisodes || '?' }} 集</span>
            </div>
            <p v-if="animeDescription" class="anime-description" :title="animeDescription">{{ animeDescription }}</p>
          </div>
        </div>

        <!-- Progress -->
        <div class="panel-section progress-section">
          <div class="progress-header">播放进度</div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
          </div>
          <div class="progress-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</div>
        </div>

        <!-- Episode List -->
        <div class="panel-section episode-list">
          <div class="episode-header">
            <span>选集</span>
            <div class="jump-box">
              <input v-model.number="jumpEpisode" type="number" placeholder="集数" :min="1" class="jump-input" />
              <button class="jump-btn" @click="jumpToEpisode">跳转</button>
            </div>
          </div>
          <div class="episode-grid">
            <button
              v-for="ep in episodeList"
              :key="ep"
              class="episode-item"
              :class="{ active: ep === episode && season === currentSeason }"
              @click="selectEpisode(ep)"
            >
              {{ ep }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useAutoplay } from '@/composables/useAutoplay'
import { animeService } from '@/services/anime.service'
import type { AnimeDetails } from '@/types/anime.types'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const historyStore = useHistoryStore()
const uiStore = useUiStore()
const { autoplay: autoPlayEnabled, toggleAutoplay } = useAutoplay()

// Get placeholder image URL as a constant
const getPlaceholderImage = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  return `${apiBaseUrl}/api/placeholder-image`
}
const placeholderImage = getPlaceholderImage()

const playerContainer = ref<HTMLElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
let player: Plyr | null = null

// Store saved position for resume after Plyr is initialized
const savedPositionForResume = ref<number | null>(null)
const savedPositionEpisode = ref<{ season: number; episode: number } | null>(null)

// Flag to trigger auto-play after Plyr is ready
const shouldAutoPlay = ref(false)

// Guard to prevent concurrent episode loading
let isLoadingEpisode = false

// Guard to prevent concurrent Plyr initialization
let isInitializingPlyr = false

const loading = ref(false)
const episodesLoading = ref(false)
const error = ref<string | null>(null)

const animeId = computed(() => route.params.animeId as string)
// Cache animeId on mount to prevent loss during route transitions
const currentAnimeId = ref<string>(animeId.value)
const season = ref(Number(route.query.season) || 1)
const episode = ref(Number(route.query.episode) || 1)
const currentSeason = ref(season.value)

const jumpEpisode = ref<number>(episode.value)

// Check if we should use iframe player
// Respects user's player mode preference
const useIframePlayer = computed(() => {
  const playerMode = uiStore.playerModePreference || 'plyr' // Default: plyr

  // Plyr 模式
  if (playerMode === 'plyr') {
    return false
  }

  // iframe 模式
  if (playerMode === 'iframe') {
    return true
  }

  // 混合模式：自动选择
  const url = playerStore.currentEpisodeData?.realVideoUrl
  if (!url) {
    return true  // 需要 iframe
  }
  return false  // 直接视频 URL，使用 Plyr
})

// Generate player URL for iframe
const playerUrl = computed(() => {
  const url = playerStore.currentEpisodeData?.iframeVideoUrl
  if (!url) return ''

  // Add autoplay parameter if not already present
  const autoplayParam = autoPlayEnabled.value ? (url.includes('?') ? '&autoplay=1' : '?autoplay=1') : ''
  return url + autoplayParam
})

// Direct video URL for Plyr player
// Returns direct video URLs (mp4, m3u8, etc.) for Plyr to play
// Returns null for iframe URLs (use iframe instead)
const videoUrl = computed(() => {
  const url = playerStore.currentEpisodeData?.realVideoUrl
  if (!url) return null

  // Direct video URLs (mp4, m3u8, etc.) - use with Plyr
  return url
})

const animeTitle = ref('')
const animeCover = ref('')
const animeType = ref('')
const animeYear = ref('')
const totalEpisodes = ref(0)
const animeDescription = ref('')

const currentTime = ref(0)
const duration = ref(0)
const autoPlayNext = ref(true) // Auto-play next episode

let saveInterval: number | null = null
let refreshUrlTimeout: number | null = null // Auto-refresh before URL expires
let isRefreshingUrl = ref(false) // Track if currently refreshing URL

const episodeTitle = computed(() => {
  if (!playerStore.currentEpisodeData) return ''
  return playerStore.currentEpisodeData.title || `第 ${episode.value} 集`
})

const posterImage = computed(() => animeCover.value || '')

const displayCoverImage = computed(() => animeCover.value || placeholderImage)

const progress = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const episodeList = computed(() => {
  if (totalEpisodes.value === 0) return []
  return Array.from({ length: totalEpisodes.value }, (_, i) => i + 1)
})

const hasPrevious = computed(() => episode.value > 1)
const hasNext = computed(() => episode.value < totalEpisodes.value)

/**
 * Load anime details (cover, type, year, description, episode list)
 * Fetches from /api/anime/:id endpoint
 */
async function loadAnimeDetails(id: string): Promise<void> {
  try {
    console.log('📺 Loading anime details for:', id)
    const details: AnimeDetails = await animeService.getAnimeById(id)

    // Update refs with anime metadata
    animeTitle.value = details.title
    animeCover.value = animeService.getImageProxyUrl(details.cover) || ''
    animeType.value = details.type || 'TV'
    animeYear.value = details.year || ''
    totalEpisodes.value = details.episodes?.length || 0
    animeDescription.value = details.description || ''

    console.log('✅ Anime details loaded:', {
      title: details.title,
      cover: animeCover.value ? 'found' : 'not found',
      type: details.type,
      year: details.year,
      totalEpisodes: totalEpisodes.value
    })
  } catch (err: any) {
    console.error('❌ Failed to load anime details:', err.message)
    // Don't throw error - video playback should still work
  }
}

async function loadEpisode() {
  // Guard: Prevent concurrent requests
  if (isLoadingEpisode) {
    console.log('⏸️ Episode load already in progress, skipping')
    return
  }

  isLoadingEpisode = true
  loading.value = true
  error.value = null

  // Reset auto-play flag for new episode
  shouldAutoPlay.value = false

  // CRITICAL: Destroy old Plyr instance before loading new episode
  // This prevents dual audio issue when switching episodes
  if (player && !useIframePlayer.value) {
    console.log('🗑️ Destroying old Plyr instance before loading new episode...')
    player.destroy()
    player = null
    console.log('✅ Old Plyr instance destroyed')
    // Wait for DOM to clean up AND for any pending initializations to complete
    await new Promise(resolve => setTimeout(resolve, 0))

    // Clear any pending initialization guard that might be stuck
    if (isInitializingPlyr) {
      console.warn('⚠️ Clearing stuck initialization guard')
      isInitializingPlyr = false
    }
  }

  try {
    // Load episode data and anime details in parallel using Promise.allSettled
    // This ensures video playback works even if anime details fail to load
    const [episodeResult, animeResult] = await Promise.allSettled([
      playerStore.loadEpisode(animeId.value, season.value, episode.value),
      loadAnimeDetails(animeId.value)
    ])

    // Handle episode data (critical - if this fails, video won't play)
    if (episodeResult.status === 'rejected') {
      error.value = episodeResult.reason?.message || 'Failed to load episode'
      loading.value = false
      return
    }

    const data = playerStore.currentEpisodeData
    if (data) {
      // Update season and episode from episode data
      season.value = Number(data.season)
      episode.value = Number(data.episode)
      currentSeason.value = Number(data.season)
      jumpEpisode.value = Number(data.episode)

      // Note: animeTitle, animeCover, etc. are now set by loadAnimeDetails()
      // But keep fallback to episode data title if anime details failed
      if (animeResult.status === 'rejected' && data.title) {
        animeTitle.value = data.title
      }

      // Fetch saved position from backend for auto-resume
      // Note: Actual resume will happen in initializePlyr() after Plyr is ready
      const savedPosition = await historyStore.getLastPosition(
        animeId.value,
        data.season,
        data.episode
      )

      // Store saved position for resume after Plyr is initialized
      const savedPos = savedPosition || 0
      if (savedPos > 5) {
        console.log('📌 Saved position found:', formatTime(savedPos), '- will resume after player ready')
        savedPositionForResume.value = savedPos
        savedPositionEpisode.value = { season: Number(data.season), episode: Number(data.episode) }
      } else {
        console.log('▶️ No saved position, starting from beginning')
        savedPositionForResume.value = null
        savedPositionEpisode.value = null
      }

      // Note: Plyr will be initialized by the watcher on useIframePlayer
      // This ensures DOM has updated before we try to initialize
      if (!useIframePlayer.value && videoUrl.value && player) {
        // Set Plyr source after initialization
        console.log('🎬 Setting Plyr source:', videoUrl.value?.substring(0, 50))
        player.source = {
          type: 'video',
          sources: [{ src: videoUrl.value, type: 'video/mp4' }]
        }

        // Set flag for auto-play - will be triggered by 'ready' event
        console.log('🎵 Auto-play enabled:', autoPlayEnabled.value)
        shouldAutoPlay.value = autoPlayEnabled.value
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load episode'
  } finally {
    loading.value = false
    isLoadingEpisode = false
  }
}

function selectEpisode(ep: number) {
  episode.value = ep
  jumpEpisode.value = ep

  router.push({
    name: 'Watch',
    params: { animeId: animeId.value },
    query: {
      season: season.value.toString(),
      episode: ep.toString()
    }
  })

  // Note: Don't call loadEpisode() here
  // The route.query watcher will trigger it automatically
  // This prevents dual invocation and race conditions
}

function jumpToEpisode() {
  if (jumpEpisode.value && jumpEpisode.value >= 1 && jumpEpisode.value <= totalEpisodes.value) {
    selectEpisode(jumpEpisode.value)
  }
}

function playPrevious() {
  if (hasPrevious.value) {
    selectEpisode(episode.value - 1)
  }
}

function playNext() {
  if (hasNext.value) {
    selectEpisode(episode.value + 1)
  }
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleImageError() {
  // Fallback to placeholder if cover image fails to load
  if (animeCover.value !== placeholderImage) {
    console.warn('⚠️ Cover image failed to load, using placeholder')
    animeCover.value = ''
  }
}

async function savePosition() {
  if (currentTime.value > 0) {
    try {
      await historyStore.savePosition(
        {
          id: currentAnimeId.value,
          title: animeTitle.value,
          cover: animeCover.value
        },
        {
          season: season.value,
          episode: episode.value,
          title: episodeTitle.value,
          duration: duration.value
        },
        currentTime.value
      )
    } catch (err) {
      console.error('Failed to save position:', err)
    }
  }
}

function togglePlayPause() {
  if (player) {
    if (player.playing) {
      player.pause()
    } else {
      player.play()
    }
  }
}

/**
 * Seek forward by 5 seconds and save position
 */
function seekForward() {
  if (player) {
    const newPosition = Math.min(player.currentTime + 5, player.duration || 0)
    player.currentTime = newPosition
    console.log('⏩ Seeked forward 5s:', formatTime(newPosition))

    // Save new position immediately
    if (newPosition > 0) {
      historyStore.savePositionImmediate(
        {
          id: currentAnimeId.value,
          title: animeTitle.value,
          cover: animeCover.value
        },
        {
          season: season.value,
          episode: episode.value,
          title: episodeTitle.value,
          duration: duration.value
        },
        newPosition,
        0  // No threshold - always save on keyboard seek
      )
      console.log('💾 Position saved after keyboard seek')
    }
  }
}

/**
 * Seek backward by 5 seconds and save position
 */
function seekBackward() {
  if (player) {
    const newPosition = Math.max(player.currentTime - 5, 0)
    player.currentTime = newPosition
    console.log('⏪ Seeked backward 5s:', formatTime(newPosition))

    // Save new position immediately
    if (newPosition > 0) {
      historyStore.savePositionImmediate(
        {
          id: currentAnimeId.value,
          title: animeTitle.value,
          cover: animeCover.value
        },
        {
          season: season.value,
          episode: episode.value,
          title: episodeTitle.value,
          duration: duration.value
        },
        newPosition,
        0  // No threshold - always save on keyboard seek
      )
      console.log('💾 Position saved after keyboard seek')
    }
  }
}

function onVideoEnd() {
  // Save position before loading next episode (mark as completed)
  if (duration.value > 0) {
    historyStore.savePositionImmediate(
      {
        id: currentAnimeId.value,
        title: animeTitle.value,
        cover: animeCover.value
      },
      {
        season: season.value,
        episode: episode.value,
        title: episodeTitle.value,
        duration: duration.value
      },
      duration.value,
      0  // No threshold for video end (always save)
    )
  }

  if (autoPlayNext.value && hasNext.value) {
    setTimeout(() => {
      playNext()
    }, 1000)
  }
}

function autoplay(delay: number = 0) {
  // Check if auto-play is enabled
  // Note: Check both shouldAutoPlay flag and autoPlayEnabled composable
  // because ready event may fire before loadEpisode sets the flag
  const shouldPlay = shouldAutoPlay.value || autoPlayEnabled.value
  console.log('▶️ Auto-play check:', {
    flag: shouldAutoPlay.value,
    composable: autoPlayEnabled.value,
    shouldPlay
  })
  if (shouldPlay) {
    console.log('▶️ Auto-play enabled, starting playback...')
    setTimeout(() => {
      if (player) {
        console.log('▶️ Attempting auto-play...')
        const playPromise = player.play()
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err: any) => {
            if (err.name === 'NotAllowedError') {
              console.log('⚠️ Unmuted autoplay blocked, trying muted fallback')
              player!.muted = true
              player!.play()
            } else {
              console.warn('Auto-play failed:', err)
            }
          })
        }
      }
    }, delay)
  }
}
/**
 * Schedule automatic URL refresh before expiration
 * Sets a timeout to refresh the URL 5 seconds before it expires
 */
function scheduleUrlRefresh() {
  // Clear any existing timeout
  if (refreshUrlTimeout) {
    clearTimeout(refreshUrlTimeout)
    refreshUrlTimeout = null
  }

  const timeUntilExpiration = playerStore.timeUntilExpiration

  if (timeUntilExpiration === Infinity) {
    return
  }

  // Refresh 5 seconds before expiration
  const REFRESH_BEFORE_EXPIRATION = 5 * 1000 // 5 seconds
  const refreshDelay = timeUntilExpiration - REFRESH_BEFORE_EXPIRATION

  if (refreshDelay <= 0) {
    console.log('⏰ URL expires soon, refreshing now...')
    refreshVideoUrlSeamlessly()
    return
  }

  console.log(`⏰ URL expires in ${Math.floor(timeUntilExpiration / 1000)}s, scheduling refresh in ${Math.floor(refreshDelay / 1000)}s`)

  refreshUrlTimeout = window.setTimeout(async () => {
    console.log('⏰ Auto-refreshing URL before expiration...')
    await refreshVideoUrlSeamlessly()
  }, refreshDelay)
}

/**
 * Refresh video URL seamlessly while maintaining playback position
 */
async function refreshVideoUrlSeamlessly() {
  if (isRefreshingUrl.value) {
    console.log('⏳ URL refresh already in progress, skipping...')
    return
  }

  const wasPlaying = player ? player.playing : false
  const currentPosition = currentTime.value

  console.log(`🔄 Refreshing video URL at position ${formatTime(currentPosition)}...`)
  uiStore.showNotification('正在刷新视频链接...', 'info')

  isRefreshingUrl.value = true

  // Save to backend FIRST before refresh (continue even if fails)
  if (currentPosition > 0) {
    try {
      await historyStore.savePositionImmediate(
        {
          id: currentAnimeId.value,
          title: animeTitle.value,
          cover: animeCover.value
        },
        {
          season: season.value,
          episode: episode.value,
          title: episodeTitle.value,
          duration: duration.value
        },
        currentPosition,
        0  // No threshold - always save before refresh
      )
      console.log('💾 Position saved to backend:', formatTime(currentPosition))
    } catch (err) {
      console.warn('⚠️ Backend save failed, continuing with memory-only restore:', err)
      // Don't block refresh - memory restore is better than nothing
    }
  }

  try {
    // Fetch fresh URL from backend
    const freshUrl = await playerStore.refreshVideoUrl()

    if (!freshUrl) {
      throw new Error('Failed to get fresh URL from backend')
    }

    console.log('✅ Got fresh URL:', freshUrl.substring(0, 80) + '...')

    // Update Plyr source with the fresh URL
    if (player) {
      player.source = {
        type: 'video',
        sources: [{ src: freshUrl, type: 'video/mp4' }]
      }

      // Use loadedmetadata event (fires when duration is available)
      // Poll for duration to be available before setting currentTime
      player.once('loadedmetadata', () => {
        let restoreAttempts = setInterval(() => {
          if (player && player.duration && player.duration > 0 && currentPosition > 0) {
            clearInterval(restoreAttempts)

            player.currentTime = currentPosition
            console.log('✅ Position restored:', formatTime(currentPosition))

            if (wasPlaying) {
              player.play()
              console.log('▶️ Resumed playback after refresh')
            }

            uiStore.showNotification('视频链接已刷新', 'success')

            // Schedule next refresh after successful URL refresh
            scheduleUrlRefresh()
          }
        }, 100)

        // Timeout: give up after 5 seconds
        setTimeout(() => {
          clearInterval(restoreAttempts)
          if (player && !player.paused) {
            console.warn('⚠️ Position restore timed out, starting from beginning')
            uiStore.showNotification('视频链接已刷新', 'success')
            scheduleUrlRefresh()
          }
        }, 5000)
      })
    } else {
      // Fallback: direct video element manipulation
      if (videoElement.value) {
        videoElement.value.src = freshUrl
        videoElement.value.currentTime = currentPosition
        if (wasPlaying) {
          videoElement.value.play()
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to refresh video URL:', error.message)
    uiStore.showNotification('刷新视频链接失败，请刷新页面', 'error')
  } finally {
    isRefreshingUrl.value = false
  }
}

// Page hide handler - defined outside onMounted for cleanup in onUnmounted
const handlePageHide = () => {
  if (currentTime.value > 0) {
    historyStore.savePositionImmediate(
      {
        id: currentAnimeId.value,
        title: animeTitle.value,
        cover: animeCover.value
      },
      {
        season: season.value,
        episode: episode.value,
        title: episodeTitle.value,
        duration: duration.value
      },
      currentTime.value,
      0  // No threshold for page exit (always save)
    )
    console.log('💾 Position saved on page exit')
  }
}

onMounted(async () => {
  uiStore.loadDarkModePreference()

  // Setup test functions for manual testing
  // These functions are attached to window for console access
  ;(window as any).testForceRefresh = async function() {
    console.log('🧪 Force refreshing video URL...')
    await refreshVideoUrlSeamlessly()
  }

  ;(window as any).testCheckExpiration = function() {
    const currentUrl = playerStore.currentVideoUrl
    const expiresAt = playerStore.expiresAt
    const timeUntilExpiration = playerStore.timeUntilExpiration

    console.log('📍 Current URL:', currentUrl?.substring(0, 100) + '...')
    console.log('⏰ Expires at:', expiresAt ? new Date(expiresAt).toLocaleString() : 'N/A')
    console.log('⏳ Time until expiration:', timeUntilExpiration === Infinity ? 'Never' : `${Math.floor(timeUntilExpiration / 1000)}s`)
    console.log('⏰ Auto-refresh scheduled in:', timeUntilExpiration === Infinity ? 'Never' : `${Math.floor((timeUntilExpiration - 5 * 1000) / 1000)}s (5s before expiration)`)
  }

  console.log('🧪 Test functions available: testForceRefresh(), testCheckExpiration()')

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    'Space': togglePlayPause,
    'ArrowRight': seekForward,
    'ArrowLeft': seekBackward,
    'Ctrl+ArrowRight': playNext
  })

  // Setup page visibility/unload event listeners for immediate save
  // Note: handlePageHide function is defined outside onMounted for cleanup in onUnmounted
  window.addEventListener('visibilitychange', handlePageHide)
  window.addEventListener('pagehide', handlePageHide)
  window.addEventListener('beforeunload', handlePageHide)

  try {
    // Note: Plyr will be initialized when videoUrl becomes available
    // via the watch on videoUrl (see below)

    // Log initial player state
    console.log('🎬 Player container ready, waiting for video URL...')

    // Load episode data
    await loadEpisode()

  } catch (err) {
    console.error('Error initializing player:', err)
  }
})

onUnmounted(() => {
  if (saveInterval) {
    clearInterval(saveInterval)
  }
  if (refreshUrlTimeout) {
    clearTimeout(refreshUrlTimeout)
  }
  if (player) {
    player.destroy()
    player = null  // Clear the reference to allow re-initialization
  }

  // Cleanup event listeners to prevent memory leaks
  window.removeEventListener('visibilitychange', handlePageHide)
  window.removeEventListener('pagehide', handlePageHide)
  window.removeEventListener('beforeunload', handlePageHide)
})

// Router navigation guard - save position before navigating away
onBeforeRouteLeave((to, from, next) => {
  if (currentTime.value > 0) {
    historyStore.savePositionImmediate(
      {
        id: currentAnimeId.value,
        title: animeTitle.value,
        cover: animeCover.value
      },
      {
        season: season.value,
        episode: episode.value,
        title: episodeTitle.value,
        duration: duration.value
      },
      currentTime.value,
      0  // No threshold - always save on navigation
    )
    console.log('💾 Position saved on route navigation guard')
  }
  next()  // Don't block navigation
})

watch(() => route.query, () => {
  if (route.params.animeId === animeId.value) {
    season.value = Number(route.query.season) || 1
    episode.value = Number(route.query.episode) || 1
    jumpEpisode.value = episode.value
    loadEpisode()
  }
}, { deep: true })

// Backup watcher: Initialize Plyr when videoElement ref is set
// This handles cases where the useIframePlayer watcher fires before video element is rendered
watch(videoElement, async (element) => {
  // Only initialize if:
  // - Element exists
  // - Not using iframe mode
  // - Plyr not already initialized
  // - Has video URL
  if (element && videoElement.value && !useIframePlayer.value && !player && videoUrl.value) {
    console.log('🎬 videoElement ref set, initializing Plyr...')
    // Small delay to ensure Plyr can attach to the element
    await new Promise(resolve => setTimeout(resolve, 80))
    initializePlyr()
  }
})

// Watch videoUrl to update source on episode changes
// CRITICAL: This watcher destroys and recreates Plyr to prevent dual audio
watch(videoUrl, async (newUrl, oldUrl) => {
  // Skip: first load, iframe mode, player not ready, no new URL
  if (!oldUrl || !newUrl || useIframePlayer.value || !player || !videoElement.value) {
    return
  }

  console.log('🔄 Episode change detected - destroying old Plyr instance')
  console.log('🔄 Old URL:', oldUrl?.substring(0, 30))
  console.log('🔄 New URL:', newUrl.substring(0, 30))

  // Destroy old Plyr instance completely to prevent dual audio
  if (player) {
    console.log('🗑️ Destroying old Plyr instance...')
    player.destroy()
    player = null
    console.log('✅ Old Plyr instance destroyed')
  }

  // Reset state
  currentTime.value = 0

  // Clear old refresh timer
  if (refreshUrlTimeout) {
    clearTimeout(refreshUrlTimeout)
    refreshUrlTimeout = null
  }

  // Wait for DOM to update, then reinitialize Plyr
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))

  console.log('🔄 Reinitializing Plyr for new episode...')
  initializePlyr()

  // Auto-play if enabled (will be handled by initializePlyr and loadEpisode)
})

// Note: Route watcher removed - with :key on router-view, component is properly
// destroyed and recreated on navigation, so this workaround is no longer needed

function initializePlyr() {
  // Guard: Prevent concurrent initialization (causes dual audio bug)
  if (isInitializingPlyr) {
    console.log('⏸️ Plyr initialization already in progress, skipping duplicate call')
    return
  }

  // Note: We assume player has already been destroyed by loadEpisode()
  // This function should only be called when player is null
  if (player) {
    console.warn('⚠️ Plyr already exists when initializePlyr() was called. This should not happen.')
    console.warn('⚠️ Destroying existing player and reinitializing...')
    player.destroy()
    player = null
  }

  isInitializingPlyr = true

  try {
    console.log('🎬 Initializing Plyr...')

    // Target the video element, not the container
    const target = videoElement.value || document.querySelector('#plyr-player video')
    console.log('🎯 Target video element:', target ? 'found' : 'not found')

    if (!target) {
      console.error('❌ Video element not found!')
      isInitializingPlyr = false
      return
    }

    player = new Plyr(target, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'pip',
        'fullscreen'
      ],
      muted: false,
      autoplay: false
    })

    console.log('✅ Plyr instance created:', !!player)

    // Update videoElement ref to point to Plyr's wrapped video element
    if (player.elements.video) {
      videoElement.value = player.elements.video
      console.log('✅ Updated videoElement ref to Plyr video element')
    }

    player.on('timeupdate', (event) => {
      const plyr = event.detail.plyr
      currentTime.value = plyr.currentTime
      duration.value = plyr.duration

      // Synchronize with player store for consistency
      playerStore.updateTime(plyr.currentTime)
      playerStore.updateDuration(plyr.duration)
    })

    // Event-driven save: play/pause
    player.on('play', () => {
      // Always save position when video starts playing (including first autoplay)
      historyStore.savePositionImmediate(
        {
          id: currentAnimeId.value,
          title: animeTitle.value,
          cover: animeCover.value
        },
        {
          season: season.value,
          episode: episode.value,
          title: episodeTitle.value,
          duration: duration.value
        },
        currentTime.value,
        0  // No threshold - always save on play
      )
    })

    player.on('pause', () => {
      // Save position when user pauses playback
      if (currentTime.value > 0) {
        historyStore.savePositionImmediate(
          {
            id: currentAnimeId.value,
            title: animeTitle.value,
            cover: animeCover.value
          },
          {
            season: season.value,
            episode: episode.value,
            title: episodeTitle.value,
            duration: duration.value
          },
          currentTime.value,
          5  // 5 second threshold for play/pause
        )
      }
    })

    // Event-driven save: seek
    player.on('seeked', (event: any) => {
      const plyr = event.detail.plyr
      const newPosition = plyr.currentTime
      if (newPosition > 0) {
        historyStore.savePositionImmediate(
          {
            id: currentAnimeId.value,
            title: animeTitle.value,
            cover: animeCover.value
          },
          {
            season: season.value,
            episode: episode.value,
            title: episodeTitle.value,
            duration: duration.value
          },
          newPosition,
          0  // No threshold - always save on seek completion
        )
      }
    })

    // Event-driven save: fast forward/rewind buttons
    player.on('fastforward', () => {
      const newPosition = currentTime.value
      if (newPosition > 0) {
        historyStore.savePositionImmediate(
          {
            id: currentAnimeId.value,
            title: animeTitle.value,
            cover: animeCover.value
          },
          {
            season: season.value,
            episode: episode.value,
            title: episodeTitle.value,
            duration: duration.value
          },
          newPosition,
          0  // No threshold - always save on button press
        )
        console.log('💾 Position saved after fast forward')
      }
    })

    player.on('rewind', () => {
      const newPosition = currentTime.value
      if (newPosition > 0) {
        historyStore.savePositionImmediate(
          {
            id: currentAnimeId.value,
            title: animeTitle.value,
            cover: animeCover.value
          },
          {
            season: season.value,
            episode: episode.value,
            title: episodeTitle.value,
            duration: duration.value
          },
          newPosition,
          0  // No threshold - always save on button press
        )
        console.log('💾 Position saved after rewind')
      }
    })

    player.on('ended', onVideoEnd)

    // Schedule automatic URL refresh before expiration
    scheduleUrlRefresh()

    // Auto-resume from saved position after Plyr is ready
    player.on('ready', () => {
      console.log('✅ Plyr ready, checking for saved position...')
      const savedPos = savedPositionForResume.value
      const savedEp = savedPositionEpisode.value

      // Check if saved position is for current episode
      const isCurrentEpisode = savedEp && savedEp.season === season.value && savedEp.episode === episode.value

      if (savedPos && savedPos > 5 && isCurrentEpisode) {
        console.log('📍 Resuming to saved position:', formatTime(savedPos), 'for episode', savedEp)

        // Wait a bit for duration to be available, then seek
        setTimeout(() => {
          const duration = player?.duration || videoElement.value?.duration
  
          if (!duration || !isFinite(duration) || duration === 0) {
            console.log('⏳ Duration not loaded yet, will try to seek anyway')
          }
  
          // Check if saved position is near end (within 30 seconds)
          if (duration && savedPos >= duration - 30) {
            console.log('⚠️ Episode already completed, starting from beginning')
            savedPositionForResume.value = null
            savedPositionEpisode.value = null
  
            // Resume playback after seek
            autoplay()
            return
          }
  
          // Seek to saved position
          if (player) {
            player.currentTime = savedPos
            console.log('✅ Resumed from saved position:', formatTime(savedPos), duration ? `/ ${formatTime(duration)}` : '')
            uiStore.showNotification(`恢复上次播放位置: ${formatTime(savedPos)}`, 'info')
            savedPositionForResume.value = null
            savedPositionEpisode.value = null
  
            // Resume playback after seek
            autoplay()
          }
        }, 500)
      } else {
        // Either no saved position, or saved position is for a different episode
        // In both cases, start from beginning and check auto-play
        if (savedPos && !isCurrentEpisode) {
          console.log('⚠️ Saved position is for different episode, ignoring')
          savedPositionForResume.value = null
          savedPositionEpisode.value = null
        } else {
          console.log('▶️ No saved position to resume')
        }

        // Resume playback
        autoplay()
      }
    })

    // Fallback interval: 5 minutes (was 30 seconds)
    // This is a safety net in case events don't fire properly
    saveInterval = window.setInterval(() => {
      if (currentTime.value > 0) {
        historyStore.savePositionImmediate(
          {
            id: currentAnimeId.value,
            title: animeTitle.value,
            cover: animeCover.value
          },
          {
            season: season.value,
            episode: episode.value,
            title: episodeTitle.value,
            duration: duration.value
          },
          currentTime.value,
          60  // 60 second threshold for fallback (only save if moved > 1 min)
        )
      }
    }, 5 * 60 * 1000)  // 5 minutes

    // Log warning if using iframe player
    if (useIframePlayer.value) {
      console.warn('⚠️ Using iframe player - progress bar may not update due to cross-origin restrictions')
    }

    console.log('✅ Plyr fully initialized with event-driven save listeners')
  } catch (err) {
    console.error('❌ Failed to initialize Plyr:', err)
  } finally {
    // Always reset the initialization guard, even if initialization failed
    isInitializingPlyr = false
  }
}
</script>

<style scoped>
/* Minimalist Theater Mode */
.watch-view {
  min-height: 100vh;
  background: var(--bg-primary);
  padding-top: 10px; /* Reduced navbar spacing */
}

.theater-mode {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Centered Video Container - Full Screen */
.video-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  box-sizing: border-box;
}

/* True Center - Video Wrapper */
.video-wrapper {
  width: 100%;
  max-width: 1280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-frame,
.plyr-wrapper {
  width: 100%;
  max-width: 1280px;
  aspect-ratio: 16/9;
  display: block;
  background: #000;
}

.video-frame {
  border: none;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* Ensure empty video element has proper background */
  background: #000;
  min-height: 300px;
}

/* Video Title Overlay - Minimal */
.video-title-overlay {
  margin-top: 1.5rem;
  text-align: center;
}

.video-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.video-meta {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Control Bar - Minimal */
.control-bar {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-tertiary);
  border-radius: 50px;
}

.btn-control {
  padding: 0.5rem 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-control:hover:not(:disabled) {
  background: var(--bg-tertiary);
}

.btn-control:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-back {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 0.85rem;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--bg-tertiary);
}

.autoplay-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
}

.autoplay-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Side Panel - Minimal */
.side-panel {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1.5rem;
  box-sizing: border-box;
}

.panel-section {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
}

/* Anime Info */
.anime-info {
  display: flex;
  gap: 0.75rem;
  grid-column: 1;
  grid-row: 1;
}

/* Progress */
.progress-section {
  grid-column: 1;
  grid-row: 2;
}

/* Episode List */
.episode-list {
  grid-column: 2;
  grid-row: 1 / span 2;
}

.anime-cover {
  width: 80px;
  height: 110px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.anime-details {
  flex: 1;
  min-width: 0;
}

.anime-details .anime-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.anime-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag {
  padding: 0.2rem 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.anime-description {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Progress */
.progress-section {
  grid-column: span 1;
}

.progress-header {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: var(--text-secondary);
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.episode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.jump-box {
  display: flex;
  gap: 0.35rem;
}

.jump-input {
  width: 50px;
  padding: 0.25rem 0.4rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.75rem;
  text-align: center;
}

.jump-btn {
  padding: 0.25rem 0.5rem;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.75rem;
  cursor: pointer;
}

.jump-btn:hover {
  background: var(--border-color);
}

.episode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.episode-item {
  padding: 0.4rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.episode-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.episode-item.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
}

/* Plyr customization */
#plyr-player {
  background: #000;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .watch-view {
    padding-top: 10px; /* Keep consistent navbar spacing */
  }

  .video-container {
    padding: 1rem;
  }

  .video-title {
    font-size: 1.2rem;
  }

  .control-bar {
    flex-wrap: wrap;
    justify-content: center;
  }

  .side-panel {
    padding: 1rem;
    max-width: 100%;
    grid-template-columns: 1fr;
  }

  .anime-info,
  .progress-section,
  .episode-list {
    grid-column: 1;
    grid-row: auto;
  }

  .episode-list {
    grid-row: auto;
  }
}
</style>
