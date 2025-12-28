# Design: Local Anime Search Index

## Context

The current search functionality is broken due to cycani.org's anti-bot protection requiring CAPTCHA verification on the search endpoint. Users cannot search for anime, making the proxy significantly less useful.

**Key Insight:** While the search endpoint has anti-bot protection, the **category browsing endpoints** (filtering by genre, year, etc.) have no protection and work reliably.

**Constraints:**
- Cannot use search endpoint (requires CAPTCHA)
- Category browsing works without restrictions
- Want to avoid unnecessary background refreshes
- Updates should happen organically as users browse

**Stakeholders:**
- End users: Need fast, reliable anime search
- Server operator: Minimal maintenance overhead
- Target website: Want to avoid excessive scraping

## Goals / Non-Goals

**Goals:**
- Provide working anime search without CAPTCHA
- Return search results in < 100ms
- Support fuzzy search (partial matches)
- Grow index organically as users browse
- No unnecessary background refresh tasks

**Non-Goals:**
- Real-time search results (acceptable delay for new anime)
- Scheduled background refresh (not needed with user-driven updates)
- Search across other anime websites

## Decisions

### Decision 1: Use Category Browsing for Initial Index Build

**Choice:** Scrape all combinations of genres and years to build initial index.

**Rationale:**
- Category endpoints have no anti-bot protection
- Comprehensive coverage from the start
- One-time cost (~200 pages × 1 second = ~3 minutes)

**Alternatives considered:**
1. **Empty initial index**: Poor UX, no search results initially
2. **Scrape search endpoint with CAPTCHA**: Not possible without user intervention

### Decision 2: Frontend-Driven Incremental Updates

**Choice:** When users browse anime lists, frontend detects new anime and reports to backend.

**Rationale:**
- Natural update timing (when users are actively browsing)
- No unnecessary background scraping
- Scales with user activity
- Catches new anime quickly if users browse new content

**Alternatives considered:**
1. **Scheduled background refresh**: Unnecessary overhead, may fetch content nobody views
2. **Manual refresh only**: Stale index if users don't browse diverse content

### Decision 3: Simple Relevance Ranking

**Choice:** Rank results by: exact match > starts-with > contains.

**Rationale:**
- Most users search for exact or near-exact titles
- Simple to implement and understand
- Good enough for single-language use case

**Alternatives considered:**
1. **Full-text search engine**: Overkill for this use case
2. **Machine learning ranking**: Unnecessary complexity

## Architecture

### Hybrid Search Mode

The frontend uses two different search approaches depending on user input:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Search Logic                        │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Check search box input   │
                    └─────────────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │ Has text input          │ No text input
                     ▼                          │
          ┌─────────────────────────┐          │
          │ LOCAL SEARCH MODE       │          │
          │ /api/search-local?q=... │          │
          │ (searches in-memory     │          │
          │  index, <100ms)         │          │
          └─────────────────────────┘          │
                     │                          │
                     │        ┌─────────────────┴─────────────────┐
                     │        │ FILTER MODE                       │
                     │        │ /api/anime-list?genre=TV&year=2024│
                     │        │ (fetches from remote website)     │
                     │        └───────────────────────────────────┘
                     │                          │
                     └────────────┬─────────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │ Display results         │
                    │ + detect new anime for  │
                    │   index update          │
                    └─────────────────────────┘
```

**Key Behaviors:**
- **Text search**: Uses local index (fast, no CAPTCHA)
- **Filter browsing**: Uses remote API (working, no anti-bot)
- **Filters disabled** when text search is active
- **Clear text** switches back to filter mode

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Server Startup                          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Check if index exists   │
                    └─────────────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │ No                       │ Yes
                     ▼                          ▼
          ┌─────────────────────────┐  ┌─────────────────────┐
          │ Build initial index     │  │ Load existing index │
          │ (category browsing:     │  │ into memory         │
          │  all genres × years)    │  │                     │
          │                         │  └─────────────────────┘
          │ Genres: TV,电影, OVA    │          │
          │ Years: 2015-2025        │          │
          │ ~44 pages               │          │
          └─────────────────────────┘          │
                     │                          │
                     └────────────┬─────────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │ Ready to serve requests │
                    └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Local Search Request                           │
│                   (User typed text)                              │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ /api/search-local?q=... │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Search in-memory index  │
                    │ (relevance ranking)     │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Return results (<100ms)  │
                    └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Filter Browse Request                          │
│                   (User selected genre/year)                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ /api/anime-list?genre=TV│
                    │ &year=2024              │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Fetch from remote site  │
                    │ (working endpoint)      │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Return results +        │
                    │ trigger index update    │
                    └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              User Browsing (Frontend-Driven Updates)            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Frontend loads anime    │
                    │ list from /api/anime-   │
                    │ list?genre=TV&year=2024 │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Compare with local index│
                    │ (check anime IDs)       │
                    └─────────────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │ New anime found         │ No new anime
                     ▼                          │
          ┌─────────────────────────┐          │
          │ POST /api/anime/:id/    │          │
          │ index (batch new IDs)   │          │
          └─────────────────────────┘          │
                     │                          │
                     ▼                          │
          ┌─────────────────────────┐          │
          │ Backend adds to index   │          │
          │ and saves to disk       │          │
          └─────────────────────────┘          │
                     │                          │
                     └────────────┬─────────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │ Index updated organically│
                    └─────────────────────────┘
```

