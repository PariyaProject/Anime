## 1. Implementation - Grouped Continue Watching
- [x] 1.1 Create `frontend/src/composables/useGroupedHistory.ts` with grouping logic
  - [x] 1.1.1 Define `GroupedAnime` and `WatchedEpisode` TypeScript interfaces
  - [x] 1.1.2 Implement `groupByAnime()` function to transform flat WatchRecord[] into GroupedAnime[]
  - [x] 1.1.3 Add `getLatestEpisode()` helper to find the most recent episode per anime
  - [x] 1.1.4 Calculate overall progress based on latest episode
- [x] 1.2 Create `frontend/src/components/history/GroupedContinueWatchingCard.vue`
  - [x] 1.2.1 Implement collapsed state with anime cover, title, episode count, latest episode info
  - [x] 1.2.2 Implement expanded state with list of all watched episodes
  - [x] 1.2.3 Add expand/collapse toggle functionality
  - [x] 1.2.4 Add individual episode progress bars in expanded view
  - [x] 1.2.5 Add click handlers for resume and episode selection
- [x] 1.3 Update `frontend/src/views/HomeView.vue` Continue Watching section
  - [x] 1.3.1 Replace HistoryCard with GroupedContinueWatchingCard
  - [x] 1.3.2 Use useGroupedHistory composable to transform continueWatching data
  - [x] 1.3.3 Update grid layout to accommodate grouped cards (row-cols-1 row-cols-md-2 row-cols-lg-4)
- [x] 1.4 Update `frontend/src/components/layout/AppNavbar.vue` dropdown
  - [x] 1.4.1 Use useGroupedHistory composable to transform continueWatching data
  - [x] 1.4.2 Implement compact grouped format (cover, title, latest episode, resume button)
  - [x] 1.4.3 Update dropdown to show up to 5 anime (not episodes)
- [x] 1.5 Add CSS styling for grouped cards
  - [x] 1.5.1 Style collapsed state with proper spacing and hover effects
  - [x] 1.5.2 Style expanded episode list with visual hierarchy
  - [x] 1.5.3 Add transition animations for expand/collapse

## 2. Implementation - Weekly Schedule Current Day Selection
- [x] 2.1 Update `frontend/src/composables/useWeeklySchedule.ts`
  - [x] 2.1.1 Add `getCurrentDayKey()` function to map Date.getDay() to schedule keys
- [x] 2.2 Update `frontend/src/components/schedule/WeeklySchedule.vue`
  - [x] 2.2.1 Add `currentDayKey` computed property to detect current day
  - [x] 2.2.2 Update `selectedDay` ref initial value from 'all' to current day
  - [x] 2.2.3 Modify `onMounted` to detect and set current day
  - [x] 2.2.4 Update initial loadSchedule call to use current day instead of 'all'

## 3. Testing
- [x] 3.1 Manual browser testing
  - [x] 3.1.1 Test grouped continue watching with sample data (multiple episodes, multiple anime)
  - [x] 3.1.2 Test expand/collapse functionality
  - [x] 3.1.3 Test resume navigation from both homepage and navbar
  - [x] 3.1.4 Test individual episode selection from expanded card
  - [x] 3.1.5 Test weekly schedule auto-select on different days of the week
  - [x] 3.1.6 Test manual day selection after auto-select
  - [x] 3.1.7 Test responsive behavior on mobile viewport
- [x] 3.2 Edge case testing
  - [x] 3.2.1 Test with empty history (no continue watching items)
  - [x] 3.2.2 Test with single episode per anime
  - [x] 3.2.3 Test with many episodes (>10) per anime
  - [x] 3.2.4 Test with multiple seasons of same anime
  - [x] 3.2.5 Test weekday when no anime scheduled

## 4. Documentation
- [x] 4.1 Update component comments and documentation
- [x] 4.2 Update CLAUDE.md if new patterns are introduced
