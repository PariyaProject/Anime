# Proposal: Remove Useless Cache Toggle Feature

## Summary

Remove the non-functional "启用缓存" (Enable Cache) toggle feature from the frontend, along with all related code. The frontend sends a `useCache` parameter to the backend, but the backend accepts this parameter without implementing any caching logic, making the feature completely non-functional.

## Problem Statement

### Current Issues

1. **Non-Functional UI Element**: The navigation bar has a "启用缓存" toggle that appears to work but has no actual effect on application behavior.

2. **Misleading User Experience**: Users may believe they are enabling/disabling caching, but the backend always returns fresh data regardless of the toggle state.

3. **Code Bloat**: The following files contain code for a feature that does nothing:
   - `frontend/src/composables/useCacheSettings.ts` (60 lines)
   - `frontend/src/components/common/CacheToggle.vue` (65 lines)
   - `frontend/src/services/anime.service.ts` (cache parameter logic)
   - `frontend/src/services/weeklySchedule.service.ts` (cache parameter logic)
   - `frontend/src/components/layout/AppNavbar.vue` (cache toggle UI integration)

4. **Backend Parameter Ignored**: The backend accepts `useCache` parameter in `/api/anime-list` and `/api/weekly-schedule` endpoints but does nothing with it (see `cycani-proxy/src/server.js:761` and `cycani-proxy/src/server.js:1272`).

5. **Historical Context**: According to the `remove-api-caching` proposal, this was added as "future opt-in caching implementation" but was never actually implemented. The backend cache removal was completed, but the frontend toggle was left as dead code.

### Affected Components

**Frontend:**
- `useCacheSettings` composable
- `CacheToggle` component
- Cache toggle in `AppNavbar.vue` settings dropdown
- Cache parameter injection in API services

**Backend:**
- `useCache` parameter acceptance (lines 761, 1272 in `server.js`) - these lines do nothing

## Proposed Solution

### Frontend Changes

1. **Remove Cache Toggle UI**:
   - Remove the "启用缓存" menu item from `AppNavbar.vue` settings dropdown
   - Remove related imports (`useCacheSettings`)

2. **Remove Composable**:
   - Delete `frontend/src/composables/useCacheSettings.ts`

3. **Remove Component**:
   - Delete `frontend/src/components/common/CacheToggle.vue`

4. **Clean Up API Services**:
   - Remove `useCache` parameter from `anime.service.ts`
   - Remove `useCache` parameter from `weeklySchedule.service.ts`
   - Remove `useCacheSettings` imports

5. **Update Tests**:
   - Remove `useCacheSettings` mock from `anime.service.test.ts`
   - Remove `useCache` parameter from test expectations

### Backend Changes

1. **Remove Dead Parameter Acceptance**:
   - Remove `const useCache = ...` lines from `/api/anime-list` endpoint (line 761)
   - Remove `const useCache = ...` lines from `/api/weekly-schedule` endpoint (line 1272)
   - Remove associated comments about "future opt-in caching"

### Documentation Updates

1. Update `CLAUDE.md` to remove references to cache toggle
2. Remove mentions of global cache setting from Key Features section
3. Remove `useCacheSettings` from composables list

## Benefits

1. **Honest UI**: Users won't be confused by a toggle that does nothing
2. **Cleaner Code**: Remove ~150 lines of dead code
3. **Simpler Architecture**: One less feature to maintain and explain
4. **Reduced Complexity**: Fewer components, composables, and test mocks
5. **No API Pollution**: Stop sending ignored parameters to backend

## Trade-offs

1. **No Future Opt-In Path**: If caching is ever needed again, this feature would need to be re-implemented (but this is unlikely given the project's development-first philosophy)

2. **User Confusion During Removal**: Users who have the toggle set in their localStorage will simply see it disappear (minimal impact since it did nothing anyway)

## Scope

### In Scope

- Remove `useCacheSettings` composable
- Remove `CacheToggle` component
- Remove cache toggle from `AppNavbar.vue`
- Remove `useCache` parameter from API services
- Remove dead `useCache` parameter handling from backend
- Update tests to remove cache-related mocks
- Update documentation

### Out of Scope

- Browser-side image caching (Cache-Control headers) - unaffected
- Watch history data storage - unrelated
- Any actual backend caching implementation - none exists

## Success Criteria

1. Cache toggle completely removed from navbar
2. `useCacheSettings` composable deleted
3. `CacheToggle` component deleted
4. API services no longer send `useCache` parameter
5. Backend no longer accepts (and ignores) `useCache` parameter
6. All tests pass after removal
7. Documentation updated to reflect changes
8. Application functions identically (since the feature did nothing)

## Dependencies

- None: This is a standalone removal of dead code

## Related Changes

- Builds on the `remove-api-caching` change which removed actual backend caching but left this dead toggle

## Historical Context

This feature was added as part of the `remove-api-caching` proposal (completed) as a "future opt-in caching implementation". The proposal stated:

> "Add useCache parameter support to affected endpoints"
> "Frontend global cache toggle UI component"
> "When useCache=true, server respects caching (for future opt-in)"

However, the "future implementation" never happened. The backend was modified to accept the parameter but do nothing with it. The frontend was implemented to send the parameter, but it has no effect.

After analysis, it's clear that:
1. The caching feature is not needed for this project
2. Having a non-functional toggle is worse than having no toggle at all
3. The project works fine without any caching
4. If caching is ever needed in the future, it can be re-implemented properly
