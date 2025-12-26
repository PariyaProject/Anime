# Change: Enable Automatic Video Playback with Sound

## Why

Currently, when users enter the playback screen, videos cannot automatically play with sound. The player starts muted to comply with browser autoplay policies, which requires user to manually unmute videos after each page load or episode change.

**Root Cause Analysis:**
The Vue3 frontend incorrectly sets `muted: true` in the Plyr player initialization (`WatchView.vue:500`). The legacy Bootstrap implementation (`cycani-proxy/public/app.js`) did NOT set this option, allowing videos to autoplay with sound successfully.

**Why the legacy version worked:**
- Users click on anime cards in the home page → **this counts as user interaction**
- Within seconds of that click, `player.play()` is called
- Browser autoplay policy allows unmuted playback because the user recently interacted with the page
- The legacy implementation did NOT force `muted: true`, so audio was enabled by default

## What Changes

- **Remove forced muted configuration**: Change `muted: true` to rely on Plyr's default (unmuted)
- **Implement smart fallback**: If autoplay fails due to browser policy, fall back to muted autoplay
- **Add sound recovery attempt**: After successful muted playback, attempt to enable sound (for returning users)

## Impact

- **Affected specs**:
  - `autoplay-preference` (existing spec in `fix-frontend-ux-issues` change)
  - `video-player` (new spec to be created)
- **Affected code**:
  - `cycani-proxy/frontend/src/views/WatchView.vue:500` (Plyr initialization with `muted: true`)
  - `cycani-proxy/frontend/src/views/WatchView.vue:352-377` (autoplay logic)

## Technical Context

Browser autoplay policies follow these rules:
- **After user interaction** (click, tap, keypress): Allows unmuted autoplay for several seconds
- **Without recent interaction**: Requires muted playback
- **Media Engagement Index**: Browsers track per-domain media engagement scores

The legacy implementation worked because:
1. User clicks anime card → User interaction registered
2. Within 1 second, `player.play()` is called
3. Browser allows unmuted playback (within the user interaction window)
4. Player was NOT configured with `muted: true`

This change leverages the same pattern to restore automatic playback with sound.

## Comparison: Legacy vs Current

| Aspect | Legacy (`cycani-proxy/public/app.js`) | Current Vue3 (`WatchView.vue`) |
|--------|--------------------------------------|-------------------------------|
| Plyr muted config | Not set (default: false) | `muted: true` ❌ |
| Initial audio state | **Unmuted** | **Muted** ❌ |
| Autoplay trigger | `setTimeout(() => player.play(), 1000)` | Same |
| User interaction | Click on anime card | Click on anime card |
| Result | ✅ Plays with sound | ❌ Plays muted |

## Dependencies

- Builds on existing `autoplay-preference` spec
- Requires Plyr video player library (already integrated)
- Compatible with Vue 3 Composition API (already in use)
- No new external dependencies required

## Success Criteria

- Videos automatically start playing when entering the playback screen (100% success rate)
- Sound is enabled by default for users who just clicked on an anime card
- Graceful fallback to muted playback if browser blocks unmuted autoplay
- User can always manually control mute/unmute state
- No breaking changes to existing autoplay preference functionality
