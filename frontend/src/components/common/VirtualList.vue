<template>
  <div
    ref="containerRef"
    class="virtual-list"
    :style="{ height: `${containerHeight}px` }"
    @scroll="onScroll"
  >
    <div
      class="virtual-list-spacer"
      :style="{ height: `${totalHeight}px` }"
    >
      <div
        class="virtual-list-content"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <slot
          name="item"
          v-for="item in visibleItems"
          :key="getItemKey(item)"
          :item="item"
          :index="items.indexOf(item)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Props<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  buffer?: number
  itemKey?: string | ((item: T) => string | number)
}

const props = withDefaults(defineProps<Props<T>>(), {
  buffer: 5,
  itemKey: 'id'
})

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() => {
  return Math.max(
    0,
    Math.floor(scrollTop.value / props.itemHeight) - props.buffer
  )
})

const endIndex = computed(() => {
  const visibleCount = Math.ceil(props.containerHeight / props.itemHeight)
  return Math.min(
    props.items.length - 1,
    startIndex.value + visibleCount + props.buffer * 2
  )
})

const offsetY = computed(() => startIndex.value * props.itemHeight)

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value + 1)
})

function getItemKey(item: T): string | number {
  if (typeof props.itemKey === 'function') {
    return props.itemKey(item)
  }
  return (item as any)[props.itemKey] || JSON.stringify(item)
}

function onScroll(event: Event) {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
}

// Expose refresh method
defineExpose({
  scrollToTop: () => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
      scrollTop.value = 0
    }
  },
  scrollToIndex: (index: number) => {
    if (containerRef.value) {
      const targetScroll = index * props.itemHeight
      containerRef.value.scrollTop = targetScroll
      scrollTop.value = targetScroll
    }
  }
})
</script>

<style scoped>
.virtual-list {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.virtual-list-spacer {
  position: relative;
  width: 100%;
}

.virtual-list-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
</style>
