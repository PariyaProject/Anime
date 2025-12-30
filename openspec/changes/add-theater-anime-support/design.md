# Design: Multi-Channel Architecture for Theater Anime Support

## Context

**Current State:**
- System supports TV anime (channel 20) only
- Single `anime-index.json` for local search
- Search API (`/api/search-local`) searches single index
- Incremental updates add to single index

**Desired State:**
- Support TV and Theater anime channels
- **Single unified index** with channel field to distinguish anime
- Search returns results from all channels (current behavior, no change needed)
- Incremental updates add to same index with channel info

**Key Constraints from Local Search System:**
- Local search is working and popular (no CAPTCHA requirement)
- Index is built from category browsing (not search endpoint)
- Incremental updates happen transparently during browsing
- Frontend uses hybrid mode: text search = local index, filters = remote API

## Goals / Non-Goals

**Goals:**
- Add theater channel support with **minimal changes**
- Keep single index file for simplicity
- Add `channel` field to index entries to distinguish TV vs theater
- Search continues to work as-is (no changes needed)
- Existing `anime-index.json` continues to work (add channel field to new entries)

**Non-Goals:**
- Separate index files (unnecessary complexity)
- Channel-scoped search (search should find all anime)
- Changing search ranking algorithm
- Rebuilding index from scratch

## Decisions

### Decision 1: Single Unified Index with Channel Field

**Choice:** Keep `anime-index.json` as single file, add `channel` field to each entry.

**Rationale:**
- **Minimal code changes**: Search doesn't need modification
- **Simpler architecture**: One file to manage, backup, migrate
- **ID collision handled**: If TV has ID 123 and theater has ID 123, they're different entries
- **Search performance**: No need to merge results from multiple files
- **Easier maintenance**: One index file to monitor and rebuild

**Alternatives considered:**
1. **Separate index files**: Rejected - adds complexity (multiple files to manage, merge search results)
2. **Namespace IDs (tv_123, movie_123)**: Rejected - changes search logic unnecessarily

### Decision 2: Search Remains Unchanged

**Choice:** `/api/search-local` continues to search single index, no changes needed.

**Rationale:**
- Search already finds all anime regardless of channel
- Channel field is just metadata in results
- Simpler code = fewer bugs
- Consistent with current user expectations

**Channel info in search results:**
- Each anime entry already has `channel` field (or will be added)
- Frontend can display channel badge based on this field
- No backend search logic changes required

### Decision 3: Incremental Update Uses Channel Parameter

**Choice:** When `/api/anime-list?channel=movie` is called, add anime with `channel: 'movie'` field.

**Rationale:**
- Consistent with API design (channel parameter indicates source)
- Index entries include source channel for identification
- No changes to incremental update logic structure

**Implementation:**
```javascript
// In incremental update
for (const anime of animeList) {
    this.index.anime[anime.id] = {
        ...anime,
        channel: channel  // 'tv' or 'movie'
    };
}
```

### Decision 4: Existing Entries Default to TV Channel

**Choice:** Anime already in index without `channel` field are treated as TV.

**Rationale:**
- All existing anime are from TV channel (channel 20)
- No migration needed - index continues to work
- New entries from theater will have `channel: 'movie'`
- Frontend displays: missing channel = TV

## Architecture

### Index File Structure

**Single file:** `config/anime-index.json`

```json
{
  "version": "2.0",
  "lastUpdated": "2025-12-30T15:00:00Z",
  "totalAnime": 6490,
  "anime": {
    "5998": {
      "id": "5998",
      "title": "间谍过家家 第二季",
      "cover": "https://...",
      "year": "2022",
      "type": "TV",
      "status": "已完结",
      "episodes": "12",
      "score": "9.1",
      "url": "https://www.cycani.org/bangumi/5998.html",
      "indexedAt": "2025-12-28T10:00:00Z",
      "channel": "tv"
    },
    "1234": {
      "id": "1234",
      "title": "剧场版某个动画",
      "cover": "https://...",
      "year": "2023",
      "type": "剧场",
      "status": "已完结",
      "episodes": "1",
      "score": "8.5",
      "url": "https://www.cycani.org/bangumi/1234.html",
      "indexedAt": "2025-12-30T12:00:00Z",
      "channel": "movie"
    }
  }
}
```

### Index Building Flow (Multi-Channel)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Build Theater Index                          │
│                  buildInitialIndex('movie')                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Scrape /show/21.html    │
                    │ years 1980-2025         │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ For each theater anime: │
                    │ Add channel: 'movie'    │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Append to existing      │
                    │ anime-index.json        │
                    │ (TV entries preserved)  │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Unified index:          │
                    │ TV: ~5000 entries       │
                    │ Movie: ~1500 entries    │
                    │ Total: ~6500 entries    │
                    └─────────────────────────┘
```

### Search Flow (No Changes)

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Search: "间谍"                           │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ /api/search-local?q=间谍 │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Search anime-index.json │
                    │ (single file, unchanged)│
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Returns results:        │
                    │ - 间谍过家家 (TV)       │
                    │ - 间谍剧场版 (Movie)    │
                    │ - ... (mixed results)   │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Frontend displays with  │
                    │ channel badges          │
                    └─────────────────────────┘
```

### Incremental Update Flow (Channel-Aware)

