# Implementation Tasks

## Phase 1: LocalStorage Caching Layer

- [x] Add localStorage helper functions to `history.service.ts`
  - `saveLocalPosition(animeId, season, episode, position)`
  - `getLocalPosition(animeId, season, episode)`
  - `clearLocalPosition(animeId, season, episode)`
- [x] Add error handling for localStorage quota/availability
- [x] Add unit tests for localStorage operations

## Phase 2: Priority Loading System

- [x] Modify `history.service.ts.getLastPosition()` to check backend first
- [x] Add fallback to localStorage if backend returns null/404
- [x] Update `WatchView.vue.loadEpisode()` to use priority loading
- [x] Add logging for load source (backend/localStorage/default)
- [x] Test all three load scenarios

## Phase 3: Event-Driven Save Triggers

- [x] Add `savePositionImmediate()` function to `history.ts` store
- [x] Add event listener for `visibilitychange` (detect tab switching/background)
- [x] Add event listener for `pagehide` (detect page unload)
- [x] Add event listener for `beforeunload` (detect browser close)
- [x] Add Plyr `seeked` event listener for manual seek operations
- [x] Add Plyr `play` and `pause` event listeners for manual play/pause operations
- [x] Modify `onVideoEnd()` to save position before next episode loads
- [x] Remove or increase interval fallback (change 30s to 5min or remove)

## Phase 4: Debouncing and Race Condition Handling

- [x] Implement debounce for rapid save events (max 1 save per 2 seconds)
- [x] Add last-write-wins logic for concurrent save operations
- [x] Track pending save state to prevent duplicate saves
- [x] Add tests for debouncing behavior

## Phase 5: Cleanup and Documentation

- [x] Remove deprecated `startAutoSave()` from `useHistory.ts` (or update to new behavior)
- [x] Update comments and JSDoc for affected functions
- [x] Add integration test for full save/load cycle
- [x] Update CLAUDE.md with new sync strategy documentation

## Dependencies

- Phase 1 must complete before Phase 2 (localStorage needed for fallback)
- Phase 2 must complete before Phase 3 (load priority needed before save changes)
- Phase 3 and Phase 4 can be done in parallel
- Phase 5 depends on all previous phases

## Validation Criteria

- [x] Backend requests reduced by ~90% (verify in network tab)
- [x] Progress loads correctly from backend when available
- [x] Progress loads from localStorage when backend has no data
- [x] Progress saves on page close/refresh
- [x] Progress saves on manual seek
- [x] Progress saves on play/pause button click
- [x] Progress saves before next episode starts
- [x] All existing tests still pass (136/136 passing)
