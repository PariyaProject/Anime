# Implementation Tasks: Fix Video Element Plugin Compatibility

## Pre-Implementation Checklist (READ BEFORE STARTING)

**Critical Understanding Points:**
- [x] I understand that `v-else` causes container destruction and must be changed to `v-if="!useIframePlayer"`
- [x] I understand that the videoUrl watcher must check `oldUrl` to skip first load
- [x] I understand that `currentTime` must be reset to 0 when src changes
- [x] I understand that `refreshUrlTimeout` must be cleared before updating src
- [x] I understand that the watcher must NOT call `player.play()`
- [x] I understand that `isLoadingEpisode` guard is required to prevent race conditions
- [x] I understand that mode switching (iframe ↔ Plyr) requires special handling
- [x] I have read the "Risks / Trade-offs" section in design.md
- [x] I have read the "Implementation Pitfalls" section in design.md

**Code Template for videoUrl Watcher:**
```javascript
// CORRECT implementation - use this as reference
watch(videoUrl, (newUrl, oldUrl) => {
  // Skip: first load, iframe mode, player not ready, no new URL
  if (!oldUrl || !newUrl || useIframePlayer.value || !player || !videoElement.value) {
    return
  }

  console.log('🔄 Updating video source:', oldUrl?.substring(0, 30), '→', newUrl.substring(0, 30))

  // Reset state
  currentTime.value = 0

  // Clear old refresh timer
  if (refreshUrlTimeout) {
    clearTimeout(refreshUrlTimeout)
    refreshUrlTimeout = null
  }

  // Update source
  videoElement.value.src = newUrl
  videoElement.value.load()

  // DO NOT call player.play() here
})
```

---

## 1. Core Implementation (REQUIRED)

- [x] 1.1 Modify App.vue router-view key binding
  - Change `<component :is="Component" :key="route.fullPath" />` to use conditional key
  - Use `route.name === 'Watch' ? route.path : route.fullPath` for the key
  - **File**: `cycani-proxy/frontend/src/App.vue:10`

- [x] 1.2 CRITICAL: Change v-else to v-if in WatchView.vue template
  - Change `<div v-else id="plyr-player">` to `<div v-if="!useIframePlayer" id="plyr-player">`
  - This prevents container destruction when switching between iframe and Plyr modes
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue:29`

- [x] 1.3 Remove v-if from video element
  - Change `<video v-if="videoUrl">` to `<video>`
  - Update source binding to `<source :src="videoUrl || ''" />`
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue:30-39`

- [x] 1.4 Add loading guard to prevent race conditions
  - Add `let isLoadingEpisode = false` flag
  - Modify `loadEpisode()` to check and set this flag
  - Return early if already loading to prevent concurrent requests
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue:293`

- [x] 1.5 Add videoUrl watcher to update source
  - Create new watcher that monitors videoUrl changes
  - **CRITICAL**: Check `oldUrl` to skip first load (let existing initialization handle it)
  - **CRITICAL**: Check `!useIframePlayer.value` to skip iframe mode
  - **CRITICAL**: Check `player` exists to avoid errors
  - When all conditions met: reset currentTime, update video.src, call video.load()
  - **CRITICAL**: Clear old refreshUrlTimeout before updating src
  - **DO NOT** call player.play() - let user manually play or respect onVideoEnd
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue` (new watcher after existing watchers)

- [x] 1.6 Remove redundant Plyr initialization watchers
  - Remove `watch(videoElement)` watcher (lines ~888-896)
  - Remove `watch(videoUrl)` initialization watcher (lines ~918-936)
  - Keep only `watch(useIframePlayer)` for initial initialization
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue:888-936`

- [x] 1.7 Add useIframePlayer watcher to handle mode switching
  - Watch for changes from Plyr → iframe: destroy player, set player = null
  - Watch for changes from iframe → Plyr: call initializePlyr()
  - This prevents memory leaks when switching modes
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue:899`

- [x] 1.8 Verify Plyr initialization logic
  - Ensure Plyr initializes once when component mounts
  - Ensure Plyr doesn't reinitialize on episode changes
  - Add guard: `if (player) return` at start of initializePlyr()
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue:941`

- [x] 1.9 Update Plyr ready event handler
  - Check if saved position is for current episode before restoring
  - Clear savedPositionForResume after using it
  - Prevents restoring wrong episode's position
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue:1105-1120`

