<template>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAnimeStore } from '@/stores/anime'
import { useUiStore } from '@/stores/ui'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import AnimeCard from '@/components/anime/AnimeCard.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Anime, FilterParams } from '@/types/anime.types'

const props = defineProps<{
  defaultFilters?: Record<string, any>
}>()

const router = useRouter()
const route = useRoute()
const animeStore = useAnimeStore()
const uiStore = useUiStore()

function resolveChannel(channel?: string): 'tv' | 'movie' {
  return channel === 'movie' ? 'movie' : 'tv'
}

const initialChannel = resolveChannel(route.query.channel as string | undefined)

if (uiStore.filters.channel !== initialChannel) {
  uiStore.updateFilters({ channel: initialChannel })
}

const filters = ref<FilterParams>({
  search: '',
  genre: '',
  year: '',
  sort: 'time',
  channel: initialChannel,
  page: 1,
  limit: 48,
  ...props.defaultFilters
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
const totalAnimeLabel = computed(() => `${totalCount.value || animeList.value.length || 0} 部`)

const isSearchMode = computed(() => Boolean(filters.value.search && filters.value.search.trim().length >= 2))

const channelDisplayName = computed(() => {
  return filters.value.channel === 'movie' ? '剧场番剧' : 'TV番剧'
})

const recentYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const startYear = 1980
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
    channel: uiStore.filters.channel,
    page: 1,
    limit: 48,
    ...props.defaultFilters
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

watch(() => uiStore.filters.channel, (newChannel) => {
  if (filters.value.channel !== newChannel) {
    filters.value.channel = newChannel
    filters.value.page = 1
    loadAnimeList()
    router.replace({ query: { ...route.query, channel: newChannel } })
  }
})

onMounted(async () => {
  const urlChannel = resolveChannel(route.query.channel as string | undefined)
  uiStore.updateFilters({ channel: urlChannel })
  filters.value.channel = urlChannel

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

  await loadAnimeList()
})
</script>

<style scoped>
.catalog-shell {
  position: relative;
  z-index: 1;
  padding: 1.35rem 1.25rem;
  border-radius: 1.7rem;
  border: 1px solid color-mix(in srgb, var(--border-color) 76%, transparent);
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  box-shadow: 0 12px 30px color-mix(in srgb, var(--shadow) 62%, transparent);
  backdrop-filter: blur(12px);
}

.catalog-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.1rem;
}

.catalog-kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.24rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.catalog-title {
  margin: 0.2rem 0 0;
  color: var(--text-primary);
  font-size: clamp(1.4rem, 2.2vw, 2rem);
  font-weight: 600;
}

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

.filters-section {
  margin-bottom: 1rem;
}

.filters-card {
  background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  border-radius: 1.1rem;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--shadow) 42%, transparent);
}

.filters-body {
  padding: 1.05rem;
}

.form-input, .form-select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s ease, background-color 0.2s ease;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color) 16%, transparent);
}

.form-input::placeholder {
  color: var(--text-secondary);
}

.form-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-secondary);
}

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
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.pagination-list {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 0.5rem;
  background: var(--bg-secondary);
  padding: 0.5rem;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.page-item {
  display: flex;
}

.page-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0 0.75rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-item.active .page-link {
  background: var(--accent-color);
  color: white;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.page-link:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-primary) 10%, transparent);
  color: var(--text-primary);
}

.page-item.disabled .page-link {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
