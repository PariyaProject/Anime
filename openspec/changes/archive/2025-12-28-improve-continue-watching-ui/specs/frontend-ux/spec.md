## ADDED Requirements

### Requirement: Grouped Continue Watching Display
The system SHALL display continue watching content grouped by anime and season, showing a single card per anime with access to all watched episodes.

#### Scenario: Display grouped anime cards
- **GIVEN** a user has watched episodes 1, 2, and 3 of "Anime A" season 1
- **WHEN** the user views the Continue Watching section on the homepage
- **THEN** a single card for "Anime A" season 1 SHALL be displayed
- **AND** the card SHALL show the anime cover, title, and total episodes watched (3)
- **AND** the card SHALL display overall progress based on the latest episode

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

#### Scenario: Group by anime and season separately
- **GIVEN** a user has watched episodes of "Anime A" season 1 and season 2
- **WHEN** the Continue Watching section is displayed
- **THEN** two separate cards SHALL be shown: one for season 1, one for season 2
- **AND** each card SHALL only contain episodes from its respective season

### Requirement: Navigation Continue Watching Dropdown Consistency
The system SHALL display the same grouped continue watching content in the navigation bar dropdown as shown on the homepage, with a compact format suitable for dropdown display.

#### Scenario: Load continue watching data in navbar
- **GIVEN** the user has watch history records
- **WHEN** the application loads and the navbar renders
- **THEN** the Continue Watching dropdown SHALL load the same data as the homepage
- **AND** the dropdown SHALL be visible when hasContinueWatching is true
- **AND** the data SHALL be grouped by anime and season

#### Scenario: Display compact grouped format in dropdown
- **GIVEN** a continue watching dropdown with grouped anime data
- **WHEN** the dropdown is displayed
- **THEN** each entry SHALL show: anime cover (40x40), anime title, latest episode info
- **AND** clicking an entry SHALL navigate to the latest episode of that anime
- **AND** the dropdown SHALL display up to 5 anime (not 5 episodes)

#### Scenario: Navigate to latest episode from dropdown
- **GIVEN** a user clicks "Anime A" in the continue watching dropdown
- **WHEN** the click event is triggered
- **THEN** the system SHALL navigate to the watch page for Anime A
- **AND** the season and episode parameters SHALL match the latest watched episode
- **AND** the saved position SHALL be restored on the watch page

#### Scenario: Show "View All" link in dropdown
- **GIVEN** a continue watching dropdown with entries
- **WHEN** the dropdown content is rendered
- **THEN** a "查看全部" (View All) link SHALL be displayed at the bottom
- **AND** clicking the link SHALL navigate to the History page
- **AND** the History page SHALL display the full grouped history

### Requirement: Weekly Schedule Current Day Auto-Selection
The system SHALL automatically select and display the current day's anime schedule in the weekly schedule component when the component loads.

#### Scenario: Detect and select current day on load
- **GIVEN** today is Wednesday
- **WHEN** the WeeklySchedule component mounts on the homepage
- **THEN** the component SHALL detect the current day using JavaScript Date
- **AND** the "周三" (Wednesday) tab SHALL be automatically selected
- **AND** only anime scheduled for Wednesday SHALL be displayed

#### Scenario: Map JavaScript days to schedule keys
- **GIVEN** JavaScript Date.getDay() returns 0 for Sunday, 1 for Monday, etc.
- **WHEN** the current day is detected
- **THEN** the system SHALL map the day to the correct schedule key
- **AND** Sunday (0) SHALL map to "sunday"
- **AND** Monday (1) SHALL map to "monday"
- **AND** Tuesday (2) SHALL map to "tuesday"
- **AND** Wednesday (3) SHALL map to "wednesday"
- **AND** Thursday (4) SHALL map to "thursday"
- **AND** Friday (5) SHALL map to "friday"
- **AND** Saturday (6) SHALL map to "saturday"

#### Scenario: Allow manual day selection after auto-select
- **GIVEN** the weekly schedule has auto-selected Wednesday on load
- **WHEN** the user clicks on "周五" (Friday) tab
- **THEN** the selected day SHALL change to Friday
- **AND** anime scheduled for Friday SHALL be displayed
- **AND** the component SHALL remain in Friday state until manually changed

#### Scenario: Support "All" option with manual selection
- **GIVEN** the weekly schedule has auto-selected the current day
- **WHEN** the user clicks the "全部" (All) tab
- **THEN** all anime for the entire week SHALL be displayed
- **AND** the component SHALL remain in "All" state until manually changed

#### Scenario: Preset "All" option if current day has no anime
- **GIVEN** today is Wednesday and no anime are scheduled for Wednesday
- **WHEN** the WeeklySchedule component mounts
- **THEN** the component SHALL still auto-select Wednesday
- **AND** an empty state message "周三暂无更新" SHALL be displayed
- **AND** the user CAN manually click "全部" to see anime from other days
