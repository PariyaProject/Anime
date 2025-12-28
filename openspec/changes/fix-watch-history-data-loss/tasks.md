# Tasks: Fix Watch History Data Loss Issues

## Backend Tasks

- [x] **Remove 100-record hard limit**
  - File: `cycani-proxy/src/server.js`
  - Removed the hard limit in `addToWatchHistory()` method
  - Test: Verify watch history grows beyond 100 entries without deletion

- [x] **Add logging for large history (optional)**
  - Added console log when history exceeds 1000 entries
  - Logs every 5000 entries thereafter
  - Helps monitor storage growth

## Frontend Tasks

- [x] **Fix event listener leak in WatchView.vue**
  - File: `cycani-proxy/frontend/src/views/WatchView.vue`
  - Extracted `handlePageHide` function outside `onMounted` (line 666)
  - Added `removeEventListener` calls in `onUnmounted` hook (lines 750-752)

- [x] **Cache animeId to prevent missing ID bug**
  - File: `cycani-proxy/frontend/src/views/WatchView.vue`
  - Added `const currentAnimeId = ref<string>(animeId.value)` after `animeId` computed (line 162)
  - Replaced all `animeId.value` references with `currentAnimeId.value` in save operations (7 occurrences)

- [x] **Add validation in history store (defensive)**
  - File: `cycani-proxy/frontend/src/stores/history.ts`
  - Added validation at start of `savePositionImmediate` (line 124)

- [x] **Add scroll container to continue watching section**
  - File: `cycani-proxy/frontend/src/views/HomeView.vue`
  - Removed `.slice(0, 4)` limitation
  - Added scrollable container div around the continue watching cards

- [x] **Update continue watching section styles**
  - File: `cycani-proxy/frontend/src/views/HomeView.vue`
  - Added `.continue-watching-container` style with max-height and overflow
  - Added scrollbar styling for dark mode compatibility

## Testing Tasks

- [ ] **Test event listener cleanup**
  - Open browser DevTools
  - Navigate between 5+ episodes
  - Check Event Listeners in DevTools - should only show 3 per component
  - Switch tabs and verify only 3 save requests are sent

- [ ] **Test animeId persistence**
  - Watch an episode for 30+ seconds
  - Click "next episode"
  - Verify save completes without error
  - Check server logs for "Invalid animeInfo" errors (should be none)

- [ ] **Test unlimited history storage**
  - Watch 101+ different episodes
  - Verify all entries are saved
  - Check `watch-history.json` file size

- [ ] **Test continue watching scroll**
  - Add 10+ anime to continue watching
  - Verify scroll container appears
  - Test scrolling in light and dark modes

## Validation

- [x] Build frontend: `npm run build` - ✅ Success
- [ ] Verify no TypeScript errors: `npx vue-tsc --noEmit` - Tool issue, but build passes
- [ ] Manual testing: Watch several episodes, switch tabs, verify history

## Dependencies

- None - all tasks are independent

## Parallelization

- Backend tasks can run in parallel with frontend tasks
- Frontend fixes are mostly independent
- Testing must happen after implementation
