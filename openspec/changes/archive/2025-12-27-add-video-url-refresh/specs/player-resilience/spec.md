## ADDED Requirements

### Requirement: Video Error Detection and Classification
The system SHALL detect video element errors and classify them by type to determine appropriate recovery actions.

#### Scenario: Detect media load errors
- **GIVEN** a video element fails to load the source
- **WHEN** the browser triggers the error event
- **THEN** the system extracts the error code and message from the MediaError object

#### Scenario: Classify 403 Forbidden errors
- **GIVEN** a video error event is triggered
- **WHEN** the error is due to an expired URL (HTTP 403)
- **THEN** the system classifies it as `URL_EXPIRED` error type

#### Scenario: Classify network errors
- **GIVEN** a video error event is triggered
- **WHEN** the error is due to network connectivity issues
- **THEN** the system classifies it as `NETWORK_ERROR` error type

#### Scenario: Classify unsupported format errors
- **GIVEN** a video error event is triggered
- **WHEN** the browser cannot decode the video format
- **THEN** the system classifies it as `UNSUPPORTED_FORMAT` error type

### Requirement: Automatic Error Recovery
The system SHALL automatically attempt to recover from video errors without user intervention when possible.

#### Scenario: Recover from expired URL
- **GIVEN** a `URL_EXPIRED` error is detected
- **WHEN** the error handler is triggered
- **THEN** the system automatically refreshes the URL and resumes playback

#### Scenario: Retry on transient network errors
- **GIVEN** a `NETWORK_ERROR` is detected
- **WHEN** the error handler is triggered
- **THEN** the system waits 2 seconds and retries loading the video source

#### Scenario: Show user action prompt for unrecoverable errors
- **GIVEN** an `UNSUPPORTED_FORMAT` error is detected
- **WHEN** the error cannot be automatically recovered
- **THEN** the system displays an error message with a "Reload Page" button

### Requirement: Playback State Preservation During Recovery
The system SHALL preserve the complete playback state (position, play state, volume) during error recovery to maintain user experience.

#### Scenario: Save playback position before refresh
- **GIVEN** a video is playing at 123.5 seconds
- **WHEN** a URL refresh is triggered
- **THEN** the system saves the current playback position (123.5) before changing the source

#### Scenario: Restore playback position after refresh
- **GIVEN** a URL was refreshed at position 123.5
- **WHEN** the new video source is loaded
- **THEN** the system seeks to the saved 123.5 position

#### Scenario: Preserve play/pause state
- **GIVEN** a video was playing before error occurred
- **WHEN** the URL is refreshed
- **THEN** the video automatically resumes playback after the new source loads

#### Scenario: Preserve volume settings
- **GIVEN** a video volume was set to 75%
- **WHEN** the URL is refreshed
- **THEN** the volume remains at 75% after the refresh

### Requirement: User Notification During Recovery
The system SHALL provide subtle, non-intrusive notifications to inform users about automatic recovery actions.

#### Scenario: Show toast during URL refresh
- **GIVEN** a URL refresh is in progress
- **WHEN** the refresh takes longer than 500ms
- **THEN** a toast notification appears: "刷新视频链接..." and disappears on completion

#### Scenario: Show success notification after recovery
- **GIVEN** a URL was successfully refreshed
- **WHEN** playback resumes
- **THEN** a brief success toast appears: "视频链接已刷新"

#### Scenario: Show error message on recovery failure
- **GIVEN** URL refresh failed after 3 retry attempts
- **WHEN** all recovery attempts are exhausted
- **THEN** an error message is displayed: "无法刷新视频链接，请刷新页面重试"

### Requirement: Retry Strategy with Exponential Backoff
The system SHALL implement exponential backoff for retryable errors to avoid overwhelming the server.

#### Scenario: First retry uses 2 second delay
- **GIVEN** a recoverable error occurs (e.g., temporary 403)
- **WHEN** the first retry is attempted
- **THEN** the system waits 2 seconds before retrying

#### Scenario: Second retry uses 4 second delay
- **GIVEN** the first retry failed
- **WHEN** the second retry is attempted
- **THEN** the system waits 4 seconds before retrying

#### Scenario: Third retry uses 8 second delay
- **GIVEN** the first two retries failed
- **WHEN** the third retry is attempted
- **THEN** the system waits 8 seconds before retrying

#### Scenario: Stop after 3 failed retries
- **GIVEN** 3 retry attempts have all failed
- **WHEN** the third retry fails
- **THEN** the system stops retrying and shows an error message to the user

### Requirement: Graceful Degradation
The system SHALL degrade gracefully when automatic recovery features are not available.

#### Scenario: Fall back to manual refresh when backend unavailable
- **GIVEN** the backend refresh endpoint is unreachable
- **WHEN** a URL expiration error occurs
- **THEN** the system shows a message: "视频链接已过期，请刷新页面"

#### Scenario: Fall back to iframe player when Plyr fails
- **GIVEN** the Plyr player cannot recover from an error
- **WHEN** the original URL included a player.cycanime.com reference
- **THEN** the system falls back to using the iframe player

#### Scenario: Continue with degraded features when Puppeteer unavailable
- **GIVEN** the Puppeteer service is not installed or fails
- **WHEN** a URL refresh is requested
- **THEN** the system returns the original URL with a warning, allowing manual page refresh

### Requirement: Error Logging and Monitoring
The system SHALL log all video errors and recovery attempts for debugging and monitoring purposes.

#### Scenario: Log error details
- **GIVEN** a video error occurs
- **WHEN** the error is detected
- **THEN** the system logs error type, error message, video URL, and timestamp to console

#### Scenario: Log recovery attempts
- **GIVEN** a recovery action is triggered
- **WHEN** the recovery is attempted
- **THEN** the system logs recovery type, parameters, and result to console

#### Scenario: Log recovery successes
- **GIVEN** a recovery action succeeds
- **WHEN** playback resumes
- **THEN** the system logs success confirmation and recovery time

#### Scenario: Log recovery failures
- **GIVEN** a recovery action fails
- **WHEN** the failure is confirmed
- **THEN** the system logs failure reason and number of attempts made
