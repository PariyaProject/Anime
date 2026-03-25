<template>
  <div class="detail-view">
    <div class="detail-layout">
      <div v-if="loading" class="detail-skeleton">
        <el-skeleton animated>
          <template #template>
            <div class="hero-grid">
              <el-skeleton-item variant="image" class="skeleton-cover" />
              <div class="skeleton-copy">
                <el-skeleton-item variant="h1" style="width: 68%; height: 34px; margin-bottom: 12px;" />
                <el-skeleton-item variant="text" style="width: 42%; margin-bottom: 10px;" />
                <el-skeleton-item variant="text" style="width: 88%; margin-bottom: 8px;" />
                <el-skeleton-item variant="text" style="width: 94%; margin-bottom: 8px;" />
                <el-skeleton-item variant="text" style="width: 74%; margin-bottom: 20px;" />
                <div class="skeleton-actions">
                  <el-skeleton-item variant="button" style="width: 150px; height: 44px;" />
                  <el-skeleton-item variant="button" style="width: 140px; height: 44px;" />
                </div>
              </div>
            </div>
          </template>
        </el-skeleton>
      </div>

      <div v-else-if="error" class="text-center py-5">
        <ErrorMessage :message="error" @retry="initializePage" />
      </div>

      <div v-else-if="anime" class="detail-content">
        <nav class="detail-breadcrumb" aria-label="面包屑导航">
          <router-link to="/" class="breadcrumb-link">动画列表</router-link>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">{{ anime.title }}</span>
        </nav>

        <section class="detail-hero">
          <div class="detail-cover-shell">
            <img
              :src="displayCoverImage"
              :alt="`${anime.title} 封面`"
              class="detail-cover"
              @error="handleImageError"
            />
          </div>

          <div class="detail-summary">
            <div class="detail-meta-row">
              <span class="detail-chip detail-chip-type">{{ anime.type || 'TV' }}</span>
              <span v-if="anime.year" class="detail-chip">{{ anime.year }}</span>
              <span class="detail-chip">{{ anime.totalEpisodes || sortedEpisodes.length || 0 }} 集</span>
              <span v-if="anime.totalSeasons > 1" class="detail-chip">{{ anime.totalSeasons }} 季</span>
            </div>

            <h1 class="detail-title">{{ anime.title }}</h1>

            <p v-if="anime.description" class="detail-description">
              {{ anime.description }}
            </p>
            <p v-else class="detail-description detail-description-muted">
              暂时还没有抓取到这部作品的完整简介，你也可以直接从下方选集开始观看。
            </p>

            <div v-if="hasProgress && resumeGroup" class="progress-panel">
              <div class="progress-copy">
                <span class="progress-kicker">继续观看</span>
                <strong class="progress-title">{{ progressHeadline }}</strong>
                <span class="progress-subtitle">
                  {{ progressSubtitle }}
                </span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :class="{ 'estimated-progress': hasEstimatedResumeProgress }"
                  :style="{ width: `${resumeProgressWidth}%` }"
                ></div>
              </div>
            </div>

            <div class="detail-actions">
              <button class="btn-primary-action" @click="playPrimaryEpisode" :disabled="!primaryEpisode">
                {{ primaryActionLabel }}
              </button>
              <button class="btn-secondary-action" @click="playFirstEpisode" :disabled="!firstEpisode">
                从第一集开始
              </button>
              <router-link to="/history" class="btn-ghost-action">
                查看历史
              </router-link>
            </div>

            <div class="detail-facts">
              <div class="fact-card">
                <span class="fact-label">当前状态</span>
                <strong class="fact-value">{{ anime.status && anime.status !== '未知' ? anime.status : '持续更新中' }}</strong>
              </div>
              <div class="fact-card">
                <span class="fact-label">推荐入口</span>
                <strong class="fact-value">{{ hasProgress ? '继续观看' : '从首集开始' }}</strong>
              </div>
              <div class="fact-card">
                <span class="fact-label">可用选集</span>
                <strong class="fact-value">{{ sortedEpisodes.length }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="episodes-section">
          <div class="section-head">
            <div>
              <h2 class="section-title">选集列表</h2>
              <p class="section-subtitle">
                {{ hasProgress ? '可以继续上次进度，也可以从任意一集重新开始。' : '从第一集开始，或者直接跳到你想看的集数。' }}
              </p>
            </div>
            <button
              v-if="sortedEpisodes.length > initialEpisodeCount"
              class="btn-ghost-inline"
              @click="showAllEpisodes = !showAllEpisodes"
            >
              {{ showAllEpisodes ? '收起部分选集' : `展开全部 ${sortedEpisodes.length} 集` }}
            </button>
          </div>

          <div v-if="visibleEpisodes.length > 0" class="episodes-grid">
            <button
              v-for="entry in visibleEpisodes"
              :key="`${entry.season}-${entry.episode}`"
              class="episode-card"
              :class="{
                active: activeEpisode?.season === entry.season && activeEpisode?.episode === entry.episode,
                resumed: resumeGroup?.latestEpisode.episode === entry.episode && resumeGroup?.season === entry.season
              }"
              @click="playEpisode(entry.season, entry.episode)"
            >
              <span class="episode-badge">第 {{ entry.episode }} 集</span>
              <strong class="episode-name">{{ entry.title || `第 ${entry.episode} 集` }}</strong>
              <span class="episode-hint">
                {{
                  resumeGroup?.latestEpisode.episode === entry.episode && resumeGroup?.season === entry.season
                    ? '上次看到这里'
                    : '点击播放'
                }}
              </span>
            </button>
          </div>
          <div v-else class="empty-episodes">
            <EmptyState
              title="暂时没有可播放的选集"
              description="这部作品的详情已抓取成功，但选集数据还没有准备好。"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animeService } from '@/services/anime.service'
