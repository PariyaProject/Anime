# Tasks: Remove API Server-Side Caching

## Phase 1: Backend Cache Removal

### 1.1 Remove AnimeListCache class
- [x] Delete `AnimeListCache` class from `cycani-proxy/src/urlConstructor.js` (lines 152-240)
- [x] Verify no other files import or reference this class
- [x] Test that TypeScript/JavaScript builds without errors

### 1.2 Remove cache variables from server.js
- [x] Remove `episodeCache` Map declaration (line 177)
- [x] Remove `weeklyScheduleCache` Map declaration (line 185)
- [x] Remove `animeListCache` instance (line 181)
- [x] Remove `CACHE_TTL` constant (line 178)
- [x] Remove startup cache clear code (lines 187-190)
- [x] Verify server starts without errors

### 1.3 Update getAnimeEpisodeCount() function
- [x] Remove cache key generation code
- [x] Remove cache check (`episodeCache.get()`)
- [x] Remove cache set call (`episodeCache.set()`)
- [x] Test with a known animeId to verify fresh data is fetched

### 1.4 Update /api/anime-list endpoint
- [x] Remove cache key generation
- [x] Remove cache check (`animeListCache.get()`)
- [x] Remove cache set call (`animeListCache.set()`)
- [x] Remove `fromCache: true` from response object
- [x] Add `useCache` parameter check (for future implementation)
- [x] Test with curl: `curl "http://localhost:3017/api/anime-list?page=1"`

### 1.5 Update /api/weekly-schedule endpoint
- [x] Remove cache key generation
- [x] Remove cache check (`weeklyScheduleCache.get()`)
- [x] Remove cache set call (`weeklyScheduleCache.set()`)
- [x] Remove `fromCache: true` from response object
- [x] Keep `refresh` parameter support
- [x] Add `useCache` parameter check (for future implementation)
- [x] Test with curl: `curl "http://localhost:3017/api/weekly-schedule?day=monday"`

### 1.6 Verify no cache references remain
- [x] Search codebase for `animeListCache` references
- [x] Search codebase for `episodeCache` references
- [x] Search codebase for `weeklyScheduleCache` references
- [x] Search codebase for `CACHE_TTL` references
- [x] Search codebase for `fromCache` references
- [x] Ensure all are removed or properly updated

## Phase 2: Frontend Cache Control

**IMPORTANT: Verify frontend 默认不使用缓存 in all tasks**

### 2.1 Create useCacheSettings composable
- [x] Create `frontend/src/composables/useCacheSettings.ts`
- [x] Implement `settings` reactive state with `enabled: false` default (重要: 默认禁用)
- [x] Implement localStorage persistence
- [x] Export helper functions: `isEnabled()`, `enable()`, `disable()`, `toggle()`
- [x] Add TypeScript types for CacheSettings interface
- [x] Verify: When no localStorage value exists, default is `disabled`

### 2.2 Create CacheToggle component
- [x] Create `frontend/src/components/common/CacheToggle.vue`
- [x] Implement checkbox toggle UI
- [x] Add warning message when cache is enabled
- [x] Add styling with scoped CSS
- [x] Export component for use in other parts of the app

### 2.3 Update API service to use cache setting
- [x] Update `frontend/src/services/anime.service.ts`
- [x] Update `frontend/src/services/weeklySchedule.service.ts`
- [x] Import `useCacheSettings` composable
- [x] Modify `fetchAnimeList()` to include `useCache` parameter
- [x] Modify `fetchWeeklySchedule()` to include `useCache` parameter
- [x] Ensure parameter is derived from global cache setting

### 2.4 Integrate CacheToggle into UI
- [x] Determine best location for cache toggle (navbar or settings)
- [x] Add `<CacheToggle />` component to chosen location
- [x] Test toggle functionality in browser
- [x] Verify localStorage persistence across page reloads
- [x] Verify API requests include correct `useCache` parameter

