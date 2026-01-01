# Change: Fix Video Element Plugin Compatibility

## Why

Users report that browser plugins (e.g., video control plugins, keyboard shortcuts, screen readers) cannot control video playback (play/pause/seek) after navigating between episodes.

**Root Cause:**
The current implementation destroys and recreates the entire WatchView component on every episode navigation due to `route.fullPath` being used as the router-view key:

```vue
<!-- App.vue:8 -->
<component :is="Component" :key="route.fullPath" />
```

When navigating from `/watch/123?season=1&episode=1` to `/watch/123?season=1&episode=2`:
1. `route.fullPath` changes (includes query parameters)
2. WatchView component is **destroyed**
3. Video element is **destroyed**
4. Plyr instance is **destroyed**
5. All plugin event listeners attached to the video element are **lost**

**Additional Issues:**
- The video element uses `v-if="videoUrl"`, causing the element to be destroyed and recreated even if the component persisted
- The template uses `v-else` on the Plyr container, which causes it to be destroyed when `useIframePlayer` changes

## Technical Investigation

### Discovery 1: v-else Container Destruction

During investigation, we discovered that the current template structure has a critical issue:

```vue
<!-- Current template structure -->
<iframe v-if="useIframePlayer" ...></iframe>
<div v-else id="plyr-player">
  <video v-if="videoUrl" ref="videoElement">...</video>
</div>
```

**Problem:** The `v-else` directive creates a dependency between the iframe and Plyr containers. When `useIframePlayer` changes:
- If switching from iframe to Plyr: The `<iframe>` is destroyed AND the `<div v-else>` is destroyed and recreated
- If switching from Plyr to iframe: The `<div v-else>` is destroyed AND the `<iframe>` is destroyed and recreated

**Impact:** Even if we keep the video element persistent by removing `v-if="videoUrl"`, the `v-else` causes the entire container (including the video element) to be destroyed and recreated.

**Solution:** Change `v-else` to independent `v-if="!useIframePlayer"`:

```vue
<!-- Fixed template structure -->
<iframe v-if="useIframePlayer" ...></iframe>
<div v-if="!useIframePlayer" id="plyr-player">
  <video ref="videoElement">...</video>
</div>
```

### Discovery 2: iframe Cross-Origin Restriction

**Critical Discovery:** Browser plugins **cannot access video elements inside cross-origin iframes** due to the Same-Origin Policy.

**Current Behavior:**
- Direct video URL (`.mp4`, `.m3u8`, etc.) → Plyr mode → Video in same origin → ✅ **Plugins work**
- `player.cycanime.com` URL or `cycani-` ID → iframe mode → Video in cross-origin iframe → ❌ **Plugins cannot work**

**Why This Happens:**
The iframe URL `https://player.cycanime.com/?url=...` is a different origin from the application domain. Browser security prevents:
- Accessing `iframe.contentWindow.document`
- Querying `iframe.querySelector('video')`
- Attaching event listeners to iframe's video element
- Any cross-origin DOM manipulation

**Backend Dependency:**
The backend attempts to decrypt `cycani-` IDs using Puppeteer to extract direct video URLs:
- **Success**: Returns direct video URL (e.g., `https://example.com/video.mp4`) → **Plugins work in Plyr/Hybrid mode**
- **Failure**: Returns `player.cycanime.com` URL as fallback → **Plugins cannot work (uses iframe)**

**Test Evidence:**
```javascript
// From same origin (works)
document.querySelector('video') // <video element>

// From cross-origin iframe (fails)
iframe.contentWindow.document.querySelector('video')
// Error: DOMException: Blocked a frame with origin "http://localhost:3000"
//        from accessing a cross-origin frame.
```

**Implication:** Plugin compatibility is **conditional** - it works in Plyr/Hybrid mode **only when backend successfully decrypts the video URL**. If backend decryption fails and falls back to iframe, plugins cannot work regardless of mode.

### Discovery 3: Multiple Competing Plyr Initialization Watchers

Current code has **three separate watchers** that can all initialize Plyr:

```javascript
// Watcher 1: videoElement ref
watch(videoElement, async (element) => {
  if (element && !player && !useIframePlayer.value && videoUrl.value) {
    initializePlyr()
  }
})

// Watcher 2: useIframePlayer computed
watch(useIframePlayer, async (newValue) => {
  if (newValue === false && !player && videoUrl.value) {
    initializePlyr()
  }
}, { immediate: true })

// Watcher 3: videoUrl computed
watch(videoUrl, async (newUrl, oldUrl) => {
  if (newUrl && !useIframePlayer.value && !player) {
    initializePlyr()
  }
}, { immediate: true })
```

**Problem:** With component persistence, these watchers remain active and can cause race conditions if `player` becomes null unexpectedly.