import { useHistoryStore } from '@/stores/history'
import { useGroupedHistory } from '@/composables/useGroupedHistory'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { AnimeDetails } from '@/types/anime.types'
import type { WatchRecord } from '@/types/history.types'

const route = useRoute()
const router = useRouter()
const historyStore = useHistoryStore()

const animeId = computed(() => route.params.animeId as string)

const loading = ref(false)
const error = ref<string | null>(null)
const anime = ref<AnimeDetails | null>(null)
const showAllEpisodes = ref(false)
const initialEpisodeCount = 24

const placeholderImage = computed(() => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  return `${apiBaseUrl}/api/placeholder-image`
})

const historyRecords = computed<WatchRecord[]>(() => {
  const merged = new Map<string, WatchRecord>()

  for (const record of [...historyStore.watchHistory, ...historyStore.continueWatching]) {
    const key = `${record.animeId}_${record.season}_${record.episode}`
    const existing = merged.get(key)

    if (!existing || new Date(record.watchDate).getTime() > new Date(existing.watchDate).getTime()) {
      merged.set(key, record)
    }
  }

  return [...merged.values()]
})

const { groupedAnime } = useGroupedHistory(historyRecords)

const animeProgressGroups = computed(() => {
  return groupedAnime.value
    .filter(group => group.animeId === animeId.value)
    .sort((a, b) => new Date(b.latestEpisode.watchDate).getTime() - new Date(a.latestEpisode.watchDate).getTime())
})

const resumeGroup = computed(() => animeProgressGroups.value[0] || null)
const hasProgress = computed(() => Boolean(resumeGroup.value))

const sortedEpisodes = computed(() => {
  return [...(anime.value?.episodes || [])].sort((a, b) => {
    if (a.season !== b.season) {
      return a.season - b.season
    }
    return a.episode - b.episode
  })
})

const visibleEpisodes = computed(() => {
  return showAllEpisodes.value ? sortedEpisodes.value : sortedEpisodes.value.slice(0, initialEpisodeCount)
})

const firstEpisode = computed(() => sortedEpisodes.value[0] || null)

const primaryEpisode = computed(() => {
  if (!resumeGroup.value) {
    return firstEpisode.value
  }

  const latestEpisode = resumeGroup.value.latestEpisode
  const matchingEpisode = sortedEpisodes.value.find(
    entry => entry.season === resumeGroup.value?.season && entry.episode === latestEpisode.episode
  )

  if (matchingEpisode && !latestEpisode.completed) {
    return matchingEpisode
  }

  const nextEpisode = sortedEpisodes.value.find(
    entry => entry.season === resumeGroup.value?.season && entry.episode > latestEpisode.episode
  )

  return nextEpisode || matchingEpisode || firstEpisode.value
})

const activeEpisode = computed(() => primaryEpisode.value || firstEpisode.value)