```
┌─────────────────────────────────────────────────────────────────┐
│              User Browses Theater Anime List                     │
│         GET /api/anime-list?channel=movie&year=&sort=time      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Fetch from cycani.org   │
                    │ /show/21.html           │
                    │ (returns 48 theater     │
                    │  anime)                 │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Compare with index      │
                    │ (check anime IDs)       │
                    └─────────────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │ New theater anime found │ None
                     ▼                          │
          ┌─────────────────────────┐          │
          │ Add to index with       │          │
          │ channel: 'movie'        │          │
          │                         │          │
          │ Existing TV entries     │          │
          │ remain untouched        │          │
          └─────────────────────────┘          │
                     │                          │
                     └────────────┬─────────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │ Save anime-index.json   │
                    │ (single file, updated)  │
                    └─────────────────────────┘
```

## Code Changes

### Backend Changes (Minimal)

**animeIndexManager.js:**
```javascript
// 1. Update buildCategoryUrl to accept channel parameter
buildCategoryUrl(genre, year, page = 1, channel = 'tv') {
    const channelId = this.getChannelId(channel); // NEW
    // ... rest of implementation
}

// 2. Update buildInitialIndex to accept channel parameter
async buildInitialIndex(channel = 'tv') {
    // ... builds index for specified channel
    // Adds channel field to each entry
}

// 3. Update incrementalUpdate to accept channel parameter
async incrementalUpdate(animeList, channel = 'tv') {
    for (const anime of animeList) {
        this.index.anime[anime.id] = {
            ...anime,
            channel: channel  // NEW
        };
    }
}

// 4. NO CHANGES to search() method - already works!

// 5. Helper method
getChannelId(channel) {
    const map = { tv: 20, movie: 21, 4k: 26, guoman: 27 };
    return map[channel] || map.tv;
}
```

**server.js:**
```javascript
// Update incremental update call to pass channel
const channel = req.query.channel || 'tv';
await animeIndexManager.incrementalUpdate(animeList, channel); // Add channel param
```

### Frontend Changes (Same as planned)

No changes to search logic - already works with single index.

## API Changes

### No Changes Required

**`/api/search-local`** - No changes needed:
- Continues to search single index file
- Returns results as-is
- Channel field already in each anime entry

**`/api/index-status`** - No changes needed:
- Continue to return aggregate stats
- Optional: Could add per-channel breakdown, but not required

### Optional Enhancement: Per-Channel Stats

If desired, could enhance `/api/index-status`:
```json
{
  "success": true,
  "data": {
    "totalAnime": 6490,
    "lastUpdated": "2025-12-30T15:00:00Z",
    "isBuilding": false,
    "byChannel": {
      "tv": 5247,
      "movie": 1243
    }
  }
}
```

This is **optional** - current format works fine.

## Migration Plan

### Phase 1: Backend Support
1. Update `animeIndexManager.js` to accept channel parameter
2. Update `buildCategoryUrl()` to use channel
3. Update `buildInitialIndex()` to accept channel
4. Update `incrementalUpdate()` to add channel field
5. NO CHANGES to search methods

### Phase 2: API Integration
1. Update `/api/anime-list` to pass channel to incrementalUpdate
2. Test with channel parameter

### Phase 3: Build Theater Index
1. Call `buildInitialIndex('movie')` to add theater anime
2. TV entries remain in index (not rebuilt)
3. Verify theater entries have `channel: 'movie'`

### Phase 4: Frontend (Same as planned)
1. Add channel tabs to UI
2. Add channel badges to search results
3. Update types and stores

### No Migration Needed!

Existing `anime-index.json` continues to work:
- Existing entries have no channel field → treated as TV
- New entries from theater will have `channel: 'movie'`
- No data loss, no file renaming

## Data Model Changes

### Index Entry Structure

**Before (TV only):**
```json
{
  "id": "5998",
  "title": "间谍过家家 第二季",
  "cover": "...",
  "year": "2022",
  "type": "TV",
  "status": "已完结",
  "episodes": "12",
  "score": "9.1",
  "url": "...",
  "indexedAt": "2025-12-28T10:00:00Z"
}
```

**After (with channel field):**
```json
{
  "id": "5998",
  "title": "间谍过家家 第二季",
  "cover": "...",
  "year": "2022",
  "type": "TV",
  "status": "已完结",
  "episodes": "12",
  "score": "9.1",
  "url": "...",
  "indexedAt": "2025-12-28T10:00:00Z",
  "channel": "tv"  // NEW
}
```

**Backward compatible:** Old entries without `channel` field are treated as TV.

## Risks / Trade-offs

### Risk: ID Collision

**Risk:** TV anime ID 123 and theater anime ID 123 are different anime.

**Mitigation:**
- JSON object keys would collide in current structure
- **Solution:** Use composite key or separate namespace
- **Simpler solution:** Since we're using object with ID as key, we need to handle this

**Updated data structure (if collision is a problem):**
```javascript
// Option 1: Composite key
"tv_5998": { ... },
"movie_5998": { ... }

// Option 2: Keep using ID as key, overwrite is OK
// (if collision occurs, newer entry wins - acceptable)
```

**Decision:** Use ID as key, accept that newer entry overwrites older if collision occurs. In practice, TV and theater use different ID ranges, so collision unlikely.

### Risk: Index File Size

**Risk:** Single file with 6000-7000 entries.

**Mitigation:**
- File size is ~2-3 MB (acceptable)
- Search is still fast (O(n) where n=7000)
- Load time is negligible

## Open Questions

1. **How to handle ID collision if it occurs?**
   - **Decision**: Newer entry overwrites older (unlikely to happen in practice)
   - TV and theater likely use separate ID ranges

2. **Should we add per-channel stats to index-status?**
   - **Decision**: Optional enhancement, not required
   - Current aggregate stats work fine

3. **Should frontend show channel breakdown in search results?**
   - **Decision**: Yes, show channel badge on each result
   - Optional: Show "Found X results (TV: Y, Theater: Z)" summary
