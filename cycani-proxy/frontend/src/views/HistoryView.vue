<template>
  <div class="history-view py-4">
    <h4 class="mb-4">
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
      <!-- Search and Filter Section -->
      <section class="filters-section mb-4">
        <div class="card">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <input
                  v-model="searchQuery"
                  type="text"
                  class="form-control"
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
            <div v-if="hasActiveFilters" class="mt-2">
              <button class="btn btn-sm btn-outline-secondary" @click="resetFilters">
                <i class="bi bi-x-circle me-1"></i>
                清除筛选
              </button>
              <span class="ms-2 text-muted">
                找到 {{ filteredHistory.length }} 条记录
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- History Grid -->
      <div v-if="filteredHistory.length === 0" class="text-center py-5">
        <EmptyState
          icon="bi bi-search"
          title="没有找到匹配的记录"
          description="尝试调整搜索条件或清除筛选"
        />
      </div>

      <div v-else class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
        <div
          v-for="item in filteredHistory"
          :key="`${item.animeId}-${item.season}-${item.episode}`"
          class="col"
        >
          <div
            class="card history-card cursor-pointer"
            @click="resumeWatching(item)"
          >
            <img
              :src="item.animeCover || placeholderImage"
              :alt="item.animeTitle"
              class="card-img-top"
              style="height: 180px; object-fit: cover"
            />
            <div class="card-body">
              <h6 class="card-title text-truncate">{{ item.animeTitle }}</h6>
              <p class="card-text small text-muted mb-2">
                第 {{ item.season }} 季 · 第 {{ item.episode }} 集
              </p>
              <div class="progress" style="height: 6px">
                <div
                  class="progress-bar"
                  role="progressbar"
                  :style="{ width: `${getProgress(item)}%` }"
                ></div>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <small class="text-muted">
                  {{ formatTime(item.position) }} / {{ formatTime(item.duration) }}
                </small>
                <span v-if="item.completed" class="badge bg-success">已看完</span>
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
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { WatchRecord } from '@/types/history.types'

const router = useRouter()
const historyStore = useHistoryStore()
const uiStore = useUiStore()

// Use static SVG file from backend server
const placeholderImage = `${import.meta.env.VITE_API_BASE_URL || ''}/placeholder/placeholder-300x180.svg`

const loading = ref(false)
const error = ref<string | null>(null)

const searchQuery = ref('')
const filterStatus = ref('')
const sortBy = ref('date')

const historyItems = computed(() => historyStore.watchHistory)
const hasHistory = computed(() => historyStore.hasHistory)

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
      episode: item.episode.toString(),
      startTime: item.position.toString()
    }
  })
}

function resetFilters() {
  searchQuery.value = ''
  filterStatus.value = ''
  sortBy.value = 'date'
}

function getProgress(item: WatchRecord): number {
  if (item.duration === 0) return 0
  return Math.min(100, (item.position / item.duration) * 100)
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
}

.history-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.history-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.cursor-pointer {
  cursor: pointer;
}
</style>
