# Implementation Tasks

## ✅ COMPLETED - Final Implementation: Auto-Refresh 5 Seconds Before Expiration

**Final Strategy:**
- Proactive refresh 5 seconds before URL expiration (not 403-based)
- No backend caching (simpler architecture)
- Maintains playback position during refresh
- Re-schedules next refresh after successful refresh

## 1. Backend - Video URL Refresh Endpoint ✅
- [x] 1.1 Add `/api/refresh-video-url/:animeId/:season/:episode` endpoint in `server.js`
- [x] 1.2 Store original encrypted URL (cycani- ID) in episode data response
- [x] 1.3 Implement re-fetching of real video URL using Puppeteer
- [x] 1.4 Add error handling for refresh failures
- **Note:** No caching implemented - CDN returns same URL until close to expiration

## 2. Frontend - URL Expiration Detection ✅
- [x] 2.1 Add `parseUrlExpiration()` method in episode.service.ts
- [x] 2.2 Add `getTimeUntilExpiration()` method
- [x] 2.3 Add computed getters in player store: `currentVideoUrl`, `expiresAt`, `timeUntilExpiration`
- [ ] 2.4 Add visual indicator for expired/to-expire URLs (optional, not implemented)

## 3. Frontend - Scheduled Auto-Refresh ✅
- [x] 3.1 Add `refreshVideoUrl()` method in player store
- [x] 3.2 Add `refreshVideoUrlSeamlessly()` function in WatchView.vue
- [x] 3.3 Add `scheduleUrlRefresh()` function - calculates delay (expiration - 5 seconds)
- [x] 3.4 Update video source while maintaining playback position
- [x] 3.5 Resume playback from same timestamp after refresh (100ms delay)
- [x] 3.6 Show notification to user during refresh
- [x] 3.7 Re-schedule next refresh after successful refresh

## 4. Frontend - Test Functions ✅
- [x] 4.1 Add `testCheckExpiration()` - show current URL status and refresh schedule
- [x] 4.2 Add `testForceRefresh()` - manually trigger refresh
- [ ] ~~4.3 Add `testSimulateExpiredUrl()`~~ - removed, not needed for final strategy

## 5. Testing ✅
- [x] 5.1 Test scheduled refresh triggers at correct time
- [x] 5.2 Test automatic refresh maintains playback position
- [x] 5.3 Test manual refresh with `testForceRefresh()`
- [x] 5.4 Test position recovery after refresh
- [ ] 5.5 Test with real expired URL (requires hours to wait - manual user test)
- [ ] 5.6 Add unit tests for URL expiration parsing logic (future enhancement)

## 6. Documentation ✅
- [x] 6.1 Document the x-expires parameter format and TTL (TESTING.md)
- [x] 6.2 Update API docs for refresh endpoint (TESTING.md)
- [x] 6.3 Add comments explaining the refresh strategy (code comments)
- [x] 6.4 Document testing methods and common issues (TESTING.md)

## Key Implementation Decisions

### Why 5 Seconds Before Expiration?
- Testing showed CDN (byteimg.com) only returns new URL when close to expiration
- Earlier refresh (e.g., 5 minutes) returns same URL - no benefit
- 5 seconds provides buffer while still getting fresh URL from CDN

### Why No Backend Caching?
- Cache would prevent getting fresh URLs when timing is right
- Simpler architecture without cache
- Frontend scheduling reduces need for rate limiting

### Why No 403 Error Detection?
- Passive response - user sees interruption first
- Scheduled refresh is proactive - prevents interruption
- Cleaner user experience

### Why Not Pause During Refresh?
- User explicitly requested no interruption
- 100ms delay minimizes visual jumping
- Acceptable trade-off for seamless experience
