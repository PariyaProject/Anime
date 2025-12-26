# Spec: Anime List Display Fix

## ADDED Requirements

### Requirement: Full Anime List Display on Homepage Load

The homepage MUST display a complete list of anime (not just one item) when first loaded, ensuring users can browse the available content catalog.

#### Scenario: Initial homepage load shows multiple anime items

**Given** the user navigates to the homepage `/`
**When** the page loads for the first time
**Then** at least 20 anime items should be displayed in the anime grid
**And** a loading spinner should be shown while data is being fetched
**And** if fewer than 10 items are returned, an error should be logged for investigation

#### Scenario: Pagination returns correct item count

**Given** the user is on page 1 with default limit settings
**When** the anime list API responds with data
**Then** the `animeList` array should contain exactly the number of items specified by the `limit` parameter (or fewer if at end of catalog)
**And** the displayed page count should reflect the actual number of items shown

#### Scenario: Empty response handling

**Given** the anime list API returns an empty array or single item unexpectedly
**When** the response is received
**Then** the UI should display an appropriate empty state message
**And** a retry button should be available to fetch the data again
**And** the error should be logged for debugging

### Requirement: Default Filter Configuration

The default filter parameters for fetching the anime list MUST be configured to return a meaningful number of results.

#### Scenario: Default filters return adequate results

**Given** no user filters are applied
**When** `loadAnimeList()` is called with default parameters
**Then** the `limit` parameter should be set to at least 20 items
**And** the `page` parameter should default to 1
**And** all other filter parameters (search, genre, year) should be empty strings to show all content

## MODIFIED Requirements

### Requirement: Anime List State Management

The anime store state management MUST properly update the UI when anime list data changes.

#### Scenario: State updates trigger UI refresh

**Given** the anime list data is successfully fetched
**When** `animeList.value` is updated in the store
**Then** the computed `hasAnime` should return true if list has items
**And** the `AnimeGrid` component should re-render with new data
**And** loading state should be set to false

## Implementation Notes

- Update default `limit` in `HomeView.vue` filters from current value to at least 20
- Verify backend pagination mapping at `server.js:660` correctly slices the anime list array
- Add defensive checks for empty or single-item responses
- Consider increasing default limit to 48 to match source website pagination