**Solution:** Simplify to single initialization path:
- Remove `watch(videoElement)` watcher
- Remove `watch(videoUrl)` initialization watcher (keep only src-update watcher)
- Keep only `watch(useIframePlayer)` for mode switching
- Add guard: `if (player) return` at start of `initializePlyr()`

## What Changes

**Strategy: Component Persistence + Source Update + User-Controllable Player Mode**

Instead of destroying and recreating the player on episode changes, we:
1. Keep the WatchView component alive when navigating between episodes of the same anime
2. Keep the video element and Plyr instance alive
3. Update only the video source when episode changes
4. **Allow users to choose player mode via settings menu (3 options)**

### Solution: Three Player Mode Options

Users can choose from the following player modes in settings (⚙️ menu):

| Mode | Description | Plugin Compatible | Use Case |
|------|-------------|-------------------|----------|
| **Plyr 模式** (插件优先) | Use Plyr for direct video URLs, fallback to iframe if needed | ✅ Conditional | Best for plugin users (when backend decryption succeeds) |
| **iframe 模式** (兼容) | Always use iframe player | ❌ No | Fallback when Plyr has issues |
| **混合模式** (自动) | Auto-select based on URL type | ✅ Conditional | Balanced approach |

**Plugin Compatibility Details:**
- **Plyr 模式**: Plugins work **when backend successfully decrypts video URL** (returns direct `.mp4`/`.m3u8` URL). If backend fails and returns `player.cycanime.com` URL, falls back to iframe and plugins cannot work.
- **iframe 模式**: Plugins **never work** due to cross-origin iframe restriction
- **混合模式**: Same as Plyr mode - plugins work only when backend decryption succeeds

**Default Setting:** Plyr 模式 (插件优先) - Maximizes chance of plugin compatibility

**Storage:** User preference saved to localStorage (`playerModePreference`)

### Changes:

**1. App.vue - Conditional router-view key**
```vue
<!-- Before -->
<component :is="Component" :key="route.fullPath" />

<!-- After -->
<component :is="Component" :key="route.name === 'Watch' ? route.path : route.fullPath" />
```

**Technical Detail:**
- `route.path` = `/watch/123` (stable across episodes, changes across different anime)
- `route.fullPath` = `/watch/123?season=1&episode=2` (changes each episode)
- Component persists when only query parameters change
- Component properly recreates when navigating to different routes (different route.name or different route.path)

**2. WatchView.vue Template - Fix v-else container destruction**
```vue
<!-- Before (WRONG) -->
<iframe v-if="useIframePlayer" ...></iframe>
<div v-else id="plyr-player">
  <video v-if="videoUrl" ref="videoElement">...</video>
</div>

<!-- After (CORRECT) -->
<iframe v-if="useIframePlayer" ...></iframe>
<div v-if="!useIframePlayer" id="plyr-player">
  <video ref="videoElement" :poster="posterImage">
    <source :src="videoUrl || ''" />
  </video>
</div>
```

**Critical Changes:**
- `v-else` → `v-if="!useIframePlayer"`: Prevents container destruction
- Remove `v-if="videoUrl"` from video element: Ensures element stays in DOM
- `:src="videoUrl || ''"`: Provides empty fallback when no URL

**3. WatchView.vue - Add loading guard to prevent race conditions**
```javascript
// Add flag at top of script
let isLoadingEpisode = false

async function loadEpisode() {
  // Guard: Prevent concurrent requests
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

**4. WatchView.vue - Update source on episode change (NOT for initialization)**
```javascript
// CRITICAL: This watcher only updates src, does NOT initialize Plyr
// Skip first load (oldUrl is undefined) - let existing initialization handle it
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

  // DO NOT call player.play() here - let user decide or respect auto-play setting
})
```

**Critical Implementation Notes:**
- **Must check `oldUrl`**: Skip first load (oldUrl is undefined) to avoid interfering with initialization
- **Must check `!useIframePlayer.value`**: Don't try to update video element in iframe mode
- **Must check `player` exists**: Guard against uninitialized Plyr
- **Must reset `currentTime.value = 0`**: New episode starts from beginning
- **Must clear `refreshUrlTimeout`**: Old timer shouldn't fire for new episode
- **DO NOT call `player.play()`**: Let user manually play or respect onVideoEnd auto-play

**5. WatchView.vue - Simplify Plyr initialization**
```javascript
// Remove these watchers (lines 888-936):
// - watch(videoElement) - redundant
// - watch(videoUrl) for initialization - redundant
// Keep only watch(useIframePlayer) for mode switching

