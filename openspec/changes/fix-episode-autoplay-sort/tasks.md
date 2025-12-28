# Tasks: Fix Episode Autoplay Sorting Bug

## Task 1: Identify root cause through debugging
**Status**: ✅ Completed
**Finding**: The issue was **not** episode sorting, but **type conversion**. Backend returns episode as string, frontend performed string concatenation instead of numeric addition.

## Task 2: Fix type conversion in loadEpisode()
**Location**: `cycani-proxy/frontend/src/views/WatchView.vue:315-318`
**Status**: ✅ Completed
**Implementation**: Added `Number()` conversion for `data.season` and `data.episode`

## Task 3: Sync jumpEpisode in route watcher
**Location**: `cycani-proxy/frontend/src/views/WatchView.vue:769-776`
**Status**: ✅ Completed
**Implementation**: Added `jumpEpisode.value = episode.value` to ensure synchronization

## Task 4: Remove debug logging
**Location**: `cycani-proxy/frontend/src/views/WatchView.vue:471-481`
**Status**: ✅ Completed
**Implementation**: Removed console.log statements from playNext() and playPrevious()

## Task 5: Verify fix with user testing
**Status**: ✅ Completed
**Result**: User confirmed the issue is fixed - episode 1 now correctly advances to episode 2