- [x] 1.10 Handle empty video element styling
  - Add CSS to ensure empty video element doesn't show visual artifacts
  - Ensure loading overlay properly covers video area
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue` (CSS section)

## 2. Player Mode Selection Feature (REQUIRED)

- [x] 2.1 Add playerModePreference to uiStore
  - Add `playerModePreference: 'plyr' | 'iframe' | 'hybrid'` to uiStore state
  - Default value: `'plyr'` (ensures plugin compatibility by default)
  - **File**: `cycani-proxy/frontend/src/stores/ui.ts`

- [x] 2.2 Add player mode methods to uiStore
  - Add `setPlayerMode(mode: string)` method
  - Add `loadPlayerModePreference()` method to load from localStorage
  - Call `localStorage.setItem('playerModePreference', mode)` in setPlayerMode
  - Call `loadPlayerModePreference()` in store initialization
  - **File**: `cycani-proxy/frontend/src/stores/ui.ts`

- [x] 2.3 Update useIframePlayer computed logic
  - Modify to respect user's playerModePreference
  - **Plyr 模式**: Always return false (use Plyr)
  - **iframe 模式**: Return true only for player.cycanime.com URLs
  - **混合模式**: Keep existing logic (auto-select based on URL type)
  - **File**: `cycani-proxy/frontend/src/views/WatchView.vue:172`

- [x] 2.4 Add settings menu item in AppNavbar
  - Add "播放器设置" (Player Settings) option to settings dropdown (⚙️ menu)
  - Options: "Plyr 模式 (插件优先)", "iframe 模式 (兼容)", "混合模式 (自动)"
  - Display current selection with checkmark or radio button
  - **File**: `cycani-proxy/frontend/src/components/layout/AppNavbar.vue`

- [x] 2.5 Handle player mode switching
  - When user selects a new mode, call `uiStore.setPlayerMode(mode)`
  - If currently on watch page, reload current episode to apply new mode
  - Show notification: "播放器模式已切换到 {mode}"
  - **File**: `cycani-proxy/frontend/src/components/layout/AppNavbar.vue`

- [x] 2.6 Add tooltip/help text for player modes
  - Plyr 模式: "支持浏览器插件，推荐使用"
  - iframe 模式: "兼容性最佳，不支持插件"
  - 混合模式: "根据视频类型自动选择"
  - Display as subtitle or help icon (?) next to each option
  - **File**: `cycani-proxy/frontend/src/components/layout/AppNavbar.vue`

- [x] 2.7 Load player mode preference on app startup
  - Call `uiStore.loadPlayerModePreference()` in App.vue `onMounted` or store initialization
  - Ensure preference is loaded before any video renders
  - **File**: `cycani-proxy/frontend/src/App.vue` or `cycani-proxy/frontend/src/stores/ui.ts`

- [ ] 2.8 Test player mode switching functionality
  - Switch between Plyr / iframe / hybrid modes
  - Verify mode persists across page reloads
  - Verify mode persists across episode navigations
  - Verify correct player is used for each mode

## 3. Plugin Compatibility Testing (REQUIRED)

- [ ] 3.1 Test element persistence across episode changes
  - Open browser DevTools Console
  - Run `const video1 = document.querySelector('video')`
  - Navigate to next episode
  - Run `const video2 = document.querySelector('video')`
  - Verify `video1 === video2` returns `true` (same element)

- [ ] 3.2 Test plugin event listeners persist
  - Attach custom event listener: `document.querySelector('video').addEventListener('play', () => console.log('Plugin: playing'))`
  - Navigate to next episode
  - Trigger video play
  - Verify console log still appears

- [ ] 3.3 Test with common browser extensions
  - Test keyboard shortcuts (Space for play/pause)
  - Test video control plugins (if available)
  - Test screen reader compatibility (if available)

- [ ] 3.4 Test plugin compatibility in each player mode
  - **Plyr 模式**: Verify plugins work fully
  - **iframe 模式**: Verify plugins cannot access video (expected limitation)
  - **混合模式**: Verify plugins work for cycani- IDs, fail for player.cycanime.com URLs

## 4. Navigation Testing (REQUIRED)

- [ ] 4.1 Test episode navigation
  - Click "下一集" button
  - Verify new episode loads without page reload
  - Verify video plays correctly
  - Verify watch position saves

- [ ] 4.2 Test browser back/forward buttons
  - Navigate through multiple episodes
  - Use browser back button
  - Verify correct episode loads
  - Use browser forward button
  - Verify correct episode loads

- [ ] 4.3 Test direct URL access
  - Navigate directly to `/watch/123?season=1&episode=5`
  - Verify correct episode loads
  - Change URL manually to `episode=6` and press Enter
  - Verify episode 6 loads

- [ ] 4.4 Test normal navigation between routes
  - Navigate home → watch → history → watch
  - Verify each page loads correctly
  - Verify no console errors
  - Verify component properly recreates when route name changes

- [ ] 4.5 Test navigation between different anime
  - Watch episode 1 of anime A
  - Navigate to anime B
  - Verify component recreates (different route.path)
  - Verify clean state for new anime

## 5. Regression Testing (REQUIRED)

- [ ] 5.1 Test watch progress tracking
  - Play video for 30 seconds
  - Navigate to next episode
  - Navigate back to previous episode
  - Verify position was saved and restored

- [ ] 5.2 Test Plyr controls
  - Test play/pause button
  - Test seek bar
  - Test volume controls
  - Test fullscreen
  - Verify all controls work correctly

- [ ] 5.3 Test iframe player
  - Test with URL that requires iframe player
  - Verify iframe loads correctly
  - Verify video plays

- [ ] 5.4 Test other pages unaffected
  - Test HomeView navigation and filtering
  - Test HistoryView loading
  - Verify query parameter-based features still work (search, pagination)

- [ ] 5.5 Test player settings persist
  - Set volume to 50%
  - Change playback speed to 1.5x
  - Navigate to next episode
  - Verify settings are preserved

## 6. State Management Testing (REQUIRED)

- [ ] 6.1 Verify episode-specific state resets
  - Play episode 1 to 50% progress
  - Navigate to episode 2
  - Verify currentTime starts at 0
  - Verify duration updates to new episode's duration

- [ ] 6.2 Verify auto-play behavior
  - Enable auto-play checkbox
  - Wait for episode to end
  - Verify next episode auto-plays
  - Disable auto-play checkbox
  - Verify next episode does NOT auto-play

- [ ] 6.3 Test loading state
  - Navigate to a new episode
  - Verify loading indicator shows
  - Verify video loads successfully
  - Test with slow network (DevTools throttling)

## 7. Memory & Performance Testing (REQUIRED)

- [ ] 7.1 Check for memory leaks
  - Open Chrome DevTools Memory profiler
  - Navigate through 10+ episodes
  - Take heap snapshot
  - Verify no detached DOM elements
  - Verify memory usage is stable

- [ ] 7.2 Monitor console logs
  - Look for any Vue warnings about duplicate component instances
  - Look for any Plyr initialization errors
  - Verify no unexpected errors

- [ ] 7.3 Performance comparison
  - Measure episode switch time before/after change
  - Verify switching is faster or same speed
  - Verify no visible jank or lag

## 8. Edge Cases (REQUIRED)

- [ ] 8.1 Test rapid episode switching (CRITICAL)
  - Click "下一集" multiple times rapidly (3+ times)
  - Verify isLoadingEpisode guard prevents concurrent requests
  - Verify final episode loads correctly (not first or middle one)
  - Verify no errors or crashes

- [ ] 8.2 Test navigation during video playback
  - Start playing episode 1
  - Immediately click "下一集"
  - Verify episode 2 loads and plays
  - Verify no audio from both videos (no overlap)
  - Verify currentTime resets to 0

- [ ] 8.3 Test navigation during video pause
  - Pause episode 1 at 50%
  - Click "下一集"
  - Verify episode 2 starts from 0 (not 50%)
  - Verify episode 2 is paused (not auto-playing)

- [ ] 8.4 Test with different video durations
  - Play episode with 10min duration
  - Navigate to episode with 24min duration
  - Verify duration updates correctly
  - Verify progress bar recalculates
  - Verify currentTime is 0 for new episode

- [ ] 8.5 Test player mode switching during playback
  - Start playing in Plyr mode
  - Switch to iframe mode via settings
  - Verify player reloads with new mode
  - Verify no memory leaks or errors

- [ ] 8.6 Test iframe ↔ Plyr mode switching
  - Start with Plyr mode (cycani- URL)
  - Navigate to iframe mode (player.cycanime.com URL)
  - Verify Plyr is destroyed
  - Verify iframe loads correctly
  - Navigate back to Plyr mode
  - Verify Plyr is re-initialized
  - Verify no memory leaks (check console)

- [ ] 8.7 Test error recovery
  - Navigate to episode that fails to load
  - Verify error message displays
  - Navigate to working episode
  - Verify video plays correctly
  - Verify no stale state from failed episode

- [ ] 8.8 Test URL refresh behavior across episodes
  - Start episode 1, wait for URL refresh timer to be scheduled
  - Navigate to episode 2 before timer fires
  - Verify episode 1's timer is cleared
  - Verify episode 2's timer is scheduled correctly
  - Verify no "wrong URL refreshed" errors

- [ ] 8.9 Test browser back/forward after multiple episodes
  - Navigate through episodes 1 → 2 → 3 → 4
  - Use browser back button multiple times
  - Verify each episode loads correctly
  - Verify video element persists (same instance)
  - Verify no memory accumulation

- [ ] 8.10 Test direct URL access after navigation
  - Navigate from episode 1 to 2 via "下一集" button
  - Type direct URL for episode 5 in address bar
  - Verify episode 5 loads correctly
  - Verify component persists (same instance)
  - Verify currentTime is 0

## 9. Documentation (OPTIONAL)

- [ ] 9.1 Update code comments
  - Document why WatchView uses conditional key
  - Add comment explaining component persistence behavior
  - Document videoUrl watcher purpose
  - Document player mode preference logic

- [ ] 9.2 Update CLAUDE.md if needed
  - Document router-view key behavior
  - Document plugin compatibility approach
  - Document player mode selection feature
