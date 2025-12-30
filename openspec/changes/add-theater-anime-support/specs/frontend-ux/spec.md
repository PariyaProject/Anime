# frontend-ux Specification Delta

## MODIFIED Requirements

### Requirement: Channel Selection UI
The system SHALL provide channel selection tabs in the navigation bar to allow users to switch between TV and Theater anime content channels.

#### Scenario: Display channel tabs in navbar
- **GIVEN** the application loads and the navbar renders
- **WHEN** viewing the navbar
- **THEN** channel tabs SHALL be displayed: [TV] [剧场]
- **AND** the active channel tab SHALL be visually highlighted with distinct background color
- **AND** inactive tabs SHALL be clickable with hover effects
- **AND** channel tabs SHALL be positioned between "动画列表" link and "继续观看" dropdown

#### Scenario: Switch channel via tab click
- **GIVEN** the user is viewing TV anime list
- **WHEN** the user clicks the "剧场" tab
- **THEN** the selected channel in uiStore SHALL change to `channel='movie'`
- **AND** the URL query parameter SHALL update to `?channel=movie`
- **AND** the anime list SHALL refresh with theater anime
- **AND** the "剧场" tab SHALL become active with highlighted styling
- **AND** the TV tab SHALL return to inactive state

#### Scenario: Channel persists during filter changes
- **GIVEN** the user is viewing theater anime
- **WHEN** the user applies additional filters (genre, year, sort)
- **THEN** the channel parameter SHALL remain `channel='movie'`
- **AND** all filters SHALL be applied within the theater channel context
- **AND** the URL SHALL include both channel and filter parameters (e.g., `?channel=movie&genre=科幻&year=2024`)

#### Scenario: Channel state syncs with URL
- **GIVEN** a user navigates to a URL with channel parameter
- **WHEN** the page loads with `?channel=movie&genre=科幻`
- **THEN** the system SHALL set uiStore channel to `movie`
- **AND** SHALL display theater anime filtered by genre
- **AND** the "剧场" tab SHALL be active/highlighted
- **AND** the genre filter SHALL show "科幻" as selected

#### Scenario: Channel tab responsive design
- **GIVEN** the user views the navbar on mobile device (width < 768px)
- **WHEN** the navbar renders
- **THEN** channel tabs SHALL remain visible
- **AND** tab text SHALL NOT be hidden (unlike nav-links)
- **AND** tabs SHALL be appropriately sized for touch targets
- **AND** spacing between tabs SHALL be maintained

#### Scenario: Invalid channel defaults to TV
- **GIVEN** a user navigates to `/?channel=invalid`
- **WHEN** the page loads
- **THEN** the system SHALL default to `channel='tv'`
- **AND** the TV tab SHALL be active
- **AND** TV anime list SHALL be displayed
- **AND** no error message SHALL be shown

### Requirement: Channel Display in Home View
The system SHALL display the current channel context in the Home View to provide clear feedback about which content category is being browsed.

#### Scenario: Show channel badge in section header
- **GIVEN** the user is viewing theater anime
- **WHEN** the Home View renders
- **THEN** the section header SHALL display "剧场番剧" next to the main title
- **AND** the channel badge SHALL be styled distinctively (e.g., different color)
- **AND** clicking the channel badge SHALL NOT trigger any action (display-only)

#### Scenario: Show channel in empty state
- **GIVEN** the user searches for non-existent theater anime
- **WHEN** no results are found
- **THEN** the empty state message SHALL include the current channel
- **AND** SHALL display "未找到剧场番剧" or similar message
- **AND** SHALL suggest trying different filters or switching channels

#### Scenario: Channel indication with filters
- **GIVEN** the user is viewing TV anime with genre filter
- **WHEN** the anime list displays
- **THEN** the page title or header MAY include "TV番剧" indication
- **AND** the combination SHALL be clear (e.g., "TV番剧 - 科幻类型")

## ADDED Requirements

### Requirement: Channel Badge on History Cards
The system SHALL display a channel badge on history cards to indicate whether each watched anime is from TV or Theater channel.

#### Scenario: Show channel badge on continue watching cards
- **GIVEN** the user has watched both TV and theater anime
- **WHEN** the continue watching section displays
- **THEN** each grouped anime card SHALL show a channel badge
- **AND** TV anime cards SHALL show "TV" badge
- **AND** theater anime cards SHALL show "剧场" badge
- **AND** the badge SHALL be positioned consistently (e.g., top-right corner)

#### Scenario: Channel badge styling
- **GIVEN** a history card displays a channel badge
- **WHEN** the badge is rendered
- **THEN** TV badge SHALL use blue color scheme
- **AND** theater badge SHALL use purple color scheme
- **AND** badges SHALL be semi-transparent to not obscure cover image
- **AND** badges SHALL have readable font size

#### Scenario: Channel badge on history page
- **GIVEN** the user views the full history page
- **WHEN** history cards are displayed
- **THEN** each card SHALL include the channel badge
- **AND** the badge SHALL be visible in both grid and list views
- **AND** hovering over the card SHALL NOT hide the badge
