# Proposal: Remove API Server-Side Caching

## Summary

Remove all server-side in-memory caching mechanisms from the backend API to eliminate development issues caused by stale cached data. The frontend will control caching behavior via a global setting, **with caching disabled by default (前端默认不使用缓存)**. Browser-side HTTP caching for images will be preserved.

## Problem Statement

### Current Issues

1. **Stale Data During Development**: Server-side caches (anime list, episode count, weekly schedule) retain data for 10-24 minutes, causing developers to work with outdated information during active development.

2. **Debugging Complexity**: Bugs and unexpected behavior are often caused by cached data rather than actual code issues, leading to misdiagnosis and wasted time.

3. **Cache Inconsistency**: Multiple separate cache implementations (Map-based, AnimeListCache class) with different TTLs create unpredictable behavior.

4. **Development Velocity**: The need to wait for cache expiration or manually restart the server to clear caches significantly slows down development iteration.

### Affected Components

- **AnimeListCache** (`urlConstructor.js`): Caches anime list results for 10 minutes
- **episodeCache** (`server.js`): Caches episode count data for 10 minutes
- **weeklyScheduleCache** (`server.js`): Caches weekly schedule for 24 hours
- All are cleared on server restart, but persist during runtime

## Proposed Solution

### Backend Changes

1. **Remove All Server-Side Cache Implementations**:
   - Remove `AnimeListCache` class from `urlConstructor.js`
   - Remove `episodeCache` Map from `server.js`
   - Remove `weeklyScheduleCache` Map from `server.js`
   - Remove all cache-checking logic from API endpoints

2. **Add Frontend Cache Control Parameter**:
   - Introduce optional `useCache` query parameter for all cached endpoints
   - When `useCache=true`, server respects caching (for future opt-in)
   - When `useCache=false` or omitted (default), server fetches fresh data
   - This enables frontend to control caching behavior globally

### Frontend Changes

1. **Global Cache Setting**:
   - Add a global cache toggle in the frontend UI
   - Store preference in localStorage
   - Apply `useCache` parameter to all relevant API requests

2. **Default Behavior (重要)**:
   - **Frontend 默认不使用缓存**
   - Cache toggle 默认状态为 `disabled` (关闭)
   - 所有 API 请求默认发送 `useCache=false` 或不传该参数
   - 用户可手动开启缓存以获得更好的性能
   - 设置持久化存储在 localStorage 中

### Preserved Items

- **Browser-side image caching** (`Cache-Control` headers) remains unchanged
- This doesn't affect API data caching, only static image resources

## Benefits

1. **Immediate Data Freshness**: Every API request returns current data from cycani.org
2. **Simplified Debugging**: Eliminates cache-related confusion during development
3. **Predictable Behavior**: No more wondering if behavior is due to cache or code
4. **Frontend Control**: Users can opt-in to caching for performance when needed
5. **Cleaner Code**: Removes ~150 lines of cache-related code
6. **Faster Development**: No server restarts needed to clear caches

## Trade-offs

1. **Increased API Requests**: More requests to cycani.org during development
   - Mitigation: The existing rate limiting (1000ms delay) prevents abuse
   - Production can enable caching via frontend setting

2. **Slightly Higher Latency**: No cache hits mean every request goes to the source
   - Mitigation: Unavoidable for development; production users can enable caching

## Scope

### In Scope

- Remove `AnimeListCache` class from `urlConstructor.js`
- Remove `episodeCache` and `weeklyScheduleCache` from `server.js`
- Remove cache logic from `/api/anime-list` endpoint
- Remove cache logic from `/api/weekly-schedule` endpoint
- Remove cache logic from `getAnimeEpisodeCount()` function
- Add `useCache` query parameter support to affected endpoints
- Frontend global cache toggle UI component
- localStorage persistence for cache preference
- Update documentation to reflect changes

### Out of Scope

- Browser-side image caching (Cache-Control headers)
- Redis or external cache systems (not currently implemented)
- Frontend caching of API responses (client-side)
- Watch history data storage (unrelated to API caching)

## Success Criteria

1. All server-side cache code is removed
2. API endpoints return fresh data by default
3. Frontend has a working global cache toggle
4. **Frontend 默认不使用缓存 - cache toggle 默认为 disabled**
5. When cache is disabled (default), no request returns stale data
6. When cache is enabled via frontend, `useCache=true` is sent with requests
7. All existing tests pass after removal
8. No regression in core functionality

## Dependencies

- None: This is a standalone removal of existing code

## Related Changes

- This change does not conflict with any existing OpenSpec changes
- May affect `fix-frontend-ux-issues` (currently 16/27 tasks complete) - need to ensure no conflicts
