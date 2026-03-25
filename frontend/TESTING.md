# Testing Guide

This guide covers manual testing procedures for the Vue.js frontend in this repository.

## Table of Contents

1. [Cross-Browser Testing](#cross-browser-testing)
2. [Mobile Testing](#mobile-testing)
3. [Accessibility Testing](#accessibility-testing)
4. [Performance Testing](#performance-testing)
5. [E2E Testing](#e2e-testing)
6. [Regression Testing](#regression-testing)

---

## Cross-Browser Testing

### Supported Browsers

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Primary |
| Firefox | 88+ | 🔲 Test |
| Safari | 14+ | 🔲 Test |
| Edge | 90+ | 🔲 Test |

### Testing Checklist

#### Chrome (Windows/Mac/Linux)
- [x] Homepage loads correctly
- [x] Anime list displays
- [x] Video player works
- [x] Dark mode toggle works
- [x] Keyboard shortcuts work (Space, Ctrl+Right)
- [x] Navigation works (forward/back)
- [x] Watch history persists
- [x] Search and filters work
- [x] Pagination works
- [x] Responsive design works

#### Firefox (Windows/Mac/Linux)
- [ ] Homepage loads correctly
- [ ] Anime list displays
- [ ] Video player works
- [ ] Dark mode toggle works
- [ ] Keyboard shortcuts work
- [ ] Navigation works
- [ ] Watch history persists
- [ ] Search and filters work
- [ ] Pagination works
- [ ] Responsive design works
- [ ] DevTools console has no errors

#### Safari (Mac/iOS)
- [ ] Homepage loads correctly
- [ ] Anime list displays
- [ ] Video player works (may need HLS support)
- [ ] Dark mode toggle works
- [ ] Keyboard shortcuts work
- [ ] Navigation works
- [ ] Watch history persists
- [ ] Search and filters work
- [ ] Pagination works
- [ ] Responsive design works
- [ ] Touch gestures work

#### Edge (Windows)
- [ ] Homepage loads correctly
- [ ] Anime list displays
- [ ] Video player works
- [ ] Dark mode toggle works
- [ ] Keyboard shortcuts work
- [ ] Navigation works
- [ ] Watch history persists
- [ ] Search and filters work
- [ ] Pagination works
- [ ] Responsive design works

### Browser-Specific Issues to Watch

| Issue | Browser | Solution |
|-------|---------|----------|
| Video playback | Safari | Use HLS.js for m3u8 |
| CSS Grid gaps | Older Firefox | Check fallback |
| Flexbox gaps | Safari 13 | Use polyfill if needed |
| Autoplay policy | All browsers | Muted autoplay required |

---

## Mobile Testing

### Test Devices

| Device | OS | Browser | Status |
|--------|-----|---------|--------|
| iPhone 12+ | iOS 14+ | Safari | 🔲 Test |
| iPhone 12+ | iOS 14+ | Chrome | 🔲 Test |
| Pixel 5+ | Android 11+ | Chrome | 🔲 Test |
| Galaxy S21+ | Android 11+ | Chrome | 🔲 Test |
| iPad | iOS 14+ | Safari | 🔲 Test |

### Mobile Testing Checklist

#### Responsive Design
- [ ] Layout adapts to portrait/landscape
- [ ] Text is readable without zooming
- [ ] Buttons are touch-friendly (44x44px min)
- [ ] No horizontal scroll
- [ ] Images scale properly
- [ ] Navigation collapses to hamburger menu
- [ ] Modals fit on screen
- [ ] Video player is responsive

#### Touch Interactions
- [ ] Tap targets are large enough
- [ ] No hover-dependent content
- [ ] Scroll works smoothly
- [ ] Pinch to zoom works (where applicable)
- [ ] Swiping works (carousel, lists)
- [ ] Long-press works (context menus)
- [ ] Double-tap zoom works

#### Performance
- [ ] Page loads in < 3 seconds on 4G
- [ ] No janky scrolling
- [ ] Animations are 60fps
- [ ] Images are optimized
- [ ] No memory leaks (monitor with DevTools)

#### Orientation Changes
- [ ] Content adapts to rotation
- [ ] Video player maintains state
- [ ] No layout shifts
- [ ] Scroll position preserved

#### iOS-Specific
- [ ] Safe areas respected (notch, home indicator)
- [ ] Back swipe works (if enabled)
- [ ] Sheet presentations work
- [ ] Pickers work (date, time, select)

#### Android-Specific
- [ ] Material Design patterns work
- [ ] Back button behavior correct
- [ ] Share intents work
- [ ] File uploads work

---

## Accessibility Testing

### Tools

- **Chrome DevTools**: Lighthouse, Accessibility Audit
- **Firefox**: Accessibility Inspector
- **macOS**: VoiceOver
- **Windows**: NVDA, Narrator
- **Mobile**: TalkBack (Android), VoiceOver (iOS)

### Checklist

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Visible focus indicators
- [ ] Logical tab order
- [ ] Skip to main content link
- [ ] Escape key closes modals
- [ ] Enter/Space activate buttons

#### Screen Reader
- [ ] Alt text for images
- [ ] ARIA labels for icons
- [ ] Form labels announced
- [ ] Error messages announced
- [ ] Status updates announced (live regions)
- [ ] Navigation is understandable

#### Color Contrast
- [ ] Text contrast ≥ 4.5:1 (normal)
- [ ] Text contrast ≥ 3:1 (large)
- [ ] UI components contrast ≥ 3:1
- [ ] Focus indicators visible
- [ ] Error states visible

#### Visual
- [ ] Text can be resized to 200%
- [ ] No color-only information
- [ ] No flashing content (>3Hz)
- [ ] Consistent navigation
- [ ] Predictable focus

---

## Performance Testing

### Lighthouse Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Performance | > 90 | `npm run lighthouse` |
| Accessibility | > 90 | `npm run lighthouse` |
| Best Practices | > 90 | `npm run lighthouse` |
| SEO | > 90 | `npm run lighthouse` |

### Running Lighthouse

```bash
# Terminal 1: Start dev server
cd frontend
npm run dev

# Terminal 2: Run Lighthouse
npm run lighthouse
```

Or use Chrome DevTools:
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select categories
4. Click "Analyze page load"

### Performance Budgets

| Metric | Budget | Actual |
|--------|--------|--------|
| Bundle size (gzipped) | 500 KB | ~497 KB ✅ |
| Initial load | 3s | ~2s (4G) |
| Time to Interactive | 5s | ~3s |
| First Contentful Paint | 2s | ~1.5s |

---

## E2E Testing

### Running E2E Tests

```bash
# Install browsers (first time only)
npm run test:e2e:install

# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/anime-list.spec.ts

# Run in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### E2E Test Coverage

| Test File | Coverage | Status |
|-----------|----------|--------|
| anime-list.spec.ts | Browse, search, filter | ✅ Written |
| video-player.spec.ts | Player, error handling | ✅ Written |
| dark-mode.spec.ts | Toggle, persistence | ✅ Written |
| history.spec.ts | Navigation, empty state | ✅ Written |

---

## Regression Testing

### Pre-Deployment Checklist

- [ ] All unit tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Bundle size under 500KB
- [ ] ESLint passes (`npm run lint`)
- [ ] No console errors
- [ ] All critical user flows work
- [ ] Watch history preserved
- [ ] Dark mode works
- [ ] Keyboard shortcuts work
- [ ] Mobile responsive

### Smoke Test (5 minutes)

1. **Load Homepage**
   - [ ] Homepage loads
   - [ ] Anime list displays
   - [ ] No console errors

2. **Play Video**
   - [ ] Click anime card
   - [ ] Video player loads
   - [ ] Video plays
   - [ ] Episode navigation works

3. **Dark Mode**
   - [ ] Toggle dark mode
   - [ ] Theme persists
   - [ ] Toggle back to light

4. **Watch History**
   - [ ] Navigate to history
   - [ ] Resume watching works
   - [ ] Position is saved

5. **Search**
   - [ ] Search works
   - [ ] Results display
   - [ ] Filters apply

---

## Bug Reporting Template

When reporting bugs found during testing, include:

### Environment
- Browser name and version
- Operating system and version
- Device (if mobile)
- Screen resolution

### Steps to Reproduce
1. Go to...
2. Click on...
3. See error...

### Expected vs Actual
- Expected behavior
- Actual behavior
- Screenshots/video if applicable

### Console Errors
```javascript
// Paste any console errors here
```

### Additional Context
- URL where bug occurs
- Does it happen consistently?
- Workarounds (if any)

---

## Test Data

### Sample Anime IDs for Testing

| ID | Title | Episodes | Notes |
|----|-------|----------|-------|
| 5998 | 赛马娘 | Multiple | Good for pagination |
| 3944 | Test Anime | 15+ | Good for player testing |

### Test Scenarios

#### Happy Path
1. Load homepage
2. Browse anime list
3. Click anime card
4. Watch video
5. Navigate episodes
6. Return to home
7. Check history

#### Error Scenarios
1. Invalid anime ID: `/watch/999999`
2. Network offline (DevTools → Network → Offline)
3. Slow 3G (DevTools → Network → Fast 3G)
4. Large anime list (1000+ items)

---

## Continuous Testing

### Automated Tests (CI/CD)

Consider setting up GitHub Actions:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests
        run: cd frontend && npm test -- --run
      - name: Build
        run: cd frontend && npm run build
```

---

## Test Environment Setup

### Local Testing

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start API server (separate terminal)
cd .. && npm start
```

### Production Build Testing

```bash
# Build for production
cd frontend
npm run build

# Serve with Express
cd ..
npm start

# Test at http://localhost:3017
```

---

## Tips and Tricks

### Browser DevTools Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| DevTools | F12 | Cmd+Opt+I |
| Inspect Element | Ctrl+Shift+C | Cmd+Shift+C |
| Console | Ctrl+Shift+J | Cmd+Opt+J |
| Network | Ctrl+Shift+I → Network | Cmd+Opt+I → Network |
| Force Refresh | Ctrl+F5 | Cmd+Shift+R |

### Mobile DevTools

1. Chrome: F12 → Toggle device toolbar (Ctrl+Shift+M)
2. Firefox: F12 → Responsive Design Mode (Ctrl+Shift+M)
3. Safari: Develop → Enter Responsive Design Mode

### Network Throttling

Chrome DevTools → Network → Throttling dropdown:
- Fast 3G
- Slow 3G
- Offline

### CPU Throttling

Chrome DevTools → Performance → CPU throttling:
- 4x slowdown
- 6x slowdown

---

## Resources

- [Vue.js Documentation](https://vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse)
- [WebAIM WCAG Checklist](https://webaim.org/standards/wcag/checklist)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
