# Spec: Video Player

## ADDED Requirements

### Requirement: Automatic Video Playback with Sound

The video player SHALL automatically start playing with sound when users have recently interacted with the page (e.g., clicked on an anime card).

#### Scenario: User clicks anime card and navigates to watch page

**Given** a user is on the home page
**When** the user clicks on an anime card
**And** the watch page loads with the selected episode
**Then** the video SHOULD start playing automatically with sound enabled
**And** playback SHALL begin within 2 seconds of page load

#### Scenario: Browser blocks unmuted autoplay (fallback)

**Given** a user navigates to the watch page
**When** the browser blocks unmuted autoplay due to autoplay policy
**Then** the player SHALL fall back to muted autoplay
**And** playback SHALL start successfully in muted mode
**And** the user CAN manually unmute the video

#### Scenario: Episode navigation with autoplay enabled

**Given** a user is watching an episode
**When** the user selects the next episode
**And** autoplay preference is enabled
**Then** the next episode SHOULD start playing automatically
**And** sound SHOULD be enabled by default (subject to browser policy)

### Requirement: Plyr Player Configuration for Sound-Aware Autoplay

The Plyr player SHALL be configured to allow unmuted autoplay by default, with graceful fallback to muted playback.

#### Scenario: Initialize Plyr without forced mute

**Given** a new Plyr instance is being created in WatchView
**When** the player is initialized
**Then** the `muted` option SHALL NOT be set (rely on Plyr's default of unmuted)
**And** the `autoplay` option SHALL be set to `false` (manual triggering)
**And** all standard controls SHALL be enabled (play, volume, mute, etc.)

#### Scenario: Autoplay with promise-based error handling

**Given** the player is loaded with a video source
**When** autoplay is triggered via `player.play()`
**And** the browser allows unmuted autoplay
**Then** playback SHALL start with sound enabled
**When** the browser blocks unmuted autoplay (NotAllowedError)
**Then** the player SHALL set `muted = true`
**And** the player SHALL retry playback in muted mode

### Requirement: Autoplay Timing Optimization

The autoplay trigger SHALL use optimized timing to ensure success while staying within the browser's user interaction window.

#### Scenario: Autoplay delay matches legacy implementation

**Given** a video source has been set on the player
**When** autoplay is enabled
**Then** `player.play()` SHALL be called after 1000ms delay
**And** this delay SHALL ensure the video source is loaded
**And** this delay SHALL stay within the browser's user interaction timeout window

## MODIFIED Requirements

### Requirement: Watch View Player Initialization

The watch view MUST initialize the Plyr player without forcing muted playback.

#### Scenario: Initialize player without muted configuration

**Given** the user navigates to a watch page
**When** the Plyr player is initialized in `onMounted()`
**Then** the player SHALL be configured without the `muted: true` option
**And** the player SHALL rely on Plyr's default unmuted state
**And** autoplay preference from `useAutoplay()` SHALL be respected

#### Scenario: Trigger autoplay with fallback

**Given** a new episode is loaded
**When** the autoplay preference is enabled
**Then** `player.play()` SHALL be called with a 1000ms delay
**And** the play promise SHALL be handled with error catching
**And** if unmuted autoplay fails, muted fallback SHALL be triggered

## Implementation Notes

### Key Code Changes

**Change 1: Remove `muted: true` from Plyr initialization**
```typescript
// WatchView.vue line 500
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
    // muted: NOT SET (defaults to false)
    autoplay: false
})
```

**Change 2: Implement promise-based autoplay with fallback**
```typescript
// WatchView.vue lines 352-377
if (autoPlayEnabled.value) {
    setTimeout(() => {
        if (player) {
            // Try unmuted autoplay, fall back to muted if blocked
            player.play().catch(err => {
                if (err.name === 'NotAllowedError') {
                    console.log('Unmuted autoplay blocked, using muted fallback')
                    player.muted = true
                    player.play()
                } else {
                    console.warn('Autoplay failed:', err)
                }
            })
        }
    }, 1000)  // Match legacy timing
}
```

### Browser Autoplay Policy Summary

| User Interaction | Browser Allows |
|-----------------|----------------|
| User clicked within last few seconds | ✅ Unmuted autoplay allowed |
| No recent interaction | ❌ Unmuted autoplay blocked, muted allowed |
| High media engagement score | ✅ Unmuted autoplay more likely |

### Testing Requirements
- Unit test: Verify `muted` option is not set
- Integration test: Verify promise-based fallback works
- Manual test: Click anime card → verify sound is enabled
- Manual test: Direct URL navigation → verify muted fallback works
- Cross-browser test: Chrome, Firefox, Safari, Edge

## Related Specs

- References: `autoplay-preference` (existing spec in `fix-frontend-ux-issues`)
- Extends: Video player behavior to enable sound by default
- Cross-reference: All playback scenarios benefit from sound-enabled autoplay

## Success Criteria

- ✅ Autoplay success rate: 100% (muted fallback guarantees)
- ✅ Sound enablement: >90% for users who just clicked anime card
- ✅ User satisfaction: No manual unmute required for typical usage
- ✅ Backward compatibility: Existing autoplay preference still works
