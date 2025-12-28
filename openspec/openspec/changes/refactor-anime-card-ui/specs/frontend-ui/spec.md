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

## REMOVED Requirements

### Requirement: Details Button
**Reason**: The "查看详情" button performs the same action as "选择播放" (both navigate to Watch page), making it redundant.

**Migration**: Remove the button and its associated event handler. The "选择播放" button remains for navigation.