// Add guard at start of initializePlyr()
function initializePlyr() {
  if (player) return // Already initialized

  // ... rest of initialization
}
```

**6. WatchView.vue - Handle mode switching (iframe ↔ Plyr)**
```javascript
// Update useIframePlayer watcher to handle mode switching
watch(useIframePlayer, async (newValue, oldValue) => {
  // From Plyr to iframe: destroy Plyr to prevent memory leak
  if (oldValue === false && newValue === true && player) {
    console.log('🔄 Switching from Plyr to iframe, destroying Plyr instance')
    player.destroy()
    player = null
    return
  }

  // From iframe to Plyr: initialize Plyr
  if (oldValue === true && newValue === false && !player && videoElement.value) {
    console.log('🔄 Switching from iframe to Plyr, initializing Plyr')
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    initializePlyr()
    return
  }

  // Initial initialization (no oldValue)
  if (newValue === false && !player && !oldValue && videoUrl.value) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    initializePlyr()
  }
}, { immediate: true })
```

**7. WatchView.vue - Update Plyr ready event handler**
```javascript
player.on('ready', () => {
  console.log('✅ Plyr ready, checking for saved position...')
  const savedPos = savedPositionForResume.value

  if (savedPos && savedPos > 5) {
    console.log('📍 Resuming to saved position:', formatTime(savedPos))

    // Check if saved position is for current episode
    const currentEpisodeKey = `${animeId.value}_${season.value}_${episode.value}`
    // Note: You may need to add episode tracking to savedPositionForResume

    player.pause()
    setTimeout(() => {
      const duration = player?.duration || videoElement.value?.duration

      if (!duration || !isFinite(duration) || duration === 0) {
        console.log('⏳ Duration not loaded yet, will try to seek anyway')
      }

      // Check if saved position is near end (within 30 seconds)
      if (duration && savedPos >= duration - 30) {
        console.log('⚠️ Episode already completed, starting from beginning')
        savedPositionForResume.value = null
        if (autoPlayEnabled.value) {
          player.play()
        }
        return
      }

      // Seek to saved position
      if (player) {
        player.currentTime = savedPos
        console.log('✅ Resumed from saved position:', formatTime(savedPos))
        uiStore.showNotification(`恢复上次播放位置: ${formatTime(savedPos)}`, 'info')
        savedPositionForResume.value = null // Clear after using

        setTimeout(() => {
          if (autoPlayEnabled.value) {
            console.log('▶️ Resuming playback after seek')
            player.play()
          }
        }, 200)
      }
    }, 100)
  }
})
```

**8. Settings UI - Player mode selector**
- Add player mode selector in settings menu (⚙️) in AppNavbar.vue
- Three options: Plyr 模式 / iframe 模式 / 混合模式
- Save preference to localStorage
- Show notification when mode changes
- If currently on watch page, reload current episode to apply new mode

**9. Updated useIframePlayer logic**
```javascript
const useIframePlayer = computed(() => {
  const url = playerStore.currentEpisodeData?.realVideoUrl
  if (!url) return false

  const playerMode = uiStore.playerModePreference || 'plyr' // Default: plyr

  // Plyr 模式：始终使用 Plyr
  if (playerMode === 'plyr') {
    return false
  }

  // iframe 模式：player.cycanime.com URL 使用 iframe
  if (playerMode === 'iframe') {
    return url.includes('player.cycanime.com')
  }

  // 混合模式：自动选择
  if (url.startsWith('cycani-')) {
    return false  // Use Plyr for cycani- IDs
  }
  return url.includes('player.cycanime.com')
})
```

**10. Store - Player mode preference**
```typescript
// ui.ts
export const useUiStore = defineStore('ui', {
  state: () => ({
    darkMode: false,
    notifications: [],
    playerModePreference: 'plyr' as 'plyr' | 'iframe' | 'hybrid'
  }),

  actions: {
    setPlayerMode(mode: string) {
      if (['plyr', 'iframe', 'hybrid'].includes(mode)) {
        this.playerModePreference = mode as any
        localStorage.setItem('playerModePreference', mode)
      }
    },

    loadPlayerModePreference() {
      const saved = localStorage.getItem('playerModePreference')
      if (saved && ['plyr', 'iframe', 'hybrid'].includes(saved)) {
        this.playerModePreference = saved as any
      }
    }
  }
})

// Call in App.vue onMounted
onMounted(() => {
  uiStore.loadDarkModePreference()
  uiStore.loadPlayerModePreference()
})
```

## Implementation Pitfalls (Common Mistakes)

### Pitfall 1: Forgetting oldUrl Check in videoUrl Watcher

**Wrong:**
```javascript
watch(videoUrl, (newUrl) => {
  videoElement.value.src = newUrl  // Fires on first load too!
})
```

**Correct:**
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl) return  // Skip first load
  videoElement.value.src = newUrl
})
```

### Pitfall 2: Not Resetting currentTime

**Wrong:**
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl) return
  videoElement.value.src = newUrl
  // currentTime still has old value!
})
```

**Correct:**
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl) return
  currentTime.value = 0  // Reset position
  videoElement.value.src = newUrl
})
```

