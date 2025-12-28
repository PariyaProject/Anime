## ADDED Requirements

### Requirement: Video URL Expiration Detection
The system SHALL parse and detect expiration parameters from video URLs to determine when a URL will become invalid.

#### Scenario: Parse x-expires timestamp
- **GIVEN** a video URL with x-expires parameter (e.g., `x-expires=1766852953`)
- **WHEN** the URL is loaded by the video player
- **THEN** the system extracts the Unix timestamp and calculates the expiration datetime

#### Scenario: Calculate time remaining until expiration
- **GIVEN** a video URL with x-expires parameter
- **WHEN** the current time is queried
- **THEN** the system calculates the remaining time in milliseconds until expiration

#### Scenario: Handle URLs without expiration
- **GIVEN** a video URL without x-expires parameter
- **WHEN** the URL is analyzed
- **THEN** the system treats the URL as non-expiring (Infinite TTL)

### Requirement: 403 Error Recovery
The system SHALL detect 403 Forbidden errors when loading video URLs and automatically refresh to a valid URL while preserving playback position.

#### Scenario: Detect 403 error on video element
- **GIVEN** a video is playing with an expired URL
- **WHEN** the browser attempts to load the video segment
- **THEN** the system detects the 403 error via the video error event

#### Scenario: Refresh URL on 403 error
- **GIVEN** a 403 error is detected on the current video URL
- **WHEN** the error handler is triggered
- **THEN** the system calls the refresh endpoint to obtain a fresh, valid URL

#### Scenario: Preserve playback position during refresh
- **GIVEN** a video was playing at timestamp 123.5 seconds when 403 occurred
- **WHEN** the URL is refreshed and updated
- **THEN** the video resumes playback from the same 123.5 second position

#### Scenario: Maintain play/pause state after refresh
- **GIVEN** a video was playing when URL expired
- **WHEN** the URL is refreshed
- **THEN** the video automatically resumes playback after the new URL loads

#### Scenario: Show notification during refresh
- **GIVEN** a URL refresh is in progress
- **WHEN** the refresh takes longer than 500ms
- **THEN** the system displays a subtle toast notification: "刷新视频链接..."

### Requirement: Pre-emptive URL Refresh
The system SHALL refresh video URLs before they expire when the video is paused, preventing 403 errors entirely.

#### Scenario: Check expiration periodically
- **GIVEN** a video is loaded with an expiring URL
- **WHEN** the expiration checker runs (every 30 seconds)
- **THEN** the system calculates time remaining until URL expiration

#### Scenario: Trigger refresh before expiration
- **GIVEN** a video URL expires in less than 60 seconds
- **WHEN** the video is currently paused
- **THEN** the system pre-emptively refreshes the URL to a fresh one

#### Scenario: Don't interrupt active playback
- **GIVEN** a video is currently playing
- **WHEN** the URL expires in less than 60 seconds
- **THEN** the system delays refresh until the video is paused

#### Scenario: Handle resume after pre-emptive refresh
- **GIVEN** a user paused video and URL was pre-emptively refreshed
- **WHEN** the user resumes playback
- **THEN** playback continues seamlessly without any 403 errors

### Requirement: Backend URL Refresh Endpoint
The system SHALL provide a backend API endpoint that returns a fresh, non-expired video URL for a given episode.

#### Scenario: Refresh endpoint accepts episode parameters
- **GIVEN** a request to `/api/refresh-video-url/:animeId/:season/:episode`
- **WHEN** the endpoint is called
- **THEN** the system returns a JSON response with `success: true` and fresh `videoUrl`

#### Scenario: Re-fetch URL using original encrypted ID
- **GIVEN** an episode's original encrypted URL (cycani- ID)
- **WHEN** the refresh endpoint is called
- **THEN** the backend uses Puppeteer to fetch a fresh signed URL from player.cycanime.com

#### Scenario: Cache refreshed URLs
- **GIVEN** a URL has been refreshed within the last 5 minutes
- **WHEN** another refresh request is made for the same episode
- **THEN** the system returns the cached URL without invoking Puppeteer

#### Scenario: Handle refresh failures gracefully
- **GIVEN** Puppeteer fails to fetch a fresh URL
- **WHEN** the refresh endpoint cannot obtain a valid URL
- **THEN** the system returns `success: false` with an error message

### Requirement: Original URL Storage
The system SHALL store the original encrypted URL alongside the decrypted real URL to enable future refreshes.

#### Scenario: Include originalUrl in episode response
- **GIVEN** a request to `/api/episode/:animeId/:season/:episode`
- **WHEN** the response is generated
- **THEN** the response includes both `realVideoUrl` (decrypted) and `originalUrl` (encrypted cycani- ID)

#### Scenario: Use originalUrl for refresh
- **GIVEN** a real video URL has expired
- **WHEN** the refresh endpoint is called
- **THEN** the system uses the stored `originalUrl` to fetch a fresh real URL

#### Scenario: Backward compatibility for existing clients
- **GIVEN** an existing client that doesn't expect originalUrl
- **WHEN** the episode endpoint is called
- **THEN** the system includes originalUrl but existing functionality remains unchanged

### Requirement: Visual Feedback for URL Status
The system SHALL provide visual indicators for video URL expiration status to inform users about potential issues.

#### Scenario: Show warning for expiring URL
- **GIVEN** a video URL will expire in less than 5 minutes
- **WHEN** the video is loaded
- **THEN** the system displays a subtle warning icon near the player

#### Scenario: Show error for expired URL
- **GIVEN** a video URL has already expired
- **WHEN** the user attempts to play the video
- **THEN** the system displays an error message: "视频链接已过期，正在刷新..."

#### Scenario: Hide indicators for non-expiring URLs
- **GIVEN** a video URL without x-expires parameter
- **WHEN** the video is loaded
- **THEN** no expiration indicators are shown

### Requirement: Refresh Debouncing
The system SHALL prevent multiple concurrent refresh requests for the same episode to reduce server load and avoid race conditions.

#### Scenario: Debounce simultaneous refresh requests
- **GIVEN** multiple components trigger refresh for the same episode simultaneously
- **WHEN** the first refresh request is in progress
- **THEN** subsequent requests wait and reuse the result from the first request

#### Scenario: Cache refresh results
- **GIVEN** a URL has been successfully refreshed
- **WHEN** another refresh is requested within 30 seconds
- **THEN** the system returns the cached result without making a backend call

#### Scenario: Clear cache on failure
- **GIVEN** a refresh request failed
- **WHEN** another refresh is requested
- **THEN** the system makes a new backend request (not cached)
