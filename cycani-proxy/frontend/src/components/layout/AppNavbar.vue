<template>
  <nav class="navbar" role="navigation" aria-label="主导航">
    <div class="navbar-container">
      <router-link to="/" class="brand" aria-label="首页">
        动画
      </router-link>

      <div class="nav-controls">
        <!-- Channel Tabs -->
        <div class="channel-tabs">
          <router-link
            to="/"
            class="channel-tab"
            :class="{ active: currentChannel === 'tv' }"
            @click="setChannel('tv')"
          >TV</router-link>
          <router-link
            to="/"
            class="channel-tab"
            :class="{ active: currentChannel === 'movie' }"
            @click="setChannel('movie')"
          >剧场</router-link>
        </div>
        <!-- Watch History Dropdown -->
        <div class="dropdown" v-if="hasContinueWatching">
          <button
            class="dropdown-btn"
            type="button"
            @click="toggleHistoryDropdown"
            :aria-expanded="historyDropdownOpen"
          >
            继续观看
            <span class="arrow" :class="{ open: historyDropdownOpen }">▼</span>
          </button>
          <div
            class="navbar-dropdown-menu"
            v-show="historyDropdownOpen"
          >
            <div
              v-for="anime in groupedAnime.slice(0, 5)"
              :key="`${anime.animeId}-${anime.season}`"
              class="dropdown-item"
              @click="resumeWatching(anime)"
            >
              <img
                :src="anime.animeCover || placeholderImage"
                :alt="anime.animeTitle"
                class="dropdown-cover"
              />
              <div class="dropdown-info">
                <div class="dropdown-title">{{ anime.animeTitle }}</div>
                <div class="dropdown-meta">
                  第 {{ anime.season }} 季 · 已看 {{ anime.totalWatched }} 集
                </div>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <router-link to="/history" class="dropdown-view-all" @click="historyDropdownOpen = false">
              查看全部
            </router-link>
          </div>
        </div>

        <!-- Settings Dropdown -->
        <div class="dropdown">
          <button
            class="icon-btn"
            type="button"
            @click="toggleSettingsDropdown"
            :aria-expanded="settingsDropdownOpen"
            title="设置"
          >
            ⚙
          </button>
          <div
            class="navbar-dropdown-menu settings-menu"
            v-show="settingsDropdownOpen"
          >
            <!-- Server Status -->
            <div class="dropdown-item settings-item" @click="toggleServerCheck">
              <span class="settings-icon">{{ serverStatusIcon }}</span>
              <span class="settings-text">服务器状态</span>
              <span class="settings-status" :class="serverStatusClass">
                {{ serverStatusText }}
              </span>
            </div>

            <div class="dropdown-divider"></div>

            <!-- Dark Mode Toggle -->
            <div class="dropdown-item settings-item" @click="uiStore.toggleDarkMode()">
              <span class="settings-icon">{{ darkMode ? '☀' : '☾' }}</span>
              <span class="settings-text">{{ darkMode ? '浅色模式' : '深色模式' }}</span>
            </div>

            <div class="dropdown-divider"></div>

            <!-- Player Mode Selection -->
            <div class="settings-header">
              <span class="settings-label">播放器模式</span>
            </div>
            <div
              class="dropdown-item settings-item"
              :class="{ active: playerMode === 'plyr' }"
              @click="setPlayerMode('plyr')"
              title="推荐使用"
            >
              <span class="settings-radio">{{ playerMode === 'plyr' ? '●' : '○' }}</span>
              <span class="settings-text">Plyr 模式</span>
              <span class="settings-hint">推荐 ✅</span>
            </div>
            <div
              class="dropdown-item settings-item"
              :class="{ active: playerMode === 'iframe' }"
              @click="setPlayerMode('iframe')"
              title="不支持视频历史以及自动播放控制"
            >
              <span class="settings-radio">{{ playerMode === 'iframe' ? '●' : '○' }}</span>
              <span class="settings-text">iframe 模式</span>
              <span class="settings-hint">兼容 ⚠️</span>
            </div>
            <div
              class="dropdown-item settings-item"
              :class="{ active: playerMode === 'hybrid' }"
              @click="setPlayerMode('hybrid')"
              title="根据解析内容自动选择播放器"
            >
              <span class="settings-radio">{{ playerMode === 'hybrid' ? '●' : '○' }}</span>
              <span class="settings-text">混合模式</span>
              <span class="settings-hint">自动 🔄</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useHistoryStore } from '@/stores/history'
import { useServerStatus } from '@/composables/useServerStatus'
import { useGroupedHistory, type GroupedAnime } from '@/composables/useGroupedHistory'

const router = useRouter()
const uiStore = useUiStore()
const historyStore = useHistoryStore()
const serverStatus = useServerStatus(30000, false)

const historyDropdownOpen = ref(false)
const settingsDropdownOpen = ref(false)

// Placeholder image via Vite proxy
const placeholderImage = computed(() => '/placeholder/placeholder-40x40.svg')

