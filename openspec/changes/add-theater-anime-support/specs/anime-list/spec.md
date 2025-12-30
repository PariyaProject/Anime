# anime-list Specification

## Purpose

Defines requirements for browsing and filtering anime content across multiple channels (TV, Theater, 4K, 国漫) with support for search, genre, year, letter, and sort filters.

## ADDED Requirements

### Requirement: Multi-Channel Anime Listing
The system SHALL support browsing anime from multiple content channels, with channel as a primary filter parameter.

#### Scenario: List TV anime (default)
- **GIVEN** the user accesses the anime list page without specifying a channel
- **WHEN** the page loads
- **THEN** the system SHALL default to `channel='tv'`
- **AND** SHALL fetch anime from `https://www.cycani.org/show/20.html`
- **AND** SHALL display TV anime in the list

#### Scenario: List theater anime
- **GIVEN** the user selects the "剧场" (Theater) channel tab
- **WHEN** the channel selection changes to `channel='movie'`
- **THEN** the system SHALL fetch anime from `https://www.cycani.org/show/21.html`
- **AND** SHALL display theater anime in the list
- **AND** the URL SHALL update to include `?channel=movie`

#### Scenario: Channel parameter in API request
- **GIVEN** the frontend requests anime list with channel parameter
- **WHEN** `GET /api/anime-list?channel=movie&page=1` is called
- **THEN** the backend SHALL construct the URL using channel ID 21
- **AND** SHALL scrape the correct channel page
- **AND** SHALL return theater anime results

#### Scenario: Channel mapping
- **GIVEN** the system maps channel names to channel IDs
- **WHEN** constructing URLs for different channels
- **THEN** `channel='tv'` SHALL map to channel ID 20
- **AND** `channel='movie'` SHALL map to channel ID 21
- **AND** `channel='4k'` SHALL map to channel ID 26 (future)
- **AND** `channel='guoman'` SHALL map to channel ID 27 (future)

### Requirement: Channel Selection UI
The system SHALL provide channel selection tabs in the navigation bar to allow users to switch between content channels.

#### Scenario: Display channel tabs in navbar
- **GIVEN** the application loads and the navbar renders
- **WHEN** viewing the navbar
- **THEN** channel tabs SHALL be displayed: [TV] [剧场]
- **AND** the active channel tab SHALL be visually highlighted
- **AND** inactive tabs SHALL be clickable

#### Scenario: Switch channel via tab
- **GIVEN** the user is viewing TV anime
- **WHEN** the user clicks the "剧场" tab
- **THEN** the selected channel SHALL change to `channel='movie'`
- **AND** the URL query parameter SHALL update to `?channel=movie`
- **AND** the anime list SHALL refresh with theater anime
- **AND** the "剧场" tab SHALL become active/highlighted

#### Scenario: Channel persists during navigation
- **GIVEN** the user is viewing theater anime
- **WHEN** the user applies additional filters (genre, year, sort)
- **THEN** the channel parameter SHALL remain `channel='movie'`
- **AND** all filters SHALL be applied within the theater channel
- **AND** the URL SHALL include both channel and filter parameters

#### Scenario: Channel selection from URL
- **GIVEN** a user navigates to a URL with channel parameter
- **WHEN** the page loads with `?channel=movie&genre=科幻`
- **THEN** the system SHALL set channel to `movie`
- **AND** SHALL display theater anime filtered by genre
- **AND** the "剧场" tab SHALL be active

### Requirement: Channel Filtering with Other Filters
The system SHALL support combining channel selection with all existing filters (genre, year, letter, sort, search).

#### Scenario: Channel with genre filter
- **GIVEN** the user selects theater channel
- **WHEN** the user applies genre filter `genre='科幻'`
- **THEN** the system SHALL fetch from `https://www.cycani.org/show/21/class/科幻.html`
- **AND** SHALL return theater sci-fi anime only

#### Scenario: Channel with year filter
- **GIVEN** the user selects theater channel
- **WHEN** the user applies year filter `year='2024'`
- **THEN** the system SHALL fetch from `https://www.cycani.org/show/21/year/2024.html`
- **AND** SHALL return theater anime from 2024 only

#### Scenario: Channel with sort and pagination
- **GIVEN** the user selects theater channel
- **WHEN** the user applies sort `sort='score'` and page `page=2`
- **THEN** the system SHALL fetch from `https://www.cycani.org/show/21/by/score/page/2.html`
- **AND** SHALL return sorted, paginated theater anime

#### Scenario: Reset filters when switching channel
- **GIVEN** the user has filters applied on TV channel
- **WHEN** the user switches to theater channel
- **THEN** the genre, year, letter filters MAY be reset or retained (user preference)
- **AND** the channel parameter SHALL change to `movie`
- **AND** results SHALL reflect the new channel

### Requirement: Per-Channel Anime Index
The system SHALL build and maintain separate search indices for each content channel to ensure fast lookups and prevent ID collisions.

#### Scenario: Build TV anime index
- **GIVEN** the anime index manager runs
- **WHEN** building the index for `channel='tv'`
- **THEN** the system SHALL scrape `https://www.cycani.org/show/20.html`
- **AND** SHALL create `anime-index-tv.json` with TV anime data
- **AND** each entry SHALL include channel identifier

