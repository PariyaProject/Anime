<template>
  <div ref="watchViewRoot" class="watch-view" :class="{ 'player-locked': playerInteractionLocked }">
    <div class="watch-layout">
      <!-- Loading State with Skeleton -->
      <div v-if="loading" class="theater-mode" style="opacity: 0.7; pointer-events: none;">
        <div ref="videoContainer" class="video-container">
          <div ref="videoWrapper" class="video-wrapper">
            <el-skeleton class="video-skeleton" animated>
              <template #template>
                <el-skeleton-item variant="image" class="video-skeleton-item" />
              </template>
            </el-skeleton>
          </div>
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
        <div ref="videoContainer" class="video-container">
          <div ref="videoWrapper" class="video-wrapper">
            <div
              v-if="videoUrl"
              id="plyr-player"
              ref="playerContainer"
              class="plyr-wrapper"
              @click.capture="handleLockedPlayerInteraction"
              @pointerdown.capture="handleLockedPlayerInteraction"
              @touchstart.capture="handleLockedPlayerInteraction"
            >
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

          <div ref="videoMetaBlock" class="video-title-overlay" :class="{ 'is-interaction-locked': playerInteractionLocked }">
            <h1 class="video-title">{{ episodeTitle }}</h1>
            <p class="video-meta">
              <span v-if="animeTitle">{{ animeTitle }}</span>
              <span v-if="season > 0"> · 第 {{ season }} 季</span>
              <span> · 第 {{ episode }} 集</span>
            </p>
          </div>

          <div ref="controlBar" class="control-bar" :class="{ 'is-interaction-locked': playerInteractionLocked }">
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

        <div class="side-panel" :class="{ 'is-interaction-locked': playerInteractionLocked }">
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

          <div class="panel-section link-status-section">
            <div class="progress-header">播放链接</div>
            <div class="link-status-summary">
              <span class="link-status-badge" :class="videoLinkStatusClass">{{ videoLinkStatusText }}</span>
              <span class="link-status-expiration">{{ videoLinkExpiresText }}</span>
            </div>
            <div class="link-status-meta">{{ videoLinkFetchedText }}</div>
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

const watchViewRoot = ref<HTMLElement | null>(null)
const videoContainer = ref<HTMLElement | null>(null)
const videoWrapper = ref<HTMLElement | null>(null)
const videoMetaBlock = ref<HTMLElement | null>(null)
const controlBar = ref<HTMLElement | null>(null)
const playerContainer = ref<HTMLElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
let player: Plyr | null = null

// Store saved position for resume after Plyr is initialized
const savedPositionForResume = ref<number | null>(null)
const savedPositionEpisode = ref<{ season: number; episode: number } | null>(null)
let isWaitingForResume = false
let pendingEpisodeAutoplay = false

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
const playerInteractionLocked = ref(false)

let saveInterval: number | null = null
let refreshUrlTimeout: number | null = null // Auto-refresh before URL expires
let isRefreshingUrl = ref(false) // Track if currently refreshing URL
let statusTickInterval: number | null = null
let responsiveLayoutFrame: number | null = null
let responsiveLayoutObserver: ResizeObserver | null = null
let touchGestureSurface: HTMLElement | null = null
let playerLockControlButton: HTMLButtonElement | null = null
let lastTouchGestureAt = 0
let lastTouchGesturePoint: { x: number; y: number } | null = null
const statusNow = ref(Date.now())
const DOUBLE_TAP_DELAY_MS = 280
const DOUBLE_TAP_MAX_DISTANCE_PX = 36

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

const videoUrlExpiresAt = computed(() =>
  playerStore.currentEpisodeData?.videoUrlExpiresAt ?? playerStore.expiresAt ?? null
)

const videoUrlFetchedAt = computed(() =>
  playerStore.currentEpisodeData?.videoUrlFetchedAt ?? null
)

const videoLinkStatusText = computed(() =>
  playerStore.currentEpisodeData?.videoUrlCacheHit ? '复用后端缓存' : '新解析链接'
)

const videoLinkStatusClass = computed(() =>
  playerStore.currentEpisodeData?.videoUrlCacheHit ? 'is-cached' : 'is-fresh'
)

