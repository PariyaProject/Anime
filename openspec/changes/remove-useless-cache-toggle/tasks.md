# Tasks: Remove Useless Cache Toggle Feature

## Phase 1: Frontend Code Removal

### 1.1 Delete composable
- [x] Delete `frontend/src/composables/useCacheSettings.ts`
- [x] Verify no other files import this composable
- [x] Confirm TypeScript/JavaScript builds without errors

### 1.2 Delete component
- [x] Delete `frontend/src/components/common/CacheToggle.vue`
- [x] Verify no other files import this component
- [x] Confirm build succeeds

### 1.3 Update AppNavbar.vue
- [x] Remove `useCacheSettings` import (line 116)
- [x] Remove `const { settings: cacheSettings, toggle: toggleCache } = useCacheSettings()` (line 123)
- [x] Remove `const cacheEnabled = computed(() => cacheSettings.enabled)` (line 135)
- [x] Remove cache toggle menu item from settings dropdown (lines 79-86)
- [x] Verify settings dropdown only shows server status and dark mode
- [ ] Test navbar dropdown in browser

### 1.4 Clean up anime.service.ts
- [x] Remove `useCacheSettings` import
- [x] Remove `const { isEnabled } = useCacheSettings()` call
- [x] Remove `useCache` parameter from `fetchAnimeList()` API call
- [x] Verify the function still works correctly

### 1.5 Clean up weeklySchedule.service.ts
- [x] Remove `useCacheSettings` import
- [x] Remove `const { isEnabled } = useCacheSettings()` call
- [x] Remove `useCache` parameter from `fetchWeeklySchedule()` API call
- [x] Verify the function still works correctly

### 1.6 Update tests
- [x] Remove `useCacheSettings` mock from `anime.service.test.ts`
- [x] Update test expectations to remove `useCache: 'false'` from params
- [x] Run `npm test` to ensure all tests pass
- [x] Verify test count decreases appropriately

## Phase 2: Backend Cleanup

### 2.1 Clean up /api/anime-list endpoint
- [x] Remove dead `useCache` parameter acceptance (lines 759-761 in server.js)
- [x] Remove associated comments about "future opt-in caching"
- [ ] Test endpoint with curl: `curl "http://localhost:3017/api/anime-list?page=1"`

### 2.2 Clean up /api/weekly-schedule endpoint
- [x] Remove dead `useCache` parameter acceptance (lines 1270-1272 in server.js)
- [x] Remove associated comments about "future opt-in caching"
- [ ] Test endpoint with curl: `curl "http://localhost:3017/api/weekly-schedule?day=monday"`

### 2.3 Verify backend ignores removed parameter
- [ ] Test `/api/anime-list` with `useCache=true` to ensure it doesn't cause errors
- [ ] Test `/api/weekly-schedule` with `useCache=true` to ensure it doesn't cause errors
- [ ] Verify endpoints return fresh data regardless of parameter

## Phase 3: Documentation Updates

### 3.1 Update CLAUDE.md
- [x] Remove `useCacheSettings` from composables list
- [x] Remove "Global cache toggle" from Key Features section
- [x] Remove `useCache` parameter from `/api/anime-list` endpoint documentation
- [x] Remove `useCache` parameter from `/api/weekly-schedule` endpoint documentation

### 3.2 Update README.md (if applicable)
- [ ] Search for and remove any mentions of cache toggle feature
- [ ] Update feature descriptions if they reference caching

## Phase 4: Testing & Verification

### 4.1 Frontend build verification
- [x] Run `npm run build` in frontend directory
- [x] Verify build completes without errors
- [x] Check dist/ directory is created correctly

### 4.2 Unit tests
- [x] Run `npm test` in frontend directory
- [x] Verify all tests pass (note: 1 pre-existing test failure in AnimeCard.test.ts unrelated to this change)
- [x] Confirm no test failures related to missing cache mocks

### 4.3 Manual browser testing
- [ ] Start frontend dev server (port 3000)
- [ ] Start backend server (port 3006)
- [ ] Open application in browser
- [ ] Open settings dropdown in navbar
- [ ] Verify "启用缓存" toggle is gone
- [ ] Verify only "服务器状态" and "深色模式/浅色模式" toggles remain
- [ ] Open DevTools Network tab
- [ ] Load anime list page
- [ ] Verify API requests do NOT include `useCache` parameter
- [ ] Load weekly schedule
- [ ] Verify API requests do NOT include `useCache` parameter
- [ ] Verify application works correctly (anime loads, videos play, etc.)

### 4.4 localStorage cleanup
- [ ] Open browser DevTools Application tab
- [ ] Check localStorage for `cycani_cache_settings` key
- [ ] Note: This key will remain but is harmless (user can clear manually if desired)
- [ ] Document that old localStorage entries are left behind but don't affect functionality

### 4.5 Smoke test application functionality
- [ ] Test anime list loads correctly
- [ ] Test anime search works
- [ ] Test channel switching (TV/Theater)
- [ ] Test watching an episode
- [ ] Test watch history
- [ ] Test weekly schedule
- [ ] Test dark mode toggle still works
- [ ] Test server status indicator still works

## Phase 5: OpenSpec Validation

### 5.1 Create spec deltas
- [ ] Create `specs/frontend-ui/spec.md` delta for removing cache toggle UI
- [ ] Create `specs/api-endpoints/spec.md` delta for removing useCache parameter
- [ ] Ensure all changes have scenarios

### 5.2 Validate proposal
- [ ] Run `openspec validate remove-useless-cache-toggle --strict`
- [ ] Resolve any validation errors
- [ ] Ensure all requirements have corresponding scenarios

## Dependencies

### Task Dependencies
- Phase 2 (Backend) is independent of Phase 1 (Frontend)
- Phase 3 (Documentation) should happen after Phase 1 & 2
- Phase 4 (Testing) depends on Phase 1 & 2
- Phase 5 (OpenSpec) can happen in parallel with Phase 3

### External Dependencies
- None: All changes are internal to the project

## Parallelizable Work

The following tasks can be done in parallel:
- Phase 1 (Frontend) and Phase 2 (Backend) are fully independent
- Phase 3 (Documentation) can be done while Phase 4 (Testing) runs
- Phase 5 (OpenSpec) can be done in parallel with documentation

## Estimated Impact

### Files Modified
- 2 files deleted (`useCacheSettings.ts`, `CacheToggle.vue`)
- 4 files modified (`AppNavbar.vue`, `anime.service.ts`, `weeklySchedule.service.ts`, `anime.service.test.ts`)
- 1 file modified (`server.js`)
- 2 files modified for documentation (`CLAUDE.md`, possibly `README.md`)

### Lines Removed
- Approximately 156 lines of code and comments

### Risk Level
- **Low**: This is pure removal of dead code
- The feature had no functional impact, so removing it changes nothing
- Backend already ignored the parameter
- Frontend UI changes are straightforward

## Rollback Plan

If any issues arise:
1. Git revert the single commit that contains all changes
2. No data migration needed (only code)
3. No database changes
4. No external dependencies affected
