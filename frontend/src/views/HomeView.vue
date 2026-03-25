<template>
  <div class="home-view">
    <div class="home-layout">
    <section class="home-stage">
      <div class="stage-copy">
        <p class="stage-kicker">{{ channelDisplayName }}</p>
        <h1 class="stage-title">ANIME</h1>
        <div class="stage-meta">
          <span class="stage-chip">{{ totalAnimeLabel }}</span>
          <span class="stage-chip">{{ hasContinueWatching ? `继续观看 ${groupedAnime.length}` : '持续更新' }}</span>
        </div>
      </div>

      <div class="stage-posters" aria-hidden="true">
        <button
          v-for="anime in featuredShelf"
          :key="`stage-${anime.id}`"
          type="button"
          class="stage-poster"
          @click="openAnimeDetail(anime)"
        >
          <img :src="getCoverImage(anime.cover)" :alt="anime.title" />
        </button>
      </div>
    </section>

    <!-- Continue Watching Section -->
    <section v-if="hasContinueWatching" class="continue-watching-section">
      <h2 class="section-header section-header-spaced">
        继续观看
      </h2>
      <div class="continue-watching-container">
        <div class="continue-watching-scroll">
          <div
            v-for="anime in groupedAnime"
            :key="`${anime.animeId}-${anime.season}`"
            class="continue-watching-item"
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
    <WeeklySchedule
      v-if="showWeeklySchedule"
      @select-anime="openAnimeDetail"
    />

    <section class="catalog-shell">
      <div class="catalog-header">
        <div>
          <p class="catalog-kicker">{{ channelDisplayName }}</p>
          <h2 class="catalog-title">片单</h2>
        </div>
        <span class="catalog-meta">{{ totalAnimeLabel }}</span>
      </div>

      <!-- Filters Section -->
      <section class="filters-section">
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
      <div v-if="loading" class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-6 g-3">
        <div v-for="i in 12" :key="i" class="col">
          <el-skeleton animated style="height: 100%">
            <template #template>
              <el-skeleton-item variant="image" style="width: 100%; height: 260px; border-radius: 8px;" />
              <div style="padding: 10px 0;">
                <el-skeleton-item variant="text" style="width: 80%" />
                <el-skeleton-item variant="text" style="width: 60%" />
              </div>
            </template>
          </el-skeleton>
        </div>
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
        <div class="anime-grid row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-6 g-3">
          <div v-for="anime in animeList" :key="anime.id" class="col anime-grid-item">
            <AnimeCard
              :anime="anime"
              @open="openAnimeDetail"
              @play="quickPlayAnime"
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
    </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
const route = useRoute()
const animeStore = useAnimeStore()
const historyStore = useHistoryStore()
const uiStore = useUiStore()

function resolveChannel(channel?: string): 'tv' | 'movie' {
  return channel === 'movie' ? 'movie' : 'tv'
}

const initialChannel = resolveChannel(route.query.channel as string | undefined)

if (uiStore.filters.channel !== initialChannel) {
  uiStore.updateFilters({ channel: initialChannel })
}

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
  channel: initialChannel,
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
const featuredShelf = computed(() => animeList.value.slice(0, 5))
const totalAnimeLabel = computed(() => `${totalCount.value || animeList.value.length || 0} 部`)

// Search mode: true when user has entered text in search box
const isSearchMode = computed(() => Boolean(filters.value.search && filters.value.search.trim().length >= 2))

// Current channel display name
const channelDisplayName = computed(() => {
  return filters.value.channel === 'movie' ? '剧场番剧' : 'TV番剧'
})
const showWeeklySchedule = computed(() => filters.value.channel === 'tv')

const continueWatching = computed(() => historyStore.continueWatching)

// Use grouped history for better UX
const { groupedAnime } = useGroupedHistory(continueWatching)
const hasContinueWatching = computed(() => groupedAnime.value.length > 0)

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
  }, 800)
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
    channel: uiStore.filters.channel,  // Keep current channel
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

function openAnimeDetail(anime: Anime | string) {
  const animeId = typeof anime === 'string' ? anime : anime.id.toString()
  router.push({
    name: 'AnimeDetail',
    params: { animeId }
  })
}

function quickPlayAnime(anime: Anime) {
  router.push({
    name: 'Watch',
    params: { animeId: anime.id.toString() }
  })
}

function getCoverImage(cover?: string): string {
  if (!cover) {
    return placeholderImage
  }

  if (cover.startsWith('http://') || cover.startsWith('https://')) {
    return cover
  }

  if (cover.startsWith('/api/') || cover.startsWith('/placeholder/')) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
    return `${apiBaseUrl}${cover}`
  }

  return placeholderImage
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

// Watch uiStore channel changes (from navbar tabs)
watch(() => uiStore.filters.channel, (newChannel) => {
  if (filters.value.channel !== newChannel) {
    filters.value.channel = newChannel
    filters.value.page = 1
    loadAnimeList()
    // Update URL query parameter without creating history entry
    router.replace({ query: { ...route.query, channel: newChannel } })
  }
})

onMounted(async () => {
  uiStore.loadDarkModePreference()

  // Read channel from URL query parameter on initial load
  const urlChannel = resolveChannel(route.query.channel as string | undefined)
  uiStore.updateFilters({ channel: urlChannel })
  filters.value.channel = urlChannel

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
  position: relative;
  padding-inline: clamp(0.5rem, 1.4vw, 1.1rem);
}

.home-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: min(100%, 1500px);
  margin: 0 auto;
  padding-block: 0.7rem 1.5rem;
}

@media (max-width: 768px) {
  .home-view {
    padding-inline: 0.65rem;
  }
}

