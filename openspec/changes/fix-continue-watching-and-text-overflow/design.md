# Design: Fix Continue Watching Sync and Text Overflow Issues

## Context

### Current Architecture

**Watch Progress Save Flow**:
```
WatchView.vue
  ├─ play Event → savePositionImmediate() [⚠️ has condition: currentTime > 0]
  ├─ pause Event → savePositionImmediate()
  ├─ seeked Event → savePositionImmediate()
  ├─ ended Event → savePositionImmediate()
  ├─ visibilitychange → savePositionImmediate()
  ├─ pagehide → savePositionImmediate()
  ├─ beforeunload → savePositionImmediate()
  └─ Fallback Interval (5 min) → savePositionImmediate()
```

**Continue Watching Load Flow**:
```
HomeView.vue
  └─ historyStore.loadContinueWatching()
      └─ historyService.getContinueWatching()
          └─ GET /api/continue-watching
              └─ Returns backend data ONLY (no localStorage)
```

**The Problem**:
1. play 事件有 `if (currentTime.value > 0)` 条件，首次自动播放时可能不通过
2. localStorage 有数据，但 UI 只从后端加载
3. 后端同步是异步的，用户可能更快回到主页

### Constraints

1. **No Backend Changes**: Cannot modify API endpoints
2. **Vue Router**: Using Vue Router with history mode
3. **Bootstrap CSS**: Using Bootstrap 5 utility classes
4. **Existing Implementation**: Event-driven saves already implemented

## Goals / Non-Goals

### Goals
- Ensure watch history appears immediately after video starts playing
- Fix text overflow in Continue Watching cards
- Provide localStorage fallback when backend sync hasn't completed
- Keep changes minimal and focused

### Non-Goals
- Modifying backend API endpoints
- Changing watch history data structure
- Implementing real-time sync
- Refactoring entire watch history system

## Decisions

### Decision 1: Remove play Event Condition

**What**: Modify `WatchView.vue` play event handler to always call `savePositionImmediate`

**Why**:
- Current condition `if (currentTime.value > 0)` may fail on first autoplay
- Removing condition ensures backend record is created on first play
- `savePositionImmediate` has built-in deduplication to avoid excessive saves

**Implementation**:
```javascript
// Before (WatchView.vue:968-987)
player.on('play', () => {
  if (currentTime.value > 0) {  // Remove this condition
    historyStore.savePositionImmediate(...)
  }
})

// After
player.on('play', () => {
  historyStore.savePositionImmediate(
    { id: currentAnimeId.value, title: animeTitle.value, cover: animeCover.value },
    { season: season.value, episode: episode.value, title: episodeTitle.value, duration: duration.value },
    currentTime.value,
    0  // No threshold - always save
  )
})
```

**Trade-offs**:
- **Pro**: Simpler, guarantees record creation on first play
- **Pro**: Logic stays in one place (play event handler)
- **Con**: May call savePositionImmediate more frequently
- **Mitigation**: Existing deduplication logic prevents duplicate backend saves

### Decision 2: Add Router Navigation Guard

**What**: Use `onBeforeRouteLeave` in `WatchView.vue`

**Why**:
- Catches ALL navigation events from watch page
- Guaranteed to execute even for rapid navigation
- More reliable than `visibilitychange` for SPA navigation
- Complements existing page exit handlers

**Implementation**:
```javascript
import { onBeforeRouteLeave } from 'vue-router'

onBeforeRouteLeave((to, from, next) => {
  if (currentTime.value > 0) {
    historyStore.savePositionImmediate(
      { id: currentAnimeId.value, title: animeTitle.value, cover: animeCover.value },
      { season: season.value, episode: episode.value, title: episodeTitle.value, duration: duration.value },
      currentTime.value,
      0  // No threshold - always save on navigation
    )
    console.log('💾 Position saved on route navigation guard')
  }
  next()  // Don't block navigation
})
```

**Alternatives Considered**:
- Rely only on `visibilitychange` - **Rejected**: Unreliable for SPA navigation
- Use `router.beforeEach()` global guard - **Rejected**: Requires state management complexity
- Keep existing handlers only - **Rejected**: User already experiencing issues

### Decision 3: Merge localStorage Data in Continue Watching

**What**: Modify `useGroupedHistory` to include localStorage-only entries

**Why**:
- Provides fallback when backend sync hasn't completed
- Shows all watched content regardless of sync status
- User can always continue watching

