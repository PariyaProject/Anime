# frontend-ux Specification Delta

## MODIFIED Requirements

### Requirement: Grouped Continue Watching Display
The system SHALL display continue watching content grouped by anime and season, showing a single card per anime with access to all watched episodes.

#### Scenario: Display grouped anime cards
- **GIVEN** a user has watched episodes 1, 2, and 3 of "Anime A" season 1
- **WHEN** the user views the Continue Watching section on the homepage
- **THEN** a single card for "Anime A" season 1 SHALL be displayed
- **AND** the card SHALL show the anime cover, title, and total episodes watched (3)
- **AND** the card SHALL display overall progress based on the latest episode
- **AND** the anime title SHALL be truncated with ellipsis if it exceeds the card width

#### Scenario: Show latest episode with quick resume
- **GIVEN** a grouped anime card for "Anime A" with episodes 1, 2, and 3 watched
- **WHEN** the card is displayed in collapsed state
- **THEN** the card SHALL prominently show the latest watched episode (episode 3)
- **AND** a "Continue" button SHALL navigate directly to episode 3
- **AND** the saved position for episode 3 SHALL be restored on playback

#### Scenario: Expand to view all watched episodes
- **GIVEN** a grouped anime card in collapsed state
- **WHEN** the user clicks on the card body (not the Continue button)
- **THEN** the card SHALL expand to show all watched episodes
- **AND** each episode SHALL display its individual progress bar
- **AND** clicking on any episode SHALL navigate to that specific episode

#### Scenario: Display progress for each episode in expanded view
- **GIVEN** an expanded grouped anime card showing episodes 1, 2, and 3
- **WHEN** the user views the episode list
- **THEN** each episode SHALL show: episode number, progress bar, completion status
- **AND** completed episodes SHALL display a "已看完" (Completed) badge
- **AND** in-progress episodes SHALL show the position (e.g., "12:35 / 24:00")
- **AND** episode titles SHALL be truncated with ellipsis if they exceed the card width

#### Scenario: Group by anime and season separately
- **GIVEN** a user has watched episodes of "Anime A" season 1 and season 2
- **WHEN** the Continue Watching section is displayed
- **THEN** two separate cards SHALL be shown: one for season 1, one for season 2
- **AND** each card SHALL only contain episodes from its respective season

#### Scenario: Show tooltip on hover for truncated titles
- **GIVEN** a grouped anime card with a truncated anime title
- **WHEN** the user hovers over the title element
- **THEN** the full anime title SHALL be displayed in a browser tooltip
- **AND** the tooltip SHALL use the HTML `title` attribute

#### Scenario: Display localStorage-only entries with visual indicator
- **GIVEN** a merged Continue Watching list with localStorage-only entries
- **WHEN** the list is displayed to the user
- **THEN** entries that exist only in localStorage SHALL show a "未同步" (Not Synced) badge
- **AND** the badge SHALL have reduced opacity or different color to distinguish from synced entries
- **AND** clicking the entry SHALL still navigate to the episode normally

## ADDED Requirements

### Requirement: Save Position on Video Play Event
The system SHALL save watch position immediately when the video play event fires, including on initial autoplay, ensuring backend records are created even when the user watches for only a few seconds.

#### Scenario: Save position on first autoplay
- **GIVEN** a user navigates to the watch page for an anime episode
- **WHEN** the video starts autoplaying
- **THEN** the play event SHALL trigger `savePositionImmediate()` with the current position
- **AND** the position SHALL be saved to localStorage synchronously
- **AND** the position SHALL be asynchronously synced to the backend
- **AND** no condition SHALL be applied (save even if position is 0)

#### Scenario: Save position on manual play
- **GIVEN** a user has paused the video at position 5:30
- **WHEN** the user clicks the play button to resume
- **THEN** the play event SHALL trigger `savePositionImmediate()` with position 5:30
- **AND** the position SHALL be saved to localStorage and backend
- **AND** existing deduplication logic SHALL prevent excessive saves

