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
            class="dropdown-menu dropdown-menu-end"
            :aria-labelledby="'history-dropdown'"
            role="menu"
          >
            <li v-for="item in continueWatching.slice(0, 5)" :key="`${item.animeId}-${item.episode}`" role="none">
              <a
                class="dropdown-item d-flex align-items-center gap-2"
                href="#"
                @click.prevent="resumeWatching(item)"
                role="menuitem"
                :aria-label="`继续观看 ${item.animeTitle} 第${item.episode}集`"
              >
                <img
                  :src="item.animeCover || placeholderImage"
                  :alt="`${item.animeTitle} 缩略图`"
                  class="rounded"
                  width="40"
                  height="40"
                  style="object-fit: cover"
                />
                <div class="flex-grow-1">
                  <div class="fw-bold text-truncate" style="max-width: 200px">
                    {{ item.animeTitle }}
                  </div>
                  <div class="small text-muted" aria-label="第{{ item.season }}季 第{{ item.episode }}集，播放至{{ formatTime(item.position) }}">
                    S{{ item.season }} E{{ item.episode }}
                    <span v-if="item.position > 0">
                      · {{ formatTime(item.position) }}
                    </span>
                  </div>
                </div>
              </a>
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

function toggleSidebar() {
  uiStore.setSidebarOpen(!uiStore.sidebarOpen)
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

.dropdown-item {
  padding: 0.5rem 1rem;
}

.dropdown-item:hover {
  background-color: var(--bg-secondary);
}
</style>
