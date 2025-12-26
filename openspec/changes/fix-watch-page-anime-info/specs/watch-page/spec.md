# Watch Page Specification

## ADDED Requirements

### Requirement: Anime Information Display

The system SHALL display comprehensive anime information on the watch page, including cover image, metadata, and episode list.

#### Scenario: User navigates to watch page
- **WHEN** a user navigates to the watch page (`/watch/:animeId?season=X&episode=Y`)
- **THEN** the system shall display the anime cover image in the sidebar
- **AND** the system shall display anime metadata (type, year, total episodes)
- **AND** the system shall display anime description if available
- **AND** the system shall populate the episode list with all available episodes

#### Scenario: Anime data fetch succeeds
- **WHEN** both episode API and anime API calls succeed
- **THEN** the system shall populate all anime information fields
- **AND** the episode list shall display episode buttons for all available episodes
- **AND** the currently playing episode shall be highlighted in the list

#### Scenario: Anime data fetch fails gracefully
- **WHEN** the anime API call fails but the episode API succeeds
- **THEN** the system shall display the video player with video playback working
- **AND** the system shall show a placeholder image for the anime cover
- **AND** the system shall display a loading state or hide the episode list
- **AND** the system shall log the error for debugging

#### Scenario: Episode list navigation
- **WHEN** a user clicks on an episode button in the episode list
- **THEN** the system shall navigate to that episode
- **AND** the system shall update the video player with the new episode
- **AND** the system shall highlight the newly selected episode in the list

### Requirement: Parallel Data Loading

The system SHALL load episode data and anime metadata in parallel to minimize page load time.

#### Scenario: Parallel API calls on page load
- **WHEN** the watch page mounts
- **THEN** the system shall initiate both episode API and anime API calls simultaneously
- **AND** the system shall use `Promise.allSettled()` to handle results independently
- **AND** the system shall not block video playback if anime metadata loading is slow

#### Scenario: Episode API completes before anime API
- **WHEN** the episode API response arrives before the anime API response
- **THEN** the system shall initialize the video player immediately
- **AND** the system shall show loading state for anime cover and episode list
- **AND** the system shall update anime information when anime API response arrives

### Requirement: Episode List Generation

The system SHALL generate an episode list based on the total episode count from the anime detail API.

#### Scenario: Generate episode list from total count
- **WHEN** the anime API returns an anime with `totalEpisodes` value
- **THEN** the system shall generate an array of episode numbers from 1 to totalEpisodes
- **AND** the system shall render an episode button for each episode number
- **AND** the system shall highlight the current episode in the list

#### Scenario: Episode list empty when totalEpisodes is zero
- **WHEN** the anime API returns `totalEpisodes: 0` or the value is missing
- **THEN** the system shall display an empty episode list
- **AND** the system shall show a loading state or "No episodes available" message

### Requirement: Anime Cover Image Display

The system SHALL display the anime cover image using the image proxy for external URLs.

#### Scenario: Display proxied cover image
- **WHEN** the anime API returns a cover URL
- **THEN** the system shall use `animeService.getImageProxyUrl()` to convert external URLs
- **AND** the system shall display the proxied image in the sidebar card
- **AND** the system shall fall back to a placeholder image if cover URL is null

#### Scenario: External cover URL handling
- **WHEN** the cover URL is an external HTTP/HTTPS URL
- **THEN** the system shall convert it to `/api/image-proxy?url=<encodedUrl>` format
- **AND** the system shall handle loading errors gracefully with fallback image

### Requirement: Anime Metadata Display

The system SHALL display anime metadata including type, year, and description.

#### Scenario: Display anime type and year badges
- **WHEN** the anime API returns type and year values
- **THEN** the system shall display type as a badge (e.g., "TV", "OVA")
- **AND** the system shall display year as a badge (e.g., "2024")
- **AND** the system shall display total episode count as a badge (e.g., "12 集")

#### Scenario: Display anime description
- **WHEN** the anime API returns a description
- **THEN** the system shall display the description text below the cover image
- **AND** the system shall truncate long descriptions if needed
- **AND** the system shall hide the description section if not available
