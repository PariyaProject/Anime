# Design: Enable Autoplay with Sound

## Context

The current Vue3 implementation forces `muted: true` in Plyr configuration (`WatchView.vue:500`), preventing automatic playback with sound. The legacy Bootstrap implementation did NOT set this option and successfully played videos with sound.

**Root Cause:** The `muted: true` configuration was likely added to avoid autoplay failures, but it also prevents sound from working. The correct approach is to try unmuted first, then fall back to muted if needed.

## Goals / Non-Goals

**Goals:**
- Remove forced `muted: true` configuration
- Implement fallback to muted playback if unmuted autoplay is blocked
- Maintain 100% autoplay success rate
- Enable sound by default for users with recent page interaction

**Non-Goals:**
- Complex user engagement tracking (unnecessary for this use case)
- Sound recovery after playback starts (out of scope, may add later)
- Iframe player modification (cross-domain restrictions apply)

## Decisions

### Decision 1: Remove `muted: true` Configuration

**What**: Change Plyr initialization from `muted: true` to not setting the option (rely on Plyr's default of unmuted).

**Current code** (`WatchView.vue:500`):
```typescript
player = new Plyr('#plyr-player', {
    controls: [...],
    muted: true,  // ❌ Remove this
    autoplay: false
})
```

**New code**:
```typescript
player = new Plyr('#plyr-player', {
    controls: [...],
    // muted: not set (defaults to false)
    autoplay: false
})
```

**Why:**
- Plyr's default is unmuted (`muted: false`)
- User just clicked on anime card → browser allows unmuted autoplay
- Matches the working legacy implementation

### Decision 2: Implement Promise-Based Fallback

**What**: Wrap the `player.play()` call in a promise handler to catch `NotAllowedError` and fall back to muted autoplay.

**Implementation**:
```typescript
function attemptAutoplay() {
    if (!autoPlayEnabled.value) return

    // Try unmuted autoplay first
    player.play().catch(err => {
        if (err.name === 'NotAllowedError') {
            console.log('Unmuted autoplay blocked, falling back to muted')
            player.muted = true
            player.play()
        }
    })
}
```

**Why:**
- Guarantees autoplay works (muted fallback)
- Enables sound by default when browser allows
- Graceful degradation

**Alternatives considered:**
- **Always muted**: Rejected - user doesn't want this
- **Ask user first**: Rejected - adds friction

### Decision 3: Timing Strategy

**What**: Call `player.play()` immediately after setting the video source, using a 1-second delay to ensure the video is ready.

**Current code** (`WatchView.vue:352-377`):
```typescript
if (autoPlayEnabled.value) {
    setTimeout(() => {
        if (player) {
            player.play()
        }
    }, 2000)
}
```

**New code** (match legacy):
```typescript
if (autoPlayEnabled.value) {
    setTimeout(() => {
        attemptAutoplay()  // Uses promise-based fallback
    }, 1000)  // Reduced from 2000ms to 1000ms (match legacy)
}
```

**Why:**
- 1 second matches the working legacy implementation
- Ensures video source is loaded before playing
- Within browser's user interaction timeout window

## Implementation Strategy

### Phase 1: Core Fix (Simple)
1. Remove `muted: true` from Plyr initialization
2. Wrap `player.play()` in promise error handler
3. Implement fallback to muted if autoplay fails

### Phase 2: Testing
1. Test on Chrome, Firefox, Safari, Edge
2. Verify autoplay works after clicking anime card
3. Verify fallback works for users without recent interaction

### Phase 3: Optional Enhancement
1. Track user's manual unmute actions in localStorage
2. For returning users who previously unmuted, attempt sound recovery
3. Add toast notification when sound is auto-enabled

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Autoplay may fail for users without recent interaction** | Low | Fallback to muted ensures 100% autoplay success |
| **Users who prefer muted playback get sound** | Low | User can manually mute; this is preferred behavior |
| **Increased complexity in autoplay logic** | Low | Minimal code change (~10 lines) |

## Migration Plan

### Steps
1. Modify `WatchView.vue:500` to remove `muted: true`
2. Modify `WatchView.vue:352-377` to use promise-based autoplay
3. Deploy to development environment
4. Test on multiple browsers
5. Deploy to production

### Rollback
- Revert `WatchView.vue` changes
- Add `muted: true` back to Plyr configuration
- No data migration required (localStorage not modified)

## Open Questions

1. **Should we reduce the autoplay delay from 2000ms to 1000ms?**
   - Answer: Yes, match the working legacy implementation

2. **Should we implement sound recovery for returning users?**
   - Answer: Optional enhancement, not required for initial fix

## Testing Strategy

### Manual Testing Checklist
- [ ] Fresh user (no interaction): video starts muted (fallback works)
- [ ] User just clicked anime card: video starts with sound
- [ ] Episode navigation: autoplay continues to work
- [ ] Multiple browsers: Chrome, Firefox, Safari, Edge
- [ ] Manual mute/unmute controls still work

### Success Metrics
- **Autoplay success rate**: 100% (muted fallback guarantees this)
- **Sound enablement rate**: >90% for users who just clicked (same interaction window)
- **User satisfaction**: No manual unmute required for typical usage

## Code Changes Required

### File: `cycani-proxy/frontend/src/views/WatchView.vue`

**Change 1: Line 500**
```diff
  player = new Plyr('#plyr-player', {
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'duration',
      'mute',
      'volume',
      'pip',
      'fullscreen'
    ],
-   muted: true,  // Start muted to allow autoplay
+   // muted: not set (defaults to false, allows sound)
    autoplay: false  // We'll manually trigger autoplay
  })
```

**Change 2: Lines 352-377**
```diff
  // Auto-play with delay (similar to old version)
  console.log('🎵 Auto-play enabled:', autoPlayEnabled.value)
  if (autoPlayEnabled.value) {
    // Wait for video to be ready before playing
    setTimeout(() => {
      console.log('▶️ Attempting to play, player exists:', !!player)
      if (player) {
        try {
-         // Check if video element is ready
-         const media = player.media;
-         if (media && media.readyState >= 2) {
-           console.log('✅ Video ready, playing now')
-           player.play()
-         } else {
-           console.log('⏳ Video not ready, waiting...')
-           // Wait for canplay event
-           media?.addEventListener('canplay', () => {
-             console.log('✅ canplay event fired, playing now')
-             player.play()
-           }, { once: true })
-         }
+         // Try unmuted autoplay, fall back to muted if blocked
+         player.play().catch(err => {
+           if (err.name === 'NotAllowedError') {
+             console.log('⚠️ Unmuted autoplay blocked, using muted fallback')
+             player.muted = true
+             player.play()
+           } else {
+             console.warn('Autoplay failed:', err)
+           }
+         })
        } catch (err) {
          console.warn('Auto-play failed:', err)
        }
      }
-   }, 2000)
+   }, 1000)  // Reduced from 2000ms to match legacy
  }
```

### Summary of Changes
- **Lines changed**: ~15 lines
- **Files modified**: 1 file (`WatchView.vue`)
- **Complexity**: Low (simple promise-based fallback)
- **Risk**: Low (graceful fallback to muted)
