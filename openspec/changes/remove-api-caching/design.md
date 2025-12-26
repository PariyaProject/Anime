# Design: Remove API Server-Side Caching

## Overview

This document describes the technical approach for removing server-side caching from the cycani-proxy backend API while adding frontend-controlled cache behavior.

## Current Architecture

### Cache Implementation Locations

```
cycani-proxy/src/
├── server.js
│   ├── episodeCache (Map)              # Line 177
│   ├── weeklyScheduleCache (Map)       # Line 185
│   ├── CACHE_TTL constant              # Line 178
│   ├── getAnimeEpisodeCount()          # Lines 193-272 (uses episodeCache)
│   ├── /api/anime-list                 # Lines 334-698 (uses animeListCache)
│   ├── /api/weekly-schedule            # Lines 866-923 (uses weeklyScheduleCache)
│   └── startup cache clear             # Lines 187-190
└── urlConstructor.js
    └── AnimeListCache class            # Lines 152-240
        ├── getCacheKey()
        ├── get()
        ├── set()
        ├── cleanup()
        ├── clear()
        └── getStats()
```

### Cache Flow (Current)

```
Request → Check Cache → Hit? → Return Cached Data
                      ↓
                     Miss
                      ↓
               Fetch from Source
                      ↓
               Store in Cache
                      ↓
               Return Data
```

## Proposed Architecture

### Simplified Flow (After Removal)

```
Request → Check useCache Parameter
         ↓
    useCache=true? → (Future) Use cache if available
         ↓
    useCache=false/omitted → Fetch from Source
         ↓
                         Return Data
```

## Detailed Design

### Phase 1: Backend Changes

#### 1.1 Remove AnimeListCache Class

**File**: `cycani-proxy/src/urlConstructor.js`

**Changes**:
- Remove entire `AnimeListCache` class (lines 152-240)
- Remove import/usage of this class in `server.js`

**Code to Remove**:
```javascript
class AnimeListCache {
    constructor(ttl = 10 * 60 * 1000) {
        this.cache = new Map();
        this.ttl = ttl;
    }
    // ... all methods
}
```

#### 1.2 Remove Cache Variables

**File**: `cycani-proxy/src/server.js`

**Changes**:
- Remove `episodeCache` Map declaration (line 177)
- Remove `weeklyScheduleCache` Map declaration (line 185)
- Remove `CACHE_TTL` constant (line 178)
- Remove `animeListCache` instance (line 181)
- Remove startup cache clear code (lines 187-190)

**Code to Remove**:
```javascript
const episodeCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;
const weeklyScheduleCache = new Map();
const animeListCache = new AnimeListCache();

// Clear caches on startup
animeListCache.clear();
weeklyScheduleCache.clear();
console.log('🧹 已清除所有缓存');
```

#### 1.3 Modify /api/anime-list Endpoint

**File**: `cycani-proxy/src/server.js` (lines 334-698)

**Changes**:
1. Remove cache check at the start
2. Remove `animeListCache.set()` call after data fetch
3. Add `useCache` parameter check (for future opt-in)

**Current Code**:
```javascript
// Check cache first
const cacheKey = { search, genre, year, letter, sort, channel, page: pageNum };
const cachedData = animeListCache.get(cacheKey);
if (cachedData) {
    console.log(`📋 使用缓存数据: ...`);
    return res.json({ success: true, data: { ...cachedData, fromCache: true } });
}

// ... fetch and process data ...

animeListCache.set(cacheKey, responseData);
```

**New Code**:
```javascript
// Check if caching is enabled (for future opt-in)
const useCache = req.query.useCache === 'true' || req.query.useCache === '1';
// TODO: Implement optional caching when useCache=true

// Fetch and process data directly (no cache check)
// ... existing fetch logic ...

// Remove cache set call
// animeListCache.set(cacheKey, responseData); // DELETED
```

#### 1.4 Modify getAnimeEpisodeCount() Function

**File**: `cycani-proxy/src/server.js` (lines 193-272)

**Changes**:
1. Remove cache check at the start
2. Remove `episodeCache.set()` call after data fetch

**Current Code**:
```javascript
const cacheKey = `episode_${animeId}`;
const cached = episodeCache.get(cacheKey);
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
}

// ... scrape episode count data ...

episodeCache.set(cacheKey, { data: result, timestamp: Date.now() });
```

