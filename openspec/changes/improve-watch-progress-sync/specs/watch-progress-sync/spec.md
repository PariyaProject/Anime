# Watch Progress Sync Strategy

## ADDED Requirements

### Requirement: Event-Driven Backend Synchronization

The system MUST synchronize watch position to the backend only on specific user events rather than using a fixed interval timer.

#### Scenario: User closes browser or navigates away
Given the user is watching a video
When the user closes the browser tab or navigates to a different page
Then the system MUST save the current watch position to the backend
And the save MUST use `visibilitychange`, `pagehide`, or `beforeunload` events
And the save MUST complete within the event handler's time constraints

#### Scenario: User manually seeks to a new position
Given the user is watching a video
When the user drags the progress bar to seek to a new position
Then the system MUST save the new position to the backend
And the save MUST be debounced to avoid excessive requests during rapid seeking
And the save MUST only trigger if the position change exceeds 5 seconds

#### Scenario: Video ends and auto-plays next episode
Given the user is watching a video
When the video reaches the end and auto-play is enabled
Then the system MUST save the completed position to the backend
And the save MUST complete before loading the next episode

#### Scenario: User manually pauses or resumes playback
Given the user is watching a video
When the user clicks pause or play button
Then the system MUST save the current position to the backend
And the save MUST be triggered by the Plyr `play` and `pause` events
And the save MUST respect the debounce timer to avoid excessive requests

#### Scenario: Optional fallback interval for long sessions
Given the user is watching a video for an extended period
When no save events have occurred for a configurable duration (default: 5 minutes)
Then the system MAY save the current position to the backend as a safety measure
And this interval MUST be configurable or disabled

### Requirement: LocalStorage Primary Storage

The system MUST use browser localStorage as the primary storage for watch position, with the backend serving as a cross-device synchronization mechanism.

#### Scenario: Saving position to localStorage
Given the user is watching a video
When the watch position changes (via any trigger)
Then the system MUST immediately save the position to localStorage
And the save MUST use the key pattern `watch_position_${animeId}_${season}_${episode}`
And the save MUST include position, timestamp, and metadata

#### Scenario: Loading position from backend with localStorage fallback
Given a user opens a video episode
When the system loads the initial watch position
Then the system MUST first attempt to load from the backend API
And if the backend returns no data or fails, the system MUST fall back to localStorage
And if both sources have no data, the system MUST default to position 0

