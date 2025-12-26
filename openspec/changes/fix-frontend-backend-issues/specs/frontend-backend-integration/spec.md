## ADDED Requirements

### Requirement: Image URL Resolution
The frontend SHALL correctly resolve and display anime cover images from the backend image proxy API.

#### Scenario: Backend returns image proxy URL
- **WHEN** backend `/api/anime-list` endpoint returns `cover` field as `/api/image-proxy?url=...`
- **THEN** frontend SHALL use the URL as-is (absolute path from backend host)
- **AND** frontend SHALL NOT duplicate the API base URL

#### Scenario: Backend returns placeholder path
- **WHEN** backend returns `/api/placeholder-image` or `/placeholder/...`
- **THEN** frontend SHALL prepend the API base URL to create absolute URL
- **AND** frontend SHALL display the placeholder image correctly

#### Scenario: Image fails to load
- **WHEN** image URL fails to load (404, network error, etc.)
- **THEN** frontend SHALL fallback to placeholder image
- **AND** frontend SHALL prevent infinite error loops

### Requirement: Video URL Retrieval
The frontend SHALL retrieve and use playable video URLs from the backend episode API.

#### Scenario: Backend returns realVideoUrl
- **WHEN** backend `/api/episode/:animeId/:season/:episode` returns `realVideoUrl` field
- **THEN** frontend video player SHALL use this URL for playback
- **AND** the URL SHALL be a valid video source (mp4, webm, etc.)

#### Scenario: Backend returns encrypted video URL
- **WHEN** backend returns `decryptedVideoUrl` or `videoUrl` but not `realVideoUrl`
- **THEN** frontend SHALL try the decrypted URL
- **AND** frontend SHALL handle URL format appropriately

#### Scenario: Video URL retrieval fails
- **WHEN** backend API returns error or video URL is null/undefined
- **THEN** frontend SHALL display user-friendly error message
- **AND** frontend SHALL provide retry option

### Requirement: API Response Format
The backend `/api/episode` endpoint SHALL return properly formatted episode data with video URLs.

#### Scenario: Successful episode data retrieval
- **WHEN** client requests `/api/episode/:animeId/:season/:episode`
- **THEN** backend SHALL return `{ success: true, data: { realVideoUrl: string, ... } }`
- **AND** `realVideoUrl` SHALL be a directly playable video URL
- **OR** if Puppeteer extraction fails, backend SHALL return a fallback URL

#### Scenario: Puppeteer video URL extraction
- **WHEN** backend uses Puppeteer to extract video URL
- **THEN** backend SHALL timeout after 12 seconds if no URL found
- **AND** backend SHALL log detailed error messages
- **AND** backend SHALL return decrypted video ID as fallback

## MODIFIED Requirements

### Requirement: Frontend Error Handling
The frontend SHALL provide clear error messages and recovery options when API calls fail.

#### Scenario: API network error
- **WHEN** API call fails due to network error
- **THEN** frontend SHALL display "Network error - please check your connection"
- **AND** frontend SHALL provide retry button

#### Scenario: API returns 500 error
- **WHEN** backend returns 500 status code
- **THEN** frontend SHALL display "Server error" message
- **AND** frontend SHALL provide retry button

#### Scenario: API returns 404 error
- **WHEN** resource is not found (404)
- **THEN** frontend SHALL display "Resource not found" message
- **AND** frontend SHOULD provide navigation back to home