**New Code**:
```javascript
// No cache check - always fetch fresh data
// ... existing scrape logic ...

// Remove cache set call
// episodeCache.set(cacheKey, { data: result, timestamp: Date.now() }); // DELETED
```

#### 1.5 Modify /api/weekly-schedule Endpoint

**File**: `cycani-proxy/src/server.js` (lines 866-923)

**Changes**:
1. Remove cache check at the start
2. Keep `refresh` parameter support for manual refresh (already bypasses cache)
3. Remove `weeklyScheduleCache.set()` call after data fetch
4. Add `useCache` parameter support for consistency

**Current Code**:
```javascript
const cacheKey = `weekly-schedule-${day}`;
const cachedEntry = weeklyScheduleCache.get(cacheKey);
const shouldSkipCache = refresh === 'true' || refresh === '1';

if (!shouldSkipCache && cachedEntry && Date.now() - cachedEntry.timestamp < 24 * 60 * 60 * 1000) {
    return res.json({ success: true, data: { schedule: cachedEntry.data, fromCache: true } });
}

// ... scrape weekly schedule data ...

weeklyScheduleCache.set(`weekly-schedule-${day}`, { data: scheduleData, timestamp: Date.now() });
```

**New Code**:
```javascript
// Check if caching is enabled (for future opt-in)
const useCache = req.query.useCache === 'true' || req.query.useCache === '1';
// TODO: Implement optional caching when useCache=true

// Keep refresh parameter for manual refresh behavior
const shouldSkipCache = refresh === 'true' || refresh === '1';

// No cache check - always fetch fresh data
// ... existing scrape logic ...

// Remove cache set call
// weeklyScheduleCache.set(...); // DELETED
```

#### 1.6 Preserve Image Caching

**Files**: `cycani-proxy/src/server.js` (lines 725, 758)

**No Changes Required**:
```javascript
// Keep these unchanged - browser-side caching
res.setHeader('Cache-Control', 'public, max-age=86400');
```

### Phase 2: Frontend Changes

**IMPORTANT: Frontend 默认不使用缓存**
- Cache toggle default value: `enabled: false`
- All API requests default to `useCache=false`
- User must manually enable caching for performance optimization

#### 2.1 Add Global Cache Setting

**New File**: `frontend/src/composables/useCacheSettings.ts`

**Purpose**: Manage cache preference state with default disabled

```typescript
import { ref, watch } from 'vue';

const CACHE_SETTINGS_KEY = 'cycani_cache_settings';

interface CacheSettings {
  enabled: boolean;
}

const settings = ref<CacheSettings>({
  enabled: false // Default: disabled for development
});

// Load from localStorage on init
const saved = localStorage.getItem(CACHE_SETTINGS_KEY);
if (saved) {
  try {
    settings.value = JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to parse cache settings:', e);
  }
}

// Persist to localStorage on changes
watch(
  settings,
  (newSettings) => {
    localStorage.setItem(CACHE_SETTINGS_KEY, JSON.stringify(newSettings));
  },
  { deep: true }
);

export function useCacheSettings() {
  return {
    settings,
    isEnabled: () => settings.value.enabled,
    enable: () => { settings.value.enabled = true; },
    disable: () => { settings.value.enabled = false; },
    toggle: () => { settings.value.enabled = !settings.value.enabled; }
  };
}
```

#### 2.2 Add Cache Toggle UI Component

**New File**: `frontend/src/components/common/CacheToggle.vue`

**Purpose**: User interface for controlling cache

```vue
<script setup lang="ts">
import { useCacheSettings } from '@/composables/useCacheSettings';

const { settings, toggle } = useCacheSettings();
</script>

<template>
  <div class="cache-toggle">
    <label class="toggle-label">
      <input
        type="checkbox"
        :checked="settings.enabled"
        @change="toggle"
      />
      <span>启用缓存</span>
    </label>
    <small v-if="settings.enabled" class="text-warning">
      缓存已启用 - 数据可能不是最新的
    </small>
  </div>
</template>

<style scoped>
.cache-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.text-warning {
  color: var(--el-color-warning);
}
</style>
```

#### 2.3 Update API Service

