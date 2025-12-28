# frontend-ux Specification Delta

## ADDED Requirements

### Requirement: ACG Visual Style Theme
The frontend SHALL display a classic ACG/anime-inspired visual theme with vibrant colors, decorative elements, and playful animations while maintaining high interactivity and user convenience.

#### Scenario: Display ACG color theme
- **GIVEN** the frontend application loads
- **WHEN** any page is displayed
- **THEN** the page SHALL use ACG-inspired color palette (pink/purple gradients, cyan accents)
- **AND** decorative elements (stars, sparkles, geometric patterns) SHALL be visible
- **AND** the overall aesthetic SHALL match classic anime/ACG design conventions

#### Scenario: Enhanced card hover effects
- **GIVEN** an anime card or interactive element is displayed
- **WHEN** the user hovers over the element
- **THEN** the element SHALL display an anime-style hover animation (scale, glow, or sparkle effect)
- **AND** the animation SHALL be smooth (60fps) using GPU-accelerated properties
- **AND** the animation SHALL respect `prefers-reduced-motion` for accessibility

#### Scenario: Maintain existing functionality
- **GIVEN** the new ACG visual style is applied
- **WHEN** a user interacts with any existing feature (watch history, episode selection, keyboard shortcuts)
- **THEN** all existing functionality SHALL work as before the visual redesign
- **AND** no feature shall be removed or degraded due to styling changes

### Requirement: Theater Mode Video Player Layout
The watch page SHALL display the video player centered on screen with a darkened background, sized responsively to maximize screen coverage while maintaining the video's aspect ratio and preventing content from being obscured.

#### Scenario: Center player on screen
- **GIVEN** a user navigates to the watch page
- **WHEN** the page loads
- **THEN** the video player SHALL be centered horizontally and vertically on the screen
- **AND** the background SHALL be darkened with a radial gradient effect
- **AND** the player SHALL be the focal point of the page

#### Scenario: Responsive player sizing
- **GIVEN** the video player is displayed in theater mode
- **WHEN** the browser viewport is resized or the user rotates their device
- **THEN** the player SHALL resize to maximize screen coverage (up to 95% viewport width, 85% viewport height)
- **AND** the video SHALL maintain its original 16:9 aspect ratio
- **AND** no content SHALL be obscured or overflow the viewport

#### Scenario: Immersive viewing experience
- **GIVEN** a user is watching an episode in theater mode
- **WHEN** the player is displayed
- **THEN** the player SHALL occupy the majority of the visible screen
- **AND** surrounding elements (sidebar, episode list) SHALL be visually de-emphasized
- **AND** the user SHALL experience an immersive, cinema-like viewing environment

#### Scenario: Mobile responsiveness for theater mode
- **GIVEN** a user accesses the watch page on a mobile device (screen width < 768px)
- **WHEN** the page loads
- **THEN** the player SHALL occupy the full width of the screen
- **AND** the episode list and sidebar SHALL be positioned below the player
- **AND** touch interactions SHALL work as expected on all controls

## MODIFIED Requirements

### Requirement: Grouped Continue Watching Display
The system SHALL display continue watching content grouped by anime and season, showing a single card per anime with access to all watched episodes. Cards shall use ACG-style design with enhanced hover effects and anime-inspired decorations.

#### Scenario: Display grouped anime cards with ACG styling
- **GIVEN** a user has watched episodes 1, 2, and 3 of "Anime A" season 1
- **WHEN** the user views the Continue Watching section on the homepage
- **THEN** a single card for "Anime A" season 1 SHALL be displayed
- **AND** the card SHALL show the anime cover, title, and total episodes watched (3)
- **AND** the card SHALL display overall progress based on the latest episode
- **AND** the card SHALL have ACG-style styling (gradient borders, rounded corners, decorative elements)
- **AND** hovering SHALL trigger an anime-style animation

#### Scenario: Expand to view all watched episodes with ACG styling
- **GIVEN** a grouped anime card in collapsed state with ACG styling applied
- **WHEN** the user clicks on the card body (not the Continue button)
- **THEN** the card SHALL expand to show all watched episodes
- **AND** each episode SHALL display its individual progress bar with ACG-style coloring
- **AND** clicking on any episode SHALL navigate to that specific episode
- **AND** the expansion animation SHALL use ACG-style easing and timing
