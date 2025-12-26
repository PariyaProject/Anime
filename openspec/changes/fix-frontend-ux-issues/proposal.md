# Proposal: Fix Frontend UX Issues

## Summary

Address four critical frontend user experience issues affecting the cycani.org anime streaming Vue.js frontend application:

1. **Anime List Display Issue**: Homepage shows only one anime on first load instead of the expected full list
2. **Missing Weekly Schedule**: No weekly anime schedule component on the homepage
3. **Missing Autoplay Toggle**: No user-configurable autoplay setting in the player view
4. **Incomplete Watch History**: No dedicated watch history page/view with resume functionality

## Current State Analysis

### Issue 1: Anime List Display Problem
**Location**: `frontend/src/views/HomeView.vue:239-244`

The `HomeView.vue` calls `animeStore.loadAnimeList(filters.value)` which sends API request with default filters:
```javascript
const filters = ref<FilterParams>({
  search: '',
  genre: '',
  year: '',
  sort: 'time',
  page: 1,
  limit: 20
})
```

**Root Cause Analysis**:
- Backend `/api/anime-list` endpoint uses pagination mapping with `limit` parameter
- When `limit=20`, the pagination calculation may return fewer items due to how source pages are sliced
- The backend response may only contain 1 item due to incorrect slice calculation or cache issues
- The code at `server.js:660` does `animeList.slice(startIndex, startIndex + limit)` which may produce incorrect results when `startIndex` is near the end of source data

### Issue 2: Missing Weekly Schedule Component
**Current State**:
- Backend has `/api/weekly-schedule` endpoint (server.js:866-917) that returns weekly anime schedule
- Frontend `HomeView.vue` does not have any weekly schedule section/component
- No service method in `anime.service.ts` to fetch weekly schedule data
- No TypeScript types defined for weekly schedule data

### Issue 3: Missing Autoplay Toggle in Player
**Current State**:
- `WatchView.vue:272` has `const autoPlay = ref(true)` but this is:
  1. Not persisted to localStorage
  2. Not synchronized with the `useIframePlayer` iframe-based player (only works for Plyr player)
  3. The toggle at lines 80-91 only controls "auto-play next episode", not initial autoplay
- When using iframe player (most common case for cycani- video IDs), there's no autoplay control
- No user preference storage for autoplay setting

### Issue 4: No Watch History Page
**Current State**:
- Backend has watch history APIs: `/api/watch-history`, `/api/continue-watching`, `/api/last-position/:animeId/:season/:episode`
- Frontend has `historyStore` with `loadWatchHistory()` and `loadContinueWatching()` methods
- `HomeView.vue` shows "Continue Watching" section (lines 3-45) but this is only on homepage
- No dedicated history route/page at `/history`
- Router may not have a history view configured
- Resume watching works (lines 295-307 in HomeView) but only from homepage cards

## Proposed Solution

### 1. Fix Anime List Display
- Change default `limit` from 20 to a higher value (48) to match source website pagination
- Add better error handling and logging for empty responses
- Verify pagination mapping calculation in backend
- Add loading state management to prevent premature UI rendering

### 2. Add Weekly Schedule Section
- Create `WeeklySchedule.vue` component
- Add `getWeeklySchedule()` method to `anime.service.ts`
- Create TypeScript types for weekly schedule data in `types/anime.types.ts`
- Integrate component into `HomeView.vue`
- Use backend `/api/weekly-schedule` API

### 3. Implement Autoplay Preference Toggle
- Create `useAutoplay.ts` composable for autoplay state management
- Persist autoplay preference to localStorage
- Add autoplay toggle switch in player controls
- Modify iframe player URL construction to include autoplay parameter when enabled
- Ensure autoplay setting applies to both Plyr and iframe players

### 4. Create Watch History Page
- Create `HistoryView.vue` page component with full watch history list
- Add `/history` route to Vue Router configuration
- Include "Resume Watching" buttons for each history entry
- Show progress bars for partially watched episodes
- Add filter/clear history functionality
- Link to history page from navigation

## Out of Scope

- Backend API changes (all required APIs already exist)
- User authentication (single-user "default" architecture maintained)
- Mobile-specific optimizations beyond responsive design
- Advanced history features like favorites or watch lists

## Impact

- **User Experience**: Significantly improved with visible anime list, weekly updates discovery, and history access
- **Code Quality**: Better state management with dedicated composables
- **Maintainability**: Clear separation of concerns with new components
- **Performance**: Minimal impact - uses existing API endpoints with caching

## Dependencies

- Vue 3.4+ with Composition API
- Pinia for state management
- Element Plus for UI components
- Existing backend APIs (`/api/anime-list`, `/api/weekly-schedule`, `/api/watch-history`)

## Risks

- **Risk**: Backend weekly schedule parsing may be incomplete
  - **Mitigation**: Add graceful degradation if schedule data is empty

- **Risk**: localStorage quota limits for autoplay preference
  - **Mitigation**: Minimal data storage (single boolean flag)

- **Risk**: Autoplay behavior differences between iframe and Plyr players
  - **Mitigation**: Document player-specific behavior in UI
