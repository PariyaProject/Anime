# Video Player Progress Tracking Specification

## MODIFIED Requirements

### Requirement: Video Player Progress Display

The system SHALL display real-time video playback progress in the progress bar and time display.

#### Scenario: User watches video with cycani- ID
- **WHEN** a user watches a video with a `cycani-` prefixed video ID
- **THEN** the system shall use the Plyr player (not iframe)
- **AND** the progress bar shall update in real-time as the video plays
- **AND** the time display shall show current position and total duration
- **AND** the progress percentage shall be calculated accurately

#### Scenario: User watches video with direct MP4 URL
- **WHEN** a user watches a video with a direct MP4 URL
- **THEN** the system shall use the Plyr player
- **AND** the progress bar shall update in real-time as the video plays
- **AND** the time display shall show current position and total duration

#### Scenario: User watches video with player.cycanime.com URL
- **WHEN** a user watches a video with an existing `player.cycanime.com` URL
- **THEN** the system shall use the iframe player
- **AND** the progress bar may not update (known limitation due to cross-origin restrictions)
- **AND** the system shall log a warning about iframe progress tracking limitations

#### Scenario: Video playback reaches different positions
- **WHEN** video playback progresses to 25%, 50%, 75%, and 100%
- **THEN** the progress bar shall reflect the accurate percentage
- **AND** the time display shall update with the current position in `M:SS` format
- **AND** the progress bar animation shall be smooth (not jerky)

### Requirement: Player State Synchronization

The system SHALL synchronize video playback state between local component refs and the player store.

#### Scenario: Plyr timeupdate event fires
- **WHEN** the Plyr player fires a `timeupdate` event
- **THEN** the system shall update the local `currentTime` ref
- **AND** the system shall update the local `duration` ref
- **AND** the system shall call `playerStore.updateTime(currentTime)`
- **AND** the system shall call `playerStore.updateDuration(duration)`

#### Scenario: Video player is destroyed
- **WHEN** the user navigates away from the watch page
- **THEN** the system shall clean up the Plyr player instance
- **AND** the system shall clear the progress tracking interval
- **AND** the system shall preserve the final playback position in the history store

### Requirement: Player Selection Logic

The system SHALL select the appropriate player type based on the video URL format.

#### Scenario: Video URL is a cycani- ID
- **WHEN** the `realVideoUrl` starts with `cycani-`
- **THEN** the system shall set `useIframePlayer` to `false`
- **AND** the system shall pass the `cycani-` ID to the Plyr player
- **AND** the Plyr player shall handle the video playback

#### Scenario: Video URL is a player.cycanime.com URL
- **WHEN** the `realVideoUrl` contains `player.cycanime.com`
- **THEN** the system shall set `useIframePlayer` to `true`
- **AND** the system shall use the iframe player
- **AND** progress tracking may be limited (known limitation)

#### Scenario: Video URL is a direct MP4 URL
- **WHEN** the `realVideoUrl` is a direct MP4 URL (not `cycani-` and not `player.cycanime.com`)
- **THEN** the system shall set `useIframePlayer` to `false`
- **AND** the system shall use the Plyr player
- **AND** progress tracking shall work correctly

### Requirement: Progress Bar Visual Feedback

The system SHALL provide clear visual feedback for video playback progress.

#### Scenario: Progress bar at 0%
- **WHEN** video playback starts
- **THEN** the progress bar shall be at 0% width
- **AND** the time display shall show `0:00 / [total duration]`

#### Scenario: Progress bar at 50%
- **WHEN** video playback reaches the halfway point
- **THEN** the progress bar shall be at approximately 50% width
- **AND** the time display shall show the current position and total duration

#### Scenario: Progress bar at 100%
- **WHEN** video playback completes
- **THEN** the progress bar shall be at 100% width
- **AND** the time display shall show the total duration for both values
- **AND** the video ended event shall trigger

### Requirement: Watch History Position Saving

The system SHALL save the current playback position every 30 seconds for resume functionality.

#### Scenario: Auto-save interval triggers
- **WHEN** 30 seconds have elapsed since the last save
- **THEN** the system shall call `savePosition()` with the current playback time
- **AND** the system shall save the position to the history store
- **AND** the system shall handle save errors gracefully without interrupting playback

#### Scenario: User navigates away before auto-save
- **WHEN** the user navigates away from the watch page
- **THEN** the system shall attempt to save the final position immediately
- **AND** the system shall clean up the auto-save interval
- **AND** the next visit shall resume from the saved position

### Requirement: Time Display Formatting

The system SHALL format time values in `M:SS` format for readability.

#### Scenario: Format current time
- **WHEN** the current time is `125` seconds
- **THEN** the system shall display `2:05` in the time display

#### Scenario: Format duration
- **WHEN** the total duration is `1445` seconds
- **THEN** the system shall display `24:05` in the time display

#### Scenario: Handle invalid time values
- **WHEN** the time value is `NaN`, `null`, or `undefined`
- **THEN** the system shall display `0:00` in the time display
- **AND** the progress bar shall remain at 0%

