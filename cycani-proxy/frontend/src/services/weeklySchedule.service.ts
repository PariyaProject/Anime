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
   * @returns Weekly schedule with anime grouped by broadcast day
   */
  async getWeeklySchedule(day: string = 'all'): Promise<WeeklySchedule> {
    const response = await api.get<BackendResponse<WeeklySchedule>>(
      '/api/weekly-schedule',
      { params: { day } }
    )
    return response.data.data
  }
}
