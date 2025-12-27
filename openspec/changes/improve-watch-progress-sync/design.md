# Technical Design

## Architecture Overview

### Current Flow (Interval-Based)
```
WatchView.vue
    │
    ├── setInterval(30s)
    │     └── savePosition() → historyStore.savePosition()
    │                              └── historyService.saveWatchPosition()
    │                                   └── POST /api/last-position
    │
    └── loadEpisode() → historyService.getLastPosition()
                          └── GET /api/last-position
```

### Proposed Flow (Event-Driven + Hybrid Storage)
```
WatchView.vue
    │
    ├── Event Triggers:
    │   ├── visibilitychange/pagehide/beforeunload → savePositionImmediate()
    │   ├── player.on('seeked') → savePositionImmediate()
    │   └── player.on('ended') → savePositionImmediate()
    │         └── historyStore.savePositionImmediate()
    │                ├── localStorage.setItem() [immediate]
    │               └── historyService.saveWatchPosition() [async, debounced]
    │
    └── loadEpisode() → historyService.getLastPosition()
                          ├── GET /api/last-position [try first]
                         └── localStorage.getItem() [fallback]
```

## Key Components

### 1. LocalStorage Schema

```typescript
// Key pattern: `watch_position_${animeId}_${season}_${episode}`
interface LocalPositionRecord {
  position: number
  lastUpdated: string  // ISO timestamp
  animeId: string
  animeTitle: string
  season: number
  episode: number
}
```

### 2. Event-Driven Save Function

```typescript
// In history.ts store
async function savePositionImmediate(
  animeInfo: AnimeInfo,
  episodeInfo: EpisodeInfo,
  position: number
) {
  const key = `${animeInfo.id}_${episodeInfo.season}_${episodeInfo.episode}`

  // 1. Save to localStorage immediately (synchronous)
  localStorage.setItem(
    `watch_position_${key}`,
    JSON.stringify({ position, lastUpdated: new Date().toISOString() })
  )
  lastPositions.value[key] = { position, lastUpdated: new Date().toISOString() }

  // 2. Debounced backend sync (async, non-blocking)
  debouncedBackendSync(animeInfo, episodeInfo, position)
}
```

### 3. Priority Load Function

```typescript
// In history.service.ts
async function getLastPosition(
  animeId: string,
  season: number,
  episode: number
): Promise<number> {
  // Priority 1: Try backend first (for cross-device sync)
  try {
    const response = await api.get(`/last-position/${animeId}/${season}/${episode}`)
    if (response.data?.position !== undefined) {
      console.log('📥 Loaded position from backend')
      return response.data.position
    }
  } catch (err) {
    console.log('📥 Backend unavailable, trying localStorage...')
  }

  // Priority 2: Fall back to localStorage
  const localKey = `watch_position_${animeId}_${season}_${episode}`
  const localData = localStorage.getItem(localKey)
  if (localData) {
    const parsed = JSON.parse(localData)
    // Only use if not too old (e.g., within 30 days)
    const age = Date.now() - new Date(parsed.lastUpdated).getTime()
    if (age < 30 * 24 * 60 * 60 * 1000) {
      console.log('📥 Loaded position from localStorage')
      return parsed.position
    }
  }

  // Priority 3: Default to 0 (start from beginning)
  console.log('📥 No saved position found, starting from 0')
  return 0
}
```

### 4. Debounce Strategy

```typescript
// Debounce backend sync to avoid excessive requests
const debounceMap = new Map<string, NodeJS.Timeout>()

function debouncedBackendSync(
  animeInfo: AnimeInfo,
  episodeInfo: EpisodeInfo,
  position: number
) {
  const key = `${animeInfo.id}_${episodeInfo.season}_${episodeInfo.episode}`

  // Clear existing timer
  if (debounceMap.has(key)) {
    clearTimeout(debounceMap.get(key)!)
  }

  // Set new timer (2 seconds)
  const timer = setTimeout(async () => {
    try {
      await api.post('/last-position', {
        animeId: animeInfo.id,
        season: episodeInfo.season,
        episode: episodeInfo.episode,
        position,
        animeTitle: animeInfo.title,
        animeCover: animeInfo.cover
      })
      console.log('✅ Synced to backend')
    } catch (err) {
      console.error('❌ Backend sync failed (data safe in localStorage)')
    }
    debounceMap.delete(key)
  }, 2000)

  debounceMap.set(key, timer)
}
```

## Event Handlers

### Page Exit Detection
```typescript
// Multiple events for better coverage
window.addEventListener('visibilitychange', handlePageHide)
window.addEventListener('pagehide', handlePageHide)
window.addEventListener('beforeunload', handlePageHide)

function handlePageHide() {
  if (currentTime.value > 0) {
    savePositionImmediate(animeInfo, episodeInfo, currentTime.value)
    // Use navigator.sendBeacon() for beforeUnload if needed
  }
}
```

### Seek Detection
```typescript
player.on('seeked', (event) => {
  const newPosition = event.detail.plyr.currentTime
  if (Math.abs(newPosition - lastSavedPosition) > 5) {
    // Only save if seeked more than 5 seconds
    savePositionImmediate(animeInfo, episodeInfo, newPosition)
  }
})
```

### Play/Pause Detection
```typescript
player.on('play', () => {
  // Save position when user resumes playback
  savePositionImmediate(animeInfo, episodeInfo, currentTime.value)
})

player.on('pause', () => {
  // Save position when user pauses playback
  savePositionImmediate(animeInfo, episodeInfo, currentTime.value)
})
```

### Video End Detection
```typescript
player.on('ended', async () => {
  // Mark as completed before loading next
  await savePositionImmediate(animeInfo, episodeInfo, duration.value)

  // Then proceed to next episode
  if (autoPlayNext.value && hasNext.value) {
    setTimeout(() => playNext(), 1000)
  }
})
```

## Error Handling

### LocalStorage Quota
```typescript
function saveToLocal(key: string, data: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('⚠️ localStorage quota exceeded, clearing old entries')
      clearOldPositions()  // Remove entries older than 60 days
      // Retry once
      try {
        localStorage.setItem(key, JSON.stringify(data))
        return true
      } catch {
        console.error('❌ localStorage unavailable, using memory-only')
        return false
      }
    }
    return false
  }
}
```

### Backend Failure
```typescript
// Silent fail - localStorage is the source of truth
try {
  await api.post('/last-position', data)
} catch (err) {
  console.warn('Backend sync failed, position saved locally')
  // No user notification needed - data is safe
}
```

## Migration Path

1. **Backward Compatible**: Existing backend API unchanged
2. **Gradual Rollout**: Can deploy frontend first, localStorage works immediately
3. **No Data Loss**: Backend remains authoritative for cross-device sync
4. **Clean Removal**: Interval-based code can be removed after validation

## Performance Impact

- **Network Requests**: ~120/hour → ~3-5/hour (96% reduction)
- **LocalStorage Writes**: 5-10 per session (negligible)
- **Memory Usage**: +1KB for debounce map (negligible)
- **CPU Usage**: Reduced (no setInterval overhead)
