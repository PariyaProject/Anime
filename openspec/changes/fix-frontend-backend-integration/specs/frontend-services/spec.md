# Spec Delta: Frontend Services

## ADDED Requirements

### Requirement: Weekly Schedule Service
The frontend MUST provide a service for fetching weekly anime schedule data from the backend.

#### Scenario: Fetch full weekly schedule
**Given** the user wants to see all anime scheduled for the week
**When** `weeklyScheduleService.getWeeklySchedule()` is called without parameters
**Then** a GET request SHALL be made to `/api/weekly-schedule?day=all`
**And** the response MUST contain schedule data for all 7 days

#### Scenario: Fetch specific day schedule
**Given** the user wants to see anime scheduled for Monday
**When** `weeklyScheduleService.getWeeklySchedule('monday')` is called
**Then** a GET request SHALL be made to `/api/weekly-schedule?day=monday`
**And** the response MUST contain only Monday's anime

#### Scenario: Weekly schedule data structure
**Given** the backend returns a weekly schedule response
**When** the response is parsed
**Then** it MUST have the structure:
```typescript
{
  schedule: {
    monday: WeeklyAnime[],
    tuesday: WeeklyAnime[],
    // ... other days
  },
  updated: string,  // ISO date
  filter: string    // 'all' or specific day
}
```

### Requirement: Anime Search Service
The frontend MUST provide a dedicated search method using the backend's search endpoint.

#### Scenario: Search with valid query
**Given** the user searches for "spy family"
**When** `animeService.searchAnime('spy family')` is called
**Then** a GET request SHALL be made to `/api/search-anime?q=spy%20family`
**And** matching anime results SHALL be returned

#### Scenario: Search with short query
**Given** the user searches for "a" (single character)
**When** `animeService.searchAnime('a')` is called
**Then** no API request SHALL be made
**And** an empty result set MUST be returned

#### Scenario: Search with empty query
**Given** the user searches with empty string
**When** `animeService.searchAnime('')` is called
**Then** no API request SHALL be made
**And** an empty result set MUST be returned

### Requirement: Image Proxy Helper
The frontend MUST provide a utility function for converting external image URLs to proxied URLs.

#### Scenario: Proxy external image URL
**Given** an anime has cover image `https://example.com/cover.jpg`
**When** `animeService.getImageProxyUrl('https://example.com/cover.jpg')` is called
**Then** it SHALL return `/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fcover.jpg`

#### Scenario: Already proxied URL
**Given** an anime already has a proxied image URL `/api/image-proxy?url=...`
**When** `animeService.getImageProxyUrl('/api/image-proxy?url=...')` is called
**Then** it SHALL return the URL unchanged

#### Scenario: Null or empty URL
**Given** an anime has no cover image (null or empty)
**When** `animeService.getImageProxyUrl(null)` is called
**Then** it SHALL return `null`

### Requirement: Type Definitions for Backend Responses
The frontend MUST have TypeScript types matching all backend API response structures.

#### Scenario: BackendResponse wrapper type
**Given** any backend API endpoint returns a response
**When** the response is typed
**Then** it MUST use the generic `BackendResponse<T>` type with fields:
```typescript
{
  success: boolean
  data: T
  error?: string
  details?: string[]
}
```

#### Scenario: WeeklyAnime type
**Given** weekly schedule data is fetched
**When** the data is typed
**Then** each anime MUST have `WeeklyAnime` type with fields:
```typescript
{
  id: string
  title: string
  cover: string
  rating: string
  status: string
  broadcastTime: string
  url: string
  watchUrl: string | null
  day: string
}
```

#### Scenario: SearchResult type
**Given** search results are fetched
**When** the data is typed
**Then** each result MUST have `SearchResult` type with fields:
```typescript
{
  id: string
  title: string
  cover: string
  url: string
}
```

## MODIFIED Requirements

### Requirement: History Service API Contract
The `saveWatchPosition` method signature MUST change to match the backend API requirements.

#### Scenario: Updated method signature
**Given** a component needs to save watch position
**When** calling `historyService.saveWatchPosition()`
**Then** it MUST provide:
- `animeInfo`: object with `id`, `title`, `cover`
- `episodeInfo`: object with `season`, `episode`, optional `title` and `duration`
- `position`: number in seconds

#### Scenario: Backward compatibility (temporary)
**Given** existing code calls the old signature
**When** the old signature is used
**Then** a deprecation warning SHALL be logged
**And** the call SHALL be forwarded to the new method with transformed parameters

## REMOVED Requirements

None. All requirements are additions or modifications.
