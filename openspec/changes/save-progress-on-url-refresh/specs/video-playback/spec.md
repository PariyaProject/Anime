# Video Playback Spec

## ADDED Requirements

### Requirement: Progress Persistence Before URL Refresh

The system SHALL save the current playback position to the backend before refreshing an expired video URL to prevent progress loss on page refresh.

#### Scenario: Save position before automatic URL refresh
**Given** a video is playing at timestamp 330 seconds (5:30)
**When** the video URL expires and automatic refresh is triggered
**Then** the system saves position 330 to the backend BEFORE fetching the new URL

#### Scenario: Save position before manual URL refresh
**Given** a video is paused at timestamp 180 seconds (3:00)
**When** the user manually triggers URL refresh via `testForceRefresh()`
**Then** the system saves position 180 to the backend BEFORE the refresh begins

#### Scenario: Continue refresh even if save fails
**Given** a video URL needs to be refreshed
**When** the backend save request fails (network error, server down)
**Then** the system continues with URL refresh and attempts memory-only position restore
**And** logs the save failure as a warning

#### Scenario: Verify position restoration after page refresh
**Given** a video was at 5:30 when URL was refreshed
**And** the position was saved to backend during refresh
**When** the user refreshes the browser page
**Then** the video resumes from approximately 5:30 (allowing for small rounding differences)

### Requirement: Reliable Position Recovery After URL Refresh

The system SHALL restore playback position only after the video metadata is fully loaded to ensure seek operations succeed.

#### Scenario: Wait for duration before restoring position
**Given** a new video URL has been loaded after refresh
**And** the saved position is 330 seconds
**When** the system attempts to restore the playback position
**Then** the system waits for `duration` to be available and greater than 0
**And** only then sets `player.currentTime = 330`

#### Scenario: Timeout if position restore fails
**Given** a video URL has been refreshed
**And** the saved position is 330 seconds
**When** the video metadata fails to load within 5 seconds
**Then** the system stops attempting to restore position
**And** logs a warning message
**And** continues playback from the beginning

#### Scenario: Restore play state after position recovery
**Given** a video was playing before URL refresh
**When** the position is successfully restored after refresh
**Then** the system automatically resumes playback
**And** maintains the same volume and mute settings

### Requirement: Save Progress on User-Initiated Position Changes

The system SHALL immediately save playback position to the backend when the user manually changes the playback position.

#### Scenario: Save on fast forward
**Given** a video is playing at position 100 seconds
**When** the user clicks the fast forward button (+10 seconds)
**Then** the system saves the new position (110 seconds) to the backend immediately

#### Scenario: Save on rewind
**Given** a video is playing at position 200 seconds
**When** the user clicks the rewind button (-10 seconds)
**Then** the system saves the new position (190 seconds) to the backend immediately

#### Scenario: Save on progress bar click
**Given** a video is playing
**When** the user clicks directly on the progress bar to jump to position 300 seconds
**Then** the system saves position 300 seconds to the backend immediately

#### Scenario: Save on keyboard seek
**Given** a video is playing at position 150 seconds
**When** the user presses the right arrow key to seek forward
**Then** the system saves the new position to the backend immediately

#### Scenario: Apply threshold for manual seeks
**Given** a user seeks to a new position
**And** the difference from last saved position is only 2 seconds
**When** the save operation is triggered
**Then** the system saves without threshold (manual seeks always save)
**And** does not apply the 5-second threshold used for automatic saves
