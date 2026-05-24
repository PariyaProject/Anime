<template>
  <section v-if="hasContinueWatching" class="continue-watching-section">
    <h2 class="section-header section-header-spaced">
      继续观看
    </h2>
    <div class="continue-watching-container">
      <div class="continue-watching-scroll">
        <div
          v-for="anime in groupedAnime"
          :key="`${anime.animeId}-${anime.season}`"
          class="continue-watching-item"
        >
          <GroupedContinueWatchingCard
            :anime="anime"
            @resume="resumeWatching"
            @select-episode="selectEpisode"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/history'
import { usePluginStore } from '@/stores/plugin.store'
import { useGroupedHistory, type GroupedAnime, type WatchedEpisode } from '@/composables/useGroupedHistory'
import GroupedContinueWatchingCard from '@/components/history/GroupedContinueWatchingCard.vue'

const router = useRouter()
const historyStore = useHistoryStore()
const pluginStore = usePluginStore()

const continueWatching = computed(() => historyStore.continueWatching)
const { groupedAnime } = useGroupedHistory(continueWatching)
const hasContinueWatching = computed(() => groupedAnime.value.length > 0)

function resumeWatching(anime: GroupedAnime) {
  if (anime.sourceId && anime.sourceId !== pluginStore.activeSourceId) {
    pluginStore.setActiveSource(anime.sourceId)
    window.location.href = `/watch/${anime.animeId}?season=${anime.season}&episode=${anime.latestEpisode.episode}`
    return
  }

  router.push({
    name: 'Watch',
    params: {
      animeId: anime.animeId
    },
    query: {
      season: anime.season.toString(),
      episode: anime.latestEpisode.episode.toString()
    }
  })
}

function selectEpisode(anime: GroupedAnime, episode: WatchedEpisode) {
  if (anime.sourceId && anime.sourceId !== pluginStore.activeSourceId) {
    pluginStore.setActiveSource(anime.sourceId)
    window.location.href = `/watch/${anime.animeId}?season=${anime.season}&episode=${episode.episode}`
    return
  }

  router.push({
    name: 'Watch',
    params: {
      animeId: anime.animeId
    },
    query: {
      season: anime.season.toString(),
      episode: episode.episode.toString()
    }
  })
}
</script>

<style scoped>
.section-header {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
}

.section-header-spaced {
  margin-bottom: 1rem;
}

.continue-watching-section {
  padding: 1.35rem 1.25rem;
  border-radius: 1.7rem;
  border: 1px solid color-mix(in srgb, var(--border-color) 76%, transparent);
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  box-shadow: 0 12px 30px color-mix(in srgb, var(--shadow) 62%, transparent);
  backdrop-filter: blur(12px);
  position: relative;
  z-index: 1;
  margin-bottom: 1.5rem;
}

.continue-watching-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;
  scroll-padding-inline-end: 0.5rem;
}

.continue-watching-scroll {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  padding: 0 0.5rem 0.5rem 0;
}

.continue-watching-item {
  flex: 0 0 auto;
  width: 280px;
  max-width: 280px;
}

.continue-watching-container::-webkit-scrollbar {
  height: 8px;
}

.continue-watching-container::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
  margin: 4px 0;
}

.continue-watching-container::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
  transition: background 0.3s ease;
  min-height: 8px;
}

.continue-watching-container:hover::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.continue-watching-container:hover::-webkit-scrollbar-thumb {
  background: var(--border-color);
}

.continue-watching-container:hover::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
