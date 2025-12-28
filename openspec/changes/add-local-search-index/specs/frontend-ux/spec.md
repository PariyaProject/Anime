## ADDED Requirements

### Requirement: Hybrid Search Mode
The system SHALL use local search for text-based queries while continuing to use remote API for filter-based browsing to leverage the working category endpoints.

#### Scenario: Text search uses local index
- **GIVEN** the local anime index has been built
- **WHEN** the user types text in the search box (e.g., "间谍过家家")
- **THEN** the system SHALL use `/api/search-local` endpoint
- **AND** the results SHALL come from the local index
- **AND** the filter dropdowns (genre, year, sort) SHALL be ignored or disabled

#### Scenario: Filter-based browsing uses remote API
- **GIVEN** the user has not typed any search text
- **WHEN** the user selects filters (genre=TV, year=2024, sort=score)
- **THEN** the system SHALL use the existing `/api/anime-list` endpoint with those filter parameters
- **AND** the results SHALL come from the remote website (which has no anti-bot protection for filters)
- **AND** these results SHALL trigger incremental index updates if year=all and sort=time

#### Scenario: Clear search text switches back to filter mode
- **GIVEN** the user has typed "间谍" in the search box and is viewing local search results
- **WHEN** the user clears the search text (empties the search box)
- **THEN** the system SHALL switch back to filter-based browsing mode
- **AND** the system SHALL reload the current filter selection from `/api/anime-list`
- **AND** the results SHALL display according to the selected filters

#### Scenario: Disable filters when text search is active
- **GIVEN** the user has typed text in the search box
- **WHEN** the search box is not empty
- **THEN** the filter dropdowns (genre, year, sort) SHALL be visually disabled
- **AND** changing filter values SHALL have no effect until search text is cleared
- **AND** a tooltip SHALL explain "清除搜索文字以使用筛选器" (Clear search to use filters)

### Requirement: Local Anime Search
The system SHALL provide a local search index for anime that returns search results without requiring external API calls or CAPTCHA verification.

#### Scenario: Search anime using local index
- **GIVEN** the local anime index has been built and contains 5000+ anime titles
- **WHEN** the user enters a search query "间谍过家家" in the search box
- **THEN** the system SHALL return matching results from the local index within 100ms
- **AND** the results SHALL include: anime ID, title, cover image, year, status
- **AND** the results SHALL be ranked by relevance (exact matches first, then partial matches)

#### Scenario: Fuzzy search support
- **GIVEN** the local anime index contains "间谍过家家 第二季"
- **WHEN** the user searches for "间谍" or "过家家"
- **THEN** the system SHALL return "间谍过家家 第二季" in the results
- **AND** partial matches SHALL be ranked lower than exact matches

#### Scenario: Handle empty search results gracefully
- **GIVEN** the local anime index exists
- **WHEN** the user searches for a non-existent anime "xyzabc123"
- **THEN** the system SHALL return an empty result set
- **AND** the frontend SHALL display "未找到相关动画" (No anime found)

#### Scenario: Fallback to legacy search if index is empty
- **GIVEN** the local anime index has not been built yet or is empty
- **WHEN** the user performs a search
- **THEN** the system SHALL fallback to the legacy `/api/search-anime` endpoint
- **AND** the frontend SHALL display a warning "搜索索引尚未构建，使用远程搜索"

### Requirement: Initial Index Building from Category Browsing
The system SHALL automatically build the initial anime index by scraping category combinations (genre × year) from cycani.org, which has no anti-bot protection.

#### Scenario: Build initial index on server startup
- **GIVEN** the server is starting and `config/anime-index.json` does not exist
- **WHEN** the server startup process begins
- **THEN** the system SHALL start scraping anime using category browsing
- **AND** the system SHALL scrape all combinations:
  - Genres: "", "TV", "电影", "OVA" (4 types)
  - Years: 2015-2025 (11 years)
  - Total: ~44 page combinations (some may be empty)
- **AND** each page SHALL be scraped with rate limiting (1 second delay between requests)
- **AND** the completed index SHALL be saved to `config/anime-index.json`

#### Scenario: Serve requests during index building
- **GIVEN** the server is still building the initial anime index
- **WHEN** a user performs a search
- **THEN** the system SHALL return HTTP 503 (Service Unavailable)
- **AND** the response SHALL contain building progress:
  ```json
  {
    "success": false,
    "error": "Anime index is building",
    "progress": { "current": 15, "total": 44, "percent": 34 }
  }
  ```
- **AND** the frontend SHALL display "搜索索引正在构建中，请稍后再试" (Index building, please try again later)

#### Scenario: Resume interrupted index build
- **GIVEN** the server was shutdown during index building at combination 20/44
- **WHEN** the server restarts
- **THEN** the system SHALL detect the partial index file
- **AND** the system SHALL resume building from combination 20
- **AND** the system SHALL complete the remaining combinations and save the final index

