<template>
  <section class="weekly-schedule-section mb-4">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-calendar-week me-2"></i>
          本周新番
        </h5>
        <button
          v-if="!loading && hasSchedule"
          class="btn btn-sm btn-outline-secondary"
          @click="refresh"
          :disabled="loading"
        >
          <i class="bi bi-arrow-clockwise me-1"></i>
          刷新
        </button>
      </div>

      <div class="card-body">
        <div v-if="loading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm" role="status"></div>
          <span class="ms-2">加载中...</span>
        </div>

        <div v-else-if="error" class="text-center py-3">
          <p class="text-danger mb-2">{{ error }}</p>
          <button class="btn btn-sm btn-outline-primary" @click="loadSchedule('all')">
            <i class="bi bi-arrow-clockwise me-1"></i>
            重试
          </button>
        </div>

        <div v-else-if="!hasSchedule" class="text-center py-3">
          <p class="text-muted mb-0">暂无本周更新信息</p>
        </div>

        <div v-else>
          <!-- Day Tabs -->
          <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item" role="presentation" v-for="(label, key) in dayLabels" :key="key">
              <button
                class="nav-link"
                :class="{ active: selectedDay === key }"
                @click="selectedDay = key"
                type="button"
                role="tab"
              >
                {{ label }}
              </button>
            </li>
          </ul>

          <!-- Anime Grid for Selected Day -->
          <div v-if="animeForSelectedDay.length > 0" class="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-6 g-3">
            <div v-for="anime in animeForSelectedDay" :key="anime.id" class="col">
              <div
                class="card schedule-card cursor-pointer"
                @click="selectAnime(anime)"
              >
                <div class="position-relative">
                  <img
                    :src="anime.cover || placeholderImage"
                    :alt="anime.title"
                    class="card-img-top"
                    style="height: 140px; object-fit: cover"
                  />
                  <!-- Status Badge -->
                  <span
                    class="position-absolute top-0 end-0 m-1 badge badge-overlay"
                    :class="anime.status === '已完结' ? 'bg-secondary' : 'bg-success'"
                  >
                    {{ anime.status }}
                  </span>
                  <!-- Rating Badge -->
                  <span
                    v-if="anime.rating"
                    class="position-absolute top-0 start-0 m-1 badge badge-overlay bg-warning text-dark"
                  >
                    <i class="bi bi-star-fill me-1"></i>{{ anime.rating }}
                  </span>
                </div>
                <div class="card-body p-2">
                  <h6 class="card-title small text-truncate mb-1" :title="anime.title">{{ anime.title }}</h6>
                  <p
                    v-if="anime.broadcastTime"
                    class="card-text small text-muted mb-0"
                    :title="anime.broadcastTime"
                  >
                    <i class="bi bi-clock me-1"></i>
                    <span class="text-truncate d-inline-block">{{ anime.broadcastTime }}</span>
                  </p>
                  <p v-else class="card-text small text-muted mb-0">
                    <i class="bi bi-clock me-1"></i>
                    <span>暂无放送信息</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-3">
            <p class="text-muted mb-0">{{ dayLabels[selectedDay] }}暂无更新</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWeeklySchedule } from '@/composables/useWeeklySchedule'
import type { WeeklyAnime } from '@/types/anime.types'

const emit = defineEmits<{
  'select-anime': [animeId: string]
}>()

const {
  loading,
  error,
  schedule,
  hasSchedule,
  loadSchedule,
  refresh,
  getAnimeForDay,
  getCurrentDayKey
} = useWeeklySchedule()

// Get current day key for auto-selection
const currentDayKey = getCurrentDayKey()
const selectedDay = ref<string>(currentDayKey)

const placeholderImage = `${import.meta.env.VITE_API_BASE_URL || ''}/placeholder/placeholder-140x140.svg`

const dayLabels: Record<string, string> = {
  all: '全部',
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日'
}

const animeForSelectedDay = computed(() => {
  if (selectedDay.value === 'all') {
    if (!schedule.value) return []
    return Object.values(schedule.value.schedule).flat()
  }
  return getAnimeForDay(selectedDay.value)
})

function selectAnime(anime: WeeklyAnime) {
  emit('select-anime', anime.id)
}

onMounted(() => {
  loadSchedule('all', true)  // Load all weekly data once, filter client-side
})
</script>

<style scoped>
.weekly-schedule-section {
  min-height: 200px;
}

.weekly-schedule-section .card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.weekly-schedule-section .card-header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.weekly-schedule-section .card-header h5 {
  color: var(--text-primary);
}

.schedule-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 3px var(--shadow);
}

.schedule-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px var(--shadow-hover);
}

.schedule-card .card-body {
  background: transparent;
}

.schedule-card .card-title {
  color: var(--text-primary);
}

/* Override Bootstrap text colors */
.weekly-schedule-section .text-muted {
  color: var(--text-secondary) !important;
}

.schedule-card .text-muted {
  color: var(--text-secondary) !important;
}

.cursor-pointer {
  cursor: pointer;
}

.nav-tabs .nav-link {
  cursor: pointer;
  color: var(--text-secondary);
}

.nav-tabs .nav-link:hover {
  color: var(--text-primary);
}

.nav-tabs .nav-link.active {
  color: var(--text-primary);
  background-color: var(--bg-primary);
  border-color: var(--border-color) var(--border-color) var(--bg-primary);
}

.card-body {
  padding: 0.5rem;
  background: transparent;
}

/* Make badges non-interactive so clicks pass through to card */
.badge-overlay {
  pointer-events: none;
}
</style>
