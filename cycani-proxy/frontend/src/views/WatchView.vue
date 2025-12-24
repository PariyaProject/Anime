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
              <div id="plyr-player" ref="playerContainer">
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
                        v-model="autoPlay"
                      />
                      <label class="form-check-label" for="autoplay-switch">
                        自动播放下一集
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
              :src="animeCover || placeholderImage"
              :alt="animeTitle"
              class="card-img-top"
              style="height: 300px; object-fit: cover"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const historyStore = useHistoryStore()
const uiStore = useUiStore()

// Use static SVG file from backend server
const placeholderImage = `${import.meta.env.VITE_API_BASE_URL || ''}/placeholder/placeholder-300x400.svg`

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

const videoUrl = computed(() => playerStore.currentEpisodeData?.realVideoUrl)
const animeTitle = ref('')
const animeCover = ref('')
const animeType = ref('')
const animeYear = ref('')
const totalEpisodes = ref(0)
const animeDescription = ref('')

const currentTime = ref(0)
const duration = ref(0)
const autoPlay = ref(true)

let saveInterval: number | null = null

const episodeTitle = computed(() => {
  if (!playerStore.currentEpisodeData) return ''
  return playerStore.currentEpisodeData.title || `第 ${episode.value} 集`
})

const posterImage = computed(() => animeCover.value || '')

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

async function loadEpisode() {
  loading.value = true
  error.value = null

  try {
    await playerStore.loadEpisode(animeId.value, season.value, episode.value)

    const data = playerStore.currentEpisodeData
    if (data) {
      animeTitle.value = data.title
      season.value = data.season
      episode.value = data.episode
      currentSeason.value = data.season
      jumpEpisode.value = data.episode

      if (videoUrl.value && player) {
        player.source = {
          type: 'video',
          sources: [{ src: videoUrl.value, type: 'video/mp4' }]
        }

        const startTime = Number(route.query.startTime) || 0
        if (startTime > 0) {
          setTimeout(() => {
            if (player) player.currentTime = startTime
          }, 500)
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
  if (autoPlay.value && hasNext.value) {
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

  try {
    await loadEpisode()

    if (playerContainer.value) {
      player = new Plyr('#plyr-player', {
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
        ]
      })

      player.on('timeupdate', (event) => {
        const plyr = event.detail.plyr
        currentTime.value = plyr.currentTime
        duration.value = plyr.duration
      })

      player.on('ended', onVideoEnd)

      saveInterval = window.setInterval(() => {
        savePosition()
      }, 30000)
    }
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