#### Scenario: Handle save failures gracefully
- **GIVEN** a play event triggers `savePositionImmediate()`
- **WHEN** localStorage is unavailable or backend sync fails
- **THEN** video playback SHALL continue normally
- **AND** the user SHALL NOT be blocked from watching
- **AND** an error message MAY be logged to the console

### Requirement: Router Navigation Guard for Watch Progress
The system SHALL save watch position when the user navigates away from the watch page using Vue Router's navigation guard.

#### Scenario: Save position before navbar navigation
- **GIVEN** a user is watching an episode at position 5:30 (330 seconds)
- **WHEN** the user clicks a navbar link (e.g., "动画", "历史记录")
- **THEN** the router navigation guard SHALL save the current position to localStorage
- **AND** the position SHALL be asynchronously synced to the backend
- **AND** the navigation SHALL proceed immediately without blocking

#### Scenario: Save position before browser back navigation
- **GIVEN** a user is watching an episode at position 10:15 (615 seconds)
- **WHEN** the user clicks the browser back button
- **THEN** the router navigation guard SHALL save the current position to localStorage
- **AND** the position SHALL be asynchronously synced to the backend
- **AND** the previous page SHALL load immediately

#### Scenario: Don't block navigation on save failure
- **GIVEN** a user is watching an episode and localStorage is unavailable
- **WHEN** the user navigates away from the watch page
- **THEN** the navigation SHALL proceed immediately
- **AND** the user SHALL NOT experience any delay or blocking

### Requirement: LocalStorage Fallback in Continue Watching
The system SHALL merge localStorage watch positions with backend data in the Continue Watching section, providing a fallback when backend sync hasn't completed.

#### Scenario: Merge localStorage entries with backend data
- **GIVEN** a user has watched episodes that are saved in localStorage but not yet synced to backend
- **WHEN** the Continue Watching section loads on the homepage
- **THEN** the system SHALL fetch backend data from `/api/continue-watching`
- **AND** the system SHALL read localStorage entries with key prefix `watch_position_`
- **AND** the system SHALL merge both datasets, deduplicating by `${animeId}_${season}_${episode}`
- **AND** the merged list SHALL be displayed to the user

#### Scenario: Prefer backend data over localStorage for duplicates
- **GIVEN** an episode exists in both backend data and localStorage with different positions
- **WHEN** the datasets are merged
- **THEN** the backend data SHALL take precedence
- **AND** the localStorage entry SHALL be discarded for that episode
- **AND** the user SHALL see the backend position in the Continue Watching list

#### Scenario: Limit localStorage entries by age
- **GIVEN** a user has localStorage entries older than 30 days
- **WHEN** the Continue Watching section loads
- **THEN** entries older than 30 days SHALL be excluded from the merge
- **AND** the old entries MAY be cleaned up from localStorage

### Requirement: Text Overflow Truncation in Continue Watching Cards
The system SHALL truncate long anime titles and episode titles with ellipsis in the Continue Watching cards, preventing text overflow.

#### Scenario: Truncate long anime titles
- **GIVEN** a grouped anime card with an anime title of 100+ characters
- **WHEN** the card is displayed in the Continue Watching section
- **THEN** the title SHALL be truncated with ellipsis (...) to fit within the card width
- **AND** the full title SHALL be visible on hover via tooltip

#### Scenario: Truncate long episode titles in expanded view
- **GIVEN** an expanded grouped anime card with episode titles exceeding 50 characters
- **WHEN** the episode list is displayed
- **THEN** each episode title SHALL be truncated with ellipsis to fit within the card width
- **AND** the full episode title SHALL be visible on hover via tooltip

#### Scenario: Apply truncation CSS correctly
- **GIVEN** a card title element with the `text-truncate` Bootstrap class
- **WHEN** the card is rendered
- **THEN** the element SHALL have `white-space: nowrap`
- **AND** the element SHALL have `overflow: hidden`
- **AND** the element SHALL have `text-overflow: ellipsis`
- **AND** the flex container SHALL have `min-width: 0` to allow shrinking
