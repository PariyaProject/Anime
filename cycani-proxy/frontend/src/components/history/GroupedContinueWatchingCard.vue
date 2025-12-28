<template>
  <div class="card grouped-history-card" :class="{ 'expanded': isExpanded }">
    <!-- Collapsed State -->
    <div class="card-body p-3" @click="toggleExpand">
      <div class="d-flex align-items-center gap-3">
        <img
          :src="anime.animeCover || placeholderImage"
          :alt="anime.animeTitle"
          class="rounded"
          width="80"
          height="80"
          style="object-fit: cover"
        />
        <div class="flex-grow-1">
          <h6 class="card-title mb-1 text-truncate">{{ anime.animeTitle }}</h6>
          <p class="card-text small text-muted mb-1">
            第 {{ anime.season }} 季 · 已看 {{ anime.totalWatched }} 集
          </p>
          <div class="d-flex align-items-center gap-2 mb-2">
            <div class="progress flex-grow-1" style="height: 4px">
              <div
                class="progress-bar"
                role="progressbar"
                :style="{ width: `${anime.overallProgress}%` }"
              ></div>
            </div>
            <span class="small text-muted">
              {{ formatProgress(anime.overallProgress) }}
            </span>
          </div>
          <div class="d-flex gap-2">
            <button
              class="btn btn-sm btn-primary"
              @click.stop="handleResume"
              :aria-label="`继续观看 ${anime.animeTitle} 第${anime.latestEpisode.episode}集`"
            >
              <i class="bi bi-play-fill me-1"></i>
              继续播放
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              @click.stop="toggleExpand"
              :aria-label="isExpanded ? '收起集数列表' : '展开集数列表'"
              :aria-expanded="isExpanded"
            >
              <i :class="isExpanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Expanded State - Episode List -->
    <div v-if="isExpanded" class="episode-list">
      <div class="p-3 pt-0">
        <hr class="my-2" />
        <p class="small text-muted mb-2">已观看集数：</p>
        <div class="episode-list-scroll">
          <div
            v-for="episode in sortedEpisodes"
            :key="episode.episode"
            class="episode-item"
            :class="{ 'active': episode.episode === anime.latestEpisode.episode }"
            @click="handleSelectEpisode(episode)"
          >
            <div class="d-flex align-items-center gap-2">
              <span class="episode-number">
                第 {{ episode.episode }} 集
              </span>
              <div class="episode-progress flex-grow-1">
                <div class="progress" style="height: 3px">
                  <div
                    class="progress-bar"
                    :class="{ 'bg-success': episode.completed }"
                    role="progressbar"
                    :style="{ width: `${getEpisodeProgress(episode)}%` }"
                  ></div>
                </div>
              </div>
              <span class="episode-status small text-muted">
                {{ episode.completed ? '已看完' : formatProgress(getEpisodeProgress(episode)) }}
              </span>
            </div>
            <p v-if="episode.episodeTitle" class="small text-muted mb-0 mt-1 text-truncate">
              {{ episode.episodeTitle }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GroupedAnime, WatchedEpisode } from '@/composables/useGroupedHistory'

interface Props {
  anime: GroupedAnime
}

interface Emits {
  resume: [anime: GroupedAnime]
  selectEpisode: [anime: GroupedAnime, episode: WatchedEpisode]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isExpanded = ref(false)

const placeholderImage = `${import.meta.env.VITE_API_BASE_URL || ''}/placeholder/placeholder-80x80.svg`

// Sort episodes by episode number
const sortedEpisodes = computed(() => {
  return [...props.anime.episodes].sort((a, b) => a.episode - b.episode)
})

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function handleResume() {
  emit('resume', props.anime)
}

function handleSelectEpisode(episode: WatchedEpisode) {
  emit('selectEpisode', props.anime, episode)
}

function getEpisodeProgress(episode: WatchedEpisode): number {
  if (episode.duration === 0) return 0
  return Math.min(100, (episode.position / episode.duration) * 100)
}

function formatProgress(progress: number): string {
  return `${Math.round(progress)}%`
}
</script>

<style scoped>
.grouped-history-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.grouped-history-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-hover);
}

.grouped-history-card .card-body {
  cursor: pointer;
  background: transparent;
}

/* Override Bootstrap text colors */
.grouped-history-card .card-title {
  color: var(--text-primary);
}

.grouped-history-card .text-muted {
  color: var(--text-secondary) !important;
}

.episode-list {
  border-top: 1px solid var(--border-color);
}

.episode-list-scroll {
  max-height: 300px;
  overflow-y: auto;
}

.episode-item {
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.episode-item:hover {
  background-color: var(--bg-tertiary);
}

.episode-item.active {
  background-color: var(--accent-color);
  border-left: 3px solid var(--accent-hover);
  color: #fff;
}

.episode-item.active .text-muted {
  color: rgba(255, 255, 255, 0.8) !important;
}

.episode-number {
  font-weight: 500;
  min-width: 70px;
}

.episode-progress {
  max-width: 150px;
}

.episode-status {
  min-width: 50px;
  text-align: right;
}

/* Scrollbar styling */
.episode-list-scroll::-webkit-scrollbar {
  width: 6px;
}

.episode-list-scroll::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.episode-list-scroll::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.episode-list-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
