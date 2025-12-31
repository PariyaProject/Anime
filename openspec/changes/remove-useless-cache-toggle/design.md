# Design: Remove Useless Cache Toggle Feature

## Overview

This document describes the technical approach for removing the non-functional cache toggle feature from the frontend and cleaning up related dead code.

## Current Architecture

### Files to Delete

```
frontend/src/
├── composables/
│   └── useCacheSettings.ts          # DELETE: 60 lines, manages cache toggle state
└── components/
    └── common/
        └── CacheToggle.vue          # DELETE: 65 lines, toggle UI component
```

### Files to Modify

```
frontend/src/
├── components/layout/
│   └── AppNavbar.vue                # REMOVE: Cache toggle menu item and imports
├── services/
│   ├── anime.service.ts             # REMOVE: useCache parameter logic
│   └── weeklySchedule.service.ts    # REMOVE: useCache parameter logic
└── services/
    └── anime.service.test.ts        # UPDATE: Remove useCacheSettings mock

cycani-proxy/src/
└── server.js                        # REMOVE: Dead useCache parameter acceptance (2 locations)
```

## Detailed Design

### Phase 1: Frontend Removal

#### 1.1 Remove useCacheSettings Composable

**File**: `frontend/src/composables/useCacheSettings.ts`

**Action**: Delete entire file

**Code to be removed**:
```typescript
/**
 * Cache Settings Composable
 * ... (entire file, ~60 lines)
 */
export function useCacheSettings() { ... }
```

#### 1.2 Remove CacheToggle Component

**File**: `frontend/src/components/common/CacheToggle.vue`

**Action**: Delete entire file

**Code to be removed**:
```vue
<template>
  <div class="cache-toggle">
    <label class="toggle-label">
      <input type="checkbox" ... />
      <span>启用缓存</span>
    </label>
    <small v-if="settings.enabled" ...>
      缓存已启用 - 数据可能不是最新的
    </small>
  </div>
</template>
<!-- ... entire file, ~65 lines -->
```

#### 1.3 Update AppNavbar.vue

**File**: `frontend/src/components/layout/AppNavbar.vue`

**Changes**:

1. **Remove import** (line 116):
```typescript
// DELETE THIS LINE:
import { useCacheSettings } from '@/composables/useCacheSettings'
```

2. **Remove composable usage** (line 123):
```typescript
// DELETE THIS LINE:
const { settings: cacheSettings, toggle: toggleCache } = useCacheSettings()
```

3. **Remove cache enabled computed** (line 135):
```typescript
// DELETE THIS LINE:
const cacheEnabled = computed(() => cacheSettings.enabled)
```

4. **Remove cache toggle menu item** (lines 79-86):
```vue
<!-- DELETE THIS BLOCK: -->
<div class="dropdown-item settings-item" @click="toggleCache">
  <span class="settings-icon">💾</span>
  <span class="settings-text">启用缓存</span>
  <span class="settings-status" :class="{ enabled: cacheEnabled }">
    {{ cacheEnabled ? '开启' : '关闭' }}
  </span>
</div>
```

**Result**: Settings dropdown will only have:
- Server status toggle
- Dark mode toggle

#### 1.4 Clean Up anime.service.ts

**File**: `frontend/src/services/anime.service.ts`

**Changes**:

1. **Remove import**:
```typescript
// DELETE THIS LINE:
import { useCacheSettings } from '@/composables/useCacheSettings'
```

2. **Remove cache logic from fetchAnimeList** (lines 28-35):
```typescript
// DELETE:
const { isEnabled } = useCacheSettings()

// BEFORE:
const response = await api.get('/api/anime-list', {
  params: {
    ...animeParams,
    useCache: isEnabled() ? 'true' : 'false'
  }
});

// AFTER:
const response = await api.get('/api/anime-list', {
  params: animeParams
});
```

#### 1.5 Clean Up weeklySchedule.service.ts

**File**: `frontend/src/services/weeklySchedule.service.ts`

**Changes**:

1. **Remove import**:
```typescript
// DELETE THIS LINE:
import { useCacheSettings } from '@/composables/useCacheSettings'
```

2. **Remove cache logic from fetchWeeklySchedule** (lines 16-27):
```typescript
// DELETE:
const { isEnabled } = useCacheSettings()

// BEFORE:
const response = await api.get('/api/weekly-schedule', {
  params: {
    day,
    useCache: isEnabled() ? 'true' : 'false'
  }
});

// AFTER:
const response = await api.get('/api/weekly-schedule', {
  params: { day }
});
```

#### 1.6 Update Tests

**File**: `frontend/src/services/anime.service.test.ts`

**Changes**:

1. **Remove mock** (lines 12-15):
```typescript
// DELETE THIS BLOCK:
vi.mock('@/composables/useCacheSettings', () => ({
  useCacheSettings: () => ({
    isEnabled: vi.fn(() => false)
  })
}));
```

