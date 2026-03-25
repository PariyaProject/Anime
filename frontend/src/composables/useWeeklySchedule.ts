import { ref, readonly, computed } from 'vue'
import type { WeeklySchedule, WeeklyAnime } from '@/types/anime.types'
import { weeklyScheduleService } from '@/services/weeklySchedule.service'

const WEEKLY_SCHEDULE_CACHE_TTL_MS = 30 * 60 * 1000
const loading = ref(false)
const error = ref<string | null>(null)
const schedule = ref<WeeklySchedule | null>(null)
const fetchedAt = ref(0)
const pendingRequests = new Map<string, Promise<WeeklySchedule>>()

/**
 * Day keys used in the weekly schedule API
 */
export type DayKey = 'all' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

/**
 * Map JavaScript Date.getDay() values to day keys
 * Date.getDay() returns: 0=Sunday, 1=Monday, ..., 6=Saturday
 */
const DAY_KEY_MAP: Record<number, DayKey> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
}

/**
 * Composable for managing weekly anime schedule data.
 * Provides loading states, error handling, and schedule data access.
 */
export function useWeeklySchedule() {
  // Computed properties for convenient data access
  const hasSchedule = computed(() => schedule.value !== null)
  const updated = computed(() => schedule.value?.updated ?? null)

  /**
   * Get anime for a specific day
   */
  function getAnimeForDay(day: string): WeeklyAnime[] {
    if (!schedule.value) return []
    return schedule.value.schedule[day] || []
  }

  /**
   * Get all anime from the schedule (across all days)
   */
  function getAllAnime(): WeeklyAnime[] {
    if (!schedule.value) return []
    return Object.values(schedule.value.schedule).flat()
  }

  /**
   * Get the current day key based on the current date
   * @returns The day key for today (e.g., 'monday', 'tuesday', etc.)
   */
  function getCurrentDayKey(): DayKey {
    const today = new Date()
    const dayIndex = today.getDay()
    return DAY_KEY_MAP[dayIndex]
  }

  /**
   * Load weekly schedule from backend
   * @param day - Specific day filter or 'all' for full week
   * @param refresh - Force refresh server cache
   */
  async function loadSchedule(day: string = 'all', refresh: boolean = false) {
    const isFresh = schedule.value &&
      schedule.value.filter === day &&
      (Date.now() - fetchedAt.value) < WEEKLY_SCHEDULE_CACHE_TTL_MS

    if (!refresh && isFresh) {
      error.value = null
      return schedule.value
    }

    const pendingKey = `${day}:${refresh ? 'refresh' : 'default'}`
    const existingRequest = pendingRequests.get(pendingKey)
    if (existingRequest) {
      return existingRequest
    }

    loading.value = true
    error.value = null
    const request = weeklyScheduleService.getWeeklySchedule(day, refresh)
      .then((result) => {
        schedule.value = result
        fetchedAt.value = Date.now()
        return result
      })
      .catch((err: any) => {
        error.value = err.message || 'Failed to load weekly schedule'
        throw err
      })
      .finally(() => {
        pendingRequests.delete(pendingKey)
        if (pendingRequests.size === 0) {
          loading.value = false
        }
      })

    pendingRequests.set(pendingKey, request)
    return request
  }

  /**
   * Refresh the current schedule (force cache refresh from server)
   */
  async function refresh() {
    const dayFilter = schedule.value?.filter || 'all'
    return loadSchedule(dayFilter, true)
  }

  function clearError() {
    error.value = null
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    schedule: readonly(schedule),
    hasSchedule,
    updated,
    loadSchedule,
    refresh,
    getAnimeForDay,
    getAllAnime,
    getCurrentDayKey,
    clearError
  }
}
