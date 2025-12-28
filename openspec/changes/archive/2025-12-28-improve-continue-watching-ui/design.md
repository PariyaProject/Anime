# Design Document: Improve Continue Watching UI

## Context

The frontend currently displays watch history and continue watching as a flat list of episodes. For users watching multiple episodes of the same anime, this creates visual clutter and makes it harder to track overall progress. Additionally, the weekly schedule component doesn't default to the current day, reducing its utility for users checking what's new today.

### Current State

**Continue Watching (HomeView.vue:4-45):**
- Shows up to 4 most recent individual episodes
- Each card displays: cover, title, season/episode, progress bar
- Clicking navigates directly to that episode

**Navigation Dropdown (AppNavbar.vue:31-82):**
- Shows up to 5 individual episodes
- Similar card format to homepage

**Weekly Schedule (WeeklySchedule.vue:40-52):**
- Day tabs default to "all" selected
- User must manually click current day

## Goals / Non-Goals

### Goals
1. Group continue watching entries by anime and season
2. Provide quick access to resume the latest episode
3. Show all watched episodes with individual progress
4. Ensure navbar and homepage display consistent data
5. Auto-select current day in weekly schedule

### Non-Goals
- Changing the backend API or data structures
- Modifying watch history storage
- Implementing complex episode filtering or sorting within groups
- Adding new routes or pages

## Decisions

### Decision 1: Group Data in Composable, Not Store

**Choice**: Create a new composable `useGroupedHistory` that transforms flat history records into grouped structure.

**Alternatives considered**:
- **Group in store**: Would require store state refactoring, more complex state management
- **Group in component**: Tight coupling, harder to reuse between views

**Rationale**: Composables are the Vue 3 pattern for derived state. The history store remains the source of truth, while the composable provides a view-specific transformation.

### Decision 2: New Component for Grouped Display

**Choice**: Create `GroupedContinueWatching.vue` component with collapsible episode lists.

**Alternatives considered**:
- **Modify existing HistoryCard**: Would require complex props to handle both modes
- **Use existing VirtualList**: Overkill for small lists, adds complexity

**Rationale**: A dedicated component allows clean separation of concerns. The grouped display has different interaction patterns (expand/collapse) that warrant a separate component.

### Decision 3: Weekly Schedule Day Detection

**Choice**: Use JavaScript `Date.getDay()` mapped to day keys (monday, tuesday, etc.).

**Alternatives considered**:
- **Server-side detection**: Would add API complexity
- **User preference storage**: Overkill for this use case

**Rationale**: Client-side detection is simple, reliable, and aligned with the component's current architecture.

## Component Architecture

```
useGroupedHistory (new composable)
├── Input: WatchRecord[]
├── Output: GroupedAnime[]
└── Methods: groupByAnime(), getLatestEpisode()

GroupedContinueWatchingCard (new component)
├── Props: anime, watchedEpisodes[], onResume, onSelectEpisode
├── State: expanded (bool)
└── Emits: resume, select-episode

HomeView.vue
└── Continue Watching Section
    └── Uses GroupedContinueWatchingCard instead of HistoryCard

AppNavbar.vue
└── Continue Watching Dropdown
    └── Shows compact grouped format

WeeklySchedule.vue
├── Props: (no changes)
├── State: selectedDay (default: current day)
└── Lifecycle: Detect day in onMounted()
```

## Data Structure

### GroupedAnime Interface
```typescript
interface GroupedAnime {
  animeId: string
  animeTitle: string
  animeCover: string
  season: number
  episodes: WatchedEpisode[]
  totalWatched: number
  latestEpisode: WatchedEpisode
  overallProgress: number // 0-100
}

interface WatchedEpisode {
  episode: number
  position: number
  duration: number
  completed: boolean
  watchDate: string
}
```

## Risks / Trade-offs

### Risk: Performance with Large History
**Risk**: Grouping many history records could be slow on every render.

**Mitigation**: Use `computed()` for memoization. The grouping operation is O(n) and history records are typically <1000.

### Risk: Expanded UI Takes More Space
**Risk**: Grouped cards with expanded episode lists consume more vertical space.

**Mitigation**: Default to collapsed state. Users opt-in to see episode details. Limit displayed episodes to latest 10 per anime.

### Risk: Navbar Dropdown Space Constraints
**Risk**: Grouped format may be too large for navbar dropdown.

**Mitigation**: Use a compact format that shows only anime cover, title, and "Resume latest" button. Full episode list only available on homepage.

## Migration Plan

### Phase 1: Infrastructure
1. Create `useGroupedHistory` composable with unit tests
2. Define TypeScript interfaces for grouped data

### Phase 2: Components
1. Create `GroupedContinueWatchingCard.vue` component
2. Update `HomeView.vue` to use grouped display
3. Update `AppNavbar.vue` dropdown with compact grouped format

### Phase 3: Weekly Schedule
1. Add day detection to `WeeklySchedule.vue`
2. Update `useWeeklySchedule` composable to support day parameter

### Phase 4: Testing
1. Manual browser testing with sample data
2. Verify responsive behavior on mobile
3. Test edge cases (empty history, single episode, many episodes)

### Rollback
If issues arise, revert to previous flat display by:
1. Restoring original `HomeView.vue` and `AppNavbar.vue`
2. Keeping new composable for future use
3. No data migration needed (no backend changes)

## Open Questions

1. **Should the HistoryView page also use grouped display?**
   - **Decision**: Yes, for consistency. But the grouping should be optional/toggleable since history page serves different use cases (searching, filtering).

2. **What's the maximum number of episodes to show per anime?**
   - **Decision**: Show all watched episodes but implement virtual scrolling if >20 episodes. For now, no limit (users rarely watch >20 episodes without completing).

3. **Should we aggregate progress across seasons?**
   - **Decision**: No, keep seasons separate. Different seasons are effectively different shows. Users may want to continue Season 1 while Season 2 is in progress.
