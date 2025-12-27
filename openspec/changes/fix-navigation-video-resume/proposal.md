# Change: Fix Video Player Not Resuming After Navigation

## Why

When users navigate from the watch page to the home page and then click "Continue Watching" to return, the video does not resume from the saved position. Instead, it starts from the beginning (0:00). The URL correctly updates, the backend API returns the correct saved position, but the Plyr player is not properly re-initialized after route navigation.

**Root Cause Analysis:**

1. **Vue Router Component Reuse**: When navigating between routes with the same component (WatchView), Vue Router reuses the component instance instead of destroying and recreating it. This is efficient but causes state synchronization issues.

2. **Race Condition in Route Watcher** (WatchView.vue:722-764):
   - The route watcher destroys the existing `player` instance (line 727-731)
   - Calls `loadEpisode()` which fetches the saved position
   - Attempts to re-initialize Plyr after `loadEpisode()` completes
   - However, the DOM may not be fully updated when `nextTick()` resolves, causing `videoElement.value` to be `null`

3. **Reactive Watchers Don't Fire**:
   - The `useIframePlayer` watcher (lines 683-700) and `videoUrl` watcher (lines 703-719) depend on reactive value changes
   - When navigating to the same anime/episode, these computed values don't change, so the watchers don't trigger
   - This leaves `player = null` without re-initialization

4. **Early Return in `initializePlyr()`**: Line 767 has `if (player) return`, which prevents re-initialization if called multiple times, but doesn't handle the case where `player` was just destroyed

**Impact:**
- Users lose their viewing progress when navigating back and forth
- The "Continue Watching" feature becomes unreliable
- Poor user experience as videos always restart from the beginning
- Watch history saves correctly, but resumption fails

## What Changes

- **Force Component Remount on Route Change**: Add a unique `key` attribute to the router-view based on route params, forcing Vue to destroy and recreate the WatchView component when navigating to different episodes
- **Alternative: Fix Route Watcher Timing**: If key-based approach is not used, improve the route watcher to properly wait for DOM updates before re-initializing Plyr, using a combination of `nextTick()` and `requestAnimationFrame()` to ensure the browser has painted the new DOM
- **Improve Player Re-initialization Logic**: Update `initializePlyr()` to handle re-initialization after destruction, removing the early return check or adding a force flag
- **Add Loading State During Re-initialization**: Show a loading indicator when the player is being re-initialized to provide visual feedback

## Impact

- **Affected specs**:
  - `video-player` (MODIFIED - add navigation handling requirements)
- **Affected code**:
  - `cycani-proxy/frontend/src/App.vue` (add key to router-view if using key approach)
  - `cycani-proxy/frontend/src/views/WatchView.vue:722-764` (route watcher)
  - `cycani-proxy/frontend/src/views/WatchView.vue:766-966` (initializePlyr function)

## Technical Context

**Current Implementation (Broken):**
```
User clicks "Continue Watching"
→ Vue Router reuses WatchView component
→ Route watcher triggers
→ Destroys player instance
→ Calls loadEpisode()
→ Attempts to re-initialize with nextTick()
→ DOM not ready, videoElement.value = null
→ Player remains null
→ Video doesn't play, or starts from 0:00
```

**Proposed Fix (Option 1 - Key-based):**
```
Add key to router-view in App.vue
<router-view :key="route.fullPath" />
→ Vue treats each route as unique component instance
→ Component is fully destroyed and recreated
→ onMounted() fires, fresh initialization
→ Saved position is loaded and applied correctly
```

**Proposed Fix (Option 2 - Improve Route Watcher):**
```
Route watcher triggers
→ Destroys player instance
→ Waits for DOM with nextTick() + requestAnimationFrame()
→ Verifies videoElement exists before calling initializePlyr()
→ Adds fallback retry logic if videoElement not ready
→ Player re-initializes successfully
→ Saved position is applied
```

## Dependencies

- Existing Plyr player integration
- Existing Vue Router configuration
- Existing saved position API
- No new external dependencies required

## Success Criteria

- Video resumes from saved position when navigating via "Continue Watching"
- Video resumes from saved position when navigating to the same episode from different sources
- No loss of playback progress during navigation
- Smooth user experience with appropriate loading indicators
- Existing functionality (video playback, autoplay, navigation) remains intact
- Works for both direct video URLs and cycani- video IDs

## Design Considerations

**Option 1: Key-based Component Re-creation**
- **Pros**: Simplest solution, guarantees clean state, leverages Vue's built-in component lifecycle
- **Cons**: Slightly less efficient (component destruction/creation vs reuse), may cause visible flicker during navigation
- **Best for**: When the component has complex state that's difficult to synchronize

**Option 2: Improve Route Watcher**
- **Pros**: Maintains Vue Router's component reuse optimization, no flicker during navigation
- **Cons**: More complex to implement correctly, requires careful timing management, may still have edge cases
- **Best for**: When performance is critical and component state is well-managed

**Recommendation**: Start with Option 1 (key-based) for reliability, then consider Option 2 if performance becomes an issue.
