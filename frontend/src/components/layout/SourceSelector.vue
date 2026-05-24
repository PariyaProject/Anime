<template>
  <div class="dropdown source-selector">
    <button
      class="dropdown-btn"
      type="button"
      @click="toggleDropdown"
      :aria-expanded="dropdownOpen"
      title="切换视频源"
    >
      <span class="source-icon">
        <i v-if="activePlugin?.icon?.startsWith('bi')" :class="activePlugin.icon"></i>
        <template v-else>{{ activePlugin?.icon || '🎬' }}</template>
      </span>
      <span class="source-name">{{ activePlugin?.name || '默认源' }}</span>
      <span class="arrow" :class="{ open: dropdownOpen }">▼</span>
    </button>
    <div
      class="navbar-dropdown-menu source-menu"
      v-show="dropdownOpen"
    >
      <div v-if="pluginStore.isLoading" class="dropdown-item empty-state">
        加载中...
      </div>
      <div v-else-if="pluginStore.plugins.length === 0" class="dropdown-item empty-state">
        暂无可用源
      </div>
      <template v-else>
        <div
          v-for="plugin in pluginStore.plugins"
          :key="plugin.id"
          class="dropdown-item source-item"
          :class="{ active: pluginStore.activeSourceId === plugin.id }"
          @click="selectSource(plugin.id)"
        >
          <span class="source-icon">
            <i v-if="plugin.icon?.startsWith('bi')" :class="plugin.icon"></i>
            <template v-else>{{ plugin.icon || '🎬' }}</template>
          </span>
          <div class="source-info">
            <div class="source-title">{{ plugin.name }}</div>
            <div class="source-desc">{{ plugin.description || '提供视频资源' }}</div>
          </div>
          <span class="source-check" v-if="pluginStore.activeSourceId === plugin.id">✓</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePluginStore } from '@/stores/plugin.store'

const pluginStore = usePluginStore()
const dropdownOpen = ref(false)

const activePlugin = computed(() => pluginStore.getActivePlugin())

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function selectSource(id: string) {
  if (pluginStore.activeSourceId !== id) {
    pluginStore.setActiveSource(id)
    // Reload page to apply new source everywhere
    window.location.reload()
  }
  dropdownOpen.value = false
}

function handleClickOutside(event: Event) {
  const target = event.target as Node
  const selector = document.querySelector('.source-selector')
  if (selector && !selector.contains(target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  pluginStore.fetchPlugins()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
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
  min-width: 220px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 20px var(--shadow);
  padding: 0.35rem;
  z-index: 1001;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
}

.dropdown-item:hover {
  background: var(--bg-secondary);
}

.source-item.active {
  background: var(--bg-tertiary);
}

.dropdown-item .source-icon {
  font-size: 1.1rem;
}

.dropdown-btn .source-icon {
  font-size: inherit;
  line-height: 1;
  display: flex;
  align-items: center;
}

.source-name {
  font-weight: 500;
}

.source-info {
  flex: 1;
  min-width: 0;
}

.source-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.source-desc {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-check {
  color: #67c23a;
  font-weight: bold;
}

.empty-state {
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: default;
}

.empty-state:hover {
  background: transparent;
}
</style>
