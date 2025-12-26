# Spec: Watch History Page

## ADDED Requirements

### Requirement: Dedicated Watch History Page

A dedicated history page MUST be available at `/history` that displays all watched anime with resume functionality, allowing users to easily continue watching from where they left off.

#### Scenario: Navigate to history page

**Given** the user is logged in (single-user "default" architecture)
**When** the user navigates to `/history` or clicks a "历史" link in the navigation
**Then** the HistoryView page should be displayed
**And** all watch history records should be fetched from the API

#### Scenario: Display watch history list

**Given** the history page is loaded
**When** watch history data is successfully fetched
**Then** each history entry should display: anime cover, title, season, episode, watch date, and progress bar
**And** entries should be sorted by watch date (most recent first)
**And** a "继续观看" (Resume Watching) button should be shown for each entry

#### Scenario: Resume watching from history

**Given** the user is on the history page
**When** the user clicks the "继续观看" button for a history entry
**Then** the user should be navigated to `/watch/:animeId?season=X&episode=Y&startTime=Z`
**And** the video should seek to the saved position (startTime) when loaded
**And** the autoplay preference should be respected

#### Scenario: Show progress for partially watched episodes

**Given** a history entry has a saved position and duration
**When** the history entry is displayed
**Then** a progress bar should show the percentage watched (position / duration * 100)
**And** the progress should be visually distinct (e.g., color-coded) based on completion status

#### Scenario: Handle empty history

**Given** the user has no watch history records
**When** the history page is loaded
**Then** an empty state message should be displayed
**And** a friendly message should encourage browsing anime from the homepage

### Requirement: History Page Navigation Link

A navigation link MUST be added to the main navigation to access the history page.

#### Scenario: Navigation bar includes history link

**Given** the user is viewing any page with the navigation bar
**When** the navigation bar is rendered
**Then** a "历史" (History) link should be present
**And** clicking it should navigate to `/history`
**And** the link should have a clock-history icon

### Requirement: History Data Management

Additional history management capabilities MUST be available on the history page.

#### Scenario: Delete individual history record

**Given** the user is on the history page
**When** the user clicks a delete button for a specific history entry
**Then** a confirmation dialog should be shown
**And** upon confirmation, the entry should be removed from both UI and backend
**And** the list should refresh

#### Scenario: Clear all history

**Given** the user is on the history page
**When** the user clicks a "清除历史" (Clear History) button
**Then** a confirmation dialog should be shown
**And** upon confirmation, all history records should be deleted
**And** the empty state should be displayed

### Requirement: History Route Configuration

A new route MUST be added to the Vue Router configuration.

#### Scenario: Route configuration for history page

**Given** the Vue Router is initialized
**When** the routes are defined
**Then** a route for path `/history` should exist with name `History`
**And** it should lazy-load `HistoryView.vue`
**And** the route meta title should be "观看历史"

## Implementation Notes

- Create `HistoryView.vue` in `frontend/src/views/`
- Add `/history` route to router configuration
- Add history link to `AppNavbar.vue` or existing navigation component
- Reuse `HistoryCard.vue` component if it exists in `frontend/src/components/history/`
- Use existing `historyStore.loadWatchHistory()` method
- Use existing `historyStore.getPosition()` for resume functionality
- Backend API already supports: `GET /api/watch-history`, `DELETE /api/watch-history` (if implemented), `GET /api/last-position/:animeId/:season/:episode`
- Consider adding delete API endpoints if not already implemented
- Use existing "Continue Watching" section in `HomeView.vue` as reference for card styling

## Related Specs

- Cross-reference: `autoplay-preference` (autoplay preference applies when resuming from history)
- Cross-reference: `anime-list-display` (history page should link back to browse anime)

## MODIFIED Requirements

### Requirement: History Store Methods

The history store MUST support loading full watch history including both completed and incomplete entries.

#### Scenario: Load full watch history (not just continue watching)

**Given** the history store is initialized
**When** `loadWatchHistory()` is called
**Then** it should fetch all history records from `/api/watch-history`
**And** the records should include both completed and incomplete entries
**And** the `watchHistory` array should be populated with the results
