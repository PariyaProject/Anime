# Capability: Video URL Extraction

## Purpose

Define requirements for reliable video URL extraction from player.cycanime.com using Puppeteer and fallback mechanisms. This capability ensures the backend can extract real video URLs that work in the frontend Plyr player.

## ADDED Requirements

### Requirement: Puppeteer Video Element Detection with Extended Wait

The system SHALL use Puppeteer to detect video elements with extended wait times and retry logic to handle dynamic player initialization.

#### Scenario: Wait for MuiPlayer PRO initialization

- **GIVEN** a request to extract video URL from player.cycanime.com
- **WHEN** Puppeteer loads the page
- **THEN** the system waits up to 60 seconds for page load completion
- **AND** waits an additional 3-10 seconds for video element initialization

#### Scenario: Retry video element detection with exponential backoff

- **GIVEN** the initial video element detection fails
- **WHEN** the first attempt returns no video element
- **THEN** the system retries after 3 seconds
- **AND** if second attempt fails, retries after 5 seconds
- **AND** if third attempt fails, retries after 10 seconds
- **AND** stops after 4 total attempts

#### Scenario: Detect video element in shadow DOM

- **GIVEN** MuiPlayer PRO uses shadow DOM encapsulation
- **WHEN** standard video element query fails
- **THEN** the system traverses shadow DOM roots
- **AND** queries for video elements within each shadow root

#### Scenario: Detect video element in nested iframes

- **GIVEN** the video player is embedded in nested iframes
- **WHEN** video element is not found in main document
- **THEN** the system searches all iframe content documents
- **AND** queries for video elements within each iframe

### Requirement: Network Request Interception as Fallback

The system SHALL intercept network requests to capture video URLs when direct element detection fails.

#### Scenario: Intercept video file requests

- **GIVEN** Puppeteer page is loading the player
- **WHEN** the page loads, request interception is enabled
- **THEN** the system intercepts all XHR and fetch requests
- **AND** filters requests for video file extensions (.m3u8, .mp4, .ts, .webm, .flv)

#### Scenario: Capture first matching video URL

- **GIVEN** a network request matches video file patterns
- **WHEN** the intercepted request URL contains a video file extension
- **THEN** the system stores the first matching URL
- **AND** returns it as the extracted video URL

#### Scenario: Fallback to network interception when element detection fails

- **GIVEN** all video element detection attempts fail
- **WHEN** no video element was found after retries
- **THEN** the system returns any intercepted video URL
- **OR** returns null if no video URL was intercepted

### Requirement: Enhanced HTTP+AES Fallback

The system SHALL attempt to extract video URLs from HTML and JavaScript when Puppeteer methods fail.

#### Scenario: Detect blob URLs in HTML

- **GIVEN** the HTML content contains blob URLs
- **WHEN** parsing the page with Cheerio
- **THEN** the system extracts blob:https:// URLs from video src attributes
- **AND** from JavaScript variables and objects

#### Scenario: Parse MuiPlayer PRO configuration

- **GIVEN** the page contains MuiPlayer PRO configuration
- **WHEN** parsing the page HTML and JavaScript
- **THEN** the system extracts video URLs from MuiPlayer config objects
- **AND** parses JSON-encoded video sources

#### Scenario: Enhanced regex patterns for video URLs

- **GIVEN** standard regex patterns fail to find video URLs
- **WHEN** performing fallback HTTP+AES parsing
- **THEN** the system uses comprehensive regex patterns for:
  - ByteCDN/ByteImg URLs (tos-cn, byteimg.com)
  - Common CDN patterns (video, media, stream)
  - Query parameter encoded URLs
  - Fragment-embedded URLs

### Requirement: Comprehensive Error Logging and Diagnostics

The system SHALL log detailed diagnostic information to aid in debugging extraction failures.

#### Scenario: Log page structure on failure

- **GIVEN** video element detection fails
- **WHEN** all retry attempts are exhausted
- **THEN** the system logs the page title
- **AND** logs the DOM tree structure (top 100 elements)
- **AND** logs all script and iframe elements

#### Scenario: Log network requests during page load

- **GIVEN** network request interception is enabled
- **WHEN** the page loads
- **THEN** the system logs all intercepted request URLs
- **AND** logs which requests matched video patterns

#### Scenario: Provide actionable error messages

- **GIVEN** video URL extraction fails completely
- **WHEN** all methods return null
- **THEN** the system logs specific failure reasons
- **AND** suggests possible fixes (e.g., "Increase timeout", "Check player structure")

### Requirement: Graceful Degradation

The system SHALL gracefully handle failures and provide fallback options.

#### Scenario: Return player URL as last resort

- **GIVEN** all extraction methods fail
- **WHEN** no video URL can be extracted
- **THEN** the system returns the original player.cycanime.com URL
- **AND** logs a warning that frontend may need to use iframe player

#### Scenario: Handle Puppeteer unavailability

- **GIVEN** Puppeteer is not installed or fails to launch
- **WHEN** video URL extraction is requested
- **THEN** the system skips Puppeteer methods
- **AND** proceeds directly to HTTP+AES fallback

#### Scenario: Handle browser pool exhaustion

- **GIVEN** the browser pool has no available instances
- **WHEN** a page creation request is made
- **THEN** the system waits up to 30 seconds for an available browser
- **OR** returns null and proceeds to fallback methods

### Requirement: Performance and Resource Management

The system SHALL manage browser resources efficiently to prevent memory leaks and excessive resource consumption.

#### Scenario: Close pages after extraction

- **GIVEN** a video URL extraction completes (success or failure)
- **WHEN** the result is determined
- **THEN** the system closes the Puppeteer page
- **AND** returns the browser instance to the pool

#### Scenario: Limit concurrent extractions

- **GIVEN** multiple video URL extraction requests occur simultaneously
- **WHEN** the browser pool is at maximum capacity
- **THEN** the system queues excess requests
- **AND** processes them when browser instances become available

#### Scenario: Clean up on error

- **GIVEN** an error occurs during extraction
- **WHEN** the error is caught
- **THEN** the system ensures the page is closed
- **AND** the browser instance is returned to the pool
- **AND** resources are properly released

### Requirement: Cache Management for Extracted URLs

The system SHALL cache extracted video URLs to reduce repeated Puppeteer operations.

#### Scenario: Cache successful extractions

- **GIVEN** a video URL is successfully extracted
- **WHEN** the extraction completes
- **THEN** the system caches the URL with the encrypted ID as key
- **AND** sets a 5-minute TTL on the cache entry

#### Scenario: Return cached URL on repeat requests

- **GIVEN** a video URL was extracted within the last 5 minutes
- **WHEN** the same encrypted ID is requested again
- **THEN** the system returns the cached URL without invoking Puppeteer
- **AND** logs "Cached URL returned"

#### Scenario: Invalidate cache on extraction failure

- **GIVEN** a cached URL fails to play (403 error)
- **WHEN** the frontend reports URL expiration
- **THEN** the system invalidates the cache entry
- **AND** triggers a fresh extraction on next request
