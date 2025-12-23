# Proposal: Migrate to Vue.js Modern Frontend Architecture

## Metadata
- **Change ID**: migrate-to-vue-frontend
- **Status**: Implemented
- **Created**: 2025-12-22
- **Completed**: 2025-12-22
- **Author**: Claude
- **Related Changes**: None

## Problem Statement

The current frontend architecture exhibits critical maintainability and extensibility issues:

### Current Issues

1. **Monolithic JavaScript Structure**
   - Single `app.js` file with 1320+ lines of code
   - All logic coupled together (UI, state, API calls, event handling)
   - No separation of concerns

2. **Manual DOM Manipulation**
   - Direct DOM queries scattered throughout (`document.getElementById`, `querySelector`)
   - HTML string interpolation for rendering components
   - No declarative UI framework
   - Example: `renderAnimeGrid()` manually constructs HTML strings

3. **Global State Management Problems**
   - 10+ global variables (`player`, `currentEpisodeData`, `autoPlay`, `currentPage`, etc.)
   - No centralized state management
   - State synchronization issues between components
   - Difficult to track state changes

4. **Error-Prone Display Control**
   - Manual show/hide logic (`style.display = 'block'/'none'`)
   - Complex conditional rendering in `hideMainSections()` and `showMainSections()`
   - Easy to introduce UI bugs when adding features

5. **No Component Architecture**
   - Repetitive code (anime cards, history cards, episode items)
   - Difficult to reuse UI elements
   - No encapsulation of component logic
   - Example: Anime card HTML inlined in `createAnimeCard()` function

6. **Scattered Event Handling**
   - Event listeners registered in multiple places
   - No clear event flow or delegation strategy
   - Manual onclick attributes in HTML strings

7. **Difficult Testing**
   - No component isolation
   - Hard to unit test UI logic
   - Requires full browser context for most tests

### User Impact

- **Development Velocity**: New features take longer and risk breaking existing functionality
- **Bug Frequency**: Display control issues, state inconsistencies, event handler conflicts
- **Code Review**: Large PRs with intertwined logic
- **Onboarding**: New contributors struggle to understand the architecture

## Proposed Solution

