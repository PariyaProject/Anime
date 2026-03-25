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
  isLocalOnly?: boolean  // Flag for localStorage-only entries
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
  hasLocalOnly?: boolean  // Flag if any episode is localStorage-only
}

/**
 * Interface for localStorage position records
 */
interface LocalPositionRecord {
  animeId: string
  animeTitle: string
  animeCover: string
  season: number
  episode: number
  position: number
  lastUpdated: string
}

/**
 * Read watch positions from localStorage
 * Returns a Map with compound keys (${animeId}_${season}_${episode}) as keys
 */
function readLocalStorageWatchPositions(): Map<string, LocalPositionRecord> {
  const result = new Map<string, LocalPositionRecord>()
  const PREFIX = 'watch_position_'
  const LS_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(PREFIX)) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const parsed: LocalPositionRecord = JSON.parse(data)

            // Check if entry is too old
            const entryAge = Date.now() - new Date(parsed.lastUpdated).getTime()
            if (entryAge > LS_MAX_AGE) {
              // Clean up old entry
              localStorage.removeItem(key)
              continue
            }

            // Extract compound key from localStorage key
            // Key format: watch_position_${animeId}_${season}_${episode}
            const compoundKey = key.substring(PREFIX.length)
            result.set(compoundKey, parsed)
          }
        } catch (e) {
          console.warn('Failed to parse localStorage entry:', key, e)
        }
      }
    }
  } catch (e) {
    console.error('Failed to read localStorage:', e)
  }

  return result
}

/**
 * Composable for transforming flat watch history into grouped structure.
 * Groups episodes by anime and season for better UX in continue watching sections.
 * Merges backend data with localStorage entries for complete coverage.
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
   * Merge backend watch records with localStorage entries
   */
  const mergedRecords: ComputedRef<WatchRecord[]> = computed(() => {
    const records = Array.isArray(watchRecords) ? watchRecords : watchRecords.value

    // Create a map of backend records by compound key
    const backendMap = new Map<string, WatchRecord>()
    for (const record of records) {
      const key = `${record.animeId}_${record.season}_${record.episode}`
      backendMap.set(key, record)
    }

    // Read localStorage entries
    const localStorageEntries = readLocalStorageWatchPositions()

    // Start with backend records
    const merged: WatchRecord[] = [...records]

    // Add localStorage-only entries (not in backend)
    for (const [key, entry] of localStorageEntries) {
      if (!backendMap.has(key)) {
        // Create a WatchRecord from localStorage entry
        // Note: isLocalOnly flag is added to the record for display purposes
        const localRecord = {
          animeId: entry.animeId,
          animeTitle: entry.animeTitle,
          animeCover: entry.animeCover,  // Use cover from localStorage
          season: entry.season,
          episode: entry.episode,
          episodeTitle: '',  // localStorage doesn't store episode title
          position: entry.position,
          duration: 0,  // localStorage doesn't store duration
          watchDate: entry.lastUpdated,
          completed: false,  // localStorage doesn't track completion
          isLocalOnly: true  // Mark as localStorage-only
        } as WatchRecord & { isLocalOnly: boolean }
        merged.push(localRecord)
      }
    }

    return merged
  })

  /**
   * Group flat watch records by anime and season
   */
  const groupedAnime: ComputedRef<GroupedAnime[]> = computed(() => {
    const records = mergedRecords.value

    // Create a map for grouping
    const groupMap = new Map<string, WatchedEpisode[]>()

    // Group episodes by animeId_season
    for (const record of records) {
      const key = `${record.animeId}_${record.season}`

      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }

      const isLocalOnly = 'isLocalOnly' in record && (record as WatchRecord & { isLocalOnly?: boolean }).isLocalOnly

      groupMap.get(key)!.push({
        episode: record.episode,
        episodeTitle: record.episodeTitle,
        position: record.position,
        duration: record.duration,
        completed: record.completed,
        watchDate: record.watchDate,
        isLocalOnly
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
      const hasLocalOnly = episodes.some(ep => ep.isLocalOnly)

      result.push({
        animeId: firstRecord.animeId,
        animeTitle: firstRecord.animeTitle,
        animeCover: firstRecord.animeCover,
        season: firstRecord.season,
        episodes,
        totalWatched: episodes.length,
        latestEpisode,
        overallProgress,
        hasLocalOnly
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
