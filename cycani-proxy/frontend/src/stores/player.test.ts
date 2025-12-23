import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'

describe('Player Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has correct initial state', () => {
    const store = usePlayerStore()
    expect(store.currentEpisodeData).toBeNull()
    expect(store.isPlaying).toBe(false)
    expect(store.currentTime).toBe(0)
    expect(store.duration).toBe(0)
    expect(store.autoPlay).toBe(true)
  })

  it('setAutoPlay updates autoPlay state', () => {
    const store = usePlayerStore()
    expect(store.autoPlay).toBe(true)

    store.setAutoPlay(false)
    expect(store.autoPlay).toBe(false)

    store.setAutoPlay(true)
    expect(store.autoPlay).toBe(true)
  })

  it('play() and pause() update isPlaying state', () => {
    const store = usePlayerStore()
    expect(store.isPlaying).toBe(false)

    store.play()
    expect(store.isPlaying).toBe(true)

    store.pause()
    expect(store.isPlaying).toBe(false)
  })

  it('updateTime updates currentTime', () => {
    const store = usePlayerStore()
    store.updateTime(100)
    expect(store.currentTime).toBe(100)

    store.updateTime(0)
    expect(store.currentTime).toBe(0)
  })

  it('updateDuration updates duration', () => {
    const store = usePlayerStore()
    store.updateDuration(1800)
    expect(store.duration).toBe(1800)
  })

  it('seekTo updates currentTime', () => {
    const store = usePlayerStore()
    store.seekTo(500)
    expect(store.currentTime).toBe(500)
  })

  it('toggleAutoPlay toggles the autoPlay state', () => {
    const store = usePlayerStore()
    expect(store.autoPlay).toBe(true)

    store.toggleAutoPlay()
    expect(store.autoPlay).toBe(false)

    store.toggleAutoPlay()
    expect(store.autoPlay).toBe(true)
  })

  it('clearPlayer resets all player state', () => {
    const store = usePlayerStore()

    // Set some state
    store.play()
    store.updateTime(100)
    store.updateDuration(1800)

    // Clear
    store.clearPlayer()

    expect(store.currentEpisodeData).toBeNull()
    expect(store.isPlaying).toBe(false)
    expect(store.currentTime).toBe(0)
    expect(store.duration).toBe(0)
  })

  it('computes progress correctly', () => {
    const store = usePlayerStore()
    store.updateDuration(100)
    store.updateTime(50)

    expect(store.progress).toBe(50)

    store.updateTime(25)
    expect(store.progress).toBe(25)
  })

  it('progress is 0 when duration is 0', () => {
    const store = usePlayerStore()
    store.updateDuration(0)
    store.updateTime(100)

    expect(store.progress).toBe(0)
  })

  it('hasEpisode returns false when no episode loaded', () => {
    const store = usePlayerStore()
    expect(store.hasEpisode).toBe(false)
  })
})
