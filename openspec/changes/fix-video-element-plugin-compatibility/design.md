# Design: Video Element Plugin Compatibility Fix

## Context

The video player uses **Plyr** to wrap the native `<video>` element for UI customization. The current architecture destroys and recreates the entire WatchView component (including the video element and Plyr instance) on every episode navigation.

**Current Flow:**
```
Episode 1 → Click Next → Episode 2
  ↓              ↓            ↓
Create      Destroy      Create New
Component    Component    Component
  ↓              ↓            ↓
Create      Destroy      Create New
Video        Video        Video
  ↓              ↓            ↓
Create      Destroy      Create New
Plyr        Plyr         Plyr
```

**Problem:** Browser plugins attach event listeners to the video element. When the element is destroyed, those listeners are lost.

**Stakeholders:**
- Users relying on browser plugins for video control (keyboard shortcuts, accessibility)
- Users with screen readers or assistive technology
- Users with custom browser extensions

## Goals / Non-Goals

**Goals:**
- Allow the video element to persist across episode navigation
- Enable plugins to maintain event listeners
- Minimize changes to existing architecture
- Preserve all existing functionality

**Non-Goals:**
- Changing Plyr's DOM structure (still needed for UI)
- Breaking existing watch history or progress tracking
- Affecting other pages' navigation behavior

## Decisions

### Decision 1: Component Persistence via Conditional Key (CHOSEN)

**What**: Change App.vue router-view key to use `route.path` for WatchView, `route.fullPath` for others.

```vue
<!-- App.vue -->
<component
  :is="Component"
  :key="route.name === 'Watch' ? route.path : route.fullPath"
/>
```

**Why**:
- `route.path` = `/watch/123` (stable across episodes)
- `route.fullPath` = `/watch/123?episode=1` (changes each episode)
- Component persists when only query parameters change
- Component properly recreates when navigating to different routes

**Trade-offs:**
- ✅ Minimal code change (single line)
- ✅ Other pages unaffected
- ⚠️ Component lifecycle changes - need to handle state updates manually
- ⚠️ Existing watchers for route.query still fire, need to ensure they work correctly

### Decision 2: Remove v-if from Video Element (CHOSEN)

**What**: Remove `v-if="videoUrl"` from the video element template.

```vue
<!-- Before -->
<video v-if="videoUrl" ref="videoElement">
  <source :src="videoUrl" />
</video>

<!-- After -->
<video ref="videoElement">
  <source :src="videoUrl || ''" />
</video>
```

**Why**:
- `v-if` destroys and recreates the element when `videoUrl` changes
- Even with component persistence, the video element would still be destroyed
- Removing `v-if` ensures the element remains in DOM
- Empty source (`src=""`) is harmless when no URL is available

**Trade-offs:**
- ✅ Video element stays in DOM
- ✅ Simpler template logic
- ⚠️ Element exists even when no video is loading (minor, acceptable)

### Decision 3: Update Source Instead of Recreating Player (CHOSEN)

**What**: When `videoUrl` changes, update the native video element's `src` attribute instead of recreating Plyr.

```javascript
watch(videoUrl, (newUrl) => {
  if (newUrl && player && videoElement.value) {
    const video = videoElement.value
    video.src = newUrl
    video.load()
  }
})
```

**Why**:
- Plyr wraps the native video element
- Changing the underlying video's src is sufficient
- Plyr adapts to the new source automatically
- Preserves Plyr instance and its event listeners

**Trade-offs:**
- ✅ Plyr instance persists
- ✅ Player settings preserved (volume, speed, etc.)
- ✅ Plugin listeners persist
- ⚠️ Need to ensure Plyr handles src changes correctly (tested, works)

### Decision 4: Simplify Plyr Initialization (CHOSEN)

**What**: Consolidate three separate watchers into single initialization in `onMounted`.

**Current (Complex):**
- `watch(videoElement)` - initializes when ref is set
- `watch(useIframePlayer)` - initializes when computed value changes
- `watch(videoUrl)` - initializes when URL is loaded

**New (Simple):**
- Single `watch(useIframePlayer)` in `onMounted`
- Initialize Plyr once when component mounts and conditions are met
- Destroy only when component unmounts

