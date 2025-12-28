# Change: Handle Expired Video URLs with Automatic Refresh

## Why

Video URLs from byteimg.com CDN contain expiration parameters (`x-expires`, `x-signature`) that cause 403 errors after long pauses. When users pause video playback for extended periods and then resume, the URL has expired, resulting in playback failure. This creates a poor user experience as the video cannot continue without manual page refresh.

## What Changes

- **Backend**: Add video URL refresh endpoint that re-fetches and returns a fresh, non-expired video URL for a given episode
- **Backend**: Store the original encrypted video URL (cycani- ID) alongside the decrypted URL for future refresh capability
- **Frontend**: Add 403 error detection on video element with automatic URL refresh and seamless recovery
- **Frontend**: Implement pre-emptive URL refresh before expiration (30-60 seconds before x-expires timestamp)
- **Frontend**: Maintain playback position during URL refresh to provide seamless experience

## Impact

- Affected specs:
  - `video-playback` (new spec for video URL management)
  - `player-resilience` (new spec for error recovery)
- Affected code:
  - `cycani-proxy/src/server.js` - Add `/api/refresh-video-url` endpoint
  - `cycani-proxy/frontend/src/views/WatchView.vue` - Add 403 error handling
  - `cycani-proxy/frontend/src/stores/player.ts` - Store original URL for refresh
  - `cycani-proxy/frontend/src/services/episode.service.ts` - Add refresh method

## Technical Notes

- The `x-expires` parameter is a Unix timestamp (e.g., `1766852953` = ~2025-12-27)
- URLs typically expire after several hours, but exact TTL is controlled by the CDN
- Solution involves detecting 403 errors and triggering a silent refresh while maintaining user's playback position
- Pre-emptive refresh can be calculated from the x-expires timestamp to prevent 403s entirely