const videoLinkExpiresText = computed(() => {
  const expiresAt = videoUrlExpiresAt.value
  if (!expiresAt) {
    return '过期时间未知'
  }

  const remainingMs = expiresAt - statusNow.value
  if (remainingMs <= 0) {
    return `已过期 · ${formatDateTime(expiresAt)}`
  }

  return `${formatRelativeDuration(remainingMs)}后过期`
})

const videoLinkFetchedText = computed(() => {
  const fetchedAt = videoUrlFetchedAt.value
  if (!fetchedAt) {
    return '尚未记录链接生成时间'
  }

  return `链接生成于 ${formatDateTime(fetchedAt)}`
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
  isWaitingForResume = false
  savedPositionForResume.value = null
  savedPositionEpisode.value = null
  currentTime.value = 0
  duration.value = 0
  playerStore.updateTime(0)
  playerStore.updateDuration(0)

  if (saveInterval) {
    clearInterval(saveInterval)
    saveInterval = null
  }

  // CRITICAL: Destroy old Plyr instance before loading new episode
  // This prevents dual audio issue when switching episodes
  if (player) {
    unmountPlayerLockControl()
    detachPlayerTouchGestures()
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

function selectEpisode(ep: number, options: { autoplay?: boolean } = {}) {
  if (options.autoplay ?? true) {
    pendingEpisodeAutoplay = true
  }

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

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

function formatRelativeDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  if (totalSeconds < 60) {
    return `${totalSeconds} 秒`
  }

  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
}

function handleImageError() {
  // Fallback to placeholder if cover image fails to load
  if (animeCover.value !== placeholderImage) {
    console.warn('⚠️ Cover image failed to load, using placeholder')
    animeCover.value = ''
  }
}

function getViewportMetrics() {
  const viewport = window.visualViewport
  return {
    height: viewport?.height || window.innerHeight,
    width: viewport?.width || window.innerWidth
  }
}

function getVerticalMargin(element: HTMLElement | null, side: 'top' | 'bottom') {
  if (!element) {
    return 0
  }

  const styles = window.getComputedStyle(element)
  const rawValue = side === 'top' ? styles.marginTop : styles.marginBottom
  const parsed = Number.parseFloat(rawValue)
  return Number.isFinite(parsed) ? parsed : 0
}

function refreshResponsiveLayoutObserver() {
  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
    return
  }

  if (!responsiveLayoutObserver) {
    responsiveLayoutObserver = new ResizeObserver(() => {
      scheduleResponsiveLayoutUpdate()
    })
  } else {
    responsiveLayoutObserver.disconnect()
  }

  const targets = [
    watchViewRoot.value,
    videoContainer.value,
    videoWrapper.value,
    videoMetaBlock.value,
    controlBar.value,
    playerContainer.value
  ]

  for (const target of targets) {
    if (target) {
      responsiveLayoutObserver.observe(target)
    }
  }
}

function updateResponsiveLayout() {
  const root = watchViewRoot.value
  const wrapper = videoWrapper.value
  const container = videoContainer.value

  if (!root) {
    return
  }

  const { height: viewportHeight, width: viewportWidth } = getViewportMetrics()
  root.style.setProperty('--watch-viewport-height', `${Math.round(viewportHeight)}px`)

  if (!wrapper || !container) {
    return
  }

  const wrapperTop = Math.max(wrapper.getBoundingClientRect().top, 0)
  const titleHeight = videoMetaBlock.value?.offsetHeight || 0
  const containerWidth = container.clientWidth || wrapper.clientWidth || viewportWidth
  const sidePadding = viewportWidth <= 768 ? 16 : 32
  const titleMarginTop = getVerticalMargin(videoMetaBlock.value, 'top')
  const titleBoundaryBuffer = viewportWidth <= 768 ? 10 : 14
  const widthPreference = viewportWidth >= 2200
    ? viewportWidth * 0.86
    : viewportWidth >= 1600
      ? viewportWidth * 0.82
      : viewportWidth >= 1200
        ? viewportWidth * 0.78
        : viewportWidth - sidePadding
  const availableHeight = viewportHeight
    - wrapperTop
    - titleMarginTop
    - titleHeight
    - titleBoundaryBuffer

  const safeMaxHeight = Math.max(180, Math.floor(availableHeight))
  const safeMaxWidth = Math.max(
    280,
    Math.floor(
      Math.min(
        containerWidth,
        viewportWidth - sidePadding,
        widthPreference,
        safeMaxHeight * (16 / 9)
      )
    )
  )
  const safeHeight = Math.max(158, Math.floor(safeMaxWidth * 9 / 16))

  root.style.setProperty('--player-width', `${safeMaxWidth}px`)
  root.style.setProperty('--player-height', `${safeHeight}px`)
  root.style.setProperty('--player-max-height', `${safeMaxHeight}px`)
}

function scheduleResponsiveLayoutUpdate() {
  if (typeof window === 'undefined') {
    return
  }

  if (responsiveLayoutFrame !== null) {
    window.cancelAnimationFrame(responsiveLayoutFrame)
  }

  responsiveLayoutFrame = window.requestAnimationFrame(() => {
    responsiveLayoutFrame = null
    updateResponsiveLayout()
  })
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

function resetTouchGestureState() {
  lastTouchGestureAt = 0
  lastTouchGesturePoint = null
}

function getPlayerLockIconMarkup(isLocked: boolean) {
  if (isLocked) {
    return `
      <svg class="player-lock-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 8h-1V6a4 4 0 0 0-7.75-1.38" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
        <rect x="5" y="8" width="14" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M10 13.5a2 2 0 1 1 4 0v1.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
      </svg>
    `
  }

  return `
    <svg class="player-lock-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 10V7a4 4 0 1 1 8 0v3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
      <rect x="5" y="10" width="14" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
    </svg>
  `
}

function getPlyrControlsElement() {
  const container = player?.elements?.container
  if (!(container instanceof HTMLElement)) {
    return null
  }

  return container.querySelector('.plyr__controls') as HTMLElement | null
}

function handlePlayerLockControlClick(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  togglePlayerInteractionLock()
}

function unmountPlayerLockControl() {
  if (!playerLockControlButton) {
    return
  }

  playerLockControlButton.removeEventListener('click', handlePlayerLockControlClick)
  playerLockControlButton.remove()
  playerLockControlButton = null
}

function syncPlayerLockControl() {
  const controls = getPlyrControlsElement()
  if (controls) {
    controls.classList.toggle('plyr__controls--lock-mode', playerInteractionLocked.value)
  }

  if (!playerLockControlButton) {
    return
  }

  const actionLabel = playerInteractionLocked.value ? '解锁屏幕' : '锁定屏幕'
  playerLockControlButton.classList.toggle('is-active', playerInteractionLocked.value)
  playerLockControlButton.setAttribute('aria-pressed', String(playerInteractionLocked.value))
  playerLockControlButton.setAttribute('aria-label', actionLabel)
  playerLockControlButton.setAttribute('title', actionLabel)
  playerLockControlButton.innerHTML = getPlayerLockIconMarkup(playerInteractionLocked.value)
}

function mountPlayerLockControl() {
  const controls = getPlyrControlsElement()
  if (!controls) {
    return
  }

  if (!playerLockControlButton) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'plyr__control player-lock-control'
    button.addEventListener('click', handlePlayerLockControlClick)
    playerLockControlButton = button
  }

  const fullscreenControl = controls.querySelector('[data-plyr="fullscreen"]')
  if (fullscreenControl?.parentElement === controls) {
    controls.insertBefore(playerLockControlButton, fullscreenControl)
  } else if (playerLockControlButton.parentElement !== controls) {
    controls.appendChild(playerLockControlButton)
  }

  syncPlayerLockControl()
}

function handleLockedPlayerInteraction(event: Event) {
  const target = event.target
  const isLockToggle = target instanceof Element && Boolean(target.closest('.player-lock-control'))

  if (isLockToggle) {
    return
  }

  if (!playerInteractionLocked.value) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
}

function togglePlayerInteractionLock() {
  playerInteractionLocked.value = !playerInteractionLocked.value
  resetTouchGestureState()
  syncPlayerLockControl()
  uiStore.showNotification(
    playerInteractionLocked.value ? '播放器已锁定，触摸操作已禁用' : '播放器已解锁',
    playerInteractionLocked.value ? 'warning' : 'success',
    1200
  )
}

function detachPlayerTouchGestures() {
  if (!touchGestureSurface) {
    return
  }

  touchGestureSurface.removeEventListener('touchend', handlePlayerTouchEnd)
  touchGestureSurface = null
  resetTouchGestureState()
}

function isTouchGestureOnPlayerControls(target: EventTarget | null) {
  return target instanceof Element && Boolean(
    target.closest('.plyr__controls, .plyr__control, .plyr__menu, .plyr__progress')
  )
}

function handlePlayerTouchEnd(event: TouchEvent) {
  if (
    !player ||
    playerInteractionLocked.value ||
    event.changedTouches.length !== 1 ||
    isTouchGestureOnPlayerControls(event.target)
  ) {
    return
  }

  const touch = event.changedTouches[0]
  const now = Date.now()
  const isWithinDoubleTapDelay = now - lastTouchGestureAt <= DOUBLE_TAP_DELAY_MS
  const isWithinDoubleTapDistance = lastTouchGesturePoint
    ? Math.hypot(
        touch.clientX - lastTouchGesturePoint.x,
        touch.clientY - lastTouchGesturePoint.y
      ) <= DOUBLE_TAP_MAX_DISTANCE_PX
    : false

  lastTouchGestureAt = now
  lastTouchGesturePoint = {
    x: touch.clientX,
    y: touch.clientY
  }

  if (!isWithinDoubleTapDelay || !isWithinDoubleTapDistance) {
    return
  }

  event.preventDefault()

  const gestureSurface = touchGestureSurface || videoElement.value || playerContainer.value
  if (!gestureSurface) {
    togglePlayPause()
    resetTouchGestureState()
    return
  }

  const { left, width } = gestureSurface.getBoundingClientRect()
  const relativeX = touch.clientX - left

  if (width > 0) {
    if (relativeX < width * 0.3) {
      seekBackward()
    } else if (relativeX > width * 0.7) {
      seekForward()
    } else {
      togglePlayPause()
    }
  } else {
    togglePlayPause()
  }

  resetTouchGestureState()
}

function attachPlayerTouchGestures() {
  detachPlayerTouchGestures()

  const container = player?.elements?.container
  const gestureSurface = (
    container instanceof HTMLElement
      ? container.querySelector('.plyr__video-wrapper')
      : null
  ) as HTMLElement | null

  touchGestureSurface = gestureSurface || videoElement.value || playerContainer.value

  if (!touchGestureSurface) {
    return
  }

  touchGestureSurface.addEventListener('touchend', handlePlayerTouchEnd, { passive: false })
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
  const forcePlayback = pendingEpisodeAutoplay
  pendingEpisodeAutoplay = false

  // Check if auto-play is enabled
  // because ready event may fire before loadEpisode sets the flag
  let shouldPlay = forcePlayback || autoPlayEnabled.value
  if (isRefreshReload) {
    shouldPlay = playingBeforeRefresh
  }
  console.log('▶️ Auto-play check:', {
    forcePlayback,
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
    const refreshedData = await playerStore.refreshVideoUrl()
    const freshUrl = refreshedData.realVideoUrl

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
  window.addEventListener('resize', scheduleResponsiveLayoutUpdate)
  window.addEventListener('orientationchange', scheduleResponsiveLayoutUpdate)
  window.addEventListener('scroll', scheduleResponsiveLayoutUpdate, { passive: true })
  window.visualViewport?.addEventListener('resize', scheduleResponsiveLayoutUpdate)
  window.visualViewport?.addEventListener('scroll', scheduleResponsiveLayoutUpdate)
  statusTickInterval = window.setInterval(() => {
    statusNow.value = Date.now()
  }, 30 * 1000)

  await nextTick()
  refreshResponsiveLayoutObserver()
  scheduleResponsiveLayoutUpdate()

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
  if (statusTickInterval) {
    clearInterval(statusTickInterval)
  }
  unmountPlayerLockControl()
  if (responsiveLayoutFrame !== null) {
    cancelAnimationFrame(responsiveLayoutFrame)
    responsiveLayoutFrame = null
  }
  if (responsiveLayoutObserver) {
    responsiveLayoutObserver.disconnect()
    responsiveLayoutObserver = null
  }
  if (player) {
    detachPlayerTouchGestures()
    player.destroy()
    player = null  // Clear the reference to allow re-initialization
  }

  // Cleanup event listeners to prevent memory leaks
  window.removeEventListener('visibilitychange', handlePageHide)
  window.removeEventListener('pagehide', handlePageHide)
  window.removeEventListener('beforeunload', handlePageHide)
  window.removeEventListener('resize', scheduleResponsiveLayoutUpdate)
  window.removeEventListener('orientationchange', scheduleResponsiveLayoutUpdate)
  window.removeEventListener('scroll', scheduleResponsiveLayoutUpdate)
  window.visualViewport?.removeEventListener('resize', scheduleResponsiveLayoutUpdate)
  window.visualViewport?.removeEventListener('scroll', scheduleResponsiveLayoutUpdate)
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

watch(
  [loading, error, videoUrl, animeTitle, episodeTitle],
  async () => {
    await nextTick()
    refreshResponsiveLayoutObserver()
    scheduleResponsiveLayoutUpdate()
  },
  { flush: 'post' }
)

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
    unmountPlayerLockControl()
    detachPlayerTouchGestures()
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
    mountPlayerLockControl()

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
      attachPlayerTouchGestures()
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
    player.on('enterfullscreen' as any, mountPlayerLockControl)
    player.on('exitfullscreen' as any, mountPlayerLockControl)

    // Schedule automatic URL refresh before expiration
    scheduleUrlRefresh()

    // Auto-resume from saved position after Plyr is ready
    player.on('ready', () => {
      mountPlayerLockControl()
      attachPlayerTouchGestures()
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
            isWaitingForResume = false

            // Resume playback after seek
            autoplay()
            return
          }
  
          // Seek to saved position
          if (player) {
            player.currentTime = savedPos
            console.log('✅ Resumed from saved position:', formatTime(savedPos), duration ? `/ ${formatTime(duration)}` : '')
            uiStore.showNotification(`恢复上次播放位置: ${formatTime(savedPos)}`, 'info')
            isWaitingForResume = false

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
  --watch-viewport-height: 100dvh;
  --player-width: min(100%, 1560px);
  --player-height: min(72dvh, calc((100vw - 1.25rem) * 9 / 16));
  --player-max-height: min(72dvh, calc((100vw - 1.25rem) * 9 / 16));
  min-height: var(--watch-viewport-height);
  background: var(--bg-primary);
  padding-top: max(10px, env(safe-area-inset-top, 0px));
  padding-bottom: max(14px, env(safe-area-inset-bottom, 0px));
  padding-inline: clamp(0.5rem, 1.4vw, 1.1rem);
  box-sizing: border-box;
}

.watch-layout {
  width: min(100%, 2200px);
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
  padding: clamp(0.55rem, 1.2vh, 1rem) 0;
  box-sizing: border-box;
}

/* True Center - Video Wrapper */
.video-wrapper {
  width: min(100%, var(--player-width));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  position: relative;
}

.video-frame,
.plyr-wrapper {
  width: 100%;
  aspect-ratio: 16/9;
  display: block;
  position: relative;
  background: #000;
  max-height: var(--player-max-height);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 18px 44px color-mix(in srgb, #000 18%, transparent);
}

.video-frame {
  border: none;
}

.plyr-wrapper,
.video-element {
  touch-action: manipulation;
}

:deep(.player-lock-control) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-width: 2.1rem;
  min-height: 2.1rem;
  padding: 0.3rem;
  transition:
    opacity 0.16s ease,
    background-color 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

:deep(.player-lock-control:hover) {
  background: rgba(255, 255, 255, 0.12);
}

:deep(.player-lock-control.is-active) {
  color: rgba(255, 205, 197, 0.92);
}

:deep(.player-lock-icon) {
  width: 0.92rem;
  height: 0.92rem;
  display: block;
}

.is-interaction-locked {
  pointer-events: none;
  opacity: 0.42;
  filter: saturate(0.75);
}

.watch-view.player-locked :deep(.plyr__controls) {
  display: flex !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateY(0) !important;
  pointer-events: auto !important;
  justify-content: flex-end !important;
  inset: auto 0 0 auto !important;
  width: auto !important;
  padding: max(0.45rem, env(safe-area-inset-bottom, 0px)) max(0.45rem, env(safe-area-inset-right, 0px)) !important;
  background: transparent !important;
}

.watch-view.player-locked :deep(.plyr__video-wrapper) {
  pointer-events: none !important;
}

.watch-view.player-locked :deep(.plyr__control--overlaid),
.watch-view.player-locked :deep(.plyr__menu) {
  opacity: 0 !important;
  pointer-events: none !important;
}

.watch-view.player-locked :deep(.plyr__controls.plyr__controls--lock-mode > *:not(.player-lock-control)) {
  display: none !important;
}

.watch-view.player-locked :deep(.plyr__controls.plyr__controls--lock-mode .player-lock-control) {
  border-radius: 999px;
  padding: 0.24rem;
  opacity: 0.58;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(9, 12, 20, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
}

.watch-view.player-locked :deep(.plyr__controls.plyr__controls--lock-mode .player-lock-control:hover),
.watch-view.player-locked :deep(.plyr__controls.plyr__controls--lock-mode .player-lock-control:focus-visible) {
  opacity: 0.9;
  background: rgba(9, 12, 20, 0.32);
  border-color: rgba(255, 255, 255, 0.18);
  transform: scale(1.03);
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
  min-height: 0;
}

/* Video Title Overlay - Minimal */
.video-title-overlay {
  width: min(100%, var(--player-width));
  margin: 1rem auto 0;
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
  width: min(100%, var(--player-width));
  margin: 1rem auto 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-tertiary);
  border-radius: 50px;
  box-sizing: border-box;
  flex-wrap: wrap;
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
  max-width: min(1600px, 100%);
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
.link-status-section {
  grid-column: 1;
  grid-row: 2;
}

.progress-section {
  grid-column: 1;
  grid-row: 3;
}

/* Episode List */
.episode-list {
  grid-column: 2;
  grid-row: 1 / span 3;
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

.link-status-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.link-status-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.link-status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.72rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.link-status-badge.is-cached {
  background: rgba(76, 175, 80, 0.16);
  color: #85d693;
}

.link-status-badge.is-fresh {
  background: rgba(255, 193, 7, 0.16);
  color: #ffd36d;
}

.link-status-expiration,
.link-status-meta {
  color: var(--text-secondary);
  font-size: 0.8rem;
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

.video-skeleton-item {
  width: min(100%, var(--player-width));
  height: var(--player-height);
  border-radius: 14px;
}

.video-skeleton {
  width: min(100%, var(--player-width));
  margin: 0 auto;
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

:deep(.plyr__video-wrapper),
:deep(.plyr__poster) {
  touch-action: manipulation;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .watch-view {
    min-height: var(--watch-viewport-height);
    padding-top: max(8px, env(safe-area-inset-top, 0px));
    padding-inline: 0.65rem;
  }

  .watch-layout {
    padding-block: 0.55rem 1rem;
  }

  .video-container {
    padding: 0.45rem 0 0.8rem;
  }

  :deep(.player-lock-control) {
    min-width: 2.1rem;
    padding-inline: 0.2rem;
  }

  :deep(.player-lock-icon) {
    width: 0.96rem;
    height: 0.96rem;
  }

  .video-title {
    font-size: clamp(1.02rem, 4.2vw, 1.2rem);
  }

  .control-bar {
    gap: 0.65rem;
    padding: 0.7rem 0.85rem;
    border-radius: 20px;
  }

  .side-panel {
    padding: 1rem 0.9rem;
    max-width: 100%;
    grid-template-columns: 1fr;
  }

  .anime-info,
  .link-status-section,
  .progress-section,
  .episode-list {
    grid-column: 1;
    grid-row: auto;
  }

  .episode-list {
    grid-row: auto;
  }

  .btn-control,
  .btn-back {
    flex: 1 1 132px;
    text-align: center;
  }

  .autoplay-toggle {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .watch-view {
    --player-height: min(62dvh, calc((100vw - 1.3rem) * 9 / 16));
  }

  .video-title-overlay {
    margin-top: 0.8rem;
  }

  .video-meta {
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .control-bar {
    margin-top: 0.85rem;
  }

  .anime-info {
    align-items: flex-start;
  }
}
</style>