#### Scenario: Cross-device synchronization
Given a user has watched an episode on Device A
When the user opens the same episode on Device B
Then the system MUST load the position from the backend (Device A's synced data)
And the system MUST update localStorage on Device B with the backend position

#### Scenario: Backend unavailable during viewing
Given the user is watching a video
When the backend API is unreachable or returns errors
Then the system MUST continue saving to localStorage
And the user experience MUST NOT be affected
And the system MUST retry backend sync when connectivity is restored

### Requirement: Priority Loading System

When loading a video episode, the system MUST implement a three-tier priority system for determining the initial playback position.

#### Scenario: Backend position available
Given a user has previously watched an episode on any device
When the user opens the episode
And the backend has a saved position for this episode
Then the system MUST load the position from the backend
And the system MUST seek the video player to that position
And the system MUST log "Loaded position from backend"

#### Scenario: No backend position, localStorage available
Given a user has previously watched an episode on the current device only
When the user opens the episode
And the backend has no saved position (or returns 404)
And localStorage has a saved position less than 30 days old
Then the system MUST load the position from localStorage
And the system MUST seek the video player to that position
And the system MUST log "Loaded position from localStorage"

#### Scenario: No saved position anywhere
Given a user opens an episode for the first time
When the user opens the episode
And the backend has no saved position
And localStorage has no saved position (or it's older than 30 days)
Then the system MUST set the initial position to 0
And the video MUST start from the beginning
And the system MUST log "No saved position found, starting from 0"

#### Scenario: Stale localStorage data
Given localStorage has a position record older than 30 days
When the user opens the episode
Then the system MUST ignore the stale localStorage data
And the system MUST check the backend or default to position 0

### Requirement: Debounced Backend Sync

To prevent excessive backend requests during rapid user interactions, the system MUST implement debouncing for backend synchronization calls.

#### Scenario: Rapid seek operations
Given a user is rapidly dragging the progress bar
When multiple seek events occur within 2 seconds
Then the system MUST debounce the backend save requests
And only the final position after 2 seconds of inactivity MUST be sent to the backend
And localStorage MUST still be updated immediately for each seek

#### Scenario: Multiple save triggers in quick succession
Given multiple save events occur (seek, then pause, then tab switch)
When these events happen within the debounce window
Then the system MUST cancel pending backend saves for the same episode
And only the most recent position MUST be sent to the backend

#### Scenario: Debounce per episode
Given a user has multiple tabs open with different episodes
When save events occur for different episodes
Then the debounce timer MUST be independent per episode key
And saves for different episodes MUST NOT interfere with each other

### Requirement: LocalStorage Error Handling

The system MUST gracefully handle localStorage errors including quota exceeded, private browsing mode, and disabled storage.

#### Scenario: LocalStorage quota exceeded
Given localStorage is near its capacity limit
When the system attempts to save a new position
Then the system MUST catch the QuotaExceededError
And the system MUST attempt to clear old position records (older than 60 days)
And the system MUST retry the save once after cleanup
And if still failing, the system MUST continue with memory-only storage

#### Scenario: Private browsing mode
Given the user is in private browsing mode with localStorage disabled
When the system attempts to save a position
Then the system MUST catch the access error
And the system MUST fall back to memory-only storage for the session
And the user experience MUST remain functional

#### Scenario: Corrupted localStorage data
Given localStorage contains corrupted or invalid JSON
When the system attempts to read a saved position
Then the system MUST catch the parse error
And the system MUST ignore the corrupted entry
And the system MUST fall back to the next priority source (backend or 0)

### Requirement: Network Failure Resilience

The system MUST maintain functionality when the backend API is unavailable or network connectivity is lost.

#### Scenario: Backend API returns error
Given the system attempts to sync position to backend
When the backend returns an error (4xx, 5xx, or network timeout)
Then the system MUST log a warning message
And the system MUST keep the localStorage save (which already succeeded)
And the system MUST NOT show an error notification to the user
And the system MUST continue normal video playback

#### Scenario: Backend unavailable during load
Given a user opens a video episode
When the backend API is unreachable
Then the system MUST fall back to localStorage after a timeout
And if localStorage also has no data, default to position 0
And the video MUST start playback without blocking

#### Scenario: Offline mode
Given the user has no internet connection
When the user watches a video and saves occur
Then all saves MUST succeed to localStorage
And backend sync errors MUST be silently ignored
And the system MUST queue failed sync for retry when online

## MODIFIED Requirements

### Requirement: Watch History Auto-Save Behavior

The system MUST replace interval-based auto-save with event-driven save triggers.

#### Scenario: Removed interval timer
Given the system previously used `setInterval` every 30 seconds
When the new event-driven system is implemented
Then the interval timer MUST be removed or increased to 5 minutes
And event-driven saves MUST become the primary save mechanism

#### Scenario: Backward compatibility during transition
Given the system is migrating to event-driven saves
When existing code calls `startAutoSave()`
Then the function MUST either use the new event system or a significantly longer interval
And deprecation warnings MUST be logged if using legacy behavior

## REMOVED Requirements

### Requirement: Fixed Interval Auto-Save

The requirement to save watch position every 30 seconds via `setInterval` is removed.

#### Scenario: Interval timer removed
Given the previous implementation saved position every 30 seconds
When the new implementation is deployed
Then the 30-second interval MUST be removed
And saves MUST only occur on specific user events or optional long-duration fallback

## Related Capabilities

- `video-player`: Video player state and event handling (modified for save triggers)
- `api-integration`: Backend API endpoints (unchanged, but call frequency reduced)
