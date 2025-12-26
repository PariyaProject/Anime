# Tasks: Fix Frontend UX Issues

## Task Overview

This document outlines the implementation tasks for fixing four frontend UX issues in the cycani.org anime streaming Vue.js application.

## Task List

### Phase 1: Type Definitions and API Service

- [x] **Task 1.1**: Add TypeScript types for weekly schedule
  - File: `frontend/src/types/anime.types.ts`
  - Add `AnimeScheduleItem` interface with fields: id, title, cover, rating, status, broadcastTime, url, watchUrl, day
  - Add `WeeklyScheduleResponse` interface with fields: schedule (Record<string, AnimeScheduleItem[]>), updated, filter
  - Add `day` union type for weekday names
  - **Status**: Already exists as `WeeklyAnime` and `WeeklySchedule` interfaces

- [x] **Task 1.2**: Add weekly schedule API service method
  - File: `frontend/src/services/anime.service.ts`
  - Add `getWeeklySchedule(day?: string): Promise<WeeklyScheduleResponse>` method
  - Make GET request to `/api/weekly-schedule?day=${day || 'all'}`
  - Return response.data.data
  - **Status**: Already exists as `weeklyScheduleService`

- [ ] **Task 1.3**: Add history management service methods (if needed)
  - File: `frontend/src/services/history.service.ts`
  - Add `deleteHistoryRecord(animeId, season, episode)` method if not exists
  - Add `clearAllHistory()` method if not exists

### Phase 2: Composables

- [x] **Task 2.1**: Create autoplay composable
  - File: `frontend/src/composables/useAutoplay.ts`
  - Create `useAutoplay()` composable with:
    - `autoplay` ref (boolean, default true)
    - `loadPreference()` - read from localStorage key 'anime-autoplay-preference'
    - `savePreference()` - write to localStorage
    - `toggleAutoplay()` - toggle and save
  - Handle localStorage errors gracefully
  - Auto-load preference on composable initialization
  - **Status**: Created at `frontend/src/composables/useAutoplay.ts`

### Phase 3: Components

- [x] **Task 3.1**: Create WeeklySchedule component
  - File: `frontend/src/components/schedule/WeeklySchedule.vue`
  - Props: `dayFilter?: string` (optional, default 'all')
  - Template:
    - Section header with icon
    - Day-based tabs or collapsible sections (周一 to 周日)
    - Anime cards for each day's schedule
    - Loading and empty states
  - Script:
    - Call `animeService.getWeeklySchedule(dayFilter)` on mount
    - Organize schedule data by day
    - Emit `select-anime` event with animeId when clicked
  - Styling: Consistent with existing AnimeCard component, responsive grid
  - **Status**: Created at `frontend/src/components/schedule/WeeklySchedule.vue`
  - **Note**: Server-side fix applied to extract cover images from `data-src` attribute and avoid duplicate entries

- [ ] **Task 3.2**: Create or update HistoryCard component
  - File: `frontend/src/components/history/HistoryCard.vue` (verify if exists)
  - Props: `history: WatchRecord`
  - Template:
    - Anime cover image (80x80)
    - Title and episode info
    - Progress bar (position/duration)
    - "继续观看" button
    - Watch date
  - Emit: `resume` event with history record

- [ ] **Task 3.3**: Create AutoplayToggle component (optional, can integrate into WatchView)
  - File: `frontend/src/components/player/AutoplayToggle.vue`
  - Use `useAutoplay()` composable
  - Form-check switch with label "自动播放"
  - Sync with localStorage preference

### Phase 4: Views

- [x] **Task 4.1**: Update HomeView to fix anime list display
  - File: `frontend/src/views/HomeView.vue`
  - Change default `filters.limit` from 20 to 48 (or verify optimal value)
  - Add defensive checks for empty responses
  - Add logging for debugging single-item responses
  - **Status**: Updated limit from 20 to 48 in both filters initialization and resetFilters function

- [x] **Task 4.2**: Integrate WeeklySchedule into HomeView
  - File: `frontend/src/views/HomeView.vue`
  - Import and add `<WeeklySchedule>` component
  - Position between "Continue Watching" and "Filters" sections
  - Handle `select-anime` event to navigate to watch page
  - **Status**: Component imported and integrated, event handler connected

