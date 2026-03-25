<template>
  <article class="anime-card" :aria-label="`${anime.title} - ${anime.episodes || '?'}集`">
    <div
      class="cover-wrapper"
      @click="handleOpen"
      role="button"
      tabindex="0"
      :aria-label="`查看 ${anime.title} 详情`"
      @keydown.enter="handleOpen"
    >
      <img
        :src="resolvedCover"
        :alt="`${anime.title} 封面图`"
        class="cover"
        loading="lazy"
        @error="handleImageError"
      />
      <div class="overlay" aria-hidden="true">
        <span class="badge channel" :class="anime.channel || 'tv'">
          {{ anime.channel === 'movie' ? '剧场' : 'TV' }}
        </span>
        <span v-if="anime.score" class="badge score">
          <i class="bi bi-star-fill"></i> {{ anime.score }}
        </span>
        <span v-if="anime.status" class="badge status" :class="{ 'bg-success': anime.status.includes('连载'), 'bg-secondary': anime.status.includes('完结') }">
          {{ anime.status }}
        </span>
      </div>
    </div>
    <div class="card-body">
      <h3 class="title" :title="anime.title">
        {{ anime.title }}
      </h3>
      <div class="card-actions">
        <button
          class="btn-secondary"
          @click.stop="handleOpen"
          :aria-label="`查看 ${anime.title} 详情`"
        >
          详情
        </button>
        <button
          class="btn-play"
          @click.stop="handlePlay"
          :aria-label="`播放 ${anime.title}`"
        >
          播放
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
  open: [anime: Anime]
  play: [anime: Anime]
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

function handleOpen() {
  emit('open', props.anime)
}

function handlePlay() {
  emit('play', props.anime)
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

.badge.channel {
  background: rgba(59, 130, 246, 0.9);  /* Blue for TV */
}

.badge.channel.movie {
  background: rgba(168, 85, 247, 0.9);  /* Purple for movie/theater */
}

.badge.score {
  background: rgba(255, 193, 7, 0.9);  /* Yellow for score (matches bg-warning) */
  color: #000;  /* Dark text for readability */
}

/* Status badge colors - matching WeeklySchedule */
.badge.status.bg-success {
  background: rgba(25, 135, 84, 0.9) !important;  /* Green for 连载中/连载中 */
  color: #fff;
}

.badge.status.bg-secondary {
  background: rgba(108, 117, 125, 0.9) !important;  /* Gray for 已完结 */
  color: #fff;
}

.card-body {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
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

.btn-secondary,
.btn-play {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s, border-color 0.2s ease;
}

.btn-secondary {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
}

.btn-play {
  background: var(--accent-color);
  border: none;
  color: var(--bg-primary);
}

.btn-play:hover {
  background: var(--accent-hover);
}

@media (prefers-reduced-motion: reduce) {
  .anime-card,
  .btn-secondary,
  .btn-play {
    transition: none;
  }
}
</style>
