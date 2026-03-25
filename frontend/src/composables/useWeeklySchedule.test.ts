import { describe, it, expect, beforeEach, vi } from 'vitest'

const { getWeeklyScheduleMock } = vi.hoisted(() => ({
  getWeeklyScheduleMock: vi.fn()
}))

vi.mock('@/services/weeklySchedule.service', () => ({
  weeklyScheduleService: {
    getWeeklySchedule: getWeeklyScheduleMock
  }
}))

describe('useWeeklySchedule', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('reuses cached weekly schedule while it is fresh', async () => {
    getWeeklyScheduleMock.mockResolvedValue({
      schedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [], all: [] },
      updated: '2026-03-25T00:00:00.000Z',
      filter: 'all'
    })

    const { useWeeklySchedule } = await import('@/composables/useWeeklySchedule')
    const first = useWeeklySchedule()
    const second = useWeeklySchedule()

    await first.loadSchedule('all')
    await second.loadSchedule('all')

    expect(getWeeklyScheduleMock).toHaveBeenCalledTimes(1)
    expect(first.hasSchedule.value).toBe(true)
    expect(second.hasSchedule.value).toBe(true)
  })
})
