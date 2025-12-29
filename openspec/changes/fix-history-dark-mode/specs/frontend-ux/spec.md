## ADDED Requirements

### Requirement: History Page Dark Mode Support
The History page SHALL support dark mode styling consistent with the Home and Watch pages, using CSS variables that respond to the `.dark-mode` class on `document.documentElement`.

#### Scenario: Display history page in dark mode
- **GIVEN** dark mode is enabled
- **WHEN** the user navigates to the History page (`/history`)
- **THEN** the page background SHALL use `var(--bg-primary)` (dark color #1a1a1a)
- **AND** all text SHALL use `var(--text-primary)` (light color #f5f5f5)
- **AND** card backgrounds SHALL use `var(--bg-secondary)` (dark color #242424)
- **AND** borders SHALL use `var(--border-color)` (dark color #333333)

#### Scenario: Display history page in light mode
- **GIVEN** dark mode is disabled
- **WHEN** the user navigates to the History page (`/history`)
- **THEN** the page background SHALL use `var(--bg-primary)` (light color #ffffff)
- **AND** all text SHALL use `var(--text-primary)` (dark color #1a1a1a)
- **AND** card backgrounds SHALL use `var(--bg-secondary)` (light color #f5f5f5)
- **AND** borders SHALL use `var(--border-color)` (light color #e0e0e0)

#### Scenario: Toggle dark mode on history page
- **GIVEN** the user is viewing the History page in light mode
- **WHEN** the user clicks the dark mode toggle in the navbar
- **THEN** the History page SHALL immediately switch to dark mode styling
- **AND** all colors SHALL transition smoothly (0.2s ease as defined in main.css)
- **AND** the page SHALL remain fully functional after the mode switch

#### Scenario: History card styling in dark mode
- **GIVEN** dark mode is enabled and the History page is displayed
- **WHEN** history cards are rendered
- **THEN** each card SHALL have a dark background using `var(--bg-secondary)`
- **AND** card borders SHALL use `var(--border-color)`
- **AND** card shadows SHALL use `var(--shadow)`
- **AND** hover effects SHALL use `var(--shadow-hover)`
- **AND** all text SHALL use appropriate CSS variable colors

#### Scenario: Filter controls styling in dark mode
- **GIVEN** dark mode is enabled and the History page is displayed
- **WHEN** the filter section (search, status, sort) is displayed
- **THEN** input fields SHALL have dark background using `var(--bg-primary)`
- **AND** input text SHALL use `var(--text-primary)`
- **AND** input borders SHALL use `var(--border-color)`
- **AND** dropdown selects SHALL match input styling
- **AND** buttons SHALL use CSS variables for background and text colors

#### Scenario: Progress bar and badge styling in dark mode
- **GIVEN** dark mode is enabled and a history card is displayed
- **WHEN** a progress bar is shown
- **THEN** the progress bar background SHALL use `var(--bg-tertiary)`
- **AND** the progress fill SHALL have a visible color that contrasts with dark mode
- **AND** "已看完" badges SHALL use CSS variables for background and text colors
- **AND** all colors SHALL be readable in dark mode

#### Scenario: Muted text and labels in dark mode
- **GIVEN** dark mode is enabled and the History page is displayed
- **WHEN** secondary text is shown (e.g., episode numbers, timestamps, filter hints)
- **THEN** muted text SHALL use `var(--text-secondary)` (light gray #a0a0a0)
- **AND** the text SHALL be readable against the dark background
- **AND** text contrast SHALL meet accessibility standards

#### Scenario: Consistency with other pages
- **GIVEN** dark mode is enabled across the application
- **WHEN** the user navigates between Home, Watch, and History pages
- **THEN** all pages SHALL use the same CSS variable values
- **AND** the dark mode experience SHALL be visually consistent
- **AND** transitions between pages SHALL maintain the selected mode
