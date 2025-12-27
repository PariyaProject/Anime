# Change: Fix Video Player Progress Bar Not Updating

## Why

The video player progress bar on the WatchView page does not update during video playback. Although the progress bar component exists in the UI (lines 178-198 in WatchView.vue), it remains static at 0% and does not reflect the actual video playback progress.

**Root Cause Analysis:**

1. **Iframe Player Cross-Origin Restriction**: When using the iframe player (for `player.cycanime.com` URLs), there is NO communication mechanism between the iframe and the parent Vue application. The browser's same-origin policy prevents the parent window from accessing iframe content.

2. **Disconnected Player State Management**:
   - The `playerStore` has `updateTime()` and `updateDuration()` methods (lines 52-58 in `player.ts`)
   - These methods are NEVER called from `WatchView.vue`
   - The local refs (`currentTime`, `duration`) in WatchView only receive updates from the Plyr player's `timeupdate` event

3. **Plyr Player Works But Limited**: The Plyr player (for direct video URLs) DOES update the progress bar via the `timeupdate` event handler (lines 576-580 in WatchView.vue), but this only works for direct MP4 URLs, not for the primary use case of `player.cycanime.com` URLs.

**Impact:**
- Users cannot see their current playback position
- The "0:00 / 0:00" time display provides no useful information
- Watch history position saving works (via `savePosition()`), but users have no visual feedback
- **No auto-resume**: When reopening an episode, playback always starts from the beginning instead of continuing from the last position
- **No cross-device sync**: Progress saved on one device is not automatically available on other devices

## What Changes

- **Implement Plyr Player for cycani- Video IDs**: Modify the player selection logic to use Plyr player for `cycani-` prefixed video IDs instead of iframe, enabling progress tracking
- **Connect Player State to Store**: Update WatchView.vue to call `playerStore.updateTime()` and `playerStore.updateDuration()` in the Plyr `timeupdate` event handler
- **Auto-Resume Playback**: Load saved playback position on page load and automatically seek to that position for seamless continuation
- **Per-Episode Progress Storage**: Ensure each episode's progress is stored independently with proper key format (`animeId_season_episode`)
- **Cross-Device Synchronization**: Leverage existing backend storage to enable progress syncing across devices

## Impact

- **Affected specs**:
  - `video-player` (MODIFIED - add progress tracking requirements)
- **Affected code**:
  - `cycani-proxy/frontend/src/views/WatchView.vue:248-284` (player selection logic)
  - `cycani-proxy/frontend/src/views/WatchView.vue:293-294` (local refs for currentTime/duration)
  - `cycani-proxy/frontend/src/views/WatchView.vue:576-580` (Plyr timeupdate event handler)
  - `cycani-proxy/frontend/src/stores/player.ts:52-58` (unused updateTime/updateDuration methods)

## Technical Context

**Current Implementation (Broken):**
```
useIframePlayer = true (for cycani- IDs)
→ iframe loads player.cycanime.com
→ NO cross-origin communication possible
→ Progress bar stays at 0%
```

**Proposed Fix:**
```
useIframePlayer = false (for cycani- IDs)
→ Use Plyr player with direct video URL
→ Plyr timeupdate event updates local refs
→ Progress bar displays correctly
→ (Optional: Also update playerStore for consistency)
```

**Current Player Selection Logic (WatchView.vue:248-255):**
```typescript
const useIframePlayer = computed(() => {
  const url = playerStore.currentEpisodeData?.realVideoUrl
  if (!url) return false
  // Only use iframe for player.cycanime.com URLs, NOT for cycani- IDs
  return url.includes('player.cycanime.com')
})
```

**Problem**: When `realVideoUrl` is a `cycani-` ID (e.g., `cycani-dcd01-7c0057fe4756658131a29301cfc4cf0f1754962525`), the `playerUrl` computed property constructs a `player.cycanime.com` URL (lines 258-276), which makes `useIframePlayer` return `true`, thus using the iframe player instead of Plyr.

**Solution**: Modify the logic so that `cycani-` IDs use Plyr player directly, avoiding the iframe entirely.

## Dependencies

- Existing Plyr player integration (already implemented)
- Existing player store with updateTime/updateDuration methods (already implemented but unused)
- No new external dependencies required

## Success Criteria

- Progress bar updates in real-time during video playback
- Time display shows accurate current time and duration
- Works for both direct video URLs and cycani- video IDs
- **Auto-resume**: When opening an episode with saved progress, playback automatically seeks to the last position
- **Per-episode storage**: Each episode's progress is stored independently with proper key format
- **Cross-device sync**: Progress saved on one device is available when accessing from another device
- Existing functionality (video playback, autoplay, navigation) remains intact
- Watch history position saving continues to work correctly

## Additional Requirements

### Auto-Resume Functionality

**Current Behavior:**
- The `savePosition()` function (line 506-527 in WatchView.vue) saves progress to the backend every 30 seconds
- However, there is NO corresponding logic to load and apply the saved position on page load
- The route query parameter `startTime` exists (line 393) but is never populated from saved history

**Desired Behavior:**
- On page load, fetch the saved position from backend API `/api/last-position/:animeId/:season/:episode`
- If a saved position exists (> 0), automatically seek the video player to that position
- Display a toast notification: "Resuming from X:YY" to inform the user
- Handle edge cases: position at 0 (new episode), position near end (completed episode)

### Per-Episode Progress Storage

**Current Backend Storage Structure:**
```json
{
  "default": {
    "userId": "default",
    "lastPositions": {
      "5998_1_1": {  // animeId_season_episode
        "position": 245,
        "lastUpdated": "2025-12-21T09:00:00.000Z"
      }
    }
  }
}
```

**Required Behavior:**
- Each episode must have a unique key: `{animeId}_{season}_{episode}`
- When saving progress, use the correct key format
- When loading progress, query by the same key format
- Ensure no key collisions between different episodes

### Cross-Device Synchronization

**Current Implementation:**
- Backend already stores progress in `data/proxy/watch-history.json`
- Frontend already calls `historyStore.savePosition()` every 30 seconds
- Backend API already supports `/api/last-position` (GET) and `POST /api/last-position`

**Required Enhancement:**
- Add frontend logic to call GET `/api/last-position/:animeId/:season/:episode` on page load
- Parse the response and apply the saved position to the video player
- Ensure the API response includes position in seconds