Migrate to a **Vue.js 3** frontend with modern architecture:

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│          Vue 3 Application                 │
│  (Composition API + TypeScript)            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────┐  ┌─────────────────┐   │
│  │  Components   │  │   Stores        │   │
│  │               │  │   (Pinia)       │   │
│  │ • AnimeCard   │  │                 │   │
│  │ • EpisodeItem │  │ • animeStore    │   │
│  │ • VideoPlayer │  │ • playerStore   │   │
│  │ • HistoryCard │  │ • historyStore  │   │
│  └───────────────┘  └─────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Utilities & Composables             │  │
│  │                                      │  │
│  │ • useAnimeApi()                     │  │
│  │ • usePlayer()                       │  │
│  │ • useDarkMode()                     │  │
│  │ • useKeyboardShortcuts()            │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  API Layer                           │  │
│  │  (Axios + interceptors)              │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ↕ API calls
┌─────────────────────────────────────────────┐
│     Existing Express Backend                │
│  (No changes - API stays the same)          │
└─────────────────────────────────────────────┘
```

### Key Benefits

1. **Component-Based Architecture**
   - Reusable, self-contained components
   - Clear props and events interface
   - Scoped styles per component
   - Example: `<AnimeCard />` replaces `createAnimeCard()` function

2. **Reactive State Management**
   - Pinia stores for centralized state
   - Automatic reactivity when state changes
   - DevTools for debugging state
   - No more manual DOM updates

3. **Declarative UI**
   - Templates instead of HTML string manipulation
   - `v-if`, `v-for` for conditional rendering
   - No more `style.display` toggling
   - Example: `<div v-if="showVideoSection">`

4. **Composable Logic**
   - Extract reusable logic with Composition API
   - Share logic between components
   - Better TypeScript support
   - Example: `useAnimeApi()` composable for all anime API calls

5. **Type Safety**
   - TypeScript for type checking
   - Interface definitions for API responses
   - Catch errors at compile time
   - Better IDE support

6. **Improved Testing**
   - Unit test components in isolation
   - Test composables without DOM
   - Vue Test Utils for component testing

7. **Better Developer Experience**
   - Hot Module Replacement (HMR)
   - Vue DevTools for debugging
   - Single File Components (.vue)
   - ESLint + Prettier integration

## Technical Approach

### Framework Choice: Vue 3

**Why Vue.js over React?**

1. **Smaller Learning Curve**: Template syntax closer to HTML
2. **Better TypeScript Support**: Built-in with Vue 3
3. **Simpler State Management**: Pinia vs Redux complexity
4. **Single File Components**: Co-located logic, template, styles
5. **Performance**: Smaller bundle size, faster runtime
6. **Documentation**: Excellent Chinese documentation (relevant for this project)

### Build Tool: Vite

- Lightning-fast HMR
- Native ES modules
- Optimized build output
- Built-in TypeScript support

### State Management: Pinia

- Official Vue state management
- TypeScript-first design
- DevTools integration
- Simple API compared to Vuex

### UI Framework: Element Plus

- Vue 3 component library
- Comprehensive component set
- Good Chinese documentation
- Tailwind CSS for custom styling

## Migration Strategy

### Phase 1: Setup and Infrastructure
1. Initialize Vue 3 + Vite project
2. Setup TypeScript configuration
3. Configure Pinia stores
4. Setup router (Vue Router)
5. Install Element Plus and Tailwind CSS

### Phase 2: Core Components
1. Create layout components (Navbar, Container)
2. Create AnimeCard component
3. Create EpisodeList component
4. Create VideoPlayer component
5. Create HistoryCard component

### Phase 3: State Management
1. Migrate global state to Pinia stores
2. Create animeStore
3. Create playerStore
4. Create historyStore
5. Create uiStore (dark mode, filters, etc.)

### Phase 4: API Integration
1. Create API client with Axios
2. Create composables for API calls
3. Add error handling and loading states
4. Implement request/response interceptors

### Phase 5: Feature Parity
1. Implement anime list with pagination
2. Implement search and filtering
3. Implement video playback
4. Implement watch history
5. Implement keyboard shortcuts
6. Implement dark mode

### Phase 6: Polish and Testing
1. Add transitions and animations
2. Responsive design improvements
3. Unit tests for components
4. E2E tests with Playwright
5. Performance optimization

## Backward Compatibility

### API Compatibility
- **No changes to backend API**
- Existing Express endpoints remain unchanged
- Migration is frontend-only

### Data Compatibility
- JSON storage format unchanged
- Watch history data structure preserved
- No data migration needed

### Deployment
- Vue app builds to static files
- Serve from same `/public` directory
- Or serve from CDN for better performance
- Graceful migration: can run side-by-side with old frontend

## Success Criteria

### Functional Requirements
- ✅ All existing features work (anime list, playback, history)
- ✅ No API changes required
- ✅ Watch history data preserved
- ✅ Dark mode functional
- ✅ Keyboard shortcuts functional

### Quality Requirements
- ✅ TypeScript coverage > 80%
- ✅ Component unit tests > 70%
- ✅ No ESLint errors
- ✅ Lighthouse score > 90
- ✅ Bundle size < 500KB (gzipped)

### Developer Experience
- ✅ Hot Module Replacement working
- ✅ Vue DevTools connected
- ✅ Build time < 30 seconds
- ✅ Clear component documentation

## Risks and Mitigations

### Risk 1: Learning Curve
- **Mitigation**: Vue 3 is easier to learn than React
- **Mitigation**: Comprehensive documentation and examples
- **Mitigation**: Incremental migration, feature by feature

### Risk 2: Development Time
- **Mitigation**: Use UI library (Element Plus) to speed up
- **Mitigation**: Reuse existing API layer
- **Mitigation**: Component-based architecture speeds up future development

### Risk 3: Bundle Size
- **Mitigation**: Vite's tree-shaking and code splitting
- **Mitigation**: Lazy loading routes and components
- **Mitigation**: Current bundle already has Bootstrap + Plyr (~200KB)

### Risk 4: Browser Compatibility
- **Mitigation**: Vue 3 supports all modern browsers
- **Mitigation**: Polyfills for IE11 if needed (unlikely for anime site)
- **Mitigation**: Test on multiple browsers during migration

## Open Questions

1. **Should we keep Bootstrap or switch to Element Plus?**
   - Element Plus is more Vue-idiomatic
   - Bootstrap requires additional vue wrappers
   - Recommendation: Switch to Element Plus + Tailwind

2. **Should we use TypeScript?**
   - Pro: Type safety, better IDE support
   - Con: Initial learning curve
   - Recommendation: Yes, long-term benefits outweigh short-term cost

3. **Should we implement Server-Side Rendering (SSR)?**
   - Pro: Better SEO, faster initial load
   - Con: More complex deployment
   - Recommendation: No, this is a web app not a content site

4. **How to handle the Plyr player?**
   - Option 1: Wrap in Vue component
   - Option 2: Use native HTML5 video
   - Option 3: Find Vue-native video player
   - Recommendation: Wrap Plyr in Vue component (least risk)

## Next Steps

Upon approval:
1. Create detailed design document
2. Create tasks.md with implementation steps
3. Create spec deltas for requirements
4. Begin Phase 1: Setup and Infrastructure
