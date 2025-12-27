# Design: Fix Video Player Progress Bar

## Problem Summary

The video player progress bar does not update during playback because:

1. **Iframe Player for cycani- IDs**: When `realVideoUrl` is a `cycani-` prefixed ID, the code constructs a `player.cycanime.com` URL and uses an iframe player, which prevents cross-origin progress tracking
2. **Unused Store Methods**: The `playerStore.updateTime()` and `playerStore.updateDuration()` methods exist but are never called
3. **Local Refs Only**: Progress tracking uses local refs that only update from Plyr's `timeupdate` event, which doesn't fire for iframe players

## Solution Design

### Approach 1: Use Plyr for cycani- IDs (Recommended)

**Strategy**: Modify player selection logic to use Plyr player directly for `cycani-` IDs instead of constructing iframe URLs.

**Implementation**:
```typescript
// In WatchView.vue, modify useIframePlayer computed property
const useIframePlayer = computed(() => {
  const url = playerStore.currentEpisodeData?.realVideoUrl
  if (!url) return false

  // Use Plyr for cycani- IDs (no iframe)
  if (url.startsWith('cycani-')) {
    return false
  }

  // Only use iframe for existing player.cycanime.com URLs
  return url.includes('player.cycanime.com')
})

// In WatchView.vue, modify videoUrl computed property
const videoUrl = computed(() => {
  const url = playerStore.currentEpisodeData?.realVideoUrl
  if (!url) return null

  // Use cycani- IDs directly with Plyr
  if (url.startsWith('cycani-')) {
    return url  // Plyr will handle the cycani- URL format
  }

  // Don't use player URLs with Plyr
  if (url.includes('player.cycanime.com')) {
    return null
  }

  return url  // Direct MP4 URLs
})
```

**Pros**:
- Simple change with minimal risk
- Leverages existing Plyr integration
- Progress tracking works immediately
- No cross-origin issues

**Cons**:
- Assumes Plyr can handle `cycani-` URL format (may need backend proxy support)
- May not work if the video URL requires special player.cycanime.com handling

### Approach 2: Add Store Synchronization (Optional Enhancement)

**Strategy**: In addition to Approach 1, connect Plyr's `timeupdate` event to the player store for consistent state management.

**Implementation**:
```typescript
// In WatchView.vue, modify Plyr timeupdate event handler
player.on('timeupdate', (event) => {
  const plyr = event.detail.plyr
  currentTime.value = plyr.currentTime
  duration.value = plyr.duration

  // Also update store for consistency
  playerStore.updateTime(plyr.currentTime)
  playerStore.updateDuration(plyr.duration)
})
```

**Pros**:
- Consistent state across local refs and store
- Enables potential future features (e.g., global player state)
- Minimal additional code

**Cons**:
- Slight redundancy (local refs + store)
- Not strictly necessary for fixing the progress bar

### Approach 3: postMessage Bridge for Iframe (Complex, Not Recommended)

**Strategy**: Implement a `postMessage` API between the iframe and parent window for progress tracking.

**Implementation**:
1. Inject a script into player.cycanime.com to send progress updates via `window.parent.postMessage()`
2. Add event listener in WatchView.vue to receive and process these messages

**Pros**:
- Allows iframe player to continue working
- Can support both player types

**Cons**:
- Complex implementation
- Requires modifying player.cycanime.com (not under our control)
- Same-origin policy still applies for reading iframe content
- High complexity for limited benefit

**Decision**: NOT recommended due to complexity and dependency on external domain.

## Recommended Implementation Plan

1. **Primary Fix**: Implement Approach 1 (Use Plyr for cycani- IDs)
   - Modify `useIframePlayer` computed property to return `false` for `cycani-` IDs
   - Ensure `videoUrl` computed property returns `cycani-` IDs for Plyr to use
   - Test that Plyr can handle `cycani-` URL format

2. **Optional Enhancement**: Implement Approach 2 (Store Synchronization)
   - Add `playerStore.updateTime()` and `playerStore.updateDuration()` calls in the `timeupdate` event handler
   - This ensures store state stays in sync with local refs