#### Scenario: Build theater anime index
- **GIVEN** the anime index manager runs
- **WHEN** building the index for `channel='movie'`
- **THEN** the system SHALL scrape `https://www.cycani.org/show/21.html`
- **AND** SHALL create `anime-index-movie.json` with theater anime data
- **AND** theater anime IDs SHALL be scoped to theater channel

#### Scenario: Search within channel index
- **GIVEN** the user searches while viewing theater channel
- **WHEN** search query is submitted
- **THEN** the system SHALL search within `anime-index-movie.json`
- **AND** SHALL return results from theater channel only
- **AND** SHALL NOT return TV anime results

#### Scenario: Prevent ID collision across channels
- **GIVEN** TV anime has ID 123 and theater anime also has ID 123
- **WHEN** either anime is accessed
- **THEN** the channel parameter SHALL distinguish between them
- **AND** `/api/anime/123?channel=tv` returns TV anime
- **AND** `/api/anime/123?channel=movie` returns theater anime

### Requirement: Channel Parameter Validation
The system SHALL validate channel parameter values and reject invalid channel names.

#### Scenario: Valid channel values
- **GIVEN** the API receives a channel parameter
- **WHEN** the channel is one of: `tv`, `movie`, `4k`, `guoman`
- **THEN** the request SHALL proceed normally
- **AND** the corresponding channel ID SHALL be used

#### Scenario: Invalid channel defaults to TV
- **GIVEN** the API receives an invalid channel parameter
- **WHEN** the channel is `unknown` or invalid
- **THEN** the system SHALL default to `channel='tv'`
- **AND** SHALL return TV anime results
- **AND** MAY log a warning about invalid channel

#### Scenario: Empty channel parameter
- **GIVEN** the API receives no channel parameter
- **WHEN** `channel` is omitted from the request
- **THEN** the system SHALL default to `channel='tv'`
- **AND** SHALL behave as if `?channel=tv` was specified

### Requirement: Channel-Aware Watch History
The system SHALL store and retrieve watch history records with channel information to support cross-channel continue watching.

#### Scenario: Save watch history with channel
- **GIVEN** the user watches an episode from theater channel
- **WHEN** watch position is saved
- **THEN** the history record SHALL include `channel='movie'`
- **AND** SHALL include animeId, season, episode, position
- **AND** the record SHALL be stored in watch history

#### Scenario: Load continue watching across channels
- **GIVEN** the user has watched TV episodes 1-3 and theater episodes 1-2
- **WHEN** the continue watching section loads
- **THEN** the system SHALL display both TV and theater anime
- **AND** SHALL NOT filter by current channel
- **AND** each card SHALL show the correct channel badge

#### Scenario: Resume playback with correct channel
- **GIVEN** the user clicks continue watching for a theater anime
- **WHEN** navigation to the watch page occurs
- **THEN** the channel parameter SHALL be preserved
- **AND** the correct anime SHALL load from theater channel

### Requirement: Type Field Distinction
The system SHALL maintain clear distinction between `channel` (content source) and `type` (anime format) fields.

#### Scenario: Type metadata display
- **GIVEN** an anime has `type='剧场'` and `channel='tv'`
- **WHEN** the anime card is displayed
- **THEN** the type badge SHALL show "剧场"
- **AND** the channel SHALL be indicated by the current tab selection
- **AND** the badge SHALL NOT show "TV" for channel

#### Scenario: Theater channel with various types
- **GIVEN** the user browses theater channel
- **WHEN** theater anime are displayed
- **THEN** the type field MAY be '剧场', 'OVA', 'OAD', or '电影'
- **AND** the channel SHALL always be `movie`
- **AND** type SHALL be displayed as a badge on the card

#### Scenario: API response includes both fields
- **GIVEN** the frontend requests anime details
- **WHEN** the API returns anime data
- **THEN** the response SHALL include both `channel` and `type` fields
- **AND** `channel` SHALL be one of: 'tv', 'movie', '4k', 'guoman'
- **AND** `type` SHALL be one of: 'TV', '剧场', 'OVA', 'OAD', '电影'

### Requirement: Search Scope
The system SHALL perform site-wide search (not channel-scoped) when using the search functionality.

#### Scenario: Search returns results from all channels
- **GIVEN** the user submits a search query
- **WHEN** search is performed
- **THEN** results SHALL include TV anime matching the query
- **AND** results SHALL include theater anime matching the query
- **AND** each result SHALL indicate its source channel

#### Scenario: Search uses different endpoint
- **GIVEN** the user uses the search box
- **WHEN** search query is submitted
- **THEN** the system SHALL use the `/search` endpoint (not channel-specific)
- **AND** SHALL NOT apply channel filter to search results
- **AND** channel tabs SHALL remain available for post-search filtering

#### Scenario: Channel tabs hidden on search results
- **GIVEN** the user is viewing search results
- **WHEN** search results page is displayed
- **THEN** the channel tabs MAY be hidden or dimmed
- **AND** search results SHALL show channel badges
- **AND** clicking a channel badge SHALL filter to that channel