2. **Update test expectations** to remove `useCache: 'false'` from expected params:
```typescript
// BEFORE:
expect(axios.get).toHaveBeenCalledWith('/api/anime-list', {
  params: { page: 1, limit: 24, useCache: 'false' }
});

// AFTER:
expect(axios.get).toHaveBeenCalledWith('/api/anime-list', {
  params: { page: 1, limit: 24 }
});
```

### Phase 2: Backend Cleanup

#### 2.1 Remove Dead Parameter from /api/anime-list

**File**: `cycani-proxy/src/server.js`

**Location**: Lines 759-761

**Action**: Remove dead parameter acceptance

```javascript
// DELETE THESE LINES:
// Note: useCache parameter can be used for future opt-in caching implementation
// Currently always fetches fresh data to support development workflow
const useCache = req.query.useCache === 'true' || req.query.useCache === '1';
```

#### 2.2 Remove Dead Parameter from /api/weekly-schedule

**File**: `cycani-proxy/src/server.js`

**Location**: Lines 1270-1272

**Action**: Remove dead parameter acceptance

```javascript
// DELETE THESE LINES:
// Note: useCache parameter can be used for future opt-in caching implementation
// Currently always fetches fresh data to support development workflow
const useCache = req.query.useCache === 'true' || req.query.useCache === '1';
```

### Phase 3: Documentation Updates

#### 3.1 Update CLAUDE.md

**Section**: Vue Frontend Architecture - Composables

**Action**: Remove `useCacheSettings` from composables list

**Section**: Key Features

**Action**: Remove "Global cache toggle (disabled by default)" from features list

**Section**: Key API Endpoints

**Action**: Remove `useCache` parameter documentation from:
- `GET /api/anime-list` - remove mention of `useCache` parameter
- `GET /api/weekly-schedule` - remove mention of `useCache` parameter

## Implementation Phases

### Phase 1: Frontend Removal (Independent)
1. Delete `useCacheSettings.ts` composable
2. Delete `CacheToggle.vue` component
3. Update `AppNavbar.vue`
4. Update API services
5. Update tests
6. Build and verify frontend

### Phase 2: Backend Cleanup (Independent)
1. Remove dead parameter from `/api/anime-list`
2. Remove dead parameter from `/api/weekly-schedule`
3. Test endpoints with curl to ensure they still work

### Phase 3: Documentation (After Phase 1 & 2)
1. Update `CLAUDE.md`
2. Update `README.md` if it mentions the feature

## Testing Strategy

### Frontend Tests

1. **Unit Tests**:
   - Run `npm test` to ensure all tests pass after removing cache-related mocks
   - Verify test count decreases (removing cache test mocks)

2. **Build Test**:
   - Run `npm run build` to ensure no import errors
   - Verify no TypeScript errors

3. **Manual Browser Test**:
   - Start frontend dev server
   - Open application in browser
   - Verify settings dropdown no longer shows cache toggle
   - Verify API requests in Network tab no longer include `useCache` parameter
   - Verify application still loads anime list correctly

### Backend Tests

1. **API Endpoint Tests**:
```bash
# Test anime list (should work without useCache parameter)
curl "http://localhost:3017/api/anime-list?page=1"

# Test weekly schedule (should work without useCache parameter)
curl "http://localhost:3017/api/weekly-schedule?day=monday"

# Test that useCache parameter is ignored (returns fresh data)
curl "http://localhost:3017/api/anime-list?page=1&useCache=true"
```

## Rollback Plan

If issues arise:
1. Git revert the commit (all changes are in one feature)
2. No data migration needed (only code changes)
3. No persistent state to clean up

## Verification Checklist

- [ ] `useCacheSettings.ts` deleted
- [ ] `CacheToggle.vue` deleted
- [ ] `AppNavbar.vue` no longer imports or uses cache settings
- [ ] `anime.service.ts` no longer sends `useCache` parameter
- [ ] `weeklySchedule.service.ts` no longer sends `useCache` parameter
- [ ] `anime.service.test.ts` no longer mocks `useCacheSettings`
- [ ] Backend `/api/anime-list` no longer accepts `useCache` parameter
- [ ] Backend `/api/weekly-schedule` no longer accepts `useCache` parameter
- [ ] All tests pass
- [ ] Frontend builds successfully
- [ ] Manual browser test confirms cache toggle is gone
- [ ] Network tab confirms `useCache` parameter not sent
- [ ] Documentation updated

## Code Quality Impact

### Lines of Code Removed
- `useCacheSettings.ts`: ~60 lines
- `CacheToggle.vue`: ~65 lines
- `AppNavbar.vue`: ~10 lines (import + usage + menu item)
- `anime.service.ts`: ~5 lines (import + logic)
- `weeklySchedule.service.ts`: ~5 lines (import + logic)
- `anime.service.test.ts`: ~5 lines (mock)
- `server.js`: ~6 lines (dead parameter handling)

**Total**: ~156 lines of dead code removed

### Complexity Reduction
- 1 composable removed
- 1 component removed
- 1 localStorage key no longer used (`cycani_cache_settings`)
- Simpler API services (no conditional parameter logic)
- Cleaner navbar UI
