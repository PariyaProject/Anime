# Data Persistence Spec

## MODIFIED Requirements

### Requirement: Unlimited Watch History Storage

The system SHALL store unlimited watch history records without automatic deletion based on record count.

#### Scenario: User watches more than 100 episodes
**Given** the user has watched 100 different episodes
**When** the user watches the 101st episode
**Then** all 101 episodes SHALL be stored in watch history
**And** no automatic deletion SHALL occur

#### Scenario: Long-term user with extensive history
**Given** a user has watched 500+ episodes over several months
**When** the user loads the continue watching section
**Then** all historical records SHALL be preserved
**And** the system SHALL function normally without performance degradation

### Requirement: Event Listener Cleanup

The WatchView component SHALL properly clean up event listeners on unmount to prevent memory leaks and duplicate requests.

#### Scenario: User navigates between episodes
**Given** a user is watching an episode
**When** the user clicks "next episode"
**Then** the old component instance SHALL remove its event listeners
**And** only the new component instance SHALL have active listeners

#### Scenario: User switches browser tabs
**Given** a user has the video player open in one tab
**When** the user switches to another tab and back
**Then** exactly ONE visibility change event SHALL be handled
**And** exactly ONE save request SHALL be sent to the backend

### Requirement: Stable animeId During Component Lifecycle

The WatchView component SHALL cache the animeId on mount to ensure stable reference during save operations.

#### Scenario: User watches episode with route transitions
**Given** a user is watching episode 1 of an anime
**When** the user clicks "next episode" triggering a route change
**Then** the old component SHALL save history with the correct animeId
**And** no "Invalid animeInfo" errors SHALL occur

#### Scenario: Component unmounts during save
**Given** a user is watching an episode
**When** the user navigates away before save completes
**Then** the cached animeId SHALL be used for the save operation
**And** the save SHALL succeed with valid animeId

### Requirement: Scrollable Continue Watching Display

The home page continue watching section SHALL display all grouped anime with scrollable container.

#### Scenario: User has many anime in continue watching
**Given** a user has 10+ anime in their continue watching list
**When** the user loads the home page
**Then** all grouped anime SHALL be displayed
**And** a vertical scroll bar SHALL appear when content exceeds container height

#### Scenario: User navigates continue watching list
**Given** the continue watching section has 15 anime displayed
**When** the user scrolls down
**Then** the scroll SHALL be smooth
**And** all anime SHALL remain accessible

## ADDED Requirements

### Requirement: Watch History Size Monitoring

The system SHALL log when watch history exceeds significant size thresholds for operational monitoring.

#### Scenario: History grows beyond 1000 entries
**Given** a user has 1000+ watch history entries
**When** a new entry is added
**Then** a console log message SHALL indicate the total count
**And** the operation SHALL complete successfully

### Requirement: Frontend Validation for animeId

The history store SHALL validate animeId presence before attempting save operations.

#### Scenario: Save called with invalid animeInfo
**Given** a save operation is triggered
**When** animeInfo.id is missing or undefined
**Then** the save SHALL be aborted immediately
**And** an error SHALL be logged to console
**And** no network request SHALL be sent
