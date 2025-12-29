# Implementation Tasks

## 1. Backend - Local Search Index System
- [x] 1.1 Create `AnimeIndexManager` class in `src/animeIndexManager.js`
- [x] 1.2 Implement initial index builder using category browsing (genre × year combinations)
- [x] 1.3 Add index persistence to `config/anime-index.json` with atomic writes
- [x] 1.4 Implement in-memory index cache for fast search
- [x] 1.5 Add incremental update method (add single anime to index)

## 2. Backend - Search API Endpoints
- [x] 2.1 Create `/api/search-local` endpoint for local index search
- [x] 2.2 Add fuzzy search support (match partial titles)
- [x] 2.3 Implement search result ranking (relevance score)
- [x] 2.4 Add `/api/index-status` endpoint to show index statistics
- [x] 2.5 Add `/api/index-rebuild` endpoint for manual index rebuild
- [x] 2.6 Keep existing `/api/search-anime` as fallback (marked as legacy)

## 3. Backend - Server Integration
- [x] 3.1 Initialize anime index on server startup (build if doesn't exist)
- [ ] 3.2 Add health check endpoint that includes index status
- [ ] 3.3 Implement graceful shutdown (save index before exit)

## 4. Backend - Incremental Index Updates (Transparent)
- [x] 4.1 Hook into existing `/api/anime-list` endpoint
- [x] 4.2 Check if year=all AND sort=time (trigger conditions)
- [x] 4.3 If conditions match: compare fetched anime with in-memory index
- [x] 4.4 Implement sequential comparison with safety buffer (5-10 items after first match)
- [x] 4.5 Add new anime to index and save to disk atomically
- [x] 4.6 Return normal response (index update is transparent)

## 5. Frontend - Hybrid Search Mode Implementation
- [x] 5.1 Implement search mode detection: check if search box has text input
- [x] 5.2 Update `anime.service.ts` to route to `/api/search-local` when text is present
- [x] 5.3 Keep existing `/api/anime-list` routing for filter-based browsing (no text input)
- [x] 5.4 Disable filter dropdowns (genre, year, sort) when text search is active
- [x] 5.5 Add visual feedback: tooltips explaining filter behavior
- [x] 5.6 Switch back to filter mode when search text is cleared
- [x] 5.7 Add fallback to legacy search if local index is empty
- [x] 5.8 Show index status indicator when index is building

## 6. Testing
- [x] 6.1 Test initial index building from category combinations
- [x] 6.2 Test hybrid search mode: text search vs filter browsing
- [x] 6.3 Test search functionality with various queries
- [x] 6.4 Test incremental index updates on backend (year=all, sort=time)
- [ ] 6.5 Test that updates are skipped when year!=all or sort!=time
- [x] 6.6 Test index persistence and recovery
- [x] 6.7 Test filter disable/enable behavior
- [ ] 6.8 Add unit tests for search ranking logic

## 7. Documentation
- [ ] 7.1 Document index data structure and API endpoints
- [ ] 7.2 Add troubleshooting guide for index issues
- [ ] 7.3 Update README with local search feature
- [ ] 7.4 Document how to trigger manual index rebuild
- [ ] 7.5 Document the automatic update behavior (year=all + sort=time)

## Notes

### Completed Items (2025-12-29)
- All core backend implementation is complete
- Frontend hybrid search mode is fully implemented
- Index building and persistence are working
- API endpoints are functional and tested

### Remaining Items
- Task 3.2: Health check endpoint enhancement (low priority - existing /api/health works)
- Task 3.3: Graceful shutdown for index (low priority - index saves on each update)
- Task 6.5: Additional unit tests for edge cases
- Task 6.8: Unit tests for search ranking logic
- Task 7.x: Documentation updates (can be done separately)

### Verification
- `/api/index-status` returns correct status
- `/api/search-local` returns proper error when index is building
- Incremental update hooks are in place in `/api/anime-list`
- Frontend filters are disabled when search text is present
