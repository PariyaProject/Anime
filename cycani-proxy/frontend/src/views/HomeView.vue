<template>
  <div class="home-view py-4">
    <!-- Continue Watching Section -->
    <section v-if="hasContinueWatching" class="continue-watching-section mb-4">
      <h5 class="mb-3">
        <i class="bi bi-clock-history me-2"></i>
        继续观看
      </h5>
      <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
        <div
          v-for="item in continueWatching.slice(0, 4)"
          :key="`${item.animeId}-${item.season}-${item.episode}`"
          class="col"
        >
          <div
            class="card history-card cursor-pointer"
            @click="resumeWatching(item)"
          >
            <div class="card-body p-2 d-flex align-items-center gap-3">
              <img
                :src="item.animeCover || placeholderImage"
                :alt="item.animeTitle"
                class="rounded"
                width="80"
                height="80"
                style="object-fit: cover"
              />
              <div class="flex-grow-1">
                <h6 class="card-title mb-1 text-truncate">{{ item.animeTitle }}</h6>
                <p class="card-text small text-muted mb-1">
                  第 {{ item.season }} 季 · 第 {{ item.episode }} 集
                </p>
                <div class="progress" style="height: 4px">
                  <div
                    class="progress-bar"
                    role="progressbar"
                    :style="{ width: `${getProgress(item)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Weekly Schedule Section -->
    <WeeklySchedule @select-anime="handleSelectAnime" />

    <!-- Filters Section -->
    <section class="filters-section mb-4">
      <div class="card">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <input
                v-model="filters.search"
                type="text"
                class="form-control"
                placeholder="搜索动画..."
                @input="debouncedSearch"
              />
            </div>
            <div class="col-md-2">
              <select v-model="filters.genre" class="form-select" @change="applyFilters">
                <option value="">全部类型</option>
                <option value="TV">TV版</option>
                <option value="电影">电影</option>
                <option value="OVA">OVA</option>
              </select>
            </div>
            <div class="col-md-2">
              <select v-model="filters.year" class="form-select" @change="applyFilters">
                <option value="">全部年份</option>
                <option v-for="year in recentYears" :key="year" :value="year.toString()">
                  {{ year }}
                </option>
              </select>
            </div>
            <div class="col-md-2">
              <select v-model="filters.sort" class="form-select" @change="applyFilters">
                <option value="time">最新</option>
                <option value="hits">热门</option>
                <option value="score">评分</option>
              </select>
            </div>
            <div class="col-md-2">
              <button class="btn btn-outline-secondary w-100" @click="resetFilters">
                重置筛选
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Anime Grid Section -->
    <section class="anime-grid-section">
      <div v-if="loading" class="text-center py-5">
        <LoadingSpinner />
        <p class="mt-3 text-muted">加载中...</p>
      </div>

      <div v-else-if="error" class="text-center py-5">
        <ErrorMessage :message="error" @retry="loadAnimeList" />
      </div>

      <div v-else-if="!hasAnime" class="text-center py-5">
        <EmptyState
          icon="bi bi-search"
          title="未找到相关动画"
          description="试试调整筛选条件或搜索关键词"
        />
      </div>

      <div v-else>
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3">
          <div v-for="anime in animeList" :key="anime.id" class="col">
            <AnimeCard
              :anime="anime"
              @select="handleSelectAnime"
              @details="handleViewDetails"
            />
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination-wrapper mt-4">
          <nav>
            <ul class="pagination justify-content-center">
              <li class="page-item" :class="{ disabled: !hasPrevPage }">
                <a
                  class="page-link"
                  href="#"
                  @click.prevent="goToPage(currentPage - 1)"
                >
                  上一页
                </a>
              </li>
              <li
                v-for="page in displayedPages"
                :key="page"
                class="page-item"
                :class="{ active: page === currentPage }"
              >
                <a
                  class="page-link"
                  href="#"
                  @click.prevent="goToPage(page)"
                >
                  {{ page }}
                </a>
              </li>
              <li class="page-item" :class="{ disabled: !hasNextPage }">
                <a
                  class="page-link"
                  href="#"
                  @click.prevent="goToPage(currentPage + 1)"
                >
                  下一页
                </a>
              </li>
            </ul>
          </nav>
          <p class="text-center text-muted small">
            第 {{ currentPage }} / {{ totalPages }} 页，共 {{ totalCount }} 部动画
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAnimeStore } from '@/stores/anime'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import AnimeCard from '@/components/anime/AnimeCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import WeeklySchedule from '@/components/schedule/WeeklySchedule.vue'
import type { Anime, FilterParams } from '@/types/anime.types'
import type { WatchRecord } from '@/types/history.types'

