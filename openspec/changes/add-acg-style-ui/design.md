# Design: ACG-Style UI and Theater Mode Player

## Context

The frontend currently uses a plain Bootstrap-based design with minimal styling. The target audience for an anime streaming site expects a distinctive ACG (Anime/Comic/Game) aesthetic that matches the content they are consuming. Additionally, the video player layout does not maximize the available screen space for an immersive viewing experience.

**Constraints:**
- Must maintain existing functionality (watch history, episode selection, autoplay)
- Must work responsively across desktop, tablet, and mobile
- Should preserve accessibility standards
- Must not significantly impact page load performance

**Stakeholders:**
- End users: Expect visually appealing, anime-themed interface
- Developers: Need maintainable, component-based implementation

## Goals / Non-Goals

**Goals:**
1. Implement classic ACG visual style with colorful theme and anime-inspired decorations
2. Create theater mode video player that centers and maximizes screen coverage
3. Maintain high interactivity and user convenience
4. Preserve all existing features (history, progress tracking, keyboard shortcuts)

**Non-Goals:**
- Complete redesign of information architecture (keep same page structure)
- Adding new features beyond visual improvements
- Changing backend API or data models
- Full custom theme system (just implement one ACG theme)

## Decisions

### Decision 1: ACG Color Palette and Theme

**Choice:** Use a vibrant ACG-inspired color palette with:
- Primary: Pink/Purple gradients (#FF6B9D to #C44DFF)
- Secondary: Cyan/Teal accents (#00D4FF to #00FFB8)
- Background: Deep purple/slate for dark mode (#1A1A2E to #16213E)
- Accent: Star/sparkle elements in gold/yellow (#FFD700)

**Rationale:** These colors are iconic in ACG/anime design (similar to sites like Bilibili, Crunchyroll) and create the playful, youthful aesthetic associated with anime culture.

**Alternatives considered:**
- Minimalist monochrome: Too plain, not distinctive enough
- Cyberpunk neon: Too harsh, may cause eye strain during long viewing sessions
- Pastel soft colors: Not energetic enough for streaming platform

### Decision 2: Theater Mode Layout Strategy

**Choice:** CSS Grid with centered player and dark overlay background:
```css
.theater-container {
  display: grid;
  place-items: center;
  min-height: 100vh;
  background: radial-gradient(ellipse at center, #2A2A4A 0%, #0A0A15 100%);
}
.player-wrapper {
  max-width: 95vw;
  max-height: 85vh;
  aspect-ratio: 16/9;
}
```

**Rationale:** This approach:
- Centers content using CSS Grid's `place-items: center`
- Maintains 16:9 aspect ratio with `aspect-ratio` property
- Uses viewport-relative units for responsive sizing
- Creates immersion with dark radial gradient background

**Alternatives considered:**
- Flexbox centering: Viable alternative, but Grid offers better 2D alignment
- Fixed pixel dimensions: Not responsive, breaks on different screen sizes
- Full-screen native API: Too invasive, users can't easily exit

### Decision 3: Decorative Elements Implementation

**Choice:** CSS-only decorative elements using pseudo-elements and backgrounds:
- Star shapes using CSS clip-path
- Sparkle animations using keyframes
- Gradient borders and glow effects
- Floating decorative shapes

**Rationale:** CSS-only approach:
- No additional HTTP requests for images
- Smooth 60fps animations
- Customizable via CSS variables
- Better performance than SVG/Canvas for simple decorations

**Alternatives considered:**
- Image-based decorations: Additional network requests, harder to customize
- Canvas-based: Overkill for simple decorations, harder to maintain
- SVG sprites: Good option but more complex for simple shapes

### Decision 4: Component Styling Approach

**Choice:** Enhance existing components with scoped CSS + Tailwind utility classes:
- Keep existing component structure intact
- Add new scoped `<style>` blocks for ACG-specific styles
- Use Tailwind for layout/spacing
- Use custom CSS for special effects (glow, gradients, animations)

**Rationale:** Incremental approach minimizes risk and allows gradual rollout. Scoped styles prevent leakage to other components.

**Alternatives considered:**
- Complete component rewrite: Higher risk, more time-consuming
- Global CSS only: Harder to maintain, style conflicts
- CSS-in-JS library: Adds dependency, increases bundle size

## Risks / Trade-offs

### Risk 1: Performance Impact from Animations

**Risk:** CSS animations and decorative elements could slow down page rendering, especially on lower-end devices.

**Mitigation:**
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Use `prefers-reduced-motion` media query to disable animations for users who prefer it
- Lazy load decorative elements
- Test on low-end devices and set performance budgets

### Risk 2: Visual Accessibility

**Risk:** Vibrant colors and animated elements may cause issues for users with visual sensitivities or color blindness.

**Mitigation:**
- Ensure sufficient color contrast ratios (WCAG AA minimum)
- Provide option to reduce/disable animations
- Keep text readability as top priority
- Test with color blindness simulators

### Risk 3: Mobile Responsiveness

**Risk:** Theater mode layout may not work well on small mobile screens.

**Mitigation:**
- Use responsive breakpoints to adjust layout on mobile
- Stack sidebar below player on small screens
- Use smaller decorative elements on mobile
- Test on actual devices across screen sizes

## Migration Plan

### Phase 1: Foundation (No User Impact)
1. Add ACG color palette to CSS variables/Tailwind config
2. Create reusable decorative component classes
3. Set up responsive breakpoints for theater mode

### Phase 2: Component Updates (Incremental Rollout)
1. Update `AnimeCard.vue` with ACG styling
2. Update `AppNavbar.vue` with ACG theme
3. Update `AppContainer.vue` with new background
4. Update `HomeView.vue` with enhanced sections

### Phase 3: Theater Mode Player (High Impact)
1. Update `WatchView.vue` with theater layout
2. Test responsive behavior across screen sizes
3. Verify video player functionality preserved
4. Test keyboard shortcuts and controls

### Phase 4: Polish and Testing
1. Cross-browser testing (Chrome, Firefox, Safari, Edge)
2. Mobile device testing
3. Accessibility audit
4. Performance optimization

### Rollback Plan

If issues arise:
- Feature flags can disable new styling
- CSS variables allow quick theme reversion
- Git revert for any component changes
- No database/API changes means clean rollback

## Open Questions

- [ ] Should we add a theme toggle (classic vs ACG mode)?
- [ ] Do we need user preference persistence for animation intensity?
- [ ] Should decorative elements be seasonal (e.g., sakura in spring)?
