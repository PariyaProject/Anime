# Spec Delta: API Integration

## ADDED Requirements

### Requirement: Backend Response Success Validation
The frontend MUST validate the `success` field in all backend API responses and properly handle error responses.

#### Scenario: Successful API response
**Given** a backend API returns `{ success: true, data: {...} }`
**When** the frontend processes the response
**Then** the response SHALL be unwrapped and `data` shall be returned

#### Scenario: Failed API response
**Given** a backend API returns `{ success: false, error: "Error message" }`
**When** the frontend processes the response
**Then** an error MUST be thrown with the error message from the response

#### Scenario: Validation errors response
**Given** a backend API returns `{ success: false, error: "...", details: ["field1", "field2"] }`
**When** the frontend processes the response
**Then** an error MUST be thrown including the error details array

### Requirement: Consistent Response Unwrapping
All frontend service functions MUST consistently unwrap the backend response wrapper pattern.

#### Scenario: Anime list response
**Given** the `/api/anime-list` endpoint returns `{ success: true, data: { animeList: [...], ... } }`
**When** `animeService.getAnimeList()` is called
**Then** it SHALL return the unwrapped `data` object, not the full response

#### Scenario: History response
**Given** the `/api/continue-watching` endpoint returns `{ success: true, data: [...] }`
**When** `historyService.getContinueWatching()` is called
**Then** it SHALL return the unwrapped data array

## MODIFIED Requirements

### Requirement: Watch History Position Saving
The frontend MUST save watch positions using the correct backend API endpoint with proper request structure.

#### Scenario: Saving watch position with full info
**Given** a user is watching an anime at position 123 seconds
**When** the position is saved via `historyService.saveWatchPosition()`
**Then** a POST request MUST be made to `/api/watch-history` with body:
```json
{
  "animeInfo": { "id": "123", "title": "Anime Title", "cover": "url" },
  "episodeInfo": { "season": 1, "episode": 5, "title": "Episode 5", "duration": 1440 },
  "position": 123
}
```

#### Scenario: Retrieving saved watch position
**Given** a user previously saved position at 123 seconds for anime 123 season 1 episode 5
**When** `historyService.getLastPosition('123', 1, 5)` is called
**Then** a GET request SHALL be made to `/api/last-position/123/1/5`
**And** the response SHALL return `{ success: true, data: { position: 123, lastUpdated: "..." } }`

## REMOVED Requirements

### Requirement: Legacy Position Saving Endpoint
**Removed**: The previous implementation incorrectly posted to `/api/last-position` which doesn't exist.

**Rationale**: The backend only has a GET endpoint for retrieving last position. Saving position should go through `/api/watch-history` with position included in the request body.