const router = useRouter()
const animeStore = useAnimeStore()
const historyStore = useHistoryStore()
const uiStore = useUiStore()

// Get placeholder image URL as a constant
const getPlaceholderImage = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  return `${apiBaseUrl}/api/placeholder-image`
}
const placeholderImage = getPlaceholderImage()

const filters = ref<FilterParams>({
  search: '',
  genre: '',
  year: '',
  sort: 'time',
  page: 1,
  limit: 48
})

let debounceTimer: number | null = null

const animeList = computed(() => animeStore.animeList)
const loading = computed(() => animeStore.loading)
const error = computed(() => animeStore.error)
const hasAnime = computed(() => animeStore.hasAnime)
const currentPage = computed(() => animeStore.currentPage)
const totalPages = computed(() => animeStore.totalPages)
const totalCount = computed(() => animeStore.totalCount)
const hasNextPage = computed(() => animeStore.hasNextPage)
const hasPrevPage = computed(() => animeStore.hasPrevPage)

const continueWatching = computed(() => historyStore.continueWatching)
const hasContinueWatching = computed(() => historyStore.hasContinueWatching)

const recentYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 10 }, (_, i) => currentYear - i)
})

const displayedPages = computed(() => {
  const pages: number[] = []
  const maxPages = 7
  const start = Math.max(1, currentPage.value - Math.floor(maxPages / 2))
  const end = Math.min(totalPages.value, start + maxPages - 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})

async function loadAnimeList() {
  try {
    await animeStore.loadAnimeList(filters.value)
  } catch (err) {
    console.error('Failed to load anime list:', err)
  }
}

function debouncedSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = window.setTimeout(() => {
    filters.value.page = 1
    loadAnimeList()
  }, 500)
}

function applyFilters() {
  filters.value.page = 1
  loadAnimeList()
}

function resetFilters() {
  filters.value = {
    search: '',
    genre: '',
    year: '',
    sort: 'time',
    page: 1,
    limit: 48
  }
  loadAnimeList()
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  filters.value.page = page
  loadAnimeList()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleSelectAnime(anime: Anime | string) {
  const animeId = typeof anime === 'string' ? anime : anime.id.toString()
  router.push({
    name: 'Watch',
    params: { animeId }
  })
}

function handleViewDetails(anime: Anime) {
  // For now, just navigate to watch page
  // In the future, could show a detail modal
  handleSelectAnime(anime)
}

function resumeWatching(item: WatchRecord) {
  router.push({
    name: 'Watch',
    params: {
      animeId: item.animeId
    },
    query: {
      season: item.season.toString(),
      episode: item.episode.toString(),
      startTime: item.position.toString()
    }
  })
}

function getProgress(item: WatchRecord): number {
  if (item.duration === 0) return 0
  return Math.min(100, (item.position / item.duration) * 100)
}

onMounted(async () => {
  uiStore.loadDarkModePreference()

  // Setup keyboard shortcuts for pagination
  useKeyboardShortcuts({
    'ArrowLeft': () => {
      if (hasPrevPage.value) {
        goToPage(currentPage.value - 1)
      }
    },
    'ArrowRight': () => {
      if (hasNextPage.value) {
        goToPage(currentPage.value + 1)
      }
    }
  })

  await Promise.all([
    loadAnimeList(),
    historyStore.loadContinueWatching()
  ])
})
</script>

<style scoped>
.home-view {
  min-height: 100vh;
}

.history-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.history-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.cursor-pointer {
  cursor: pointer;
}

.pagination-wrapper {
  margin-top: 2rem;
}

.page-link {
  cursor: pointer;
}
</style>
