# Proposal: Save Progress Before Video URL Refresh and Enhance Recovery

## Summary

Fix watch progress loss when video URLs are refreshed with two improvements:
1. **Save to backend before refresh** - Ensure progress persists even after page refresh
2. **Fix position recovery timing** - Wait for video to fully load before restoring position

Additionally, add more save triggers for user-initiated position changes (fast forward, rewind, manual seek).

## Problem Statement

### Issue 1: Progress Not Saved Before URL Refresh

**Location**: `cycani-proxy/frontend/src/views/WatchView.vue:596-665`

The `refreshVideoUrlSeamlessly()` function handles video URL refresh but does NOT save position to backend:

```javascript
async function refreshVideoUrlSeamlessly() {
  const currentPosition = currentTime.value  // Capture position

  // Fetch fresh URL and update player
  player.source = { sources: [{ src: freshUrl }] }

  // Restore position - BUT only to memory!
  player.once('ready', () => {
    player.currentTime = currentPosition  // ❌ Not saved to backend
  })
}
```

**User Feedback**: "现在前端视频链接刷新时它会从头开始播放（没有即使更新后台）导致我的进度会丢失"

### Issue 2: Position Recovery Fails (Timing Issue)

Current recovery logic uses `ready` event with 100ms delay:

```javascript
player.once('ready', () => {
  setTimeout(() => {
    player.currentTime = currentPosition  // May fail if video not loaded
  }, 100)
})
```

**User Feedback**: "但是它刷新其实是没有正确回到刚才那个位置的我刚才试了一下，即使是存在前台它也没有正确的回复到那个播放位置"

**Root Cause**: `ready` event fires before `duration` is available. Seeking before video is fully loaded fails silently.

### Issue 3: Missing Save Triggers

Current save triggers (lines 869-932):
- ✅ `play` event
- ✅ `pause` event
- ✅ `seeked` event (may be unreliable)
- ✅ `ended` event
- ✅ Page exit

**Missing**:
- ❌ Fast forward/rewind button clicks
- ❌ Manual position selection (clicking on progress bar)
- ❌ Keyboard shortcuts for seeking

**User Feedback**: "除了快进逃退以外还需要手动选定播放位置的时候都应该向后台提交播放进度的保存"

## Current Behavior Flow (Broken)

1. User watches video at position 5:30 (330 seconds)
2. Video URL expires (every ~6 hours)
3. `refreshVideoUrlSeamlessly()` is triggered
4. Captures `currentTime.value = 330`
5. Fetches new URL and applies to player
6. Tries to restore position:
   - Waits for `ready` event (too early!)
   - Sets `player.currentTime = 330` → **FAILS** because video not loaded
7. ❌ Backend was never updated with position 330
8. ❌ Memory restore also failed due to timing
9. User refreshes page → video starts from 0:00

## Proposed Solution

### Fix 1: Save to Backend Before Refresh

```javascript
async function refreshVideoUrlSeamlessly() {
  if (isRefreshingUrl.value) return

  const wasPlaying = player ? player.playing : false
  const currentPosition = currentTime.value

  // ✅ NEW: Save to backend FIRST (continue even if fails)
  if (currentPosition > 0) {
    try {
      await historyStore.savePositionImmediate(
        { id: currentAnimeId.value, title: animeTitle.value, cover: animeCover.value },
        { season: season.value, episode: episode.value, title: episodeTitle.value, duration: duration.value },
        currentPosition,
        0  // No threshold - always save
      )
      console.log('💾 Position saved to backend:', formatTime(currentPosition))
    } catch (err) {
      console.warn('⚠️ Backend save failed, continuing with memory-only restore:', err)
      // Don't block refresh - memory restore is better than nothing
    }
  }

  // ... continue with refresh
}
```

### Fix 2: Fix Position Recovery Timing

```javascript
// Use loadedmetadata event (fires when duration is available)
player.once('loadedmetadata', () => {
  // Poll for duration to be available and > 0
  const restoreAttempts = setInterval(() => {
    if (player.duration && player.duration > 0 && currentPosition > 0) {
      clearInterval(restoreAttempts)

      player.currentTime = currentPosition
      console.log('✅ Position restored:', formatTime(currentPosition))

      if (wasPlaying) {
        player.play()
      }
    }
  }, 100)

  // Timeout: give up after 5 seconds (user feedback: skip if fails once)
  setTimeout(() => {
    clearInterval(restoreAttempts)
    if (!player.paused) {
      console.warn('⚠️ Position restore timed out, starting from beginning')
    }
  }, 5000)
})
```

### Fix 3: Add More Save Triggers

Add save calls for:
- **Fast forward** (+10s button)
- **Rewind** (-10s button)
- **Progress bar click/touch** (direct seek)
- **Keyboard shortcuts** (arrow keys)

```javascript
// Add to Plyr event handlers or UI element handlers
function onUserSeek(newPosition: number) {
  historyStore.savePositionImmediate(
    { id: currentAnimeId.value, title: animeTitle.value, cover: animeCover.value },
    { season: season.value, episode: episode.value, title: episodeTitle.value, duration: duration.value },
    newPosition,
    5  // 5 second threshold for manual seeks
  )
}
```

## What Changes

- **ADDED**: Backend save call in `refreshVideoUrlSeamlessly()` before URL refresh
- **MODIFIED**: Position recovery logic to use `loadedmetadata` event and poll for duration
- **MODIFIED**: Add save triggers for fast forward, rewind, and manual position selection
- **NO BREAKING CHANGES**: All existing behavior preserved

## Impact

- **Affected specs**: `video-playback` (modify/extend requirements)
- **Affected code**:
  - `cycani-proxy/frontend/src/views/WatchView.vue`
    - `refreshVideoUrlSeamlessly()` function
    - `initializePlyr()` function (add new event handlers)
    - Add new save trigger handlers
- **Risk**: Low - defensive coding with fallbacks

## Related Changes

- **fix-watch-history-data-loss**: Addresses similar data loss issues
- **add-video-url-refresh**: Original implementation of URL refresh feature
- **improve-watch-progress-sync**: Event-driven save strategy

## References

- Video URL refresh: `cycani-proxy/frontend/src/views/WatchView.vue` lines 596-665
- Plyr initialization: `cycani-proxy/frontend/src/views/WatchView.vue` lines 819-1022
- Event-driven save: `cycani-proxy/frontend/src/views/WatchView.vue` lines 869-932
- History store: `cycani-proxy/frontend/src/stores/history.ts`
