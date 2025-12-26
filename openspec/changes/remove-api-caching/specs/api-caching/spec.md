# api-caching Specification

## Purpose

Defines the behavior for API data caching in the cycani-proxy backend. This specification removes server-side in-memory caching and provides frontend-controlled caching behavior via query parameters.

## ADDED Requirements

### Requirement: No Server-Side In-Memory Caching

The backend API SHALL NOT implement any server-side in-memory caching mechanisms for API responses.

#### Scenario: Anime list endpoint always fetches fresh data
- **WHEN** a client requests `/api/anime-list` with any parameters
- **THEN** the server SHALL fetch data directly from cycani.org
- **AND** SHALL NOT check any in-memory cache before fetching
- **AND** SHALL NOT store the response in any in-memory cache

#### Scenario: Episode count endpoint always fetches fresh data
- **WHEN** the `getAnimeEpisodeCount()` function is called
- **THEN** the server SHALL scrape episode count directly from cycani.org
- **AND** SHALL NOT check any in-memory cache
- **AND** SHALL NOT store the result in any in-memory cache

#### Scenario: Weekly schedule endpoint always fetches fresh data
- **WHEN** a client requests `/api/weekly-schedule`
- **THEN** the server SHALL scrape schedule data directly from cycani.org
- **AND** SHALL NOT check any in-memory cache
- **AND** SHALL NOT store the result in any in-memory cache

### Requirement: Frontend Cache Control Parameter

API endpoints that previously used caching SHALL support an optional `useCache` query parameter for future opt-in caching behavior.

#### Scenario: Default behavior without useCache parameter
- **WHEN** a client makes a request without the `useCache` parameter
- **THEN** the server SHALL fetch fresh data from the source
- **AND** SHALL NOT apply any caching logic

#### Scenario: useCache=false explicitly disables caching
- **WHEN** a client includes `useCache=false` or `useCache=0` in the query string
- **THEN** the server SHALL fetch fresh data from the source
- **AND** SHALL behave identically to omitting the parameter

#### Scenario: useCache=true for future caching implementation
- **WHEN** a client includes `useCache=true` or `useCache=1` in the query string
- **THEN** the server MAY use cached data if a caching system is implemented
- **AND** in the current implementation, SHALL still fetch fresh data (placeholder for future)

#### Scenario: useCache parameter combined with other parameters
- **WHEN** a client requests `/api/anime-list?page=1&search=naruto&useCache=false`
- **THEN** the server SHALL process all parameters normally
- **AND** SHALL fetch fresh data regardless of other parameter values

### Requirement: Preserve Refresh Parameter

The `/api/weekly-schedule` endpoint SHALL continue to support the existing `refresh` parameter for manual cache bypass behavior.

#### Scenario: refresh parameter bypasses any caching
- **WHEN** a client requests `/api/weekly-schedule?refresh=true` or `refresh=1`
- **THEN** the server SHALL fetch fresh schedule data
- **AND** the `refresh` parameter SHALL take precedence over any caching logic

### Requirement: Preserve Browser-Side Image Caching

The server SHALL continue to set `Cache-Control` headers for image resources to enable browser-side caching.

#### Scenario: Image proxy returns cache headers
- **WHEN** a client requests `/api/image-proxy`
- **THEN** the response SHALL include `Cache-Control: public, max-age=86400`
- **AND** browsers MAY cache the image for 24 hours

#### Scenario: Placeholder image returns cache headers
- **WHEN** a client requests `/api/placeholder-image`
- **THEN** the response SHALL include `Cache-Control: public, max-age=86400`
- **AND** browsers MAY cache the image for 24 hours

### Requirement: No Cache-Related Response Metadata

API responses SHALL NOT include cache-related metadata such as `fromCache` flags.

#### Scenario: API response structure
- **WHEN** a client receives any API response
- **THEN** the response SHALL NOT contain a `fromCache` field
- **AND** the response structure SHALL be identical whether data is freshly fetched or (in the future) cached

### Requirement: Frontend Cache Toggle Control

The frontend SHALL provide a global cache toggle that controls the `useCache` parameter sent with API requests. **IMPORTANT: Frontend 默认不使用缓存 - the cache toggle MUST be disabled by default.**

#### Scenario: Cache toggle disabled by default
- **WHEN** the frontend application initializes
- **THEN** the cache setting SHALL default to `disabled`
- **AND** all API requests SHALL include `useCache=false` or omit the parameter
- **AND** this default ensures fresh data is always fetched during development

#### Scenario: Cache toggle persists across sessions
- **WHEN** a user changes the cache toggle setting
- **THEN** the preference SHALL be stored in localStorage
- **AND** the setting SHALL persist across page reloads and browser restarts

#### Scenario: Cache toggle affects all relevant API requests
- **WHEN** the cache toggle is enabled
- **THEN** requests to `/api/anime-list` SHALL include `useCache=true`
- **AND** requests to `/api/weekly-schedule` SHALL include `useCache=true`
- **AND** episode count requests SHALL include `useCache=true`

#### Scenario: Cache toggle provides visual feedback
- **WHEN** the cache toggle is enabled
- **THEN** the UI SHALL display a warning that cached data may not be current
- **AND** the warning SHALL clearly indicate the trade-off between performance and data freshness

### Requirement: Remove Cache Implementation Code

All server-side cache implementation code SHALL be removed from the codebase.

#### Scenario: AnimeListCache class removed
- **WHEN** examining `src/urlConstructor.js`
- **THEN** the `AnimeListCache` class SHALL NOT exist
- **AND** no code SHALL import or reference this class

#### Scenario: Cache variables removed from server.js
- **WHEN** examining `src/server.js`
- **THEN** the following SHALL NOT exist:
  - `episodeCache` Map variable
  - `weeklyScheduleCache` Map variable
  - `animeListCache` instance
  - `CACHE_TTL` constant

#### Scenario: Cache initialization code removed
- **WHEN** the server starts up
- **THEN** no cache-clearing code SHALL execute on startup
- **AND** the console message "已清除所有缓存" SHALL NOT appear

### Requirement: API Behavior Consistency

With server-side caching removed, API endpoints SHALL maintain consistent behavior across multiple requests.

#### Scenario: Repeated requests return potentially different data
- **WHEN** a client makes multiple identical requests to `/api/anime-list`
- **THEN** each request MAY return different data if the source has changed
- **AND** the server SHALL NOT return identical cached responses

#### Scenario: Rate limiting prevents request flooding
- **WHEN** a client makes rapid successive requests
- **THEN** the existing rate limiting mechanism (`RATE_LIMIT_DELAY`) SHALL prevent excessive requests to cycani.org
- **AND** the server SHALL respect the configured delay between requests

### Requirement: Documentation Updates

Project documentation SHALL be updated to reflect the removal of server-side caching.

#### Scenario: CLAUDE.md documents cache removal
- **WHEN** reading the `Key API Endpoints` section in CLAUDE.md
- **THEN** it SHALL NOT mention server-side caching behavior
- **AND** it SHALL document the `useCache` parameter
- **AND** it SHALL note the default is no caching

#### Scenario: README reflects current behavior
- **WHEN** reading the main project README
- **THEN** it SHALL not describe in-memory caching as a feature
- **AND** it SHALL document the frontend cache toggle feature
