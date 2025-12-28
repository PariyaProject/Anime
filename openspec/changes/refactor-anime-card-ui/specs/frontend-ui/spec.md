## ADDED Requirements

### Requirement: Conditional Metadata Display
The anime card component SHALL conditionally display metadata badges (type, year, episode count) only when the corresponding data values are present and non-empty.

#### Scenario: Anime with complete metadata
- **WHEN** an anime has type, year, and episode count data
- **THEN** all three metadata badges are displayed

#### Scenario: Anime with partial metadata
- **WHEN** an anime has only some metadata fields (e.g., only type)
- **THEN** only the badges for available data are displayed

#### Scenario: Anime with no metadata
- **WHEN** an anime has no metadata (all fields are null, undefined, or empty strings)
- **THEN** no metadata badges are displayed

#### Scenario: Anime with empty string metadata
- **WHEN** an anime has metadata fields set to empty strings
- **THEN** badges for empty fields are not displayed

### Requirement: Single Action Button
The anime card component SHALL display a single "选择播放" button that navigates to the Watch page.

#### Scenario: Button click navigates to watch page
- **WHEN** the user clicks the "选择播放" button
- **THEN** the application navigates to the Watch view with the correct anime ID

#### Scenario: Button has appropriate accessibility label
- **WHEN** the button is rendered
- **THEN** it has an aria-label describing its action

### Requirement: Balanced Grid Layout
The anime grid SHALL display 6 items per row on large screens (xl breakpoint: 1200px+) to ensure 48 items per page create exactly 8 full rows with no empty slots.

#### Scenario: Large screen grid layout
- **WHEN** viewing the anime list on a screen width >= 1200px with 48 items
- **THEN** 6 items are displayed per row, creating exactly 8 full rows with no gaps

#### Scenario: Responsive grid maintained
- **WHEN** viewing on smaller screen sizes (< 1200px)
- **THEN** the existing responsive behavior is preserved (1/2/3/4 items per row based on breakpoint)

#### Scenario: Grid calculation
- **WHEN** the page displays 48 anime items
- **THEN** the grid divides evenly (48 ÷ 6 = 8 rows) with no remainder

## REMOVED Requirements

### Requirement: Details Button
**Reason**: The "查看详情" button performs the same action as "选择播放" (both navigate to Watch page), making it redundant.

**Migration**: Remove the button and its associated event handler. The "选择播放" button remains for navigation.
