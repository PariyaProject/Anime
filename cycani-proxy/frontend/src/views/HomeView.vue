<template>
  <div class="home-view py-4">
    <!-- Continue Watching Section -->
    <section v-if="hasContinueWatching" class="continue-watching-section mb-5">
      <h2 class="section-header mb-4">
        继续观看
      </h2>
      <div class="continue-watching-container">
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
          <div
            v-for="anime in groupedAnime"
            :key="`${anime.animeId}-${anime.season}`"
            class="col"
          >
            <GroupedContinueWatchingCard
              :anime="anime"
              @resume="resumeWatching"
              @select-episode="selectEpisode"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Weekly Schedule Section -->
    <WeeklySchedule @select-anime="handleSelectAnime" />

    <!-- Filters Section -->
    <section class="filters-section mb-4">
      <div class="filters-card">
        <div class="filters-body">
          <div class="row g-3">
            <div class="col-md-4">
              <input
                v-model="filters.search"
                type="text"
                class="form-input"
                placeholder="搜索动画..."
                @input="debouncedSearch"
              />
            </div>
            <div class="col-md-2">
              <select
                v-model="filters.genre"
                class="form-select"
                @change="applyFilters"
                :disabled="isSearchMode"
                :title="isSearchMode ? '文本搜索时不可用' : ''"
              >
                <option value="">全部类型</option>
                <option value="TV">TV版</option>
                <option value="电影">电影</option>
                <option value="OVA">OVA</option>
              </select>
            </div>
            <div class="col-md-2">
              <select
                v-model="filters.year"
                class="form-select"
                @change="applyFilters"
                :disabled="isSearchMode"
                :title="isSearchMode ? '文本搜索时不可用' : ''"
              >
                <option value="">全部年份</option>
                <option v-for="year in recentYears" :key="year" :value="year.toString()">
                  {{ year }}
                </option>
              </select>
            </div>
            <div class="col-md-2">
              <select
                v-model="filters.sort"
                class="form-select"
                @change="applyFilters"
                :disabled="isSearchMode"
                :title="isSearchMode ? '文本搜索时不可用' : ''"
              >
                <option value="time">最新</option>
                <option value="hits">热门</option>
                <option value="score">评分</option>
              </select>
            </div>
            <div class="col-md-2">
              <button class="btn-reset w-100" @click="resetFilters">
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
          title="未找到相关动画"
          description="试试调整筛选条件或搜索关键词"
        />
      </div>

      <div v-else>
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-6 g-3">
          <div v-for="anime in animeList" :key="anime.id" class="col">
            <AnimeCard
              :anime="anime"
              @select="handleSelectAnime"
            />
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination-wrapper mt-4">
          <nav class="pagination">
            <ul class="pagination-list">
              <li class="page-item" :class="{ disabled: !hasPrevPage }">
                <button
                  class="page-link"
                  @click="goToPage(currentPage - 1)"
                  :disabled="!hasPrevPage"
                >
                  上一页
                </button>
              </li>
              <li
                v-for="page in displayedPages"
                :key="page"
                class="page-item"
                :class="{ active: page === currentPage }"
              >
                <button
                  class="page-link"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
              </li>
              <li class="page-item" :class="{ disabled: !hasNextPage }">
                <button
                  class="page-link"
                  @click="goToPage(currentPage + 1)"
                  :disabled="!hasNextPage"
                >
                  下一页
                </button>
              </li>
            </ul>
          </nav>
          <p class="text-center text-muted small mt-3">
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
import { useGroupedHistory, type GroupedAnime, type WatchedEpisode } from '@/composables/useGroupedHistory'
import AnimeCard from '@/components/anime/AnimeCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import GroupedContinueWatchingCard from '@/components/history/GroupedContinueWatchingCard.vue'
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

// Search mode: true when user has entered text in search box
const isSearchMode = computed(() => Boolean(filters.value.search && filters.value.search.trim().length >= 2))

const continueWatching = computed(() => historyStore.continueWatching)
const hasContinueWatching = computed(() => historyStore.hasContinueWatching)

// Use grouped history for better UX
const { groupedAnime } = useGroupedHistory(continueWatching)

const recentYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const startYear = 1980  // Website has data from 1980
  const years = []
  for (let year = currentYear; year >= startYear; year--) {
    years.push(year)
  }
  return years
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

function resumeWatching(anime: GroupedAnime) {
  router.push({
    name: 'Watch',
    params: {
      animeId: anime.animeId
    },
    query: {
      season: anime.season.toString(),
      episode: anime.latestEpisode.episode.toString()
      // Note: startTime is no longer needed - backend API will return the saved position
    }
  })
}

function selectEpisode(anime: GroupedAnime, episode: WatchedEpisode) {
  router.push({
    name: 'Watch',
    params: {
      animeId: anime.animeId
    },
    query: {
      season: anime.season.toString(),
      episode: episode.episode.toString()
      // Note: startTime is no longer needed - backend API will return the saved position
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

/* Section Headers */
.section-header {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
}

/* Continue Watching Container - Scrollable */
.continue-watching-container {
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* Scrollbar styling for dark mode compatibility */
.continue-watching-container::-webkit-scrollbar {
  width: 8px;
}

.continue-watching-container::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.continue-watching-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.continue-watching-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* Filters Card */
.filters-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 1px 3px var(--shadow);
}

.filters-body {
  padding: 1rem;
}

/* Form Input */
.form-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.form-input::placeholder {
  color: var(--text-secondary);
}

/* Form Select */
.form-select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.form-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-secondary);
}

/* Reset Button */
.btn-reset {
  padding: 0.6rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-reset:hover {
  background: var(--bg-tertiary);
}

/* Pagination */
.pagination {
  margin-top: 2rem;
}

.pagination-list {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.page-item {
  display: flex;
}

.page-link {
  min-width: 40px;
  height: 36px;
  padding: 0 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.page-link:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
}

.page-item.active .page-link {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: var(--bg-primary);
}

.page-item.disabled .page-link {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-item.disabled .page-link:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.pagination-wrapper {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .form-input,
  .form-select,
  .btn-reset,
  .page-link {
    transition: none;
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .section-header {
    font-size: 1.25rem;
  }

  .filters-body {
    padding: 0.75rem;
  }

  .pagination-list {
    gap: 0.25rem;
  }

  .page-link {
    min-width: 36px;
    height: 32px;
    padding: 0 0.5rem;
    font-size: 0.85rem;
  }
}
</style>
