import { computed, type ComputedRef } from 'vue'
import type { WatchRecord } from '@/types/history.types'

/**
 * Represents a single watched episode within a grouped anime
 */
export interface WatchedEpisode {
  episode: number
  episodeTitle: string
  position: number
  duration: number
  completed: boolean
  watchDate: string
}

/**
 * Represents an anime with grouped watched episodes
 */
export interface GroupedAnime {
  animeId: string
  animeTitle: string
  animeCover: string
  season: number
  episodes: WatchedEpisode[]
  totalWatched: number
  latestEpisode: WatchedEpisode
  overallProgress: number // 0-100
}

/**
 * Composable for transforming flat watch history into grouped structure.
 * Groups episodes by anime and season for better UX in continue watching sections.
 */
export function useGroupedHistory(watchRecords: ComputedRef<WatchRecord[]> | WatchRecord[]) {
  /**
   * Get the most recent episode from an array of watched episodes
   */
  function getLatestEpisode(episodes: WatchedEpisode[]): WatchedEpisode {
    if (episodes.length === 0) {
      throw new Error('Cannot get latest episode from empty array')
    }
    // Sort by watch date descending and get the first one
    return episodes.sort((a, b) => {
      return new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime()
    })[0]
  }

  /**
   * Calculate overall progress based on the latest watched episode
   */
  function calculateOverallProgress(latestEpisode: WatchedEpisode): number {
    if (latestEpisode.duration === 0) return 0
    return Math.min(100, (latestEpisode.position / latestEpisode.duration) * 100)
  }

  /**
   * Group flat watch records by anime and season
   */
  const groupedAnime: ComputedRef<GroupedAnime[]> = computed(() => {
    const records = Array.isArray(watchRecords) ? watchRecords : watchRecords.value

    // Create a map for grouping
    const groupMap = new Map<string, WatchedEpisode[]>()

    // Group episodes by animeId_season
    for (const record of records) {
      const key = `${record.animeId}_${record.season}`

      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }

      groupMap.get(key)!.push({
        episode: record.episode,
        episodeTitle: record.episodeTitle,
        position: record.position,
        duration: record.duration,
        completed: record.completed,
        watchDate: record.watchDate
      })
    }

    // Transform map into GroupedAnime array
    const result: GroupedAnime[] = []

    for (const [key, episodes] of groupMap.entries()) {
      // Use the first record to get anime info (all records in group have same anime info)
      const firstRecord = records.find(
        r => `${r.animeId}_${r.season}` === key
      )

      if (!firstRecord) continue

      const latestEpisode = getLatestEpisode(episodes)
      const overallProgress = calculateOverallProgress(latestEpisode)

      result.push({
        animeId: firstRecord.animeId,
        animeTitle: firstRecord.animeTitle,
        animeCover: firstRecord.animeCover,
        season: firstRecord.season,
        episodes,
        totalWatched: episodes.length,
        latestEpisode,
        overallProgress
      })
    }

    // Sort by latest episode watch date (most recently watched first)
    return result.sort((a, b) => {
      return new Date(b.latestEpisode.watchDate).getTime() - new Date(a.latestEpisode.watchDate).getTime()
    })
  })

  /**
   * Get grouped anime by anime ID and season
   */
  function getGroupedAnime(animeId: string, season: number): GroupedAnime | undefined {
    return groupedAnime.value.find(
      anime => anime.animeId === animeId && anime.season === season
    )
  }

  return {
    groupedAnime,
    getGroupedAnime
  }
}