#### Scenario: Graceful degradation if scraping fails
- **GIVEN** the initial index building fails due to network errors
- **WHEN** the server cannot complete the index build
- **THEN** the system SHALL log the error and continue running
- **AND** search SHALL fallback to the legacy `/api/search-anime` endpoint
- **AND** an admin CAN manually trigger index rebuild later

### Requirement: Backend-Driven Incremental Index Updates
The system SHALL automatically update the local index transparently on the backend when users browse with "All Years" + "Newest First" sorting. No special frontend logic or API calls are required.

#### Scenario: Backend updates index transparently during normal API request
- **GIVEN** the local anime index contains IDs [..., 6016, 6015, ...]
- **WHEN** the user browses the homepage (year=all, sort=time)
- **AND** the frontend calls `GET /api/anime-list?year=&sort=time`
- **THEN** the backend SHALL check if year is empty/all AND sort is "time"
- **AND** the backend SHALL fetch anime list from cycani.org (48 items)
- **AND** the backend SHALL compare internally against the cached index:
  - [0] ID 6020: not in index → add to batch
  - [1] ID 6019: not in index → add to batch
  - [2] ID 6018: not in index → add to batch
  - [3] ID 6017: not in index → add to batch
  - [4] ID 6016: exists → start safety buffer
  - [5-9] exists → safety buffer → STOP
- **AND** the backend SHALL update the index with the 4 new anime
- **AND** the backend SHALL save the updated index to disk
- **AND** the backend SHALL return the anime list results normally
- **AND** the frontend SHALL be unaware that an index update occurred

#### Scenario: Skip index update when year is not "all"
- **GIVEN** the user has selected a specific year filter (year=2024)
- **WHEN** the frontend calls `GET /api/anime-list?year=2024&sort=time`
- **THEN** the backend SHALL check if year is empty/all AND sort is "time"
- **AND** the backend SHALL detect year is NOT empty/all
- **AND** the backend SHALL skip the index update check
- **AND** the backend SHALL return results normally without touching the index

#### Scenario: Skip index update when sort is not "newest"
- **GIVEN** the user has selected a different sort (sort=score or sort=hits)
- **WHEN** the frontend calls `GET /api/anime-list?year=&sort=score`
- **THEN** the backend SHALL check if year is empty/all AND sort is "time"
- **AND** the backend SHALL detect sort is NOT "time"
- **AND** the backend SHALL skip the index update check
- **AND** the backend SHALL return results normally without touching the index

#### Scenario: Index grows organically as users browse homepage
- **GIVEN** the local anime index has 5000 anime
- **WHEN** multiple users browse the homepage (year=all, sort=time) over time
- **THEN** the backend SHALL automatically detect and add new anime to the index
- **AND** the index SHALL remain up-to-date without background tasks or special frontend logic

### Requirement: Search API Endpoints
The system SHALL provide REST API endpoints for searching the local anime index and managing index updates.

#### Scenario: Query search endpoint with valid query
- **GIVEN** the local anime index exists and is populated
- **WHEN** a GET request is made to `/api/search-local?q=间谍`
- **THEN** the system SHALL return HTTP 200 with JSON body
- **AND** the response SHALL contain:
  ```json
  {
    "success": true,
    "data": {
      "animeList": [...],
      "searchQuery": "间谍",
      "totalCount": 42,
      "indexLastUpdated": "2025-12-28T10:00:00Z"
    }
  }
  ```

#### Scenario: Query with short search term
- **GIVEN** the local anime index exists
- **WHEN** a GET request is made to `/api/search-local?q=x`
- **THEN** the system SHALL return HTTP 400
- **AND** the response SHALL contain error message "搜索关键词至少需要2个字符"

#### Scenario: Get index status
- **GIVEN** the local anime index exists
- **WHEN** a GET request is made to `/api/index-status`
- **THEN** the system SHALL return HTTP 200 with JSON body
- **AND** the response SHALL contain:
  ```json
  {
    "success": true,
    "data": {
      "totalAnime": 5247,
      "lastUpdated": "2025-12-28T10:00:00Z",
      "isBuilding": false
    }
  }
  ```

#### Scenario: Manual index rebuild (admin)
- **GIVEN** the local anime index exists but may be stale
- **WHEN** a POST request is made to `/api/index-rebuild`
- **THEN** the system SHALL start rebuilding the index from scratch
- **AND** the system SHALL return HTTP 202 (Accepted)
- **AND** the response SHALL contain:
  ```json
  {
    "success": true,
    "message": "Index rebuild started"
  }
  ```
- **AND** the index SHALL be rebuilt in the background without blocking requests
