<template>
  <div class="watch-view py-4">
    <div v-if="loading" class="text-center py-5">
      <LoadingSpinner />
      <p class="mt-3 text-muted">加载中...</p>
    </div>

    <div v-else-if="error" class="text-center py-5">
      <ErrorMessage :message="error" @retry="loadEpisode" />
    </div>

    <div v-else class="row">
      <!-- Video Player Section -->
      <div class="col-lg-8">
        <div class="video-player-section mb-4">
          <div class="card">
            <div class="card-body p-0">
              <!-- Use iframe for cycani- video IDs (player domain) -->
              <iframe
                v-if="useIframePlayer"
                :src="playerUrl"
                class="w-100"
                style="aspect-ratio: 16/9; border: none"
                allowfullscreen
                allow="autoplay; fullscreen"
              ></iframe>

              <!-- Use Plyr for direct video URLs -->
              <div v-else id="plyr-player" ref="playerContainer">
                <video
                  v-if="videoUrl"
                  ref="videoElement"
                  controls
                  :poster="posterImage"
                  class="w-100"
                >
                  <source :src="videoUrl" type="video/mp4" />
                  您的浏览器不支持视频播放。
                </video>
              </div>
            </div>
          </div>

          <!-- Episode Info -->
          <div class="episode-info mt-3">
            <h4>{{ episodeTitle }}</h4>
            <p class="text-muted mb-2">
              <span v-if="animeTitle">{{ animeTitle }}</span>
              <span v-if="season > 0"> · 第 {{ season }} 季</span>
              · 第 {{ episode }} 集
            </p>
          </div>

          <!-- Player Controls -->
          <div class="player-controls mt-3">
            <div class="card">
              <div class="card-body">
                <div class="row align-items-center g-3">
                  <div class="col-auto">
                    <button
                      class="btn btn-primary"
                      @click="playPrevious"
                      :disabled="!hasPrevious"
                    >
                      <i class="bi bi-skip-start-fill"></i>
                      上一集
                    </button>
                  </div>
                  <div class="col-auto">
                    <button
                      class="btn btn-success"
                      @click="playNext"
                      :disabled="!hasNext"
                    >
                      下一集
                      <i class="bi bi-skip-end-fill"></i>
                    </button>
                  </div>
                  <div class="col">
                    <div class="form-check form-switch">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        id="autoplay-switch"
                        :checked="autoPlayEnabled"
                        @change="toggleAutoplay"
                      />
                      <label class="form-check-label" for="autoplay-switch">
                        自动播放
                      </label>
                    </div>
                  </div>
                  <div class="col-auto">
                    <router-link to="/" class="btn btn-outline-secondary">
                      <i class="bi bi-arrow-left"></i>
                      返回列表
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Episode List -->
        <div class="episode-list-section">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="bi bi-list-task me-2"></i>
                选集
              </h5>
              <div class="input-group input-group-sm" style="width: 200px">
                <input
                  v-model.number="jumpEpisode"
                  type="number"
                  class="form-control"
                  placeholder="集数"
                  :min="1"
                />
                <button class="btn btn-outline-primary" @click="jumpToEpisode">
                  跳转
                </button>
              </div>
            </div>
            <div class="card-body">
              <div v-if="episodesLoading" class="text-center py-3">
                <div class="spinner-border spinner-border-sm" role="status"></div>
                <span class="ms-2">加载中...</span>
              </div>
              <div v-else class="episode-grid">
                <button
                  v-for="ep in episodeList"
                  :key="ep"
                  class="btn episode-btn"
                  :class="{
                    'btn-primary': ep === episode && season === currentSeason,
                    'btn-outline-primary': ep !== episode || season !== currentSeason
                  }"
                  @click="selectEpisode(ep)"
                >
                  {{ ep }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar Section -->
      <div class="col-lg-4">
        <!-- Anime Info -->
        <div class="anime-info-section mb-4">
          <div class="card">
            <img
              :src="displayCoverImage"
              :alt="animeTitle"
              class="card-img-top"
              style="height: 300px; object-fit: cover"
              @error="handleImageError"
            />
            <div class="card-body">
              <h5 class="card-title">{{ animeTitle || '加载中...' }}</h5>
              <div class="anime-meta mb-2">
                <span class="badge bg-secondary me-1">{{ animeType || 'TV' }}</span>
                <span class="badge bg-info text-dark me-1">{{ animeYear || '未知' }}</span>
                <span class="badge bg-warning text-dark">
                  {{ totalEpisodes || '?' }} 集
                </span>
              </div>
              <p v-if="animeDescription" class="card-text small">
                {{ animeDescription }}
              </p>
            </div>
          </div>
        </div>

        <!-- Position Info -->
        <div class="position-info-section">
          <div class="card">
            <div class="card-body">
              <h6 class="card-title">
                <i class="bi bi-bookmark-fill me-2"></i>
                播放进度
              </h6>
              <div class="progress mb-2" style="height: 10px">
                <div
                  class="progress-bar"
                  role="progressbar"
                  :style="{ width: `${progress}%` }"
                ></div>
              </div>
              <p class="small text-muted mb-0">
                {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
const { autoplay: autoPlayEnabled, toggleAutoplay, setAutoplay } = useAutoplay()

// Get placeholder image URL as a constant
const getPlaceholderImage = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  return `${apiBaseUrl}/api/placeholder-image`
}
const placeholderImage = getPlaceholderImage()

const playerContainer = ref<HTMLElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
let player: Plyr | null = null

const loading = ref(false)
const episodesLoading = ref(false)
const error = ref<string | null>(null)

const animeId = computed(() => route.params.animeId as string)
const season = ref(Number(route.query.season) || 1)
const episode = ref(Number(route.query.episode) || 1)
const currentSeason = ref(season.value)

const jumpEpisode = ref<number>(episode.value)

// Check if we should use iframe player
// Use Plyr for cycani- IDs to enable progress tracking and auto-resume
const useIframePlayer = computed(() => {
  const url = playerStore.currentEpisodeData?.realVideoUrl
  if (!url) return false

  // Use Plyr for cycani- IDs (no iframe for better progress tracking)
  if (url.startsWith('cycani-')) {
    return false
  }

  // Only use iframe for existing player.cycanime.com URLs
  return url.includes('player.cycanime.com')
})

// Generate player URL for iframe
const playerUrl = computed(() => {
  const url = playerStore.currentEpisodeData?.realVideoUrl
  if (!url) return ''

  // If URL already contains player.cycanime.com, use it directly
  if (url.includes('player.cycanime.com')) {
    // Add autoplay parameter if not already present
    const autoplayParam = autoPlayEnabled.value ? (url.includes('?') ? '&autoplay=1' : '?autoplay=1') : ''
    return url + autoplayParam
  }

  // If URL is a cycani- ID, construct the player URL
  if (url.startsWith('cycani-')) {
    const autoplayParam = autoPlayEnabled.value ? '&autoplay=1' : ''
    return `https://player.cycanime.com/?url=${url}${autoplayParam}`
  }

  return ''
})

// Direct video URL for Plyr player
// Returns cycani- IDs directly (Plyr will handle them via backend proxy or player URL resolution)
// Returns direct MP4 URLs as-is
// Returns null for player.cycanime.com URLs (use iframe instead)
const videoUrl = computed(() => {
  const url = playerStore.currentEpisodeData?.realVideoUrl
  if (!url) return null

  // Return cycani- IDs directly for Plyr to handle
  if (url.startsWith('cycani-')) {
    return url
  }

  // Don't use player URLs with Plyr
  if (url.includes('player.cycanime.com')) {
    return null
  }

  return url  // Direct MP4 URLs
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
  loading.value = true
  error.value = null

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
      season.value = data.season
      episode.value = data.episode
      currentSeason.value = data.season
      jumpEpisode.value = data.episode

      // Note: animeTitle, animeCover, etc. are now set by loadAnimeDetails()
      // But keep fallback to episode data title if anime details failed
      if (animeResult.status === 'rejected' && data.title) {
        animeTitle.value = data.title
      }

      // Fetch saved position from backend for auto-resume
      const savedPosition = await historyStore.getLastPosition(
        animeId.value,
        data.season,
        data.episode
      )

      // Note: Plyr will be initialized by the watcher on useIframePlayer
      // This ensures DOM has updated before we try to initialize
      if (!useIframePlayer.value && videoUrl.value) {
        // Set Plyr source after initialization
        if (player) {
          console.log('🎬 Setting Plyr source:', videoUrl.value?.substring(0, 50))
          player.source = {
            type: 'video',
            sources: [{ src: videoUrl.value, type: 'video/mp4' }]
          }
        }

        // Auto-resume from saved position or use route query parameter
        const routeStartTime = Number(route.query.startTime) || 0
        let startTime = routeStartTime

        // Determine if we should use saved position
        if (savedPosition && savedPosition > 5 && !routeStartTime) {
          // Check if position is not near the end (completed episode)
          // We need to wait for player to load duration first
          setTimeout(() => {
            if (player && player.duration && savedPosition < player.duration - 30) {
              // Valid position, use it
              startTime = savedPosition
              player.currentTime = startTime
              uiStore.showNotification(
                `继续播放: ${formatTime(startTime)}`,
                'info'
              )
            } else if (player && player.duration && savedPosition >= player.duration - 30) {
              // Position near end, treat as completed
              console.log('Episode already completed, starting from beginning')
            } else {
              // Duration not loaded yet, try seeking anyway
              player.currentTime = savedPosition
            }
          }, 1000)
        } else if (savedPosition && savedPosition <= 5) {
          // Position at beginning, treat as new episode
          console.log('No saved position (at beginning), starting from beginning')
        }

        // Auto-play with delay (similar to old version)
        console.log('🎵 Auto-play enabled:', autoPlayEnabled.value)
        if (autoPlayEnabled.value) {
          // Wait for video to be ready before playing
          setTimeout(() => {
            console.log('▶️ Attempting to play, player exists:', !!player, 'videoElement:', !!videoElement.value)
            // Use the native video element for more reliable autoplay
            if (videoElement.value) {
              const media = videoElement.value
              console.log('🎬 Video element state:', {
                muted: media.muted,
                paused: media.paused,
                readyState: media.readyState
              })

              // Try unmuted autoplay, fall back to muted if blocked by browser
              const playPromise = media.play()
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch((err: any) => {
                  if (err.name === 'NotAllowedError') {
                    console.log('⚠️ Unmuted autoplay blocked, using muted fallback')
                    media.muted = true
                    media.play()
                  } else {
                    console.warn('Autoplay failed:', err)
                  }
                })
              } else if (playPromise === undefined) {
                // play() succeeded synchronously (no promise)
                console.log('✅ Playback started (synchronous)')
              }
            } else if (player) {
              // Fallback to Plyr's play method if video element is not available
              console.log('⚠️ videoElement not available, using Plyr play()')
              player.play()
            }
          }, 1000)  // Reduced from 2000ms to match legacy implementation
        }
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load episode'
  } finally {
    loading.value = false
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

  loadEpisode()
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
          id: animeId.value,
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

function onVideoEnd() {
  // Save position before loading next episode (mark as completed)
  if (duration.value > 0) {
    historyStore.savePositionImmediate(
      {
        id: animeId.value,
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

onMounted(async () => {
  uiStore.loadDarkModePreference()

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    'Space': togglePlayPause,
    'Ctrl+ArrowRight': playNext
  })

  // Setup page visibility/unload event listeners for immediate save
  const handlePageHide = () => {
    if (currentTime.value > 0) {
      historyStore.savePositionImmediate(
        {
          id: animeId.value,
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

  window.addEventListener('visibilitychange', handlePageHide)
  window.addEventListener('pagehide', handlePageHide)
  // Note: beforeunload is unreliable for async operations, but we try anyway
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
  if (player) {
    player.destroy()
  }
})

watch(() => route.query, () => {
  if (route.params.animeId === animeId.value) {
    season.value = Number(route.query.season) || 1
    episode.value = Number(route.query.episode) || 1
    loadEpisode()
  }
}, { deep: true })

// Watch useIframePlayer to initialize Plyr when DOM has updated
watch(useIframePlayer, async (newValue) => {
  // Only initialize Plyr when using Plyr player (not iframe)
  if (newValue === false && !player && videoUrl.value) {
    console.log('🎬 useIframePlayer is false, initializing Plyr...')
    // Wait for DOM to update
    await nextTick()
    // Small delay to ensure browser has rendered
    await new Promise(resolve => setTimeout(resolve, 50))

    const target = videoElement.value || document.querySelector('#plyr-player video')
    if (target) {
      console.log('✅ Found video element, calling initializePlyr()')
      initializePlyr()
    } else {
      console.error('❌ Video element not found after useIframePlayer check')
    }
  }
})

// Also watch videoUrl in case it changes after useIframePlayer watcher
watch(videoUrl, async (newUrl) => {
  if (newUrl && !useIframePlayer.value && !player) {
    console.log('🎬 videoUrl changed, initializing Plyr...')
    // Wait for DOM to update
    await nextTick()
    // Small delay to ensure browser has rendered
    await new Promise(resolve => setTimeout(resolve, 50))

    const target = videoElement.value || document.querySelector('#plyr-player video')
    if (target) {
      console.log('✅ Found video element via videoUrl watcher, calling initializePlyr()')
      initializePlyr()
    } else {
      console.error('❌ Video element not found after videoUrl changed')
    }
  }
})

function initializePlyr() {
  if (player) return // Already initialized

  try {
    console.log('🎬 Initializing Plyr...')

    // Target the video element, not the container
    const target = videoElement.value || document.querySelector('#plyr-player video')
    console.log('🎯 Target video element:', target ? 'found' : 'not found')

    if (!target) {
      console.error('❌ Video element not found!')
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
      // Save position when user resumes playback
      if (currentTime.value > 0) {
        historyStore.savePositionImmediate(
          {
            id: animeId.value,
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

    player.on('pause', () => {
      // Save position when user pauses playback
      if (currentTime.value > 0) {
        historyStore.savePositionImmediate(
          {
            id: animeId.value,
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
    player.on('seeked', (event) => {
      const plyr = event.detail.plyr
      const newPosition = plyr.currentTime
      if (newPosition > 0) {
        historyStore.savePositionImmediate(
          {
            id: animeId.value,
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
          5  // 5 second threshold for seek
        )
      }
    })

    player.on('ended', onVideoEnd)

    // Fallback interval: 5 minutes (was 30 seconds)
    // This is a safety net in case events don't fire properly
    saveInterval = window.setInterval(() => {
      if (currentTime.value > 0) {
        historyStore.savePositionImmediate(
          {
            id: animeId.value,
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
  }
}
</script>

<style scoped>
.watch-view {
  min-height: 100vh;
}

.episode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 0.5rem;
}

.episode-btn {
  padding: 0.5rem;
  font-size: 0.875rem;
}

.anime-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

#plyr-player {
  background: #000;
}
</style>
