<template>
  <div class="card grouped-history-card" :class="{ 'expanded': isExpanded, 'has-local-only': anime.hasLocalOnly }">
    <!-- 未同步角标 - 右上角三角形 -->
    <div v-if="anime.hasLocalOnly" class="corner-badge" title="仅本地存储">
      <span class="corner-text">本地</span>
    </div>

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
          <h6 class="card-title mb-1 text-truncate" :title="anime.animeTitle">{{ anime.animeTitle }}</h6>
          <p class="card-text small text-muted mb-1">
            第 {{ anime.season }} 季 · 已看 {{ anime.totalWatched }} 集
          </p>
          <div class="d-flex align-items-center gap-2 mb-2">
            <div class="progress flex-grow-1" style="height: 4px">
              <div
                class="progress-bar"
                :class="{ 'estimated-progress': isEstimatedAnimeProgress(anime) }"
                role="progressbar"
                :style="{ width: `${getAnimeProgressWidth(anime)}%` }"
              ></div>
            </div>
            <span class="small text-muted">
              {{ getAnimeProgressLabel(anime) }}
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
            :class="{ 'active': episode.episode === anime.latestEpisode.episode, 'local-only': episode.isLocalOnly }"
            @click="handleSelectEpisode(episode)"
          >
            <div class="d-flex align-items-center">
              <span class="episode-number">
                第 {{ episode.episode }} 集
              </span>
              <div class="episode-progress flex-grow-1 ms-1">
                <div class="progress" style="height: 3px">
                  <div
                    class="progress-bar"
                    :class="{
                      'bg-success': episode.completed,
                      'estimated-progress': isEstimatedEpisodeProgress(episode)
                    }"
                    role="progressbar"
                    :style="{ width: `${getEpisodeProgressWidth(episode)}%` }"
                  ></div>
                </div>
              </div>
              <span class="episode-status small text-muted">
                {{ getEpisodeStatusLabel(episode) }}
              </span>
            </div>
            <p v-if="episode.episodeTitle" class="small text-muted mb-0 mt-1 text-truncate" :title="episode.episodeTitle">
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

// Placeholder image via Vite proxy
const placeholderImage = '/placeholder/placeholder-80x80.svg'

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
  if (episode.completed) return 100
  if (episode.duration === 0) return 0
  return Math.min(100, (episode.position / episode.duration) * 100)
}

function getEpisodeProgressWidth(episode: WatchedEpisode): number {
  const progress = getEpisodeProgress(episode)
  if (progress > 0) {
    return progress
  }

  if (episode.position > 0) {
    return estimateProgressWidth(episode.position)
  }

  return 0
}

function getAnimeProgressWidth(anime: GroupedAnime): number {
  if (anime.overallProgress > 0) {
    return anime.overallProgress
  }

  if (anime.latestEpisode.position > 0) {
    return estimateProgressWidth(anime.latestEpisode.position)
  }

  return 0
}

function isEstimatedEpisodeProgress(episode: WatchedEpisode): boolean {
  return !episode.completed && episode.duration <= 0 && episode.position > 0
}

function isEstimatedAnimeProgress(anime: GroupedAnime): boolean {
  const latestEpisode = anime.latestEpisode
  return !latestEpisode.completed && latestEpisode.duration <= 0 && latestEpisode.position > 0
}

function getAnimeProgressLabel(anime: GroupedAnime): string {
  const latestEpisode = anime.latestEpisode
  if (latestEpisode.completed) {
    return '已看完'
  }

  if (latestEpisode.position > 0) {
    return formatTime(latestEpisode.position)
  }

  return '未开始'
}

function getEpisodeStatusLabel(episode: WatchedEpisode): string {
  if (episode.completed) {
    return '已看完'
  }

  if (episode.position > 0) {
    return formatTime(episode.position)
  }

  return '未开始'
}

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function estimateProgressWidth(position: number): number {
  return Math.min(45, Math.max(14, Math.round(position / 30)))
}
</script>

<style scoped>
.grouped-history-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  position: relative; /* For absolute positioning of badge */
  overflow: visible; /* Allow corner badge to extend beyond */
}

/* 三角形角标 - 右上角 */
.corner-badge {
  position: absolute;
  top: 0;
  right: 0;
  width: 50px;
  height: 50px;
  overflow: hidden;
  z-index: 10;
  pointer-events: none;
}

.corner-badge::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #ff9f43 0%, #ff7f11 50%, #ee5a24 100%);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.15);
}

.corner-text {
  position: absolute;
  top: 6px;
  right: 6px;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transform: rotate(45deg);
  transform-origin: center;
  white-space: nowrap;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0; /* Allow flex item to shrink */
}

/* Ensure flex container allows text truncation */
.grouped-history-card .flex-grow-1 {
  min-width: 0; /* Allow flex child to shrink */
}

.grouped-history-card .text-muted {
  color: var(--text-secondary) !important;
}

.grouped-history-card .progress-bar.estimated-progress {
  background:
    repeating-linear-gradient(
      135deg,
      rgba(74, 158, 255, 0.95) 0 10px,
      rgba(45, 125, 210, 0.85) 10px 20px
    ) !important;
}

.episode-list {
  border-top: 1px solid var(--border-color);
  background-color: transparent;
}

.episode-list-scroll {
  max-height: 300px;
  overflow-y: auto;
  background-color: transparent;
}

.episode-item {
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
  margin-bottom: 0.25rem;
  color: var(--text-primary) !important;
  background-color: var(--bg-secondary) !important;
  border: 1px solid var(--border-color) !important;
}

.episode-item:hover {
  background-color: var(--bg-tertiary) !important;
}

.episode-item.active {
  background-color: #4a9eff !important;
  border-left: 3px solid #2d7dd2 !important;
  color: #fff !important;
}

.episode-item.active .text-muted {
  color: rgba(255, 255, 255, 0.8) !important;
}

.episode-number {
  font-weight: 500;
  min-width: 70px;
}

/* 未同步集数的橙色背景 */
.episode-item.local-only {
  background: rgba(255, 159, 67, 0.15) !important;
  border-left: 3px solid #ff7f11 !important;
}

.episode-item.local-only:hover {
  background: rgba(255, 159, 67, 0.25) !important;
}

/* local-only 状态下的文字颜色 */
.episode-item.local-only .episode-number {
  color: #ff7f11;
  font-weight: 600;
}

/* 既是 local-only 又是 active 的状态 - 优先显示 active 样式但保留橙色边框 */
.episode-item.local-only.active {
  background: #4a9eff !important;
  border-left: 3px solid #ff7f11 !important;
}

.episode-item.local-only.active .episode-number {
  color: #fff !important;
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
