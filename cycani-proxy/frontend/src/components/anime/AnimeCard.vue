<template>
  <article class="anime-card" :aria-label="`${anime.title} - ${anime.episodes || '?'}集`">
    <div
      class="cover-wrapper"
      @click="handleSelect"
      role="button"
      tabindex="0"
      :aria-label="`播放 ${anime.title}`"
      @keydown.enter="handleSelect"
    >
      <img
        :src="resolvedCover"
        :alt="`${anime.title} 封面图`"
        class="cover"
        loading="lazy"
        @error="handleImageError"
      />
      <div class="overlay" aria-hidden="true">
        <span v-if="anime.score" class="badge score">
          {{ anime.score }}
        </span>
        <span v-if="anime.status" class="badge status">
          {{ anime.status }}
        </span>
      </div>
    </div>
    <div class="card-body">
      <h3 class="title" :title="anime.title">
        {{ anime.title }}
      </h3>
      <button
        class="btn-play"
        @click.stop="handleSelect"
        :aria-label="`播放 ${anime.title}`"
      >
        播放
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Anime } from '@/types/anime.types'

interface Props {
  anime: Anime
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [anime: Anime]
}>()

const getPlaceholderImage = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  return `${apiBaseUrl}/api/placeholder-image`
}

const placeholderImage = getPlaceholderImage()

const resolvedCover = computed(() => {
  const cover = props.anime.cover
  if (!cover) {
    return placeholderImage
  }

  if (cover.startsWith('http://') || cover.startsWith('https://')) {
    return cover
  }

  if (cover.startsWith('/api/')) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
    return `${apiBaseUrl}${cover}`
  }

  if (cover.startsWith('/placeholder/')) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
    return `${apiBaseUrl}${cover}`
  }

  return placeholderImage
})

function handleSelect() {
  emit('select', props.anime)
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  if (!img.dataset.errorSet) {
    img.dataset.errorSet = 'true'
    img.src = placeholderImage
    img.onerror = null
  }
}
</script>

<style scoped>
.anime-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.anime-card:hover {
  box-shadow: 0 4px 20px var(--shadow-hover);
}

.cover-wrapper {
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.cover {
  width: 100%;
  height: 260px;
  object-fit: cover;
  display: block;
}

.overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  backdrop-filter: blur(4px);
}

.card-body {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title {
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--text-primary);
  line-height: 1.4;
}

.btn-play {
  margin-top: auto;
  padding: 8px 16px;
  background: var(--accent-color);
  border: none;
  border-radius: 4px;
  color: var(--bg-primary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.btn-play:hover {
  background: var(--accent-hover);
}

@media (prefers-reduced-motion: reduce) {
  .anime-card,
  .btn-play {
    transition: none;
  }
}
</style>