**Implementation**:
```typescript
// In useGroupedHistory.ts
function readLocalStorageWatchPositions(): Map<string, LocalPositionRecord> {
  const result = new Map()
  const PREFIX = 'watch_position_'

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX)) {
      const data = localStorage.getItem(key)
      if (data) {
        const parsed: LocalPositionRecord = JSON.parse(data)
        result.set(key.substring(PREFIX.length), parsed)
      }
    }
  }

  return result
}

export function useGroupedHistory(continueWatching: Ref<WatchRecord[]>) {
  const localStorageEntries = readLocalStorageWatchPositions()

  // Merge backend + localStorage
  const mergedRecords = computed(() => {
    const backendMap = new Map()
    continueWatching.value.forEach(r => {
      const key = `${r.animeId}_${r.season}_${r.episode}`
      backendMap.set(key, r)
    })

    const allRecords = [...continueWatching.value]

    // Add localStorage-only entries
    for (const [key, entry] of localStorageEntries) {
      if (!backendMap.has(key)) {
        allRecords.push({
          animeId: entry.animeId,
          animeTitle: entry.animeTitle,
          animeCover: '',
          season: entry.season,
          episode: entry.episode,
          position: entry.position,
          duration: 0,
          completed: false,
          watchDate: entry.lastUpdated,
          isLocalOnly: true
        })
      }
    }

    return allRecords
  })

  // Group merged records...
}
```

**Visual Indicator**:
- Add "未同步" badge for localStorage-only entries
- Use reduced opacity or different color to distinguish

### Decision 4: Fix Text Overflow with CSS

**What**: Add CSS rules to `GroupedContinueWatchingCard.vue`

**Why**:
- Bootstrap's `text-truncate` requires parent constraints
- Flex container needs `min-width: 0` to allow shrinking

**Implementation**:
```css
.grouped-history-card .card-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
```

## Data Flow

### After Fix

```
User opens episode
  ↓
Video starts playing (autoplay)
  ↓
play event fires (even at currentTime = 0)
  ↓
savePositionImmediate() → localStorage ✓, backend (async)
  ↓
Backend creates watch history record
  ↓
User watches for 10 seconds, then clicks navbar
  ↓
onBeforeRouteLeave guard fires
  ↓
savePositionImmediate() → localStorage ✓, backend (async)
  ↓
User arrives at homepage
  ↓
loadContinueWatching() → GET /api/continue-watching
  ↓
Backend returns data (includes record created at play event!)
  ↓
✅ Anime IS in Continue Watching list
```

### Fallback: localStorage Merge

```
User opens episode
  ↓
Video starts playing, play event saves to localStorage
  ↓
User closes browser immediately (before backend sync)
  ↓
User reopens browser, goes to homepage
  ↓
loadContinueWatching() → Backend data (doesn't include recent session)
  ↓
useGroupedHistory reads localStorage
  ↓
Merges localStorage entries with backend data
  ↓
✅ Anime IS in Continue Watching list (with "未同步" badge)
```

## Risks / Trade-offs

### Risk 1: More Frequent savePositionImmediate Calls

**Impact**: More API calls to backend

**Mitigation**:
- Existing deduplication logic in `savePositionImmediate`:
  ```javascript
  const lastSaved = lastSavedPositions.value[key]
  if (lastSaved !== undefined && Math.abs(position - lastSaved) < skipThreshold) {
    return  // Skip save if position hasn't changed much
  }
  ```
- Only saves when position changes significantly (threshold: 5 seconds)

### Risk 2: Router Guard Delays Navigation

**Impact**: User perceives sluggish navigation

**Mitigation**:
- localStorage save is synchronous and instant (<1ms)
- Backend save is async and non-blocking
- `next()` called immediately after localStorage save

### Risk 3: localStorage Merge Complexity

**Impact**: Deduplication bugs possible

**Mitigation**:
- Use compound key `${animeId}_${season}_${episode}`
- Prefer backend data over localStorage when both exist
- Simple merge logic, well-tested

## Migration Plan

### Steps

1. **Phase 1: Remove play Event Condition**
   - Modify play event handler in `WatchView.vue`
   - Test that record is created on first autoplay

2. **Phase 2: Router Guard**
   - Add `onBeforeRouteLeave` to `WatchView.vue`
   - Test navigation scenarios

3. **Phase 3: localStorage Merge**
   - Modify `useGroupedHistory`
   - Add "未同步" badge
   - Test with network throttling

4. **Phase 4: Text Overflow**
   - Add CSS rules
   - Test with long titles

### Rollback

- Phase 1: Restore condition, logic reverts to old behavior
- Phase 2: Comment out guard, existing handlers still work
- Phase 3: Remove merge logic, use backend-only
- Phase 4: Remove CSS, text overflows (not breaking)

## Open Questions

1. **Should "未同步" badge be clickable?**
   - **Answer**: No - keep it simple, backend sync happens automatically

2. **What minimum watch duration justifies creating a record?**
   - **Answer**: 0 seconds - create record on first play, `savePositionImmediate` has deduplication

3. **How long to keep localStorage-only entries?**
   - **Answer**: 30 days - same as existing `LS_MAX_AGE`