### Requirement: Auto-Resume from Saved Position

The system SHALL automatically resume playback from the last saved position when opening an episode.

#### Scenario: User opens episode with saved progress
- **WHEN** a user navigates to an episode with a saved position greater than 5 seconds
- **THEN** the system shall fetch the saved position from the backend API
- **AND** the system shall seek the video player to the saved position after the player is ready
- **AND** the system shall display a toast notification: "继续播放: X:YY"
- **AND** the video shall begin playback from the saved position

#### Scenario: User opens new episode (no progress)
- **WHEN** a user navigates to an episode with no saved position or position < 5 seconds
- **THEN** the system shall start playback from the beginning (0:00)
- **AND** the system shall NOT show a resume notification
- **AND** the system shall treat the episode as new

#### Scenario: User opens completed episode
- **WHEN** a user navigates to an episode with saved position within 30 seconds of the end
- **THEN** the system shall start playback from the beginning
- **AND** the system shall NOT show a resume notification
- **AND** the system shall treat the episode as completed

#### Scenario: Backend API returns position
- **WHEN** the backend API `/api/last-position/:animeId/:season/:episode` returns a position
- **THEN** the system shall parse the position value in seconds
- **AND** the system shall validate the position is within acceptable range (> 5 and < duration - 30)
- **AND** the system shall apply the position to the video player

#### Scenario: Backend API fails to return position
- **WHEN** the backend API call fails or returns an error
- **THEN** the system shall start playback from the beginning
- **AND** the system shall log the error for debugging
- **AND** the system shall NOT interrupt the user experience with error messages

### Requirement: Per-Episode Progress Storage

The system SHALL store playback progress independently for each episode with a unique key.

#### Scenario: Save progress for episode
- **WHEN** the auto-save interval triggers (every 30 seconds)
- **THEN** the system shall generate a unique key: `{animeId}_{season}_{episode}`
- **AND** the system shall save the current position under this key
- **AND** the system shall NOT overwrite progress from other episodes

#### Scenario: Load progress for specific episode
- **WHEN** a user opens episode 5998, season 1, episode 14
- **THEN** the system shall query the backend with key `5998_1_14`
- **AND** the system shall retrieve only the position for that specific episode
- **AND** the system shall NOT load positions from other episodes

#### Scenario: Multiple episodes with progress
- **WHEN** a user has watched episode 1 to 5:00 and episode 2 to 10:30
- **THEN** the system shall store both positions independently
- **AND** opening episode 1 shall resume from 5:00
- **AND** opening episode 2 shall resume from 10:30
- **AND** the positions shall NOT interfere with each other

### Requirement: Cross-Device Progress Synchronization

The system SHALL synchronize playback progress across devices using backend storage.

#### Scenario: Watch on desktop, resume on mobile
- **WHEN** a user watches an episode on desktop and stops at 15:30
- **AND** the same user opens the same episode on mobile
- **THEN** the mobile app shall fetch the saved position from the backend
- **AND** the mobile app shall resume playback from 15:30
- **AND** a toast notification shall show "继续播放: 15:30"

#### Scenario: Watch on mobile, resume on desktop
- **WHEN** a user watches an episode on mobile and stops at 8:45
- **AND** the same user opens the same episode on desktop
- **THEN** the desktop app shall fetch the saved position from the backend
- **AND** the desktop app shall resume playback from 8:45
- **AND** a toast notification shall show "继续播放: 8:45"

#### Scenario: Concurrent access from multiple devices
- **WHEN** a user is watching on desktop and simultaneously opens the same episode on mobile
- **THEN** the device that opened later shall resume from the last saved position
- **AND** both devices shall save progress independently every 30 seconds
- **AND** the last save shall override previous saves

#### Scenario: Backend storage consistency
- **WHEN** progress is saved from any device
- **THEN** the backend shall write to `data/proxy/watch-history.json`
- **AND** the backend shall use the key format `{animeId}_{season}_{episode}`
- **AND** the backend shall persist the data for retrieval by any device

### Requirement: Resume Notification Display

The system SHALL display a toast notification when resuming from a saved position.

#### Scenario: Show resume notification
- **WHEN** playback resumes from a saved position
- **THEN** the system shall display a toast notification at the top of the screen
- **AND** the notification shall show: "继续播放: X:YY" (where X:YY is the saved position)
- **AND** the notification shall auto-dismiss after 3 seconds
- **AND** the notification shall use the "info" style

#### Scenario: Notification positioning and timing
- **WHEN** the video player seeks to the saved position
- **THEN** the toast notification shall appear after the seek completes
- **AND** the notification shall NOT interrupt video playback
- **AND** the notification shall be non-blocking (user can dismiss)

#### Scenario: No notification for new episodes
- **WHEN** an episode has no saved position or position < 5 seconds
- **THEN** the system shall NOT display a resume notification
- **AND** the playback shall start normally from the beginning