**Why**:
- Three competing watchers create race conditions
- Component persistence means we only initialize once
- Simpler code is easier to maintain
- Single initialization path is more predictable

## Architecture

### Component Lifecycle (New)

```
┌─────────────────────────────────────────┐
│ Initial Load: /watch/123?episode=1      │
├─────────────────────────────────────────┤
│ 1. Component mounts (onMounted)         │
│ 2. Video element created (no v-if)      │
│ 3. loadEpisode() → videoUrl = "ep1"     │
│ 4. useIframePlayer watcher triggers     │
│ 5. initializePlyr() → player created    │
│ 6. Video plays episode 1                │
└─────────────────────────────────────────┘
              ↓ User clicks "Next"
┌─────────────────────────────────────────┐
│ Navigate: /watch/123?episode=2          │
├─────────────────────────────────────────┤
│ 1. route.query watcher triggers         │
│ 2. loadEpisode() → videoUrl = "ep2"     │
│ 3. videoUrl watcher triggers            │
│ 4. Update video.src = "ep2"             │
│ 5. video.load()                         │
│ 6. Video plays episode 2                │
│    ✅ Component still exists            │
│    ✅ Video element same instance       │
│    ✅ Plyr instance same instance       │
└─────────────────────────────────────────┘
              ↓ User clicks "Home"
┌─────────────────────────────────────────┐
│ Navigate: / (different route.path)      │
├─────────────────────────────────────────┤
│ 1. route.path changes                   │
│ 2. Component key changes                │
│ 3. WatchView destroyed (onUnmounted)    │
│ 4. player.destroy() called              │
│ 5. Video element removed from DOM       │
└─────────────────────────────────────────┘
```

### State Management

**State that updates on episode change:**
- `episode` (ref)
- `season` (ref)
- `videoUrl` (computed)
- `episodeTitle` (computed)
- `currentTime` (ref) - reset to 0

**State that persists across episodes:**
- `player` (let) - Plyr instance
- `videoElement` (ref) - DOM element reference
- Player settings (volume, speed, etc. in Plyr)

**Watchers that trigger on episode change:**
```javascript
// route.query watcher (existing)
watch(() => route.query, () => {
  season.value = Number(route.query.season) || 1
  episode.value = Number(route.query.episode) || 1
  loadEpisode()  // This updates videoUrl
})

// New: videoUrl watcher updates source
watch(videoUrl, (newUrl) => {
  if (newUrl && player && videoElement.value) {
    videoElement.value.src = newUrl
    videoElement.value.load()
  }
})
```

## Risks / Trade-offs

### Risk 1: v-else Container Destruction (CRITICAL)

**Risk**: The current template uses `<iframe v-if="useIframePlayer">` and `<div v-else id="plyr-player">`. The `v-else` directive causes the entire plyr-player container to be destroyed when useIframePlayer changes, even if we remove `v-if` from the video element itself.

**Impact**: Video element and all plugin listeners are lost when switching between iframe and Plyr modes.

**Mitigation**:
- Change `v-else` to independent `v-if="!useIframePlayer"`
- This ensures both containers can coexist and switching is controlled by their own v-if
- Template should be:
```vue
<iframe v-if="useIframePlayer" ...></iframe>
<div v-if="!useIframePlayer" id="plyr-player">
  <video ref="videoElement" ...></video>
</div>
```

### Risk 2: Multiple Initialization Watchers (CRITICAL)

**Risk**: Current code has three watchers that can initialize Plyr:
- `watch(videoElement)` - initializes when ref is set
- `watch(useIframePlayer)` - initializes when computed value changes
- `watch(videoUrl)` - initializes when URL is loaded

All have `!player` check, but with component persistence, these watchers remain active and could cause race conditions if player becomes null unexpectedly.

**Impact**: Unpredictable initialization timing, potential multiple Plyr instances.

**Mitigation**:
- Remove `watch(videoElement)` watcher entirely
- Remove `watch(videoUrl)` initialization watcher (keep only the src-update watcher)
- Keep only `watch(useIframePlayer)` for initial Plyr creation
- Add guard to prevent re-initialization

