<template>
  <div class="history-view">
    <div class="history-layout">
      <h4 class="history-header mb-4">
        <i class="bi bi-clock-history me-2"></i>
        观看历史
      </h4>

      <div v-if="loading" class="text-center py-5">
        <LoadingSpinner />
        <p class="mt-3 text-muted">加载中...</p>
      </div>

      <div v-else-if="error" class="text-center py-5">
        <ErrorMessage :message="error" @retry="loadHistory" />
      </div>

      <div v-else-if="!hasHistory" class="text-center py-5">
        <EmptyState
          icon="bi bi-clock-history"
          title="暂无观看历史"
          description="开始观看动画后，历史记录会显示在这里"
        />
      </div>

      <div v-else>
        <section class="filters-section mb-4">
          <div class="filters-card">
            <div class="filters-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <input
                    v-model="searchQuery"
                    type="text"
                    class="form-input"
                    placeholder="搜索动画..."
                  />
                </div>
                <div class="col-md-3">
                  <select v-model="filterStatus" class="form-select">
                    <option value="">全部状态</option>
                    <option value="completed">已看完</option>
                    <option value="watching">观看中</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <select v-model="sortBy" class="form-select">
                    <option value="date">按时间排序</option>
                    <option value="name">按名称排序</option>
                    <option value="progress">按进度排序</option>
                  </select>
                </div>
              </div>
              <div v-if="hasActiveFilters" class="mt-2 filter-actions">
                <button class="btn-clear" @click="resetFilters">
                  <i class="bi bi-x-circle me-1"></i>
                  清除筛选
                </button>
                <span class="result-count">
                  找到 {{ filteredHistory.length }} 条记录
                </span>
              </div>
            </div>
          </div>
        </section>

        <div v-if="filteredHistory.length === 0" class="text-center py-5">
          <EmptyState
            icon="bi bi-search"
            title="没有找到匹配的记录"
            description="尝试调整搜索条件或清除筛选"
          />
        </div>

        <div v-else class="history-grid">
          <div
            v-for="item in filteredHistory"
            :key="`${item.animeId}-${item.season}-${item.episode}`"
            class="history-item"
          >
            <div
              class="history-card cursor-pointer"
              :class="{ 'local-only': (item as any).isLocalOnly }"
              @click="resumeWatching(item)"
            >
              <img
                :src="item.animeCover || placeholderImage"
                :alt="item.animeTitle"
                class="history-card-image"
              />

              <div v-if="(item as any).isLocalOnly" class="corner-badge" title="仅本地存储">
                <span class="corner-text">本地</span>
              </div>
              <div class="history-card-body">
                <h6 class="history-card-title">{{ item.animeTitle }}</h6>
                <p class="history-card-meta">
                  第 {{ item.season }} 季 · 第 {{ item.episode }} 集
                </p>
                <div class="progress-bar-container">
                  <div
                    class="progress-bar-fill"
                    :class="{ 'estimated-progress': isEstimatedProgress(item) }"
                    :style="{ width: `${getDisplayProgress(item)}%` }"
                  ></div>
                </div>
                <div class="history-card-footer">
                  <span class="time-text">
                    {{ formatProgressLabel(item) }}
                  </span>
                  <span v-if="item.completed" class="badge-completed">已看完</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import { useGroupedHistory } from '@/composables/useGroupedHistory'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { WatchRecord } from '@/types/history.types'

const router = useRouter()
const historyStore = useHistoryStore()
const uiStore = useUiStore()

// Use static SVG file from backend server (via Vite proxy in dev)
const placeholderImage = '/placeholder/placeholder-300x180.svg'

const loading = ref(false)
const error = ref<string | null>(null)

const searchQuery = ref('')
const filterStatus = ref('')
const sortBy = ref('date')

// Get backend history data
const backendHistory = computed(() => historyStore.watchHistory)

// Merge with localStorage data using useGroupedHistory
const { groupedAnime } = useGroupedHistory(backendHistory)

// Convert grouped anime back to flat list for history display
const historyItems = computed(() => {
  const flatList: (WatchRecord & { isLocalOnly?: boolean })[] = []
  for (const anime of groupedAnime.value) {
    for (const episode of anime.episodes) {
      flatList.push({
        animeId: anime.animeId,
        animeTitle: anime.animeTitle,
        animeCover: anime.animeCover,
        season: anime.season,
        episode: episode.episode,
        episodeTitle: episode.episodeTitle,
        position: episode.position,
        duration: episode.duration,
        watchDate: episode.watchDate,
        completed: episode.completed,
        isLocalOnly: episode.isLocalOnly  // 保留 isLocalOnly 标志
      })
    }
  }
  return flatList
})

const hasHistory = computed(() => historyItems.value.length > 0)

const hasActiveFilters = computed(() => {
  return searchQuery.value !== '' || filterStatus.value !== '' || sortBy.value !== 'date'
})

