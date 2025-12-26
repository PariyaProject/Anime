# Change: Fix Frontend-Backend Integration Issues

## Why

The frontend Vue.js application is not properly integrating with the backend API, causing two critical bugs:

1. **Images not displaying**: Image URLs returned by the backend `/api/image-proxy` endpoint are not being correctly processed by the frontend
2. **Video playback failing**: The video player cannot retrieve playable video URLs from the backend `/api/episode` endpoint

These issues prevent users from viewing anime thumbnails and watching episodes, making the application effectively non-functional.

## What Changes

- **Fix image URL handling** in `AnimeCard.vue` to properly resolve backend proxy URLs
- **Fix video URL extraction and display** in `WatchView.vue` and player store
- **Ensure backend `/api/episode` endpoint returns properly formatted video URLs**
- **Add proper error handling and fallbacks** for failed image/video loads

## Impact

- Affected specs: `frontend-backend-integration` (new spec)
- Affected code:
  - `cycani-proxy/frontend/src/components/anime/AnimeCard.vue` (image resolution)
  - `cycani-proxy/frontend/src/views/WatchView.vue` (video URL handling)
  - `cycani-proxy/frontend/src/stores/player.ts` (episode data loading)
  - `cycani-proxy/src/server.js` (API endpoint responses)
