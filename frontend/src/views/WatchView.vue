<template>
  <div class="watch-view">
    <div class="watch-layout">
      <!-- Loading State with Skeleton -->
      <div v-if="loading" class="theater-mode" style="opacity: 0.7; pointer-events: none;">
        <div class="video-container">
          <el-skeleton style="width: 100%; height: 100%" animated>
            <template #template>
              <el-skeleton-item variant="image" style="width: 100%; height: 60vh; border-radius: 8px;" />
            </template>
          </el-skeleton>
        </div>
        <div class="side-panel">
          <el-skeleton style="width: 100%" animated>
            <template #template>
              <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                <el-skeleton-item variant="image" style="width: 100px; height: 140px; border-radius: 4px;" />
                <div style="flex: 1">
                  <el-skeleton-item variant="text" style="width: 80%; height: 24px; margin-bottom: 10px;" />
                  <el-skeleton-item variant="text" style="width: 40%; margin-bottom: 10px;" />
                  <el-skeleton-item variant="text" style="width: 100%" />
                  <el-skeleton-item variant="text" style="width: 90%" />
                </div>
              </div>
              <div style="margin-top: 2rem;">
                <el-skeleton-item variant="h3" style="width: 30%; margin-bottom: 10px;" />
                <el-skeleton-item variant="p" style="width: 100%; height: 20px; margin-bottom: 5px;" v-for="i in 5" :key="i" />
              </div>
            </template>
          </el-skeleton>
        </div>
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
            <div v-if="videoUrl" id="plyr-player" ref="playerContainer" class="plyr-wrapper">
              <video
                ref="videoElement"
                :poster="posterImage"
                class="video-element"
                playsinline
              >
                您的浏览器不支持视频播放。
              </video>
            </div>
            <div v-else class="video-frame video-frame-error">
              暂时无法加载可播放的视频源。
            </div>
          </div>

          <div class="video-title-overlay">
            <h1 class="video-title">{{ episodeTitle }}</h1>
            <p class="video-meta">
              <span v-if="animeTitle">{{ animeTitle }}</span>
              <span v-if="season > 0"> · 第 {{ season }} 季</span>
              <span> · 第 {{ episode }} 集</span>
            </p>
          </div>

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

        <div class="side-panel">
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
              <router-link
                :to="{ name: 'AnimeDetail', params: { animeId: currentAnimeId || animeId } }"
                class="detail-link"
              >
                查看作品详情
              </router-link>
            </div>
          </div>

          <div class="panel-section progress-section">
            <div class="progress-header">播放进度</div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <div class="progress-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</div>
          </div>

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
let isWaitingForResume = false

// Guard to prevent concurrent episode loading
let isLoadingEpisode = false

// Guard to prevent concurrent Plyr initialization
let isInitializingPlyr = false

// Refresh status
let isRefreshReload = false
let playingBeforeRefresh = false

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

// Direct video URL from the episode data
const videoUrl = computed(() => playerStore.currentEpisodeData?.realVideoUrl || null)

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

  // CRITICAL: Destroy old Plyr instance before loading new episode
  // This prevents dual audio issue when switching episodes
  if (player) {
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

      if (animeResult.status === 'rejected' && data.title) {
        animeTitle.value = data.title
      }

      // Fetch saved position for auto-resume
      const savedPosition = await historyStore.getLastPosition(
        animeId.value,
        data.season,
        data.episode
      )
      const savedPos = savedPosition || 0
      if (savedPos > 5) {
        console.log('📌 Saved position found:', formatTime(savedPos))
        savedPositionForResume.value = savedPos
        savedPositionEpisode.value = { season: Number(data.season), episode: Number(data.episode) }
      } else {
        savedPositionForResume.value = null
        savedPositionEpisode.value = null
      }

      // Hide skeleton — video DOM element will now render
      loading.value = false

      // Wait for Vue to render the <video> element into the DOM
      await nextTick()
      await nextTick()

      if (videoUrl.value) {
        // Initialize or update Plyr only when we have a direct media source
        await setupPlayer()
      } else {
        error.value = '当前剧集暂时没有可用的 Plyr 播放源'
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load episode'
  } finally {
    loading.value = false
    isLoadingEpisode = false
  }
}

