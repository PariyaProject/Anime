# Design: Video URL Refresh Strategy

## Context

### Problem
Video URLs from byteimg.com CDN contain signed parameters (`x-expires`, `x-signature`) that expire after a certain time. When users pause playback for extended periods and resume, the URL returns 403 Forbidden, causing playback failure.

### Example URL
```
https://p3-dcd-sign.byteimg.com/tos-cn-i-f042mdwyw7/aafe379739014e50a9245da73988d322~tplv-jxcbcipi3j-image.image?lk3s=13ddc783&x-expires=1766852953&x-signature=TkFxS9AiU8l3uRPzfCskWpJbRDQ%3D
```

- `x-expires=1766852953` → Unix timestamp (expires ~2025-12-27)
- `x-signature` → HMAC signature validating the request

### Constraints
- Cannot "crack" or bypass the signature - it's a security measure
- Cannot extend TTL - controlled by CDN
- Must work within browser security restrictions
- Should be transparent to user (no manual refresh needed)

## Goals / Non-Goals

### Goals
1. **Seamless Recovery**: User resumes playback after long pause without any manual action
2. **Position Preservation**: Playback resumes from exact timestamp where it stopped
3. **Pre-emptive Action**: Refresh URL before it expires when possible
4. **Fallback Gracefully**: If refresh fails, provide clear error message

### Non-Goals
1. **Cracking Signatures**: Not attempting to bypass x-signature validation
2. **Extending TTL**: Cannot modify CDN expiration behavior
3. **Real-time Refresh**: Not refreshing during active playback (only when paused or on error)

## Decisions

### Decision 1: Dual Strategy - Reactive + Pre-emptive

**Approach**: Combine reactive 403 error handling with pre-emptive refresh before expiration.

**Rationale**:
- **Reactive**: Catches cases where user resumes after URL has already expired
- **Pre-emptive**: Prevents 403 errors entirely by refreshing before expiration
- **Combination**: Best UX - most users never see a 403, but system recovers gracefully if they do

**Alternatives Considered**:
1. **Reactive Only**: Simpler, but user sees loading spinner after resume
2. **Pre-emptive Only**: Complex, and doesn't handle cases where URL expired during pause
3. **Periodic Refresh**: Wasteful - refreshing working URLs unnecessarily

**Chosen**: Dual strategy provides best balance of complexity and UX.

### Decision 2: Backend Refresh Endpoint

**Approach**: Add `/api/refresh-video-url/:animeId/:season/:episode` endpoint that re-fetches a fresh URL using Puppeteer.

**Rationale**:
- **Centralized Logic**: Refresh logic lives in one place (backend)
- **Puppeteer Access**: Backend can run headless browser to get fresh signed URL
- **Caching**: Can cache refreshed URLs to reduce Puppeteer overhead
- **Security**: Encrypted URL IDs stay on backend

**Alternatives Considered**:
1. **Client-side Refresh**: Cannot access player.cycanime.com (CORS)
2. **Proxy All Video Traffic**: Too much bandwidth, complex
3. **Extend URL TTL**: Not possible - controlled by CDN

**Chosen**: Backend endpoint is only feasible approach.

### Decision 3: Store Original Encrypted URL

**Approach**: Include the original encrypted URL (e.g., `cycani-dcd01-...`) in episode API response alongside the decrypted real video URL.

**Rationale**:
- **Refresh Capability**: Real URL expires, but encrypted ID doesn't
- **Re-fetch Source**: Puppeteer can use encrypted ID to get fresh real URL
- **Backward Compatible**: Doesn't break existing clients

**Alternatives Considered**:
1. **Re-scrape Episode Page**: Slower, more fragile
2. **Store Real URLs Only**: Cannot refresh when expired
3. **Cache Forever**: URLs expire, cache becomes invalid

**Chosen**: Store both encrypted and real URLs for maximum flexibility.

### Decision 4: Pre-emptive Refresh Timing

**Approach**: Check expiration every 30 seconds, refresh if URL expires in < 60 seconds AND video is paused.

**Rationale**:
- **30s Check Interval**: Frequent enough to catch expirations, low overhead
- **60s Buffer**: Gives margin for network latency and processing time
- **Paused Only**: Don't interrupt active playback (buffering is jarring)

**Alternatives Considered**:
1. **Refresh at 50% TTL**: Too aggressive, unnecessary refreshes
2. **Refresh Only on Resume**: User sees 403 first (bad UX)
3. **Always Refresh**: Wasteful, may trigger rate limits

**Chosen**: Balanced approach prevents most 403s without being wasteful.

## Technical Implementation

### URL Expiration Parsing

```javascript
function parseUrlExpiration(videoUrl: string): number | null {
  const url = new URL(videoUrl)
  const expiresParam = url.searchParams.get('x-expires')
  return expiresParam ? parseInt(expiresParam) * 1000 : null
}

function getTimeUntilExpiration(videoUrl: string): number {
  const expires = parseUrlExpiration(videoUrl)
  if (!expires) return Infinity
  return expires - Date.now()
}
```

### 403 Error Detection

```javascript
videoElement.addEventListener('error', (event) => {
  const error = event.target.error
  if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    // Check if it's a 403 by fetching HEAD request
    checkUrlStatus(videoElement.src).then(status => {
      if (status === 403) {
        handleExpiredUrl()
      }
    })
  }
})
```

### Seamless URL Refresh

```javascript
async function refreshVideoUrl(animeId: string, season: number, episode: number) {
  const currentTime = videoElement.currentTime
  const wasPlaying = !videoElement.paused

  // 1. Fetch fresh URL from backend
  const freshUrl = await episodeService.refreshVideoUrl(animeId, season, episode)

  // 2. Update video source
  videoElement.src = freshUrl

  // 3. Restore position and play state
  videoElement.currentTime = currentTime
  if (wasPlaying) {
    videoElement.play()
  }
}
```

## Risks / Trade-offs

### Risk 1: Puppeteer Rate Limits

**Risk**: player.cycanime.com may block frequent Puppeteer requests.

**Mitigation**:
- Cache refreshed URLs with 5-minute TTL
- Only refresh when actually needed (near expiration or 403)
- Use same browser pool for efficiency

### Risk 2: Playback Interruption

**Risk**: Refreshing URL during playback causes buffering.

**Mitigation**:
- Only refresh when video is paused
- If must refresh during playback, show loading indicator
- Pre-emptive refresh happens before user resumes

### Risk 3: Refresh Failure

**Risk**: Backend refresh fails, leaving user stuck.

**Mitigation**:
- Show clear error message with "Reload Page" button
- Fallback to full page refresh if all else fails
- Log errors for monitoring

## Migration Plan

### Phase 1: Backend (No Breaking Changes)
1. Add `originalUrl` field to episode API response
2. Add `/api/refresh-video-url` endpoint
3. Test with existing frontend

### Phase 2: Frontend Reactive
1. Add 403 error detection
2. Add automatic refresh on 403
3. Test with manually expired URLs

### Phase 3: Frontend Pre-emptive
1. Add expiration checker
2. Add pre-emptive refresh logic
3. Test with various pause durations

### Rollback
- If frontend refresh fails, existing behavior (403 error) is still functional
- Backend endpoint addition is backward compatible

## Open Questions

1. **URL TTL**: What is the actual TTL of byteimg.com URLs? (Assume ~4-6 hours based on typical CDNs)
2. **Rate Limits**: Does player.cycanime.com have rate limiting? (Will monitor after deployment)
3. **Concurrent Refreshes**: Should we debounce multiple refresh requests for same episode? (Yes, add in-memory cache)