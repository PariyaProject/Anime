<template>
  <div class="home-view">
    <div class="home-layout">
      <!-- 
        Dynamic layout rendering powered by the active plugin's manifest
      -->
      <template v-if="uiLayout.home">
        <component
          v-for="(block, index) in uiLayout.home"
          :key="`${activeSourceId}-${index}`"
          :is="resolveComponent(block.component)"
          v-bind="block.props || {}"
        />
      </template>
      <div v-else class="empty-layout">
        <p>当前视频源没有配置主页布局。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePluginStore } from '@/stores/plugin.store'
import { useUiStore } from '@/stores/ui'

// Dynamic components map
import HeroBanner from '@/components/dynamic/HeroBanner.vue'
import ContinueWatching from '@/components/dynamic/ContinueWatching.vue'
import FilterableGrid from '@/components/dynamic/FilterableGrid.vue'
import WeeklyScheduleWidget from '@/components/schedule/WeeklySchedule.vue'

const componentRegistry: Record<string, any> = {
  HeroBanner,
  ContinueWatching,
  FilterableGrid,
  WeeklyScheduleWidget
}

const pluginStore = usePluginStore()
const uiStore = useUiStore()

const activeSourceId = computed(() => pluginStore.activeSourceId)
const activePlugin = computed(() => pluginStore.activePlugin)

// Get layout from the active plugin's manifest
const uiLayout = computed(() => {
  if (!activePlugin.value || !activePlugin.value.uiLayout) {
    return {
      // Fallback legacy layout
      home: [
        { component: 'HeroBanner' },
        { component: 'ContinueWatching' },
        { component: 'WeeklyScheduleWidget' },
        { component: 'FilterableGrid' }
      ]
    }
  }
  return activePlugin.value.uiLayout
})

function resolveComponent(componentName: string) {
  if (componentRegistry[componentName]) {
    return componentRegistry[componentName]
  }
  console.warn(`[DynamicLayout] Component ${componentName} is not registered.`)
  return 'div' // Fallback
}

onMounted(() => {
  uiStore.loadDarkModePreference()
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

.empty-layout {
  padding: 4rem;
  text-align: center;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
  border-radius: 1rem;
  border: 1px dashed var(--border-color);
  z-index: 1;
}
</style>