.home-view::before,
.home-view::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.home-view::before {
  background:
    radial-gradient(circle at top left, rgba(255, 179, 71, 0.16), transparent 24%),
    radial-gradient(circle at top right, rgba(78, 156, 255, 0.12), transparent 22%);
  opacity: 0.95;
}

.home-view::after {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.26), transparent 80%);
}

.home-stage,
.continue-watching-section,
.catalog-shell {
  position: relative;
  z-index: 1;
}

.home-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.95fr);
  gap: 1.5rem;
  align-items: center;
  padding: 1.6rem 1.5rem;
  border-radius: 1.9rem;
  border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  background:
    radial-gradient(circle at top right, rgba(255, 182, 77, 0.18), transparent 28%),
    linear-gradient(145deg, color-mix(in srgb, var(--bg-primary) 88%, #ffffff 12%), var(--bg-secondary));
  box-shadow: 0 18px 48px color-mix(in srgb, var(--shadow) 70%, transparent);
  overflow: hidden;
}

.home-stage::after {
  content: '';
  position: absolute;
  inset: auto -10% -40% 30%;
  height: 220px;
  background: radial-gradient(circle, rgba(87, 154, 255, 0.18), transparent 70%);
  pointer-events: none;
}

.stage-copy {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-width: 0;
}

.stage-kicker,
.catalog-kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.24rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.stage-title {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
  font-size: clamp(3rem, 7vw, 5.3rem);
  line-height: 0.92;
  color: var(--text-primary);
}

.stage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.stage-chip,
.catalog-meta {
  display: inline-flex;
  align-items: center;
  min-height: 2.15rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
  background: color-mix(in srgb, var(--bg-primary) 86%, transparent);
  color: var(--text-primary);
  backdrop-filter: blur(14px);
}

.stage-posters {
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 290px;
  padding-right: 0.5rem;
}

.stage-poster {
  width: 150px;
  aspect-ratio: 3 / 4;
  border: 0;
  border-radius: 1.4rem;
  overflow: hidden;
  padding: 0;
  background: var(--bg-secondary);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.22);
  transform-origin: center bottom;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.stage-poster + .stage-poster {
  margin-left: -1.9rem;
}

.stage-poster:nth-child(1) { transform: translateY(18px) rotate(-10deg); }
.stage-poster:nth-child(2) { transform: translateY(-8px) rotate(-4deg); }
.stage-poster:nth-child(3) { transform: translateY(12px) rotate(3deg); }
.stage-poster:nth-child(4) { transform: translateY(-14px) rotate(8deg); }
.stage-poster:nth-child(5) { transform: translateY(6px) rotate(13deg); }

.stage-poster:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 24px 42px rgba(0, 0, 0, 0.28);
}

.stage-poster img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
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

.section-header-spaced {
  margin-bottom: 1rem;
}

.continue-watching-section,
.catalog-shell {
  padding: 1.35rem 1.25rem;
  border-radius: 1.7rem;
  border: 1px solid color-mix(in srgb, var(--border-color) 76%, transparent);
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  box-shadow: 0 12px 30px color-mix(in srgb, var(--shadow) 62%, transparent);
  backdrop-filter: blur(12px);
}

.filters-section {
  margin-bottom: 1rem;
}

.catalog-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.1rem;
}

.catalog-title {
  margin: 0.2rem 0 0;
  color: var(--text-primary);
  font-size: clamp(1.4rem, 2.2vw, 2rem);
  font-weight: 600;
}

/* Continue Watching Container - Horizontal Scroll */
.continue-watching-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;
  scroll-padding-inline-end: 0.5rem;
}

.continue-watching-scroll {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  padding: 0 0.5rem 0.5rem 0;
}

.continue-watching-item {
  flex: 0 0 auto;
  width: 280px;
  max-width: 280px;
}

/* Horizontal scrollbar styling for dark mode compatibility */
.continue-watching-container::-webkit-scrollbar {
  height: 8px;
}

.continue-watching-container::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
  margin: 4px 0;
}

.continue-watching-container::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
  transition: background 0.3s ease;
  min-height: 8px;
}

.continue-watching-container:hover::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.continue-watching-container:hover::-webkit-scrollbar-thumb {
  background: var(--border-color);
}

.continue-watching-container:hover::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* Filters Card */
.filters-card {
  background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  border-radius: 1.1rem;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--shadow) 42%, transparent);
}

.filters-body {
  padding: 1.05rem;
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
  transition: border-color 0.2s, box-shadow 0.2s ease, background-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color) 16%, transparent);
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
  transition: border-color 0.2s, box-shadow 0.2s ease, background-color 0.2s ease;
}

.form-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color) 16%, transparent);
}

.form-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-secondary);
}

/* Reset Button */
.btn-reset {
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, color-mix(in srgb, var(--bg-secondary) 82%, transparent), var(--bg-tertiary));
  border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  border-radius: 0.85rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.18s ease;
}

.btn-reset:hover {
  background: var(--bg-tertiary);
  transform: translateY(-1px);
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

.anime-grid-item {
  content-visibility: auto;
  contain-intrinsic-size: 420px;
  contain: layout paint style;
}

.anime-grid {
  contain: layout style;
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
  .home-layout {
    gap: 0.85rem;
    padding-block: 0.45rem 1rem;
  }

  .home-stage {
    grid-template-columns: 1fr;
    padding: 1.2rem 1rem;
  }

  .stage-posters {
    justify-content: flex-start;
    min-height: 210px;
    overflow-x: auto;
    padding-bottom: 0.6rem;
  }

  .stage-poster {
    width: 118px;
    flex: 0 0 auto;
  }

  .stage-poster + .stage-poster {
    margin-left: -1.1rem;
  }

  .section-header {
    font-size: 1.25rem;
  }

  .catalog-header {
    flex-direction: column;
    align-items: flex-start;
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
