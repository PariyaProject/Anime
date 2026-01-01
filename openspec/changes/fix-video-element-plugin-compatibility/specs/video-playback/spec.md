## MODIFIED Requirements

### Requirement: WatchView Component Persistence
The system SHALL preserve the WatchView component instance when navigating between episodes of the same anime to maintain browser plugin compatibility.

#### Scenario: Component persists across episode navigation
- **GIVEN** user is watching episode 1 at `/watch/123?season=1&episode=1`
- **WHEN** user clicks "下一集" button or navigates to episode 2
- **THEN** the WatchView component instance remains the same (not destroyed and recreated)
- **AND** only the route query parameters change (`episode=2`)
- **AND** the component key is based on `route.path` which remains `/watch/123`

#### Scenario: Component recreates on route navigation
- **GIVEN** user is on watch page at `/watch/123?season=1&episode=1`
- **WHEN** user navigates to a different route (e.g., `/` or `/history`)
- **THEN** the WatchView component is properly destroyed and recreated upon return
- **AND** this ensures clean state when navigating between different pages

#### Scenario: Component recreates for different anime
- **GIVEN** user is watching anime 123 at `/watch/123?episode=1`
- **WHEN** user navigates to anime 456 at `/watch/456?episode=1`
- **THEN** the WatchView component is destroyed and recreated
- **AND** the component key changes because `route.path` changes from `/watch/123` to `/watch/456`

#### Scenario: Plugins maintain event listeners across episodes
- **GIVEN** a browser plugin has attached event listeners to the video element
- **WHEN** the user navigates to the next episode of the same anime
- **THEN** the plugin's event listeners remain attached and functional
- **AND** the video element DOM node is the same instance (can be verified with `===` operator)

### Requirement: Router-View Key Binding Strategy
The system SHALL use conditional key binding for the router-view to balance component persistence and proper navigation behavior.

#### Scenario: WatchView uses route.path as key
- **GIVEN** the router-view in App.vue renders the WatchView component
- **WHEN** the route is `/watch/123` with any query parameters
- **THEN** the component key is `route.path` (e.g., `/watch/123`)
- **AND** query parameter changes do NOT trigger component recreation

#### Scenario: Other routes use route.fullPath as key
- **GIVEN** the router-view renders a component other than WatchView (e.g., HomeView, HistoryView)
- **WHEN** the route includes query parameters
- **THEN** the component key is `route.fullPath`
- **AND** existing behavior for these routes is preserved

#### Scenario: Conditional key implementation
- **GIVEN** the router-view key binding in App.vue
- **WHEN** determining the key value
- **THEN** the key is computed as `route.name === 'Watch' ? route.path : route.fullPath`
- **AND** this ensures WatchView persists while other routes behave normally

### Requirement: Video Element Stability
The system SHALL ensure the video element DOM node remains stable across episode changes when within the same anime.

#### Scenario: Video element always exists in DOM
- **GIVEN** the WatchView component is mounted
- **WHEN** the component renders regardless of videoUrl availability
- **THEN** the `<video>` element exists in the DOM (no `v-if="videoUrl"`)
- **AND** the element's src may be empty when no video is loaded

#### Scenario: Video element identity preserved
- **GIVEN** user obtains reference to video element via `document.querySelector('video')`
- **WHEN** user navigates to next episode of the same anime
- **THEN** the same video element instance exists in the DOM
- **AND** the reference obtained earlier still points to a valid, attached element

#### Scenario: Video source updates dynamically
- **GIVEN** the video element is loaded with episode 1 URL
- **WHEN** user navigates to episode 2
- **THEN** the video element's `src` attribute is updated to the new URL
- **AND** `video.load()` is called to reload the video
- **AND** the video element itself is not destroyed and recreated

#### Scenario: Plyr instance persists across episodes
- **GIVEN** Plyr player is initialized and playing video
- **WHEN** user navigates to next episode of the same anime
- **THEN** the same Plyr instance is used (not destroyed and recreated)
- **AND** Plyr's internal state is preserved (volume, playback speed, etc.)
- **AND** only the underlying video source is updated

#### Scenario: Plugins can control video after episode changes
- **GIVEN** a browser extension controls video playback via standard HTML5 video APIs
- **WHEN** user has navigated through multiple episodes of the same anime
- **THEN** the extension can still call `video.play()`, `video.pause()`, `video.currentTime = x`
- **AND** these calls work correctly without re-attaching event listeners

### Requirement: Episode State Management
The system SHALL properly reset episode-specific state when the video source changes while preserving player settings.

#### Scenario: Playback position resets on episode change
- **GIVEN** user watched episode 1 to 50% completion (currentTime = 600s)
- **WHEN** user navigates to episode 2
- **THEN** currentTime resets to 0
- **AND** duration updates to the new episode's duration
- **AND** progress bar reflects the new episode's length

#### Scenario: Player settings persist across episodes
- **GIVEN** user set volume to 50% and playback speed to 1.5x during episode 1
- **WHEN** user navigates to episode 2
- **THEN** volume remains at 50%
- **AND** playback speed remains at 1.5x

#### Scenario: Loading state updates correctly
- **GIVEN** user navigates to a new episode
- **WHEN** the new video URL is being loaded
- **THEN** the loading indicator is displayed
- **AND** once the video is ready, the loading indicator is hidden

### Requirement: Backward Compatibility
The system SHALL maintain all existing functionality while improving plugin compatibility.

#### Scenario: Watch progress tracking still works
- **GIVEN** user plays video for 30 seconds then navigates to next episode
- **WHEN** user navigates back to previous episode
- **THEN** the saved playback position is correctly restored
- **AND** watch history is updated as expected

#### Scenario: Browser navigation works correctly
- **GIVEN** user has navigated through multiple episodes
- **WHEN** user clicks browser back button
- **THEN** the previous episode loads correctly
- **AND** the video state updates to match the route parameters
- **AND** component state is properly synchronized

#### Scenario: Direct URL access works
- **GIVEN** user navigates directly to `/watch/123?season=1&episode=5` via URL bar
- **WHEN** the page loads
- **THEN** episode 5 loads and plays correctly
- **AND** all player controls function normally

#### Scenario: Auto-play behavior preserved
- **GIVEN** user has enabled auto-play checkbox
- **WHEN** current episode ends
- **THEN** the next episode automatically loads and plays
- **AND** if user has disabled auto-play, the next episode does not auto-play

#### Scenario: Iframe player mode unaffected
- **GIVEN** a video requires iframe player (player.cycanime.com URL)
- **WHEN** user navigates between episodes
- **THEN** the iframe is used instead of Plyr
- **AND** component persistence still works
- **AND** the iframe src is updated dynamically

### Requirement: Plyr Initialization Simplification
The system SHALL initialize Plyr once when the component mounts and reuse the instance across episode changes.

#### Scenario: Plyr initializes on component mount
- **GIVEN** the WatchView component mounts
- **WHEN** the video element is rendered and videoUrl is available
- **THEN** Plyr is initialized once
- **AND** no additional Plyr instances are created on episode changes

#### Scenario: Plyr initializes only when not using iframe
- **GIVEN** the useIframePlayer computed value is `true`
- **WHEN** the component renders
- **THEN** Plyr is NOT initialized
- **AND** the iframe player is used instead

#### Scenario: Plyr destroyed on component unmount
- **GIVEN** user navigates away from the watch page (e.g., to home)
- **WHEN** the WatchView component unmounts
- **THEN** Plyr.destroy() is called
- **AND** the player instance is properly cleaned up
- **AND** event listeners are removed