const primaryActionLabel = computed(() => {
  if (!primaryEpisode.value) {
    return '暂无可播放选集'
  }

  if (!resumeGroup.value) {
    return '立即播放'
  }

  const latestEpisode = resumeGroup.value.latestEpisode
  if (primaryEpisode.value.episode === latestEpisode.episode && !latestEpisode.completed) {
    return `继续第 ${latestEpisode.episode} 集`
  }

  return `播放第 ${primaryEpisode.value.episode} 集`
})

const progressHeadline = computed(() => {
  if (!resumeGroup.value || !primaryEpisode.value) {
    return '从第一集开始'
  }

  const latestEpisode = resumeGroup.value.latestEpisode
  if (primaryEpisode.value.episode === latestEpisode.episode && !latestEpisode.completed) {
    return `你上次看到第 ${latestEpisode.episode} 集`
  }

  return `推荐继续第 ${primaryEpisode.value.episode} 集`
})

const progressSubtitle = computed(() => {
  if (!resumeGroup.value) {
    return ''
  }

  const latestEpisode = resumeGroup.value.latestEpisode
  if (latestEpisode.completed) {
    return `最近记录：第 ${latestEpisode.episode} 集`
  }

  if (latestEpisode.position > 0) {
    return `最近记录：第 ${latestEpisode.episode} 集，${formatTime(latestEpisode.position)}`
  }

  return `最近记录：第 ${latestEpisode.episode} 集`
})

const hasEstimatedResumeProgress = computed(() => {
  const latestEpisode = resumeGroup.value?.latestEpisode
  return Boolean(
    latestEpisode &&
    !latestEpisode.completed &&
    latestEpisode.duration <= 0 &&
    latestEpisode.position > 0
  )
})

const resumeProgressWidth = computed(() => {
  if (!resumeGroup.value) {
    return 0
  }

  if (resumeGroup.value.overallProgress > 0) {
    return resumeGroup.value.overallProgress
  }

  const latestEpisode = resumeGroup.value.latestEpisode
  if (latestEpisode.position > 0) {
    return estimateProgressWidth(latestEpisode.position)
  }

  return 0
})

const displayCoverImage = computed(() => {
  const cover = anime.value?.cover
  const resolved = animeService.getImageProxyUrl(cover)
  return resolved || placeholderImage.value
})

async function initializePage() {
  if (!animeId.value) {
    error.value = '缺少动画编号，无法加载详情。'
    anime.value = null
    return
  }

  loading.value = true
  error.value = null
  anime.value = null
  showAllEpisodes.value = false

  try {
    const detailPromise = animeService.getAnimeById(animeId.value)
    const historyPromise = Promise.allSettled([
      historyStore.loadWatchHistory(),
      historyStore.loadContinueWatching()
    ])

    const [detail] = await Promise.all([detailPromise, historyPromise])
    anime.value = detail
    document.title = `${detail.title} - 动画`
  } catch (err: any) {
    error.value = err?.message || '加载动画详情失败'
  } finally {
    loading.value = false
  }
}

function playEpisode(season: number, episode: number) {
  router.push({
    name: 'Watch',
    params: { animeId: animeId.value },
    query: {
      season: season.toString(),
      episode: episode.toString()
    }
  })
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

function playFirstEpisode() {
  if (firstEpisode.value) {
    playEpisode(firstEpisode.value.season, firstEpisode.value.episode)
  }
}

function playPrimaryEpisode() {
  if (primaryEpisode.value) {
    playEpisode(primaryEpisode.value.season, primaryEpisode.value.episode)
  }
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  if (!img.dataset.errorSet) {
    img.dataset.errorSet = 'true'
    img.src = placeholderImage.value
    img.onerror = null
  }
}

watch(animeId, () => {
  void initializePage()
}, { immediate: true })
</script>

<style scoped>
.detail-view {
  min-height: 100vh;
  padding-inline: clamp(0.5rem, 1.4vw, 1.1rem);
}

.detail-layout {
  width: min(100%, 1720px);
  margin: 0 auto;
  padding-block: 1rem 2rem;
}

.detail-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.breadcrumb-link {
  color: var(--text-secondary);
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: var(--text-primary);
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 600;
}

.hero-grid,
.detail-hero {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

.detail-hero {
  padding: 1.75rem;
  border: 1px solid var(--border-color);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(255, 184, 0, 0.1), transparent 30%),
    linear-gradient(180deg, var(--bg-secondary), var(--bg-primary));
  box-shadow: 0 18px 48px var(--shadow);
}

.detail-cover-shell {
  position: relative;
}

.detail-cover,
.skeleton-cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 20px;
  object-fit: cover;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.detail-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.9rem;
}