const darkMode = computed(() => uiStore.darkMode)
const playerMode = computed(() => uiStore.playerModePreference)
const currentChannel = computed(() => uiStore.filters.channel)
const continueWatching = computed(() => historyStore.continueWatching)
const hasContinueWatching = computed(() => continueWatching.value.length > 0)

const { status, loading, enabled: serverCheckEnabled, toggle: toggleServerCheck } = serverStatus

const { groupedAnime } = useGroupedHistory(continueWatching)

const serverStatusIcon = computed(() => {
  if (loading.value) return '⟳'
  if (status.value.online) return '✓'
  return '✕'
})

const serverStatusText = computed(() => {
  if (!serverCheckEnabled.value) return '已禁用'
  if (loading.value) return '检查中'
  if (status.value.online) return status.value.latency ? `${status.value.latency}ms` : '在线'
  return '离线'
})

const serverStatusClass = computed(() => {
  if (!serverCheckEnabled.value) return 'disabled'
  if (loading.value) return 'loading'
  if (status.value.online) return 'online'
  return 'offline'
})

function toggleHistoryDropdown() {
  historyDropdownOpen.value = !historyDropdownOpen.value
  settingsDropdownOpen.value = false
}

function toggleSettingsDropdown() {
  settingsDropdownOpen.value = !settingsDropdownOpen.value
  historyDropdownOpen.value = false
}

function resumeWatching(anime: GroupedAnime) {
  historyDropdownOpen.value = false
  router.push({
    name: 'Watch',
    params: {
      animeId: anime.animeId
    },
    query: {
      season: anime.season.toString(),
      episode: anime.latestEpisode.episode.toString()
    }
  })
}

function setChannel(channel: 'tv' | 'movie') {
  uiStore.updateFilters({ channel })
}

function setPlayerMode(mode: 'plyr' | 'iframe' | 'hybrid') {
  uiStore.setPlayerMode(mode)

  // Show notification
  const modeNames = {
    plyr: 'Plyr 模式 (插件优先)',
    iframe: 'iframe 模式 (兼容)',
    hybrid: '混合模式 (自动)'
  }
  uiStore.showNotification(`播放器模式已切换到 ${modeNames[mode]}`, 'success')

  // If currently on watch page, reload to apply new mode
  if (router.currentRoute.value.name === 'Watch') {
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }
}

function handleClickOutside(event: Event) {
  const target = event.target as Node
  const navbar = document.querySelector('.navbar')
  if (navbar && !navbar.contains(target)) {
    historyDropdownOpen.value = false
    settingsDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  // Load continue watching data for navbar
  historyStore.loadContinueWatching().catch(err => {
    console.warn('Failed to load continue watching for navbar:', err)
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.navbar {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 1px 3px var(--shadow);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-container {
  width: 100%;
  padding: 0 1.5rem;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: nowrap;
}

.brand {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

/* Channel Tabs */
.channel-tabs {
  display: flex;
  gap: 0.25rem;
}

.channel-tab {
  padding: 0.35rem 0.75rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.85rem;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.channel-tab:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.channel-tab.active {
  color: var(--text-primary);
  background: var(--bg-secondary);
  border-color: var(--border-color);
  font-weight: 500;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

/* Dropdown */
.dropdown {
  position: relative;
}

.dropdown-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.dropdown-btn:hover {
  background: var(--bg-tertiary);
}

.arrow {
  font-size: 0.6rem;
  transition: transform 0.2s;
}

.arrow.open {
  transform: rotate(180deg);
}

.navbar-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  max-width: 350px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 20px var(--shadow);
  padding: 0.35rem;
  z-index: 1001;
}

.settings-menu {
  min-width: 180px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: var(--bg-secondary);
}

.dropdown-cover {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.dropdown-info {
  flex: 1;
  min-width: 0;
}

.dropdown-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}

/* Settings Item Styles */
.settings-item {
  justify-content: space-between;
}

.settings-item.active {
  background: var(--bg-tertiary);
}

.settings-header {
  padding: 0.4rem 0.6rem 0.2rem;
}

.settings-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-icon {
  font-size: 0.9rem;
  width: 20px;
  text-align: center;
}

.settings-radio {
  font-size: 0.8rem;
  width: 20px;
  text-align: center;
  color: var(--text-secondary);
}

.settings-text {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.settings-hint {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.settings-status {
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.settings-status.online {
  background: #67c23a;
  color: white;
}

.settings-status.offline {
  background: #f56c6c;
  color: white;
}

.settings-status.loading {
  background: #e6a23c;
  color: white;
}

.settings-status.disabled {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.2rem 0;
}

.dropdown-view-all {
  display: block;
  padding: 0.4rem;
  text-align: center;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 0.85rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.dropdown-view-all:hover {
  background: var(--bg-secondary);
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--bg-tertiary);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .navbar-container {
    padding: 0 0.75rem;
  }

  .channel-tabs {
    display: none;  /* Hide channel tabs on very small screens */
  }

  .dropdown-menu {
    right: -0.75rem;
    min-width: calc(100vw - 1.5rem);
  }

  .dropdown-btn {
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
  }

  .icon-btn {
    width: 30px;
    height: 30px;
    font-size: 0.85rem;
  }
}
</style>