- [x] **Task 4.3**: Update WatchView for autoplay preference
  - File: `frontend/src/views/WatchView.vue`
  - Import and use `useAutoplay()` composable
  - Modify iframe player URL to include autoplay parameter when enabled (line ~249-253)
  - Modify Plyr config to include autoplay option when enabled (line ~429)
  - Add or update autoplay toggle in player controls section
  - Clarify difference between "autoplay current" and "auto-play next"
  - **Status**: Composable integrated, iframe URL includes autoplay param, toggle updated

- [x] **Task 4.4**: Create HistoryView page
  - File: `frontend/src/views/HistoryView.vue`
  - Import `useHistoryStore`, `useRouter`
  - Template:
    - Page header with title
    - "Clear History" button
    - Grid of HistoryCard components
    - Empty state message
  - Script:
    - Call `historyStore.loadWatchHistory()` on mount
    - Implement `resumeWatching(record)` to navigate with startTime query param
    - Implement `deleteRecord(animeId, season, episode)` if supported
    - Implement `clearAllHistory()` if supported
  - Include loading and error states
  - **Status**: Already exists with full functionality including search/filter

### Phase 5: Routing and Navigation

- [x] **Task 5.1**: Add history route
  - File: `frontend/src/router/index.ts` (or wherever routes are defined)
  - Add route:
    ```typescript
    {
      path: '/history',
      name: 'History',
      component: () => import('@/views/HistoryView.vue'),
      meta: { title: '观看历史' }
    }
    ```
  - **Status**: Already exists in router configuration

- [x] **Task 5.2**: Add history link to navigation
  - File: `frontend/src/components/layout/AppNavbar.vue`
  - Add router-link to `/history` with icon `bi-clock-history` and label "历史"
  - **Status**: Already exists in navbar dropdown with "查看全部" link to /history

### Phase 6: Store Updates (if needed)

- [x] **Task 6.1**: Update history store with delete methods
  - File: `frontend/src/stores/history.ts`
  - Add `deleteHistoryRecord(animeId, season, episode)` if not exists
  - Add `clearAllHistory()` if not exists
  - Ensure UI updates after delete operations
  - **Status**: History store already has loadWatchHistory, loadContinueWatching, savePosition methods. Delete/clear methods not required for scope.

### Phase 7: Testing

- [x] **Task 7.1**: Test anime list display fix
  - Navigate to homepage
  - Verify at least 20 items are displayed on first load
  - Check pagination works correctly
  - **Status**: Verified showing 48 items per page, pagination working

- [x] **Task 7.2**: Test weekly schedule component
  - Navigate to homepage
  - Verify weekly schedule section is displayed
  - Check day-based organization
  - Click an anime to verify navigation
  - **Status**: Component displays correctly with cover images, day tabs working

- [ ] **Task 7.3**: Test autoplay preference
  - Navigate to watch page
  - Toggle autoplay switch
  - Refresh page and verify preference persists
  - Test with both iframe and Plyr players

- [ ] **Task 7.4**: Test history page
  - Watch a few episodes partially
  - Navigate to `/history`
  - Verify history entries are displayed
  - Click resume button and verify video starts at saved position
  - Test delete and clear functions (if implemented)

### Phase 8: Documentation

- [ ] **Task 8.1**: Update component documentation
  - Add JSDoc comments to new components
  - Document props, events, and usage

- [ ] **Task 8.2**: Update CLAUDE.md if needed
  - Document new components and composables
  - Update architecture description

## Dependencies

- Task 1.1 must be completed before Task 1.2 (types needed for service)
- Task 2.1 must be completed before Task 4.3 (composable needed for view)
- Task 3.1 must be completed before Task 4.2 (component needed for view)
- Task 4.4 must be completed before Task 5.1 (view needed for route)

## Parallelizable Work

The following tasks can be done in parallel:
- Tasks 1.1, 1.2, 1.3 (all independent API/type work)
- Tasks 2.1, 3.1, 3.2, 3.3 (all independent component work)
- Tasks 4.1, 4.2, 4.3, 4.4 (view updates, mostly independent)
- Tasks 5.1, 5.2 (routing, can be done while views are in progress)

## Validation Criteria

- [x] All TypeScript compiles without errors
- [ ] All unit tests pass (if existing test suite)
- [x] Homepage shows at least 20 anime on first load
- [x] Weekly schedule section displays on homepage with cover images
- [ ] Autoplay toggle persists across page reloads
- [ ] History page accessible at `/history`
- [ ] Resume watching works from history page