const filteredHistory = computed(() => {
  let items = [...historyItems.value]

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    items = items.filter(item =>
      item.animeTitle.toLowerCase().includes(query)
    )
  }

  // Apply status filter
  if (filterStatus.value === 'completed') {
    items = items.filter(item => item.completed)
  } else if (filterStatus.value === 'watching') {
    items = items.filter(item => !item.completed)
  }

  // Apply sorting
  items.sort((a, b) => {
    if (sortBy.value === 'name') {
      return a.animeTitle.localeCompare(b.animeTitle, 'zh-CN')
    } else if (sortBy.value === 'progress') {
      const progressA = getProgress(a)
      const progressB = getProgress(b)
      return progressB - progressA
    } else {
      // Default: sort by date
      return new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime()
    }
  })

  return items
})

async function loadHistory() {
  loading.value = true
  error.value = null

  try {
    await historyStore.loadWatchHistory()
  } catch (err: any) {
    error.value = err.message || 'Failed to load history'
  } finally {
    loading.value = false
  }
}

function resumeWatching(item: WatchRecord) {
  router.push({
    name: 'Watch',
    params: {
      animeId: item.animeId
    },
    query: {
      season: item.season.toString(),
      episode: item.episode.toString()
      // Note: startTime is no longer needed - backend API will return the saved position
    }
  })
}

function resetFilters() {
  searchQuery.value = ''
  filterStatus.value = ''
  sortBy.value = 'date'
}

function getProgress(item: WatchRecord): number {
  if (item.completed) return 100
  if (item.duration === 0) return 0
  return Math.min(100, (item.position / item.duration) * 100)
}

function getDisplayProgress(item: WatchRecord): number {
  const progress = getProgress(item)
  if (progress > 0) {
    return progress
  }

  if (item.position > 0) {
    return estimateProgressWidth(item.position)
  }

  return 0
}

function isEstimatedProgress(item: WatchRecord): boolean {
  return !item.completed && item.duration <= 0 && item.position > 0
}

function estimateProgressWidth(position: number): number {
  return Math.min(45, Math.max(14, Math.round(position / 30)))
}

function formatProgressLabel(item: WatchRecord): string {
  if (item.completed) {
    return '已看完'
  }

  if (item.position > 0) {
    return formatTime(item.position)
  }

  return '0:00'
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

onMounted(async () => {
  uiStore.loadDarkModePreference()
  await loadHistory()
})
</script>

<style scoped>
.history-view {
  min-height: 100vh;
  padding-inline: clamp(0.5rem, 1.4vw, 1.1rem);
}

.history-layout {
  width: min(100%, 1720px);
  margin: 0 auto;
  padding-block: 1rem 2rem;
}

/* Section Header */
.history-header {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
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

.filter-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

/* Clear Button */
.btn-clear {
  padding: 0.4rem 0.8rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
}

.btn-clear:hover {
  background: var(--bg-tertiary);
}

/* Result Count */
.result-count {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* History Grid */
.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .history-view {
    padding-inline: 0.65rem;
  }

  .history-layout {
    padding-block: 0.85rem 1.25rem;
  }
}

/* History Card */
.history-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px var(--shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.history-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px var(--shadow-hover);
}

/* 本地记录的橙色边框 */
.history-card.local-only {
  border: 2px solid #ff7f11;
}

/* 三角形角标 - 右上角 */
.history-card .corner-badge {
  position: absolute;
  top: 0;
  right: 0;
  width: 50px;
  height: 50px;
  overflow: hidden;
  z-index: 100;
  pointer-events: none;
}

.history-card .corner-badge::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #ff9f43 0%, #ff7f11 50%, #ee5a24 100%);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.15);
}

.history-card .corner-text {
  position: absolute;
  top: 6px;
  right: 6px;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transform: rotate(45deg);
  transform-origin: center;
  white-space: nowrap;
  z-index: 101;
}

.history-card-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.history-card-body {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.history-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-card-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem 0;
}

/* Progress Bar */
.progress-bar-container {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-bar-fill.estimated-progress {
  background:
    repeating-linear-gradient(
      135deg,
      rgba(74, 158, 255, 0.95) 0 10px,
      rgba(45, 125, 210, 0.85) 10px 20px
    );
}

/* History Card Footer */
.history-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.time-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Badge */
.badge-completed {
  padding: 0.25rem 0.5rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 4px;
}

/* Cursor */
.cursor-pointer {
  cursor: pointer;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .form-input,
  .form-select,
  .btn-clear,
  .history-card,
  .progress-bar-fill {
    transition: none;
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .history-header {
    font-size: 1.25rem;
  }

  .filters-body {
    padding: 0.75rem;
  }

  .history-grid {
    grid-template-columns: 1fr;
  }
}
</style>
