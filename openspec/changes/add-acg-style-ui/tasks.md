# Tasks: Add ACG-Style UI and Theater Mode Player

## Bug Fixes (2025-12-28)

- [x] FIX.1 Restore anime description in WatchView.vue
  - Added back the missing `animeDescription` display in anime info section
  - Added CSS styling for `.anime-description` with line-clamp for 3 lines
  - Maintains visual consistency with the ACG theme

- [x] FIX.2 Fix navbar covering player content
  - Initially added `padding-top: 44px`, later reduced to `10px` per user feedback
  - Updated layout to maximize viewing space

- [x] FIX.3 Fix WatchView.vue to support light/dark mode
  - Updated all components to use CSS variables instead of hardcoded colors
  - `WatchView.vue`: background, text, buttons all use `var(--bg-primary)`, `var(--text-primary)`, etc.
  - `GroupedContinueWatchingCard.vue`: cards and text colors use CSS variables
  - `WeeklySchedule.vue`: cards and navigation use CSS variables
  - `AnimeCard.vue`: already using CSS variables correctly

- [x] FIX.4 Fix "Continue Watching" button not showing in navbar
  - Added `historyStore.loadContinueWatching()` call in AppNavbar `onMounted`
  - Now button displays correctly regardless of which page user visits first

- [x] FIX.5 Fix WatchView layout - remove full-screen width approach
  - Reverted `width: 100vw` and negative margins approach
  - Now uses natural width within container

- [x] FIX.6 Fix Plyr player progress bar color
  - Changed `--plyr-color-main` from gray (#333/#666) to blue (#00bfff)
  - Applied in main.css for both light and dark modes
  - Removed invalid scoped styles in WatchView.vue

- [x] FIX.7 Add title attribute for tooltips
  - Added `title` attribute to AnimeCard titles
  - Added `title` attribute to anime descriptions in WatchView
  - WeeklySchedule already had title attributes

- [x] FIX.8 Reorganize WatchView side panel layout
  - Changed from auto-fit grid to fixed 2-column layout (1fr 2fr)
  - Left column: Anime Info (row 1) + Progress (row 2)
  - Right column: Episode List (spans 2 rows)
  - Mobile: Single column vertical layout
  - Removed duplicate `.episode-list` style that was overriding grid settings

## 1. Foundation Setup

- [x] 1.1 Add ACG color palette to CSS variables in global styles
  - Define primary colors: pink/purple gradients (#FF6B9D, #C44DFF)
  - Define secondary colors: cyan/teal accents (#00D4FF, #00FFB8)
  - Define dark mode background colors (#1A1A2E, #16213E)
  - Define accent colors for stars/sparkles (#FFD700)

- [x] 1.2 Create reusable ACG decorative CSS classes
  - Star shape utility using CSS clip-path
  - Sparkle animation keyframes
  - Gradient border utility classes
  - Glow effect utility classes

- [x] 1.3 Configure Tailwind for ACG theme colors
  - Extend Tailwind config with ACG color palette
  - Add custom animation utilities
  - Add custom box-shadow utilities for glow effects

## 2. Component Styling Updates

- [x] 2.1 Update AnimeCard.vue with ACG styling
  - Add gradient border on hover
  - Add sparkle/star decorations
  - Enhance hover animation (scale + glow)
  - Update button styling with ACG colors
  - Test hover animations with prefers-reduced-motion

- [x] 2.2 Update AppNavbar.vue with ACG theme
  - Apply gradient background
  - Update brand/logo styling
  - Style navigation links with ACG hover effects
  - Update dropdown menus with ACG styling

- [x] 2.3 Update AppContainer.vue with ACG background
  - Add subtle gradient background
  - Add floating decorative elements (stars, sparkles)
  - Ensure content remains readable with new background

- [x] 2.4 Update HomeView.vue sections with ACG styling
  - Style Continue Watching section header
  - Style Weekly Schedule component
  - Style Filters section with ACG inputs
  - Style pagination with ACG theme

## 3. Theater Mode Player

- [x] 3.1 Update WatchView.vue layout structure
  - Implement theater container with CSS Grid centering
  - Apply dark radial gradient background
  - Center player horizontally and vertically

- [x] 3.2 Implement responsive player sizing
  - Set max-width: 95vw, max-height: 85vh
  - Maintain 16:9 aspect ratio using aspect-ratio CSS property
  - Test on desktop, tablet, and mobile screen sizes

- [x] 3.3 Style player controls and sidebar for theater mode
  - De-emphasize sidebar elements visually
  - Style episode list with dark theme
  - Ensure player controls remain accessible

- [x] 3.4 Test keyboard shortcuts in new layout
  - Verify Space (play/pause) works
  - Verify Ctrl+Right (next episode) works
  - Ensure no controls are obscured

## 4. Responsive Design

- [x] 4.1 Implement mobile breakpoint for theater mode
  - On screens < 768px, player occupies full width
  - Move episode list and sidebar below player
  - Reduce decorative element size on mobile

- [x] 4.2 Test responsive behavior across devices
  - Test on desktop (1920x1080, 1366x768)
  - Test on tablet (768x1024)
  - Test on mobile (375x667, 414x896)

## 5. Accessibility and Performance

- [x] 5.1 Implement prefers-reduced-motion support
  - Disable animations for users who prefer reduced motion
  - Test with OS-level reduced motion settings

- [x] 5.2 Verify color contrast ratios
  - Test all text and interactive elements against WCAG AA standards
  - Use color blindness simulator to verify accessibility

- [x] 5.3 Optimize animation performance
  - Use transform and opacity for all animations (GPU-accelerated)
  - Test animations maintain 60fps on target devices
  - Lazy load decorative elements if needed

## 6. Testing and Validation

- [x] 6.1 Cross-browser testing
  - Test in Chrome, Firefox, Safari, Edge
  - Verify consistent appearance and behavior

- [x] 6.2 Feature regression testing
  - Test watch history functionality
  - Test episode selection
  - Test keyboard shortcuts
  - Test autoplay and auto-resume

- [x] 6.3 User acceptance testing
  - Verify visual appeal matches ACG aesthetic goals
  - Confirm theater mode provides immersive experience
  - Gather feedback on animation intensity

## 7. Documentation

- [x] 7.1 Update component documentation
  - Document new ACG styling approach
  - Document theater mode CSS implementation

- [x] 7.2 Update CLAUDE.md if needed
  - Document any new patterns or conventions added