### 2.5 Update existing composables (if needed)
- [x] Check `useAnimeApi.ts` for cache-related code
- [x] Check `useServerStatus.ts` for cache-related code
- [x] Update any hardcoded cache assumptions

## Phase 3: Testing

### 3.1 Backend testing
- [x] Test anime list endpoint returns fresh data on repeated calls
- [x] Test episode count returns fresh data
- [x] Test weekly schedule returns fresh data
- [x] Verify `useCache` parameter is accepted (doesn't cause errors)
- [x] Verify `refresh` parameter still works for weekly schedule

### 3.2 Frontend unit tests
- [x] Update test for `anime.service.test.ts` to include `useCache` parameter
- [x] Mock `useCacheSettings` composable in tests
- [x] Test default value (disabled)
- [x] Test API calls include correct parameters

### 3.3 Integration testing
- [x] Test API service with cache disabled
- [x] Verify correct `useCache` values in network requests
- [x] Test end-to-end: toggle → API call → verify parameter

### 3.4 Manual browser testing
- [x] Start backend server (running on port 3006)
- [x] Start frontend dev server (running on port 3000)
- [x] Open application in browser
- [x] Toggle cache setting on and off
- [x] Check browser DevTools Network tab for `useCache` parameter
- [x] Reload page and verify setting persists

## Phase 4: Documentation Updates

### 4.1 Update CLAUDE.md
- [x] Remove mentions of server-side in-memory caching from "Key API Endpoints"
- [x] Document `useCache` parameter for affected endpoints
- [x] Note default behavior is `useCache=false` (no caching)
- [x] Update composables list to include `useCacheSettings`
- [x] Update Key Features section to mention cache toggle

### 4.2 Update README.md
- [x] Remove cache-related feature descriptions
- [x] Document frontend cache toggle feature
- [x] Update API documentation section

### 4.3 Update code comments
- [x] Remove outdated cache comments from server.js
- [x] Remove outdated cache comments from urlConstructor.js
- [x] Add comments explaining `useCache` parameter (for future impl)

### 4.4 Verify spec documentation
- [x] Ensure spec.md accurately reflects implemented behavior
- [x] Cross-check requirements against implementation

## Phase 5: Verification

### 5.1 Build verification
- [x] Run `npm run build` in frontend directory
- [x] Verify build completes without errors
- [x] Check dist/ directory is created correctly

### 5.2 Existing tests still pass
- [x] Run frontend unit tests: `cd frontend && npm test`
- [x] Verify all 136 existing tests still pass (updated from 96)
- [x] Fix any failures caused by cache removal (updated anime.service.test.ts)

### 5.3 OpenSpec validation
- [ ] Run `openspec validate remove-api-caching --strict`
- [ ] Resolve any validation errors
- [ ] Ensure all requirements have corresponding scenarios

### 5.4 Smoke test deployed application
- [x] Visit http://localhost:3000 (frontend)
- [x] Navigate to home page
- [x] Verify anime list loads
- [x] Navigate to watch page
- [x] Verify episode data loads
- [x] Navigate to weekly schedule
- [x] Verify schedule loads
- [x] Toggle cache setting
- [x] Verify behavior remains consistent
- [x] Verify ServerStatusIndicator is visible in navbar
- [x] Verify ServerStatusIndicator shows server status correctly
- [x] Verify ServerStatusIndicator toggle works (enable/disable)

## Dependencies

### Task Dependencies
- Phase 2 (Frontend) depends on Phase 1 (Backend) completion
- Phase 3 (Testing) depends on Phase 1 and Phase 2
- Phase 4 (Documentation) can be done in parallel with Phase 3
- Phase 5 (Verification) depends on all previous phases

### External Dependencies
- None: All changes are internal to the project

## Parallelizable Work

The following tasks can be done in parallel:
- All Phase 1 backend tasks can be done sequentially by one developer
- Phase 2 frontend tasks can be done in parallel with Phase 1 (with mock backend)
- Phase 4 documentation can be started early based on design decisions
