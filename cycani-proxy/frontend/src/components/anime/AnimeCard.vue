<template>
  <article class="anime-card card" :aria-label="`${anime.title} - ${anime.episodes || '?'}集`">
    <div
      class="anime-cover-wrapper"
      @click="handleSelect"
      role="button"
      tabindex="0"
      :aria-label="`播放 ${anime.title}`"
      @keydown.enter="handleSelect"
    >
      <img
        :src="resolvedCover"
        :alt="`${anime.title} 封面图`"
        class="anime-cover card-img-top"
        loading="lazy"
        @error="handleImageError"
      />
      <div class="anime-overlay" aria-hidden="true">
        <span v-if="anime.score" class="badge bg-warning text-dark" aria-label="评分 {{ anime.score }}">
          ⭐ {{ anime.score }}
        </span>
        <span v-if="anime.status" class="badge bg-info">
          {{ anime.status }}
        </span>
      </div>
    </div>
    <div class="card-body">
      <h6 class="card-title anime-title" :title="anime.title">
        {{ anime.title }}
      </h6>
      <div class="anime-meta mb-2" role="list" aria-label="动画信息">
        <span class="badge bg-secondary me-1" role="listitem">{{ anime.type || 'TV' }}</span>
        <span class="badge bg-info text-dark me-1" role="listitem">{{ anime.year || '未知' }}</span>
        <span class="badge bg-warning text-dark" role="listitem">
          {{ anime.episodes || '?' }} 集
        </span>
      </div>
      <div class="anime-actions" role="group" aria-label="动画操作">
        <button
          class="btn btn-success btn-sm w-100 mb-1"
          @click.stop="handleSelect"
          :aria-label="`播放 ${anime.title}`"
        >
          选择播放
        </button>
        <button
          class="btn btn-outline-secondary btn-sm w-100"
          @click.stop="handleDetails"
          :aria-label="`查看 ${anime.title} 详情`"
        >
          查看详情
        </button>
      </div>
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
  details: [anime: Anime]
}>()

// Get placeholder image URL as a constant
const getPlaceholderImage = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  return `${apiBaseUrl}/api/placeholder-image`
}

const placeholderImage = getPlaceholderImage()

// Resolve image URL - handle different URL formats correctly
const resolvedCover = computed(() => {
  const cover = props.anime.cover
  if (!cover) {
    return placeholderImage
  }

  // If it's already an absolute URL (http/https), use as-is
  if (cover.startsWith('http://') || cover.startsWith('https://')) {
    return cover
  }

  // If it's already an API path (/api/...), prepend backend base URL
  if (cover.startsWith('/api/')) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
    return `${apiBaseUrl}${cover}`
  }

  // If it's a placeholder path (/placeholder/...), prepend backend base URL
  if (cover.startsWith('/placeholder/')) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
    return `${apiBaseUrl}${cover}`
  }

  // Default to placeholder for any other format
  return placeholderImage
})

function handleSelect() {
  emit('select', props.anime)
}

function handleDetails() {
  emit('details', props.anime)
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  // Prevent infinite loop - only set placeholder once
  if (!img.dataset.errorSet) {
    img.dataset.errorSet = 'true'
    img.src = placeholderImage
    // Remove error handler after setting placeholder to prevent infinite loop
    img.onerror = null
  }
}
</script>

<style scoped>
.anime-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
}

.anime-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.anime-cover-wrapper {
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.anime-cover {
  width: 100%;
  height: 280px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.anime-card:hover .anime-cover {
  transform: scale(1.05);
}

.anime-overlay {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.anime-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.4em;
}

.anime-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.anime-actions {
  display: flex;
  flex-direction: column;
}
</style>
