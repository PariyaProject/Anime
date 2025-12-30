# Change: Add Theater Anime Support

## Why

Currently, the system only supports TV anime (TV番组, channel 20, `/show/20.html`). The cycani.org website has a separate theater anime category (剧场番组, channel 21, `/show/21.html`) that is not integrated into the proxy server and frontend.

**Root Cause Analysis (from code review):**

### Backend Issues:
1. **Hardcoded channel ID**: `animeIndexManager.js:321` has `const channelId = 20; // TV番组` hardcoded
2. **Index builder doesn't support channels**: The `buildCategoryUrl()` method doesn't accept channel parameter
3. **Channel field missing from index entries**: Index doesn't distinguish TV vs theater anime

### Frontend Issues:
1. **Missing channel field**: `FilterState` (ui.ts:11-17) and `FilterParams` (anime.types.ts:24-32) don't include `channel`
2. **No channel parameter passing**: `animeService.getAnimeList()` (anime.service.ts:20-36) doesn't pass channel to API
3. **No channel UI**: AppNavbar.vue and HomeView.vue have no channel selection controls

### Already Working (no changes needed):
1. **urlConstructor.js**: Complete channel map support (tv, movie, 4k, guoman)
2. **server.js**: API already accepts and processes `channel` parameter (line 739, 777)
3. **ApiParameterValidator**: Validates channel parameter correctly
4. **Local search**: Already searches single index - no changes needed!

## What Changes

### Backend Changes:
- Add channel parameter support to `animeIndexManager.js`
- **Keep single unified index file** - just add `channel` field to entries
- Append theater anime to existing `anime-index.json`
- Update incremental update to pass channel parameter

### Frontend Changes:
- Add `channel: 'tv' | 'movie'` to `FilterState` interface
- Add `channel?: 'tv' | 'movie'` to `FilterParams` type
- Update `animeService.getAnimeList()` to pass channel parameter
- Add channel selection tabs in AppNavbar.vue
- Update HomeView.vue to display current channel
- Add channel badges to search results

### UI Changes:
- Add channel tabs: [TV] [剧场] in navbar
- Channel state syncs with URL query parameter (`?channel=movie`)
- Active channel tab is visually highlighted
- Search results show channel badge (TV/剧场)

## Impact

- **Affected specs**:
  - `anime-list` (new spec to be created) - anime listing and channel filtering
  - `frontend-ux` (MODIFIED) - add channel selection UI requirements

- **Affected code**:
  - `cycani-proxy/src/animeIndexManager.js:321` - hardcoded channel ID
  - `cycani-proxy/src/animeIndexManager.js:319-342` - buildCategoryUrl method
  - `cycani-proxy/frontend/src/stores/ui.ts:11-17` - FilterState interface
  - `cycani-proxy/frontend/src/types/anime.types.ts:24-32` - FilterParams interface
  - `cycani-proxy/frontend/src/services/anime.service.ts:20-36` - getAnimeList method
  - `cycani-proxy/frontend/src/components/layout/AppNavbar.vue` - add channel tabs
  - `cycani-proxy/frontend/src/views/HomeView.vue` - add channel indicator

- **NOT affected** (already working):
  - `cycani-proxy/src/urlConstructor.js` - channel map already complete
  - `cycani-proxy/src/server.js:729-779` - API already processes channel parameter
  - `cycani-proxy/src/server.js:915, 1033` - channel already included in API response
  - **`/api/search-local`** - already searches unified index, no changes needed!
  - **Index file structure** - just add channel field to entries

## Technical Context

**Simplified Approach: Unified Index with Channel Field**

Instead of creating separate index files, we'll keep the single `anime-index.json` and add a `channel` field to each entry:

```json
{
  "5998": {
    "id": "5998",
    "title": "间谍过家家 第二季",
    "channel": "tv",  // NEW field
    ...
  },
  "1234": {
    "id": "1234",
    "title": "剧场版某个动画",
    "channel": "movie",  // NEW field
    ...
  }
}
```

**Benefits:**
- **Minimal code changes** - search doesn't need modification
- **No migration needed** - existing index continues to work
- **Simpler architecture** - one file to manage
- **Same search performance** - O(n) where n is total anime

**Channel Map (already implemented in urlConstructor.js):**
```javascript
{
    'tv': 20,      // TV番组 (currently supported)
    'movie': 21,   // 剧场番组 (to be added)
    '4k': 26,      // 4K专区 (future)
    'guoman': 27,  // 国漫（external source, future)
    'default': 20
}
```

**Type vs Channel (important distinction):**
- **Channel** (`channel`): Content source category (tv/movie/4k/guoman) - determines which listing page to scrape
- **Type** (`type`): Anime format classification (TV/剧场/OVA/OAD/电影) - displayed as metadata badge

## Dependencies

- Existing `urlConstructor.js` channel map (already implemented, no changes needed)
- Existing API channel parameter handling (already implemented in server.js)
- Existing local search system (already works with single index)
- No new external dependencies required

## Success Criteria

- Users can switch between TV and Theater anime via UI tabs
- Anime list displays correct content based on selected channel
- **Single unified index** contains both TV and theater anime with channel field
- Watch history and continue watching work across both channels
- Channel selection persists across page navigation (via URL query parameter)
- All existing filters (genre, year, letter, sort, search) work with channel parameter
- URL sharing works: `?channel=movie&genre=科幻` opens theater anime with sci-fi filter
- **Search returns results from all channels** (no search code changes needed!)
