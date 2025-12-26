import { ref, readonly, computed } from 'vue'
import type { WeeklySchedule, WeeklyAnime } from '@/types/anime.types'
import { weeklyScheduleService } from '@/services/weeklySchedule.service'

/**
 * Composable for managing weekly anime schedule data.
 * Provides loading states, error handling, and schedule data access.
 */
export function useWeeklySchedule() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const schedule = ref<WeeklySchedule | null>(null)

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
   * Load weekly schedule from backend
   * @param day - Specific day filter or 'all' for full week
   * @param refresh - Force refresh server cache
   */
  async function loadSchedule(day: string = 'all', refresh: boolean = false) {
    loading.value = true
    error.value = null
    try {
      schedule.value = await weeklyScheduleService.getWeeklySchedule(day, refresh)
      return schedule.value
    } catch (err: any) {
      error.value = err.message || 'Failed to load weekly schedule'
      throw err
    } finally {
      loading.value = false
    }
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
    clearError
  }
}
