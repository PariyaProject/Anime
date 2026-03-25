import api from './api'
import type { WeeklySchedule } from '@/types/anime.types'
import type { BackendResponse } from '@/types/api.types'

/**
 * Service for fetching weekly anime schedule from backend.
 * Uses the /api/weekly-schedule endpoint.
 */
export const weeklyScheduleService = {
  /**
   * Get weekly anime schedule.
   * @param day - Specific day filter ('monday', 'tuesday', etc.) or 'all' for full week
   * @param refresh - Force refresh server cache (legacy parameter, kept for compatibility)
   * @returns Weekly schedule with anime grouped by broadcast day
   */
  async getWeeklySchedule(day: string = 'all', refresh: boolean = false): Promise<WeeklySchedule> {
    const response = await api.get<BackendResponse<WeeklySchedule>>(
      '/api/weekly-schedule',
      {
        params: {
          day,
          refresh: refresh ? '1' : '0'
        }
      }
    )
    return response.data.data
  }
}