/**
 * Sets up the Plyr player after the DOM is ready.
 * - First load: initializes a fresh Plyr instance.
 * - Episode change: updates source on existing Plyr instance.
 */
async function setupPlayer() {
  const url = videoUrl.value
  if (!url) {
    console.warn('⚠️ No video URL available for player setup')
    return
  }

  if (player) {
    // Plyr already exists — just update the source (episode change or URL refresh)
    console.log('🔄 Updating Plyr source:', url.substring(0, 60))
    player.source = {
      type: 'video',
      sources: [{ src: url, type: 'video/mp4' }]
    }
  } else {
    // No Plyr yet — initialize fresh
    initializePlyr(url)
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
  // because ready event may fire before loadEpisode sets the flag
  let shouldPlay = autoPlayEnabled.value
  if (isRefreshReload) {
    shouldPlay = playingBeforeRefresh
  }
  console.log('▶️ Auto-play check:', {
    autoPlayEnabled: autoPlayEnabled.value,
    isRefreshReload,
    playingBeforeRefresh,
    shouldPlay
  })
  // Clear refresh status
  isRefreshReload = false

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
    if (player && currentPosition > 0) {
      player.source = {
        type: 'video',
        sources: [{ src: freshUrl, type: 'video/mp4' }]
      }

      isRefreshReload = true
      playingBeforeRefresh = wasPlaying
      savedPositionForResume.value = currentPosition
      savedPositionEpisode.value = { season: season.value, episode: episode.value }

      // Use loadedmetadata event (fires when duration is available)
      // Poll for duration to be available before setting currentTime
      player.once('loadedmetadata', () => {
        uiStore.showNotification('视频链接已刷新', 'success')

        // Schedule next refresh after successful URL refresh
        scheduleUrlRefresh()
      })
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

// Note: Plyr initialization is triggered directly from loadEpisode()
// after loading=false and nextTick, guaranteeing the <video> element exists in DOM.

function initializePlyr(initialUrl?: string) {
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
        'rewind',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'captions',
        'pip',
        'airplay',
        'fullscreen'
      ],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
      seekTime: 10,
      muted: false,
      autoplay: false
    })

    console.log('✅ Plyr instance created:', !!player)

    if (initialUrl) {
      console.log('🎞️ Setting initial Plyr source:', initialUrl.substring(0, 60))
      player.source = {
        type: 'video',
        sources: [{ src: initialUrl, type: 'video/mp4' }]
      }
    }

    // Track native video elem for error/stall events
    const nativeVideo = (player.elements as any).video as HTMLVideoElement | undefined
    if (nativeVideo) {
      videoElement.value = nativeVideo
      let networkRetryCount = 0
      const MAX_NETWORK_RETRIES = 3

      nativeVideo.addEventListener('error', async () => {
        const code = nativeVideo.error?.code
        console.error('❌ Video error code:', code, nativeVideo.error?.message)
        if (code === MediaError.MEDIA_ERR_NETWORK || code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          if (networkRetryCount < MAX_NETWORK_RETRIES) {
            networkRetryCount++
            const delay = 1500 * networkRetryCount // exponential backoff: 1.5s, 3s, 4.5s
            console.log(`🔁 Network error – retry ${networkRetryCount}/${MAX_NETWORK_RETRIES} in ${delay}ms...`)
            uiStore.showNotification(`网络错误，正在重试... (${networkRetryCount}/${MAX_NETWORK_RETRIES})`, 'warning')
            setTimeout(() => {
              if (nativeVideo) {
                nativeVideo.load() // re-trigger load with same src
                nativeVideo.play().catch(() => {})
              }
            }, delay)
          } else {
            // Max retries exceeded – try refreshing the URL
            console.log('❌ Max retries exceeded, attempting URL refresh...')
            uiStore.showNotification('视频链接失效，正在刷新...', 'info')
            await refreshVideoUrlSeamlessly()
            networkRetryCount = 0
          }
        } else if (code === MediaError.MEDIA_ERR_DECODE) {
          uiStore.showNotification('视频解码失败，尝试刷新链接...', 'warning')
          await refreshVideoUrlSeamlessly()
        }
      })

      // Stall detection: if video has stalled for > 10s, retry
      let stallTimeout: ReturnType<typeof setTimeout> | null = null
      nativeVideo.addEventListener('stalled', () => {
        console.warn('⚠️ Video stalled')
        if (stallTimeout) clearTimeout(stallTimeout)
        stallTimeout = setTimeout(() => {
          if (nativeVideo.readyState < 3 && !nativeVideo.paused) {
            console.log('❌ Still stalled after 10s, reloading...')
            uiStore.showNotification('网络不稳定，正在重载...', 'warning')
            nativeVideo.load()
            nativeVideo.play().catch(() => {})
          }
        }, 10000)
      })
      nativeVideo.addEventListener('playing', () => {
        if (stallTimeout) { clearTimeout(stallTimeout); stallTimeout = null }
        networkRetryCount = 0 // reset on successful play
      })
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
      if (isWaitingForResume && currentTime.value <= 0) {
        console.log('⏸️ Skipping initial zero-position save while resume is still pending')
        return
      }

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
    player.on('fastforward' as any, () => {
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

    player.on('rewind' as any, () => {
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
        isWaitingForResume = true

        // Claim the pending resume immediately so duplicate ready events
        // cannot schedule the same resume notification twice.
        savedPositionForResume.value = null
        savedPositionEpisode.value = null

        // Wait a bit for duration to be available, then seek
        setTimeout(() => {
          const duration = player?.duration || videoElement.value?.duration
  
          if (!duration || !isFinite(duration) || duration === 0) {
            console.log('⏳ Duration not loaded yet, will try to seek anyway')
          }
  
          // Check if saved position is near end (within 30 seconds)
          if (duration && duration > 1 && savedPos >= duration - 30) {
            console.log('⚠️ Episode already completed, starting from beginning')
  
            // Resume playback after seek
            autoplay()
            return
          }
  
          // Seek to saved position
          if (player) {
            player.currentTime = savedPos
            console.log('✅ Resumed from saved position:', formatTime(savedPos), duration ? `/ ${formatTime(duration)}` : '')
            uiStore.showNotification(`恢复上次播放位置: ${formatTime(savedPos)}`, 'info')
  
            // Resume playback after seek
            autoplay()
          }
        }, 500)
      } else {
        if (isWaitingForResume) {
          console.log('⏳ Resume flow already in progress, skipping fallback autoplay')
          return
        }

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
  padding-top: 10px;
  padding-inline: clamp(0.5rem, 1.4vw, 1.1rem);
}

.watch-layout {
  width: min(100%, 1720px);
  margin: 0 auto;
  padding-block: 0.65rem 1.5rem;
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
  margin: 0 auto;
  padding: 1rem 0;
  box-sizing: border-box;
}

/* True Center - Video Wrapper */
.video-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-frame,
.plyr-wrapper {
  width: 100%;
  aspect-ratio: 16/9;
  display: block;
  background: #000;
}

.video-frame {
  border: none;
}

.video-frame-error {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1rem;
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

.detail-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.85rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  text-decoration: none;
  background: var(--bg-secondary);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.detail-link:hover {
  background: var(--bg-tertiary);
  border-color: var(--text-tertiary);
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

/* Override Plyr's default max-width restrictions */
.plyr {
  max-width: none !important;
  width: 100% !important;
}

.plyr__video-wrapper {
  max-width: none !important;
  width: 100% !important;
}

.plyr__poster {
  max-width: none !important;
  width: 100% !important;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .watch-view {
    padding-top: 10px;
    padding-inline: 0.65rem;
  }

  .watch-layout {
    padding-block: 0.55rem 1rem;
  }

  .video-container {
    padding: 0.9rem 0;
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
