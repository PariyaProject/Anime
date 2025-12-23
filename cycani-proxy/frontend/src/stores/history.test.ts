import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore } from '@/stores/history'
import type { WatchRecord } from '@/types/history.types'

describe('History Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has correct initial state', () => {
    const store = useHistoryStore()
    expect(store.watchHistory).toEqual([])
    expect(store.continueWatching).toEqual([])
    expect(store.lastPositions).toEqual({})
  })

  it('hasHistory returns false when history is empty', () => {
    const store = useHistoryStore()
    expect(store.hasHistory).toBe(false)
  })

  it('hasHistory returns true when history has items', () => {
    const store = useHistoryStore()
    store.watchHistory = [{ animeId: '1' } as WatchRecord]
    expect(store.hasHistory).toBe(true)
  })

  it('hasContinueWatching returns true when there are items', () => {
    const store = useHistoryStore()
    store.continueWatching = [{ completed: false } as WatchRecord]
    expect(store.hasContinueWatching).toBe(true)
  })

  it('hasContinueWatching returns true when items are completed (still has items)', () => {
    const store = useHistoryStore()
    store.continueWatching = [{ completed: true } as WatchRecord]
    // hasContinueWatching only checks array length, not completion status
    expect(store.hasContinueWatching).toBe(true)
  })

  it('getPosition returns saved position', () => {
    const store = useHistoryStore()
    store.lastPositions = {
      '1_1_1': { position: 100, lastUpdated: new Date().toISOString() }
    }

    expect(store.getPosition('1', 1, 1)).toBe(100)
  })

  it('getPosition returns 0 when no position saved', () => {
    const store = useHistoryStore()
    expect(store.getPosition('1', 1, 1)).toBe(0)
  })

  it('clearError clears the error state', () => {
    const store = useHistoryStore()
    store.error = 'Test error'
    expect(store.error).toBe('Test error')

    store.clearError()
    expect(store.error).toBeNull()
  })
})
