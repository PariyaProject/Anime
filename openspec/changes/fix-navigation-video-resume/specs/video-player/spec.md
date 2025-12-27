## ADDED Requirements

### Requirement: Navigation State Reset
The video player component SHALL completely reset its state when navigating between different episodes or when re-entering the watch page, ensuring that saved positions are correctly loaded and applied.

#### Scenario: Navigate from watch page to home and back via Continue Watching
- **WHEN** user navigates from the watch page to the home page and then clicks "Continue Watching"
- **THEN** the video player SHALL re-initialize completely
- **AND** the saved position SHALL be loaded from the backend
- **AND** playback SHALL resume from the saved position (not from 0:00)

#### Scenario: Navigate directly to a previously watched episode
- **WHEN** user navigates directly to an episode with a saved position
- **THEN** the video player SHALL initialize with fresh state
- **AND** the saved position SHALL be loaded and applied
- **AND** playback SHALL resume from the saved position

#### Scenario: Rapid navigation between episodes
- **WHEN** user rapidly navigates between different episodes
- **THEN** each navigation SHALL trigger a complete player state reset
- **AND** no stale state from previous episodes SHALL persist
- **AND** the correct saved position for each episode SHALL be loaded

## MODIFIED Requirements

### Requirement: Component Lifecycle Management
The video player SHALL properly manage its lifecycle during route transitions, ensuring clean state initialization and cleanup to prevent player re-initialization failures.

#### Scenario: Component is remounted due to route change
- **WHEN** the WatchView component is remounted (via key-based navigation or manual lifecycle management)
- **THEN** the onMounted hook SHALL execute with fresh component state
- **AND** the player SHALL be initialized after the DOM is ready
- **AND** the saved position SHALL be fetched and applied after player initialization

#### Scenario: Player is destroyed during route transition
- **WHEN** a route transition begins and the player instance exists
- **THEN** the player SHALL be properly destroyed with cleanup
- **AND** all event listeners SHALL be removed
- **AND** the player reference SHALL be set to null
- **AND** the DOM SHALL be updated before re-initialization

#### Scenario: Player initialization after route change
- **WHEN** a route change completes and the video URL is available
- **THEN** the player SHALL initialize only after the video element exists in the DOM
- **AND** the initialization SHALL wait for both nextTick() and browser paint
- **AND** the saved position SHALL be applied after the player is ready