.detail-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.detail-chip-type {
  background: #fff4dd;
  color: #a05a00;
  border-color: #ffd48c;
}

.detail-title {
  margin: 0;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.08;
  color: var(--text-primary);
}

.detail-description {
  margin: 1rem 0 0;
  max-width: 72ch;
  font-size: 1rem;
  line-height: 1.8;
  color: var(--text-primary);
}

.detail-description-muted {
  color: var(--text-secondary);
}

.progress-panel {
  margin-top: 1.5rem;
  padding: 1rem 1.1rem;
  border-radius: 18px;
  background: rgba(55, 128, 255, 0.08);
  border: 1px solid rgba(55, 128, 255, 0.18);
}

.progress-copy {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.progress-kicker {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2d66d6;
  font-weight: 700;
}

.progress-title {
  color: var(--text-primary);
  font-size: 1.05rem;
}

.progress-subtitle {
  color: var(--text-secondary);
}

.progress-bar {
  margin-top: 0.9rem;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(55, 128, 255, 0.15);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2d66d6, #49a3ff);
}

.progress-fill.estimated-progress {
  background:
    repeating-linear-gradient(
      135deg,
      rgba(73, 163, 255, 0.95) 0 10px,
      rgba(45, 102, 214, 0.85) 10px 20px
    );
}

.detail-actions,
.skeleton-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.6rem;
}

.btn-primary-action,
.btn-secondary-action,
.btn-ghost-action,
.btn-ghost-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.8rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid transparent;
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.btn-primary-action {
  background: #1f4ed8;
  color: #fff;
}

.btn-primary-action:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #1a43ba;
}

.btn-secondary-action {
  background: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.btn-secondary-action:hover:not(:disabled),
.btn-ghost-action:hover,
.btn-ghost-inline:hover {
  background: var(--bg-secondary);
}

.btn-ghost-action,
.btn-ghost-inline {
  background: transparent;
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.btn-primary-action:disabled,
.btn-secondary-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1.75rem;
}

.fact-card {
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.fact-label {
  display: block;
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-bottom: 0.35rem;
}

.fact-value {
  color: var(--text-primary);
  font-size: 1rem;
}

.episodes-section {
  margin-top: 2rem;
  padding: 1.35rem;
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: var(--bg-primary);
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1.2rem;
}

.section-title {
  margin: 0;
  font-size: 1.35rem;
  color: var(--text-primary);
}

.section-subtitle {
  margin: 0.35rem 0 0;
  color: var(--text-secondary);
}

.episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.9rem;
}

.episode-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid var(--border-color);
  background: linear-gradient(180deg, var(--bg-secondary), var(--bg-primary));
  color: var(--text-primary);
  text-align: left;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.episode-card:hover {
  transform: translateY(-2px);
  border-color: #80a9ff;
  box-shadow: 0 10px 24px var(--shadow);
}

.episode-card.active {
  border-color: #2d66d6;
  box-shadow: 0 12px 28px rgba(45, 102, 214, 0.18);
}

.episode-card.resumed .episode-badge {
  background: rgba(45, 102, 214, 0.12);
  color: #2d66d6;
}

.episode-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.episode-name {
  font-size: 1rem;
  line-height: 1.45;
}

.episode-hint {
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.empty-episodes {
  padding: 1.25rem 0;
}

@media (max-width: 1024px) {
  .hero-grid,
  .detail-hero {
    grid-template-columns: 1fr;
  }

  .detail-cover-shell {
    max-width: 320px;
  }

  .detail-facts {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .detail-view {
    padding-inline: 0.65rem;
  }

  .detail-layout {
    padding-block: 0.85rem 1.25rem;
  }

  .detail-hero,
  .episodes-section {
    padding: 1rem;
    border-radius: 18px;
  }

  .detail-actions,
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-primary-action,
  .btn-secondary-action,
  .btn-ghost-action,
  .btn-ghost-inline {
    width: 100%;
  }
}
</style>
