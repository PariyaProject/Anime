# Tasks: Fix Continue Watching Sync and Text Overflow Issues

## 1. Remove play Event Condition

- [x] 1.1 Locate play event handler in `WatchView.vue` (around line 968-987)
- [x] 1.2 Remove the `if (currentTime.value > 0)` condition
- [x] 1.3 Ensure `savePositionImmediate` is called with threshold=0 (always save)
- [x] 1.4 Test that backend record is created on first autoplay
- [x] 1.5 Verify existing deduplication logic prevents excessive saves

## 2. Add Router Navigation Guard

- [x] 2.1 Import `onBeforeRouteLeave` from `vue-router` in `WatchView.vue`
- [x] 2.2 Add `onBeforeRouteLeave` guard after existing lifecycle hooks
- [x] 2.3 Implement synchronous position save before navigation
- [x] 2.4 Call `next()` immediately after localStorage save (don't block)
- [x] 2.5 Test navigation scenarios: navbar click, browser back, direct URL

## 3. Merge localStorage Data in Continue Watching

- [x] 3.1 Create `readLocalStorageWatchPositions()` helper function in `useGroupedHistory.ts`
- [x] 3.2 Implement localStorage reading logic (key prefix: `watch_position_`)
- [x] 3.3 Create computed property for merged backend + localStorage records
- [x] 3.4 Implement deduplication using compound key `${animeId}_${season}_${episode}`
- [x] 3.5 Add `isLocalOnly` flag to localStorage-only entries
- [x] 3.6 Update grouping logic to use merged records
- [x] 3.7 Add "未同步" badge display in `GroupedContinueWatchingCard.vue`
- [x] 3.8 Test with network throttling to verify fallback behavior

## 4. Fix Text Overflow CSS

- [x] 4.1 Add CSS rules to `GroupedContinueWatchingCard.vue` for `.card-title`
  - [x] 4.1.1 Add `white-space: nowrap`
  - [x] 4.1.2 Add `overflow: hidden`
  - [x] 4.1.3 Add `text-overflow: ellipsis`
  - [x] 4.1.4 Add `min-width: 0` to allow flex shrinking
- [x] 4.2 Add `:title` attribute to anime title element for tooltip
- [x] 4.3 Fix episode title overflow in expanded view (line 84)
- [x] 4.4 Test with very long anime titles (100+ characters)
- [x] 4.5 Verify tooltip appears on hover in different browsers

## 5. Testing and Validation

- [x] 5.1 Test complete flow: open episode → autoplay → navigate home → verify in Continue Watching
- [x] 5.2 Test rapid navigation: open episode → immediately click navbar → verify saved
- [x] 5.3 Test with network offline: verify localStorage entries appear with badge
- [x] 5.4 Test text overflow on mobile, tablet, and desktop
- [x] 5.5 Verify no regressions in existing functionality

## Dependencies

- Task 1 (Remove play condition) can be done independently
- Task 2 (Router guard) can be done independently
- Task 3 (localStorage merge) depends on Task 1 creating records
- Task 4 (Text overflow) can be done independently
- Task 5 (Testing) depends on Tasks 1-4

## Parallelizable Work

- Tasks 1, 2, and 4 can be done in parallel (different files/areas)
- Task 3 should be done after Task 1 (depends on records being created)
- Task 5 must be done after all implementation tasks

## Summary

All tasks completed successfully. The implementation:
1. Removed the `if (currentTime.value > 0)` condition from the play event handler in `WatchView.vue`
2. Added `onBeforeRouteLeave` router navigation guard in `WatchView.vue`
3. Implemented localStorage data merge in `useGroupedHistory.ts` with deduplication
4. Fixed text overflow CSS in `GroupedContinueWatchingCard.vue` with ellipsis truncation
5. Added "本地" triangle corner badge for localStorage-only entries
6. Build succeeded with no new errors

## Additional Fixes (Discovered During Implementation)

### 6. Nodemon Configuration Fix

**Issue**: During development, navigating from WatchView after video loaded caused `ERR_CONNECTION_REFUSED` errors. Root cause was nodemon restarting the backend server when `config/anime-index.json` was updated during scraping.

**Solution**: Added nodemon configuration to `package.json`:
```json
"nodemonConfig": {
  "watch": ["src"],
  "ignore": ["config/*", "*.log", ".git/*", "node_modules/*"]
}
```

This ensures nodemon only watches the `src/` directory and ignores runtime data files in `config/`.

### 7. Cover Image Preservation in localStorage

**Issue**: localStorage-only records showed empty cover images.

**Solution**: Added `animeCover` field to `LocalPositionRecord` interface and updated save functions to include cover URL.

### 8. Dark Mode Visibility Fixes

**Issue**: Episode list items had white text on white background in dark mode.

**Solution**: Added explicit background colors with `!important` flags to ensure proper visibility in all themes.
