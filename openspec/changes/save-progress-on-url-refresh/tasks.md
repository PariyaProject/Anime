# Tasks: Save Progress Before Video URL Refresh and Enhance Recovery

## Implementation Tasks

### Part 1: Fix URL Refresh Save and Recovery

- [x] **Add backend save before URL refresh**
  - File: `cycani-proxy/frontend/src/views/WatchView.vue`
  - Function: `refreshVideoUrlSeamlessly()` (around line 596)
  - Add `historyStore.savePositionImmediate()` call after capturing `currentPosition`
  - Add try-catch: warn on failure but continue with refresh (memory-only fallback)
  - Add console log for successful save

- [x] **Fix position recovery timing**
  - File: `cycani-proxy/frontend/src/views/WatchView.vue`
  - Function: `refreshVideoUrlSeamlessly()` - position restoration logic
  - Replace `ready` event with `loadedmetadata` event
  - Add polling for `duration > 0` before setting `currentTime`
  - Add 5-second timeout to stop attempting restore
  - Restore play state (wasPlaying) after successful position restore

### Part 2: Add More Save Triggers

- [x] **Add save trigger for seeked event (if not already working)**
  - File: `cycani-proxy/frontend/src/views/WatchView.vue`
  - Function: `initializePlyr()` - around line 912
  - Verify existing `seeked` event handler saves to backend
  - If not working, add immediate save call with 0 threshold

- [x] **Add save trigger for fast forward/rewind buttons**
  - File: `cycani-proxy/frontend/src/views/WatchView.vue`
  - Add Plyr event listeners for `fastforward` and `rewind` events
  - Or add custom handlers if using custom buttons
  - Save new position immediately after action completes

- [x] **Add save trigger for progress bar interaction**
  - File: `cycani-proxy/frontend/src/views/WatchView.vue`
  - Add listener for progress bar `input` event (during drag)
  - Add listener for progress bar `change` event (after click/release)
  - Save new position immediately with 0 threshold

- [x] **Add save trigger for keyboard shortcuts**
  - File: `cycani-proxy/frontend/src/views/WatchView.vue`
  - Extend existing keyboard shortcut handler (around line 713)
  - Add save calls for arrow key seeks (left/right)
  - Save new position immediately after seek

## Testing Tasks

- [ ] **Test URL refresh save**
  - Open a video episode and watch for 1-2 minutes
  - Trigger manual URL refresh: `testForceRefresh()` in browser console
  - Check network tab: verify save API call completes BEFORE new URL loads
  - Refresh page and confirm position is restored from backend

- [ ] **Test position recovery timing**
  - Open a video episode and watch for 1-2 minutes
  - Trigger URL refresh
  - Observe console: verify position is restored after duration is available
  - Verify playback resumes automatically if was playing

- [ ] **Test fast forward/rewind save**
  - Open a video episode
  - Click fast forward button
  - Check network tab for save API call
  - Refresh page and verify new position is restored

- [ ] **Test progress bar click save**
  - Open a video episode
  - Click directly on progress bar to jump to new position
  - Check network tab for save API call
  - Refresh page and verify new position is restored

- [ ] **Test keyboard shortcut save**
  - Open a video episode
  - Press right/left arrow keys to seek
  - Check network tab for save API call
  - Refresh page and verify new position is restored

## Validation

- [x] Build frontend: `npm run build`
- [x] Verify no TypeScript errors
- [ ] Manual testing: All test scenarios above

## Dependencies

- None - all tasks are in the same file and can be done sequentially

## Parallelization

- Part 1 tasks must be done in order (save before recovery)
- Part 2 tasks are independent and can be done in any order
- Testing must happen after implementation
