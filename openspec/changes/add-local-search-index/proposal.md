# Change: Add Local Anime Search Index

## Why

The current search implementation (`/api/search-anime`) directly queries cycani.org's search endpoint, which has anti-bot protection that requires:
1. Bot detection verification on first search
2. CAPTCHA challenge for verification

This causes all search requests to fail with no results, making the search feature unusable.

However, the website's **category-based browsing** (by genre, year, etc.) has no anti-bot protection and works reliably.

## What Changes

- Add a local anime index stored in JSON format at `cycani-proxy/config/anime-index.json`
- Implement an **incremental index builder** that scrapes anime metadata using category browsing (genre+year combinations)
- Create `/api/search-local` endpoint that searches the local index
- Add **frontend-driven incremental updates**: when users browse anime lists, new items are automatically added to the index
- No background refresh tasks - updates happen organically as users browse
- Keep the existing `/api/search-anime` endpoint as a fallback for future use

## Impact

- **Affected specs**:
  - `frontend-ux` (add search requirements)
- **Affected code**:
  - `cycani-proxy/src/server.js` (add search endpoints and incremental index update)
  - `cycani-proxy/src/animeIndexManager.js` (new file for index management)
  - `cycani-proxy/config/anime-index.json` (new data file for local index)
  - `cycani-proxy/frontend/src/services/anime.service.ts` (update to use local search and report new anime)

## Trade-offs

**Benefits**:
- Fast search results (no network latency)
- No CAPTCHA requirements
- Uses existing working API endpoints (category browsing)
- Incremental updates happen naturally as users browse
- No unnecessary background refreshes
- Reduced load on target website (only fetch what users actually view)

**Drawbacks**:
- Initial index build takes time (scrapes all category combinations)
- Index may be incomplete until users browse various categories
- Increased storage (~1-5 MB for full index)

**Alternatives considered**:
1. **CAPTCHA proxy**: Display CAPTCHA to user for manual solving - rejected due to poor UX
2. **Puppeteer CAPTCHA bypass**: Complex and unreliable - rejected due to maintenance burden
3. **Scheduled background refresh**: Unnecessary overhead when updates can happen organically - rejected in favor of user-driven approach

## Migration Plan

1. Build initial anime index from category browsing (all genre+year combinations)
2. Add local search endpoint alongside existing remote endpoint
3. Update frontend to use local search by default
4. Add "new anime detection" when users browse lists
5. Frontend reports new anime IDs to backend for index update
6. Remove background refresh task (not needed)

## Open Questions

- Should we build the full index upfront or let it grow organically? (proposal: build upfront for better UX)
- How many category combinations to scrape initially? (proposal: all genres × recent years = ~200 pages)