**File**: `frontend/src/services/api.ts`

**Changes**: Add `useCache` parameter to requests based on global setting

```typescript
import { useCacheSettings } from '@/composables/useCacheSettings';

// In API calls, add useCache parameter
export async function fetchAnimeList(params: AnimeListParams): Promise<AnimeListResponse> {
  const { isEnabled } = useCacheSettings();

  const response = await api.get('/api/anime-list', {
    params: {
      ...params,
      useCache: isEnabled() ? 'true' : 'false'
    }
  });

  return response.data;
}
```

#### 2.4 Integrate Cache Toggle into UI

**Options**:
1. Add to settings page/menu (if exists)
2. Add to navbar
3. Add to home page

**Recommended**: Add to `AppNavbar.vue` for easy access

### Phase 3: Documentation Updates

#### 3.1 Update CLAUDE.md

**Section**: Key API Endpoints

**Changes**:
- Remove mention of caching behavior
- Document `useCache` parameter
- Note default is `useCache=false`

#### 3.2 Update Readme

**Changes**:
- Remove cache-related notes
- Document frontend cache toggle feature

## Implementation Phases

### Phase 1: Backend (Independent, No Dependencies)
1. Remove cache classes and variables
2. Update API endpoints
3. Test endpoints directly with curl/Postman

### Phase 2: Frontend (Depends on Phase 1)
1. Create `useCacheSettings` composable
2. Create `CacheToggle` component
3. Update API services
4. Integrate into UI
5. Test frontend with backend

### Phase 3: Documentation (Depends on Phase 1 & 2)
1. Update CLAUDE.md
2. Update README.md
3. Update any inline code comments

## Migration Notes

### Breaking Changes

None for external API consumers:
- The `useCache` parameter is optional
- Default behavior (no parameter) = no caching = fresh data
- Existing API consumers continue to work unchanged

### Data Migration

No data migration required - no persistent cache data

### Rollback Plan

If issues arise:
1. Git revert the commit
2. Cache state is in-memory only, so no cleanup needed
3. Frontend cache setting can be ignored by backend

## Testing Strategy

### Backend Tests

```bash
# Test anime list without cache (default)
curl "http://localhost:3017/api/anime-list?page=1"

# Test anime list with cache parameter (future implementation)
curl "http://localhost:3017/api/anime-list?page=1&useCache=false"

# Test weekly schedule
curl "http://localhost:3017/api/weekly-schedule?day=monday"

# Verify fresh data on repeated calls
# Should see new timestamps/data each time
```

### Frontend Tests

1. Unit test for `useCacheSettings` composable
2. Component test for `CacheToggle`
3. Integration test for API service with cache parameter

### Manual Testing

1. Toggle cache setting
2. Verify API requests include correct `useCache` parameter
3. Verify localStorage persistence across page reloads
4. Verify default is "disabled"

## Performance Considerations

### Without Cache (Default)

- **Pros**: Fresh data always, simpler debugging
- **Cons**: More HTTP requests to cycani.org
- **Mitigation**: Existing rate limiting prevents abuse

### With Cache (Opt-In)

- **Pros**: Reduced latency, fewer external requests
- **Cons**: Potential stale data
- **Use Case**: Production users who prefer performance

### Rate Limiting

Current implementation already has:
- `RATE_LIMIT_DELAY` environment variable (default 1000ms)
- Automatic retry with exponential backoff on 429 errors

This prevents excessive requests even without caching.

## Future Considerations

### Re-adding Caching

If needed in the future:
1. Backend can implement Redis-based caching when `useCache=true`
2. Frontend already has the toggle infrastructure
3. No API changes needed

### Alternative Approaches Considered

1. **Keep cache, add refresh button**: Rejected - still requires manual intervention
2. **Shorter TTL**: Rejected - even 1-minute cache causes confusion during development
3. **Environment-based cache**: Rejected - adds complexity without solving core issue
4. **Full removal with no opt-in**: Rejected - removes optimization option for production

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Remove all server-side cache | Eliminates development confusion |
| Frontend-controlled opt-in | Allows production optimization |
| Default to disabled | Prioritizes development experience |
| Preserve image caching | Unrelated to API data caching |
| Use query parameter | Simple, stateless, cache-friendly |