## Data Model

### Anime Index Structure

```json
{
  "version": "1.0",
  "lastUpdated": "2025-12-28T10:00:00Z",
  "totalAnime": 5247,
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
      "indexedAt": "2025-12-28T10:00:00Z"
    }
  }
}
```

Note: Using object with ID keys for O(1) lookup when checking for new anime.

### Search Response Structure

```json
{
  "success": true,
  "data": {
    "animeList": [
      {
        "id": "5998",
        "title": "间谍过家家 第二季",
        "cover": "https://...",
        "year": "2022",
        "type": "TV",
        "status": "已完结"
      }
    ],
    "searchQuery": "间谍",
    "totalCount": 42,
    "indexLastUpdated": "2025-12-28T10:00:00Z"
  }
}
```

## API Specification

### GET /api/search-local

Search anime in local index.

**Query Parameters:**
- `q` (required): Search query, min 2 characters

**Response:**
- 200: Success with anime list
- 400: Invalid query (too short)
- 503: Index is building

### GET /api/index-status

Get current index status.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAnime": 5247,
    "lastUpdated": "2025-12-28T10:00:00Z",
    "isBuilding": false
  }
}
```

Note: No `animeIds` field needed since frontend doesn't participate in index updates.

### POST /api/index-rebuild

Trigger manual index rebuild (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Index rebuild started"
}
```

## Implementation Details

### Initial Index Building Algorithm

```
1. Define genres to scrape: ["", "TV", "电影", "OVA"]
2. Define years to scrape: [2025, 2024, 2023, ..., 2015]
3. For each genre × year combination:
   a. Scrape page using existing /api/anime-list logic
   b. Parse anime items from response
   c. Add to in-memory index (if not already present)
   d. Rate limit: 1 second between requests
4. Save complete index to disk
5. Update lastUpdated timestamp
```

### Frontend-Driven Update Algorithm (Optimized)

**Key Insight:** Incremental updates happen transparently on the backend when users browse with "All Years" + "Newest First" sorting. The frontend doesn't need to call any special update APIs.

```
Backend (when receiving /api/anime-list request):
1. Check if request parameters match update conditions:
   - year = "" or "all" (全部年份)
   - sort = "time" (最新排序)
   - If NOT matched → return results normally, skip index update
2. If matched → proceed with index update:
   a. Fetch anime list from cycani.org (48 items)
   b. Compare from the FIRST item sequentially:
      - If ID NOT in index → add to newAnime batch, continue
      - If ID exists → continue for 5-10 more items (safety buffer), then STOP
   c. If batch has items → add to index and save to disk
3. Return results to frontend (no additional API calls needed)

Frontend behavior:
- Just calls /api/anime-list as usual
- No special update logic needed
- Index updates happen transparently in background

Example scenario:
- User browses homepage (year=all, sort=time)
- Backend receives: GET /api/anime-list?year=&sort=time
- Index has: [..., 6016, 6015, ...]
- API returns: [6020, 6019, 6018, 6017, 6016, 6015, ...]
- Backend comparison:
  [0] 6020: new → add to batch
  [1] 6019: new → add to batch
  [2] 6018: new → add to batch
  [3] 6017: new → add to batch
  [4] 6016: exists → start safety buffer
  [5-9] exists → safety buffer → STOP
- Backend updates index, returns results to frontend
- Frontend receives results normally (unaware of index update)

Why only "All Years" + "Newest First"?
- "All Years" ensures we see the absolute newest anime across all time
- "Newest First" sorting guarantees new anime appear at the top
- Other combinations (e.g., specific year) don't need index updates
- Reduces unnecessary processing and disk writes

Backend (on receiving batch-index):
1. For each anime in batch:
   a. Check if ID already exists in index
   b. If exists, update metadata
   c. If not exists, add new entry
2. Save updated index to disk (atomic write)
3. Update lastUpdated timestamp
```

### Search Algorithm

```
1. Normalize query (lowercase, trim)
2. For each anime in index:
   a. Calculate relevance score:
      - Exact match: 100
      - Starts with: 80
      - Contains: 60
   b. If score > 0, add to results with score
3. Sort results by score descending
4. Return top 50 results
```

## Risks / Trade-offs

### Risk: Index is initially incomplete

**Mitigation:** Build upfront index from all category combinations for good baseline coverage

### Risk: New anime not found until someone browses that category

**Mitigation:** Most users browse "最新" (newest) category regularly, so new anime will be indexed quickly

### Risk: High memory usage

**Mitigation:** Index is ~1-5 MB, acceptable for modern servers

### Risk: Scrape rate limiting

**Mitigation:** Use existing rate-limited httpClient, respect 1-second delay

## Migration Plan

1. Deploy new code with local search endpoints
2. Server builds initial index on startup (3-5 minutes)
3. Update frontend to use `/api/search-local`
4. Add frontend new anime detection
5. Monitor for 1 week
6. Deprecate `/api/search-anime` (keep as fallback)

### Rollback

If issues occur:
1. Revert frontend to use `/api/search-anime`
2. Delete local index file
3. Restart server
