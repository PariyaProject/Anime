<template>
  <section class="home-stage">
    <div class="stage-copy">
      <p class="stage-kicker">{{ channelDisplayName }}</p>
      <h1 class="stage-title">ANIME</h1>
      <div class="stage-meta">
        <span class="stage-chip">{{ totalAnimeLabel }}</span>
        <span class="stage-chip">{{ hasContinueWatching ? `继续观看 ${groupedAnime.length}` : '持续更新' }}</span>
      </div>
    </div>

    <div class="stage-posters" aria-hidden="true">
      <button
        v-for="anime in featuredShelf"
        :key="`stage-${anime.id}`"
        type="button"
        class="stage-poster"
        @click="openAnimeDetail(anime)"
      >
        <img :src="getCoverImage(anime.cover)" :alt="anime.title" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAnimeStore } from '@/stores/anime'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import { useGroupedHistory } from '@/composables/useGroupedHistory'
import type { Anime } from '@/types/anime.types'

const router = useRouter()
const animeStore = useAnimeStore()
const historyStore = useHistoryStore()
const uiStore = useUiStore()

const channelDisplayName = computed(() => {
  return uiStore.filters.channel === 'movie' ? '剧场番剧' : 'TV番剧'
})

const animeList = computed(() => animeStore.animeList)
const totalCount = computed(() => animeStore.totalCount)
const totalAnimeLabel = computed(() => `${totalCount.value || animeList.value.length || 0} 部`)
const featuredShelf = computed(() => animeList.value.slice(0, 5))

const continueWatching = computed(() => historyStore.continueWatching)
const { groupedAnime } = useGroupedHistory(continueWatching)
const hasContinueWatching = computed(() => groupedAnime.value.length > 0)

const placeholderImage = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api/placeholder-image` : '/api/placeholder-image'

function getCoverImage(cover?: string): string {
  if (!cover) return placeholderImage
  if (cover.startsWith('http://') || cover.startsWith('https://')) return cover
  if (cover.startsWith('/api/') || cover.startsWith('/placeholder/')) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
    return `${apiBaseUrl}${cover}`
  }
  return placeholderImage
}

function openAnimeDetail(anime: Anime | string) {
  const animeId = typeof anime === 'string' ? anime : anime.id.toString()
  router.push({
    name: 'AnimeDetail',
    params: { animeId }
  })
}
</script>

<style scoped>
.home-stage {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.95fr);
  gap: 1.5rem;
  align-items: center;
  padding: 1.6rem 1.5rem;
  border-radius: 1.9rem;
  border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  background:
    radial-gradient(circle at top right, rgba(255, 182, 77, 0.18), transparent 28%),
    linear-gradient(145deg, color-mix(in srgb, var(--bg-primary) 88%, #ffffff 12%), var(--bg-secondary));
  box-shadow: 0 18px 48px color-mix(in srgb, var(--shadow) 70%, transparent);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.home-stage::after {
  content: '';
  position: absolute;
  inset: auto -10% -40% 30%;
  height: 220px;
  background: radial-gradient(circle, rgba(87, 154, 255, 0.18), transparent 70%);
  pointer-events: none;
}

.stage-copy {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-width: 0;
}

.stage-kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.24rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.stage-title {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
  font-size: clamp(3rem, 7vw, 5.3rem);
  line-height: 0.92;
  color: var(--text-primary);
}

.stage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.stage-chip {
  display: inline-flex;
  align-items: center;
  min-height: 2.15rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
  background: color-mix(in srgb, var(--bg-primary) 86%, transparent);
  color: var(--text-primary);
  backdrop-filter: blur(14px);
}

.stage-posters {
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 290px;
  padding-right: 0.5rem;
}

.stage-poster {
  width: 150px;
  aspect-ratio: 3 / 4;
  border: 0;
  border-radius: 1.4rem;
  overflow: hidden;
  padding: 0;
  background: var(--bg-secondary);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.22);
  transform-origin: center bottom;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.stage-poster + .stage-poster {
  margin-left: -1.9rem;
}

.stage-poster:nth-child(1) { transform: translateY(18px) rotate(-10deg); }
.stage-poster:nth-child(2) { transform: translateY(-8px) rotate(-4deg); }
.stage-poster:nth-child(3) { transform: translateY(12px) rotate(3deg); }
.stage-poster:nth-child(4) { transform: translateY(-14px) rotate(8deg); }
.stage-poster:nth-child(5) { transform: translateY(6px) rotate(13deg); }

.stage-poster:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 24px 42px rgba(0, 0, 0, 0.28);
}

.stage-poster img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
</style>