3. **Fallback Testing**: If Approach 1 doesn't work (Plyr cannot handle `cycani-` URLs), consider:
   - Using a backend proxy endpoint to resolve `cycani-` IDs to direct video URLs
   - Or implementing Approach 3 (postMessage bridge) as a last resort

## Technical Considerations

### Plyr Video URL Format

**Question**: Can Plyr handle `cycani-` prefixed video IDs directly?

**Assumption**: The `cycani-` IDs likely need to be resolved to actual video URLs via the backend API. If this is the case, we may need to:

1. Add a backend endpoint like `/api/video-proxy/:id` that:
   - Takes a `cycani-` ID
   - Resolves it to the actual video stream URL
   - Returns a proxied video URL that Plyr can use

2. Update the frontend to use this endpoint for `cycani-` IDs

### Existing Progress Tracking Infrastructure

The codebase already has:
- `playerStore.currentTime` and `playerStore.duration` state (lines 10-11)
- `playerStore.updateTime()` and `playerStore.updateDuration()` methods (lines 52-58)
- Plyr `timeupdate` event handler in WatchView.vue (lines 576-580)

**Current State**:
- Store methods exist but are never called
- Only local refs (`currentTime`, `duration` in WatchView) are updated
- Progress bar uses local refs via computed property

**Proposed State**:
- Keep local refs for immediate UI updates (reactivity)
- Also update store for consistency and future features
- Progress bar continues to use local refs (no change needed)

## Testing Strategy

1. **Unit Tests**: Test modified computed properties (`useIframePlayer`, `videoUrl`)
2. **Integration Tests**: Test Plyr player initialization with `cycani-` URLs
3. **Manual Testing**: Verify progress bar updates during playback on actual cycani.org content
4. **Edge Cases**: Test with direct MP4 URLs, `cycani-` IDs, and `player.cycanime.com` URLs

## Risk Assessment

- **Low Risk**: Approach 1 (modify computed properties)
- **Low Risk**: Approach 2 (add store synchronization)
- **High Risk**: Approach 3 (postMessage bridge) - NOT recommended

## Conclusion

**Recommended Solution**: Implement Approach 1 + optional Approach 2.

This is the simplest, most reliable fix that leverages existing infrastructure and avoids cross-origin complexity.

---

# Auto-Resume and Cross-Device Sync Design

## Problem Summary

Currently, the system saves playback progress to the backend every 30 seconds, but there is NO logic to load and resume from the saved position. When a user reopens an episode, playback always starts from the beginning.

**Missing Features:**
1. No auto-resume from saved position on page load
2. No toast notification when resuming
3. No handling of edge cases (position at 0, near end, etc.)

## Solution Design

### Approach: Load Saved Position on Episode Load

**Strategy**: Fetch the saved position from the backend API when the episode loads, then automatically seek the video player to that position.

**Implementation Flow:**
```
1. User navigates to /watch/:animeId?season=X&episode=Y
2. WatchView calls loadEpisode()
3. loadEpisode() calls playerStore.loadEpisode()
4. After episode data loads, fetch saved position via history API
5. If saved position > 0, seek video player to that position
6. Show toast notification: "Resuming from X:YY"
```

**Code Changes Required:**

1. **Add saved position fetching in WatchView.vue:**
```typescript
async function loadEpisode() {
  loading.value = true
  error.value = null

  try {
    // ... existing episode loading code ...

    const data = playerStore.currentEpisodeData
    if (data) {
      // Fetch saved position from backend
      const savedPosition = await historyStore.getLastPosition(
        animeId.value,
        data.season,
        data.episode
      )

      // Initialize player and seek to saved position
      if (!useIframePlayer.value && videoUrl.value && player) {
        player.source = {
          type: 'video',
          sources: [{ src: videoUrl.value, type: 'video/mp4' }]
        }

        // Seek to saved position if it exists and is valid
        if (savedPosition && savedPosition > 0) {
          const resumeTime = savedPosition

          // Wait for player to be ready before seeking
          setTimeout(() => {
            if (player) {
              player.currentTime = resumeTime
              // Show toast notification
              uiStore.showNotification(
                `Resume from ${formatTime(resumeTime)}`,
                'info'
              )
            }
          }, 1000)
        }
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load episode'
  } finally {
    loading.value = false
  }
}
```

