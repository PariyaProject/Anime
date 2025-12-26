# Spec: Autoplay Preference

## ADDED Requirements

### Requirement: User-Configurable Autoplay Setting

Users MUST be able to toggle autoplay on/off through a persistent preference setting that applies across both iframe and Plyr video players.

#### Scenario: Toggle autoplay in player view

**Given** the user is on the watch page (`/watch/:animeId`)
**When** the user clicks the autoplay toggle switch
**Then** the preference should be immediately saved to localStorage
**And** the toggle state should reflect the new setting
**And** a confirmation message should be displayed

#### Scenario: Autoplay preference persists across sessions

**Given** the user has set autoplay to "off"
**When** the user closes and reopens the browser
**And** navigates to a new episode
**Then** autoplay should remain "off"
**And** the toggle should show the "off" state

#### Scenario: Default autoplay enabled for new users

**Given** a new user visits the site for the first time
**When** no autoplay preference exists in localStorage
**Then** autoplay should default to "enabled" (true)
**And** episodes should automatically start playing when loaded

#### Scenario: Autoplay applies to iframe player

**Given** the user has autoplay enabled
**When** an episode is loaded that uses the iframe player (cycani- video IDs)
**Then** the iframe URL should include `?autoplay=1` or equivalent parameter
**And** the video should automatically start playing (subject to browser autoplay policies)

#### Scenario: Autoplay applies to Plyr player

**Given** the user has autoplay enabled
**When** an episode is loaded that uses the Plyr player (direct video URLs)
**Then** the Plyr instance should be initialized with `autoplay: true` in config
**And** the video should attempt automatic playback

### Requirement: Autoplay Composable

A dedicated composable MUST manage autoplay preference state with localStorage persistence.

#### Scenario: Read autoplay preference on mount

**Given** the `useAutoplay()` composable is called
**When** the component mounts
**Then** localStorage should be read for key 'anime-autoplay-preference'
**And** if no value exists, default to `true`
**And** the `autoplay` ref should be set accordingly

#### Scenario: Save autoplay preference on change

**Given** the autoplay value is changed via `toggleAutoplay()`
**When** the toggle method is called
**Then** localStorage should be updated with the new boolean value
**And** the `autoplay` ref should reflect the new state
**And** the save should handle localStorage errors gracefully

### Requirement: Autoplay Toggle UI Component

A visual toggle switch MUST be available in the player controls.

#### Scenario: Toggle switch in player controls

**Given** the user is viewing the player page
**When** the player controls section is rendered
**Then** a form-check switch should be displayed with label "自动播放"
**And** the switch state should be synchronized with the autoplay preference
**And** the switch should be positioned prominently in the control bar

## MODIFIED Requirements

### Requirement: Watch View Player Initialization

The watch view MUST initialize both iframe and Plyr players with the user's autoplay preference.

#### Scenario: Initialize player with autoplay preference

**Given** the user navigates to a watch page
**When** the player component mounts
**Then** the autoplay setting should be read from the `useAutoplay()` composable
**And** for iframe players: include autoplay parameter in URL if enabled
**And** for Plyr players: pass autoplay option in config if enabled

## Implementation Notes

- Create `useAutoplay.ts` composable in `frontend/src/composables/`
- Use localStorage key: `anime-autoplay-preference`
- Default value: `true` (autoplay enabled)
- Create `AutoplayToggle.vue` component (or integrate into existing player controls)
- Modify `WatchView.vue` to use autoplay preference for both player types
- For iframe player, the URL at `WatchView.vue:249-253` needs to conditionally add autoplay parameter
- The existing "自动播放下一集" toggle at `WatchView.vue:80-91` is for "auto-play next episode" - the new toggle should be for "autoplay current episode" - consider renaming for clarity or combining both concepts

## Related Specs

- Cross-reference: `weekly-schedule` (autoplay applies to all episodes accessed from schedule)
- Cross-reference: `watch-history-page` (autoplay preference applies when resuming from history)
