<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark" role="navigation" aria-label="主导航">
    <div class="container-fluid">
      <router-link to="/" class="navbar-brand" aria-label="次元城动画 首页">
        <i class="bi bi-play-circle-fill me-2" aria-hidden="true"></i>
        次元城动画
      </router-link>

      <button
        class="navbar-toggler"
        type="button"
        @click="toggleSidebar"
        aria-label="切换导航菜单"
        aria-expanded="false"
        :aria-controls="'navbarNav'"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto" role="menubar">
          <li class="nav-item" role="none">
            <router-link to="/" class="nav-link" role="menuitem">动画列表</router-link>
          </li>
        </ul>
      </div>

      <!-- Always-visible controls (outside collapsible section) -->
      <div class="d-flex align-items-center gap-3" role="group" aria-label="用户操作">
        <!-- Watch History Dropdown -->
        <div class="dropdown" v-if="hasContinueWatching">
          <button
            class="btn btn-outline-light dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-haspopup="true"
            :id="'history-dropdown'"
          >
            <i class="bi bi-clock-history me-1" aria-hidden="true"></i>
            继续观看
          </button>
          <ul
            class="dropdown-menu dropdown-menu-end history-dropdown-menu"
            :aria-labelledby="'history-dropdown'"
            role="menu"
          >
            <li v-for="anime in groupedAnime.slice(0, 5)" :key="`${anime.animeId}-${anime.season}`" role="none">
              <div
                class="dropdown-item p-2"
                role="menuitem"
                :aria-label="`继续观看 ${anime.animeTitle} 第${anime.season}季`"
              >
                <div class="d-flex align-items-center gap-2 history-dropdown-item">
                  <img
                    :src="anime.animeCover || placeholderImage"
                    :alt="`${anime.animeTitle} 缩略图`"
                    class="rounded flex-shrink-0"
                    width="40"
                    height="40"
                    style="object-fit: cover"
                  />
                  <div class="flex-grow-1 min-w-0">
                    <div class="fw-bold text-truncate" :title="anime.animeTitle">
                      {{ anime.animeTitle }}
                    </div>
                    <div class="small text-muted text-truncate" :title="`第 ${anime.season} 季 · 已看 ${anime.totalWatched} 集`">
                      第 {{ anime.season }} 季 · 已看 {{ anime.totalWatched }} 集
                      <span v-if="anime.latestEpisode.position > 0">
                        · {{ formatTime(anime.latestEpisode.position) }}
                      </span>
                    </div>
                  </div>
                  <button
                    class="btn btn-sm btn-primary flex-shrink-0 history-play-btn"
                    @click="resumeWatching(anime)"
                    :aria-label="`继续播放 ${anime.animeTitle}`"
                  >
                    <i class="bi bi-play-fill"></i>
                  </button>
                </div>
              </div>
            </li>
            <li role="none"><hr class="dropdown-divider" /></li>
            <li role="none">
              <router-link to="/history" class="dropdown-item" role="menuitem">查看全部</router-link>
            </li>
          </ul>
        </div>

        <!-- Server Status Indicator -->
        <ServerStatusIndicator />

        <!-- Dark Mode Toggle -->
        <button
          class="btn btn-outline-light"
          type="button"
          @click="uiStore.toggleDarkMode()"
          :title="darkMode ? '关闭深色模式' : '开启深色模式'"
          :aria-label="darkMode ? '关闭深色模式' : '开启深色模式'"
          :aria-pressed="darkMode"
        >
          <i :class="darkMode ? 'bi bi-sun-fill' : 'bi bi-moon-fill'" aria-hidden="true"></i>
        </button>

        <!-- Cache Toggle -->
        <CacheToggle />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useHistoryStore } from '@/stores/history'
import { useGroupedHistory, type GroupedAnime } from '@/composables/useGroupedHistory'
import ServerStatusIndicator from '@/components/common/ServerStatusIndicator.vue'
import CacheToggle from '@/components/common/CacheToggle.vue'
import type { WatchRecord } from '@/types/history.types'

const router = useRouter()
const uiStore = useUiStore()
const historyStore = useHistoryStore()

// Use static SVG file from backend server (computed to avoid initialization issues)
const placeholderImage = computed(() => `${import.meta.env.VITE_API_BASE_URL || ''}/placeholder/placeholder-40x40.svg`)

const darkMode = computed(() => uiStore.darkMode)
const continueWatching = computed(() => historyStore.continueWatching)
const hasContinueWatching = computed(() => continueWatching.value.length > 0)

// Use grouped history for better UX
const { groupedAnime } = useGroupedHistory(continueWatching)

function toggleSidebar() {
  uiStore.setSidebarOpen(!uiStore.sidebarOpen)
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.navbar-brand {
  font-size: 1.25rem;
  font-weight: 600;
}

/* History dropdown menu styling */
.history-dropdown-menu {
  min-width: 280px;
  max-width: 350px;
}

.history-dropdown-item {
  min-width: 0; /* Allow flex items to shrink */
  width: 100%;
}

.history-dropdown-item > div {
  min-width: 0; /* Allow text truncation to work */
}

.dropdown-item {
  cursor: pointer;
  padding: 0.5rem 1rem;
  background-color: transparent;
}

.dropdown-item:hover {
  background-color: var(--bs-tertiary-bg);
}

.history-play-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
}

/* Ensure dropdown menu doesn't overflow */
.dropdown-menu {
  max-width: 90vw;
}
</style>