### Risk 3: Race Condition on Rapid Navigation

**Risk**: User clicking "下一集" multiple times rapidly triggers:
- Multiple `route.query` watcher firings
- Multiple concurrent `loadEpisode()` calls
- Multiple async API requests
- Final state may not match the last click

**Impact**: Wrong episode loads, inconsistent state.

**Mitigation**:
```javascript
let isLoadingEpisode = false

async function loadEpisode() {
  if (isLoadingEpisode) {
    console.log('⏸️ Episode load already in progress, skipping')
    return
  }
  isLoadingEpisode = true
  try {
    // ... existing logic
  } finally {
    isLoadingEpisode = false
  }
}
```

### Risk 4: State Not Resetting Properly

**Risk**: Component state from previous episode might leak into next episode.

**Mitigation**:
- Explicitly reset `currentTime.value = 0` when videoUrl changes
- Ensure `duration` updates from new video's metadata
- Clear any episode-specific caches
- Test all features after multiple episode navigations

### Risk 5: URL Refresh Timer Not Cleared

**Risk**: `scheduleUrlRefresh()` sets a timeout. When videoUrl changes, the old timeout remains active and may trigger for the wrong episode.

**Impact**: Wrong URL refreshed, potential errors.

**Mitigation**:
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (oldUrl && refreshUrlTimeout) {
    clearTimeout(refreshUrlTimeout)
    refreshUrlTimeout = null
  }
  // ... update src
  // Note: New timer will be set in Plyr 'ready' event
})
```

### Risk 6: Plyr Event Listeners Firing on Src Change

**Risk**: When video.src changes, Plyr events fire again:
- `ready` event triggers
- `loadedmetadata` event triggers
- `timeupdate` event triggers

**Impact**:
- `savedPositionForResume` might be applied to wrong episode
- Progress saving might start from wrong position
- Duplicate event handlers

**Mitigation**:
- Clear `savedPositionForResume` after using it
- Add episode identifier to saved position
- Check episode number before restoring position

### Risk 7: Auto-play Triggering Unexpectedly

**Risk**: Changing src might trigger auto-play when user doesn't expect it (browser-dependent behavior).

**Mitigation**:
- Don't call `player.play()` in the src-update watcher
- Let user manually play, or respect existing auto-play setting
- Test auto-play behavior across browsers

### Risk 8: Mode Switching (iframe ↔ Plyr)

**Risk**: When `useIframePlayer` changes between episodes:
- Plyr → iframe: Plyr instance not destroyed, memory leak
- iframe → Plyr: New Plyr instance created, old iframe remains

**Impact**: Memory leaks, duplicate players, unpredictable behavior.

**Mitigation**:
```javascript
watch(useIframePlayer, (newValue, oldValue) => {
  // From Plyr to iframe: destroy Plyr
  if (oldValue === false && newValue === true && player) {
    player.destroy()
    player = null
  }
  // From iframe to Plyr: initialize Plyr
  if (oldValue === true && newValue === false && !player && videoElement.value) {
    initializePlyr()
  }
})
```

### Risk 9: Empty Video Element Styling

**Risk**: Removing `v-if="videoUrl"` means video element exists in DOM even when no URL is loaded. May have default dimensions or visual artifacts.

**Impact**: Visual issues during loading state.

**Mitigation**:
- Add CSS to hide or style empty video element
- Use `:src="videoUrl || ''"` to provide empty fallback
- Ensure loading overlay covers video area

### Risk 10: First Load vs Subsequent Loads

**Risk**: The videoUrl watcher needs to distinguish between:
- First load (oldUrl is undefined) - let existing initialization handle it
- Subsequent loads (oldUrl exists) - update src

**Impact**: Incorrect initialization logic, race conditions.

**Mitigation**:
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  // Skip first load - let existing initialization handle it
  if (!oldUrl || !newUrl || !player || !videoElement.value) {
    return
  }
  // Handle subsequent loads - update src
  // ...
})
```

### Risk 11: Memory Leaks from Persistent Component

**Risk**: Component staying in memory longer than before could accumulate:
- Detached DOM elements
- Unremoved event listeners
- Uncleared timers