### Pitfall 3: Not Clearing refreshUrlTimeout

**Wrong:**
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl) return
  currentTime.value = 0
  // Forgot to clear old timer!
  videoElement.value.src = newUrl
})
```

**Correct:**
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl) return
  currentTime.value = 0

  // Clear old refresh timer
  if (refreshUrlTimeout) {
    clearTimeout(refreshUrlTimeout)
    refreshUrlTimeout = null
  }

  videoElement.value.src = newUrl
})
```

### Pitfall 4: Not Handling iframe Mode

**Wrong:**
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl) return
  videoElement.value.src = newUrl  // Error if in iframe mode!
})
```

**Correct:**
```javascript
watch(videoUrl, (newUrl, oldUrl) => {
  if (!oldUrl || useIframePlayer.value || !player || !videoElement.value) {
    return
  }
  videoElement.value.src = newUrl
})
```

## Impact

- Affected specs: `video-playback`
- Affected code:
  - `cycani-proxy/frontend/src/App.vue:10` (router-view key binding)
  - `cycani-proxy/frontend/src/views/WatchView.vue:29` (v-else → v-if change)
  - `cycani-proxy/frontend/src/views/WatchView.vue:30-39` (video element template)
  - `cycani-proxy/frontend/src/views/WatchView.vue:172` (useIframePlayer computed logic)
  - `cycani-proxy/frontend/src/views/WatchView.vue:293` (loadEpisode function - add guard)
  - `cycani-proxy/frontend/src/views/WatchView.vue:888-936` (Plyr initialization watchers)
  - `cycani-proxy/frontend/src/views/WatchView.vue:1105` (Plyr ready event handler)
  - `cycani-proxy/frontend/src/stores/ui.ts` (add playerModePreference)
  - `cycani-proxy/frontend/src/components/layout/AppNavbar.vue` (add settings menu item)

**Benefits:**
- ✅ Plugins maintain event listeners across episode navigation (when using Plyr with direct video URLs)
- ✅ Video element DOM node remains stable (same instance)
- ✅ Better performance (no DOM recreation)
- ✅ Smoother UX (instant episode switching)
- ✅ Player settings persist (volume, speed, etc.)
- ✅ Other pages unaffected
- ✅ User control over player mode
- ✅ Default behavior maximizes plugin compatibility chance
- ✅ Fallback option for troubleshooting

**Plugin Compatibility by Mode:**
- **Plyr 模式** (default): ✅ Plugins work when backend successfully decrypts video URL → direct video URL. ❌ Plugins cannot work when backend fails → iframe fallback.
- **iframe 模式**: ❌ Plugins cannot access cross-origin iframe (technical limitation)
- **混合模式**: ✅ Same as Plyr mode - plugins work only when backend decryption succeeds

**Risks:**
- State management complexity increases (component doesn't reset between episodes)
- Need to ensure all episode-specific state is properly updated
- Existing watchers for route.query need to handle state updates correctly
- Memory leaks possible if Plyr is not properly destroyed on mode switch
- Race conditions possible if user rapidly clicks "下一集" button

**Risk Mitigation:**
- Add `isLoadingEpisode` guard to prevent concurrent requests
- Clear all timers and event listeners on component unmount
- Add mode switching watcher to properly destroy/recreate Plyr
- Add episode identifier to saved position to prevent restoring wrong episode's position

## Testing Strategy

### Critical Path Tests:
1. **Element Persistence**: Verify `document.querySelector('video')` returns same instance across episodes
2. **Plugin Compatibility**: Verify custom event listeners persist after episode navigation (when backend returns direct video URL)
3. **Mode Switching**: Verify Plyr ↔ iframe switching works without memory leaks
4. **Backend Dependency**: Verify plugins work when backend successfully decrypts URL, and gracefully fallback to iframe when backend fails
5. **Rapid Navigation**: Verify clicking "下一集" 3+ times rapidly doesn't break state

### Navigation Tests:
5. Episode navigation (下一集/上一集 buttons)
6. Browser back/forward buttons
7. Direct URL access (/watch/123?season=1&episode=5)
8. Navigation between different anime (should recreate component)

### Regression Tests:
9. Watch progress saves and restores correctly
10. Plyr controls function correctly
11. iframe player loads correctly
12. Other pages (Home, History) unaffected
13. Player mode preference persists across sessions

## Rollback Plan

If critical issues arise:
1. Revert App.vue single-line change: `git checkout cycani-proxy/frontend/src/App.vue`
2. Revert WatchView.vue changes: `git checkout cycani-proxy/frontend/src/views/WatchView.vue`
3. Revert uiStore changes: Remove `playerModePreference` related code
4. Revert AppNavbar changes: Remove settings menu item
5. No database migrations needed (pure frontend change)