2. **Add getLastPosition method to history store:**
```typescript
// In stores/history.ts
async function getLastPosition(
  animeId: string,
  season: number,
  episode: number
): Promise<number | null> {
  try {
    const response = await api.get(`/last-position/${animeId}/${season}/${episode}`)
    return response.data?.position || null
  } catch (err) {
    console.error('Failed to get last position:', err)
    return null
  }
}
```

3. **Handle edge cases:**
```typescript
// Don't auto-resume if position is at the very beginning
if (savedPosition < 5) {
  return  // Consider it a new episode
}

// Don't auto-resume if position is near the end (completed)
if (savedPosition >= duration - 30) {
  return  // Consider it completed
}
```

## Per-Episode Progress Storage

**Backend Key Format:**
```typescript
const key = `${animeId}_${season}_${episode}`
// Example: "5998_1_14"
```

**Current Implementation (Already Correct):**
- Backend already uses this key format in `data/proxy/watch-history.json`
- `historyStore.savePosition()` already calls the correct API endpoint
- The storage structure is already correct

**No changes needed** - the backend storage is already properly implemented.

## Cross-Device Synchronization

**How It Works:**
1. User A watches episode 5998_1_14 on Desktop, stops at 5:30
2. Frontend saves position to backend API: `POST /api/last-position`
3. Backend writes to `data/proxy/watch-history.json`
4. User A opens episode 5998_1_14 on Mobile
5. Frontend fetches from backend API: `GET /api/last-position/5998/1/14`
6. Backend reads from `data/proxy/watch-history.json`
7. Frontend receives saved position (330 seconds)
8. Video player seeks to 5:30 and shows toast: "Resuming from 5:30"

**Data Flow:**
```
Desktop              Backend               Mobile
    |                    |                    |
    | POST /last-position|                    |
    |------------------->|                    |
    |   { position: 330 } |                    |
    |                    | Write to JSON       |
    |                    |                    |
    |                    |                    | GET /last-position
    |                    |<-------------------|
    |                    | { position: 330 }   |
    |                    |------------------->|
    |                    |                    Seek to 5:30
```

## Toast Notification Design

**Show notification when:**
- Saved position is loaded successfully
- Position is > 5 seconds (not a new episode)
- Position is < duration - 30 seconds (not completed)

**Notification content:**
```typescript
const message = `继续播放: ${formatTime(resumeTime)}`
// Example: "继续播放: 5:30"

uiStore.showNotification(message, 'info', 3000)
```

**Edge cases:**
- Position at 0-5 seconds: Don't show notification (treat as new episode)
- Position near end: Don't auto-resume (treat as completed)
- Position fetch fails: Start from beginning, show error notification

## Testing Strategy

1. **Test auto-resume with valid position:**
   - Watch episode for 2 minutes
   - Navigate away
   - Navigate back to same episode
   - Verify: Player seeks to ~2:00
   - Verify: Toast notification shows "继续播放: 2:00"

2. **Test per-episode storage:**
   - Watch episode 1 for 5 minutes
   - Watch episode 2 for 2 minutes
   - Navigate to episode 1
   - Verify: Resumes at ~5:00
   - Navigate to episode 2
   - Verify: Resumes at ~2:00

3. **Test cross-device sync:**
   - Watch episode on Device A, save progress
   - Open same episode on Device B
   - Verify: Device B resumes from saved position

4. **Test edge cases:**
   - Position at 0: Should not auto-resume
   - Position at 2 seconds: Should not auto-resume
   - Position at end-10 seconds: Should not auto-resume (completed)
   - API failure: Should start from beginning with error notification

## Risk Assessment

- **Low Risk**: Auto-resume functionality is a pure enhancement
- **Low Risk**: Backend storage already works correctly
- **Medium Risk**: Toast notification timing (need to test UX)
- **Low Risk**: Edge case handling (position at 0, near end)

## Dependencies

- Existing backend API: `GET /api/last-position/:animeId/:season/:episode`
- Existing history store methods
- Existing UI store notification system
- No new backend endpoints required