**Impact**: Memory usage grows over time, browser slows down.

**Mitigation**:
- Ensure all event listeners are removed in onUnmounted
- Clear all timers (saveInterval, refreshUrlTimeout)
- Test with Chrome DevTools Memory profiler after 10+ episodes

### Risk 12: Route Name Change

**Risk**: If route name changes from 'Watch' to something else, conditional key breaks.

**Mitigation**:
- Route names are stable in this codebase
- Alternative: use path matching `route.path.startsWith('/watch/')`
- Add runtime check: `console.assert(route.name === 'Watch', 'Unexpected route name')`

## Implementation Pitfalls

### Pitfall 1: Forgetting oldUrl Check

**Wrong**:
```javascript
watch(videoUrl, (newUrl) => {
  videoElement.value.src = newUrl  // Fires on first load too!
})
```

**Correct**:
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl) return  // Skip first load
  videoElement.value.src = newUrl
})
```

### Pitfall 2: Not Resetting currentTime

**Wrong**:
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  videoElement.value.src = newUrl
  videoElement.value.load()
  // currentTime still has old value!
})
```

**Correct**:
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl) return
  currentTime.value = 0  // Reset position
  videoElement.value.src = newUrl
  videoElement.value.load()
})
```

### Pitfall 3: Calling player.play() Unconditionally

**Wrong**:
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  // ...
  player.play()  // Always auto-plays!
})
```

**Correct**:
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  // ...
  // Don't auto-play, let user decide or respect onVideoEnd
})
```

### Pitfall 4: Not Handling iframe Mode

**Wrong**:
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl) return
  videoElement.value.src = newUrl  // Error if in iframe mode!
})
```

**Correct**:
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl || useIframePlayer.value || !player || !videoElement.value) {
    return
  }
  videoElement.value.src = newUrl
})
```

## Testing Checklist

### Critical Path Testing:
- [ ] Video element persists (verify with `===` operator)
- [ ] Plugin listeners persist across episodes
- [ ] No memory leaks after 10+ episodes
- [ ] Rapid clicking (3+ times) doesn't break state
- [ ] iframe ↔ Plyr mode switching works correctly

### Edge Cases:
- [ ] Navigate while video is playing
- [ ] Navigate while video is paused
- [ ] Navigate while video is buffering
- [ ] Navigate with auto-play enabled
- [ ] Navigate with auto-play disabled
- [ ] Direct URL access to episode 5, then navigate to 6
- [ ] Browser back/forward after multiple episodes

### Regression Testing:
- [ ] Watch progress saves and restores correctly
- [ ] URL refresh timer works for new episode
- [ ] All Plyr controls function correctly
- [ ] Keyboard shortcuts still work
- [ ] Other routes (Home, History) unaffected

## Migration Plan

### Phase 1: Template Changes (REQUIRED)
1. Modify App.vue router-view key (single line)
2. Remove v-if from video element in WatchView.vue
3. Update videoUrl watcher to update src instead of initializing Plyr

### Phase 2: Simplify Initialization (REQUIRED)
1. Remove redundant watchers (videoElement, videoUrl for initialization)
2. Keep only useIframePlayer watcher for initial Plyr creation
3. Ensure Plyr initializes only once

### Phase 3: Testing (REQUIRED)
1. Test element persistence across episodes
2. Test plugin compatibility
3. Test all navigation scenarios
4. Regression test existing features

### Phase 4: Validation (REQUIRED)
1. Run automated tests
2. Manual testing in browser
3. Test with real browser plugins

**Rollback**: Revert all changes if critical issues arise (single git revert).

## Open Questions

1. **Q**: Should we reset player settings (volume, speed) between episodes?
   - **A**: No, let them persist for better UX.

2. **Q**: What happens if user navigates to different anime?
   - **A**: Route path changes (`/watch/123` → `/watch/456`), component recreates, clean slate.

3. **Q**: Should we auto-play new episode after src update?
   - **A**: Respect user's auto-play preference (checkbox setting).

4. **Q**: Will Plyr's event listeners fire correctly after src change?
   - **A**: Yes, Plyr handles src changes, all events fire normally.
