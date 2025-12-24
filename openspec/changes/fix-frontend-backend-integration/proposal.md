# Proposal: Fix Frontend-Backend Integration Issues

## Summary
Review and fix integration gaps between the Vue.js frontend and Express.js backend proxy server. The backend provides several API endpoints that are not fully utilized by the frontend, and some existing integrations have bugs or missing features.

## Problem Statement

### Current Issues Identified

1. **Unused Backend APIs**: The backend exposes endpoints that the frontend doesn't use:
   - `/api/weekly-schedule` - Weekly anime schedule by day (not used in frontend)
   - `/api/search-anime` - Dedicated search endpoint (frontend uses `/api/anime-list` with search param instead)
   - `/api/video-proxy` and `/api/stream` - Video proxying endpoints (not integrated)
   - `/api/image-proxy` - Image proxy is used but not via a dedicated service

2. **API Integration Issues**:
   - `history.service.ts` sends `POST /api/last-position` but backend only has `GET /api/last-position/:animeId/:season/:episode`
   - The `saveWatchPosition` method posts to a non-existent endpoint
   - Watch history saving uses `animeInfo` and `episodeInfo` but backend expects different structure

3. **Missing Type Definitions**:
   - Frontend types don't fully match backend response structures
   - No types for weekly schedule, search results, video proxy responses

4. **Incomplete Error Handling**:
   - Backend returns `success: boolean` wrapper but frontend services don't consistently check it
   - Some services assume successful responses without validation

5. **Pagination Mismatch**:
   - Backend uses complex pagination mapping (source site has 48 items/page)
   - Frontend `FilterParams` type doesn't match all available backend filter options

## Goals

1. **Add Missing Service Functions**:
   - Create `weeklySchedule.service.ts` for `/api/weekly-schedule`
   - Add search method to `anime.service.ts` using `/api/search-anime`
   - Create `imageProxy.service.ts` or add to existing service

2. **Fix History Service Integration**:
   - Correct `saveWatchPosition` to use proper backend API pattern
   - Ensure watch history saving uses correct request body structure

3. **Add Missing Type Definitions**:
   - Define types matching backend response structures
   - Add types for weekly schedule, search, video proxy

4. **Improve Error Handling**:
   - Check `success` field in API responses
   - Handle errors consistently across all services

5. **Update Frontend Components** (if needed):
   - Consider adding a weekly schedule view
   - Use dedicated search endpoint instead of filter-based search

## Out of Scope

- Changes to backend API structure (backend APIs work correctly)
- Complete UI redesign (only component updates to use new services)
- Performance optimizations (cache tuning, pagination improvements)

## Risks

- **Breaking Changes**: Fixing `saveWatchPosition` may break existing watch position saving if data format changes
- **Type Mismatches**: Adding strict types may reveal existing hidden bugs
- **Testing Gaps**: New services need test coverage

## Alternatives Considered

1. **Keep Using Filter-Based Search**: Continue using `/api/anime-list` with search parameter
   - *Pros*: No code changes needed, works correctly
   - *Cons*: Doesn't use dedicated search endpoint which may be optimized for search

2. **Separate Service for Every Endpoint**: Create individual service files for each API group
   - *Pros*: Better separation of concerns
   - *Cons*: More boilerplate, may be overkill for simple endpoints

3. **Generic API Service**: Use a single generic service for all API calls
   - *Pros*: Less code duplication
   - *Cons*: Loses type safety and semantic grouping

## Chosen Approach

- **Add missing service functions** to existing service files for better discoverability
- **Fix history service bugs** to match backend API contract
- **Add comprehensive type definitions** matching backend responses
- **Keep filter-based search** as primary method but expose dedicated search for future use
