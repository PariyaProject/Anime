# Change: Fix Watch Page Missing Anime Info

## Why

The WatchView page (video player detail page) currently displays incomplete anime information:

1. **Cover image not displayed** - The `animeCover` field remains empty because the episode API (`/api/episode/:animeId/:season/:episode`) doesn't return cover image data
2. **Episode list is empty** - The `totalEpisodes` field is always 0, resulting in no episode buttons in the selection grid
3. **Missing anime metadata** - Fields like `animeType`, `animeYear`, and `animeDescription` are not populated

**Root Cause:**
The `WatchView.vue` component calls `playerStore.loadEpisode()` which only invokes the episode API (`episodeService.getEpisode()`). The `EpisodeData` type returned by this API only includes video playback information (title, season, episode, videoUrl) but lacks anime metadata (cover, totalEpisodes, description, type, year).

The legacy Bootstrap implementation (`cycani-proxy/public/app.js`) did NOT have this issue because it populated anime information from the home page navigation state, whereas the Vue3 implementation relies solely on API responses.

## What Changes

- **Add anime details to WatchView**: Fetch anime details (cover, totalEpisodes, type, year, description) from `/api/anime/:id` endpoint
- **Update EpisodeData type**: Extend the type to include optional anime metadata fields
- **Modify WatchView loading logic**: Load anime details in parallel with episode data for optimal performance
- **Ensure backward compatibility**: The episode API remains unchanged; frontend fetches additional data separately

## Impact

- **Affected specs**:
  - `watch-page` (new spec to be created)
- **Affected code**:
  - `cycani-proxy/frontend/src/views/WatchView.vue:283-288` (animeCover, totalEpisodes, animeDescription refs)
  - `cycani-proxy/frontend/src/types/episode.types.ts:8-18` (EpisodeData interface)
  - `cycani-proxy/frontend/src/services/anime.service.ts:24-26` (getAnimeById method)

## Technical Context

**Current Data Flow (Broken):**
```
WatchView.vue → playerStore.loadEpisode() → episodeService.getEpisode()
→ Returns: { bangumiId, title, season, episode, videoUrl, realVideoUrl }
→ Missing: cover, totalEpisodes, type, year, description
```

**Proposed Data Flow (Fixed):**
```
WatchView.vue → playerStore.loadEpisode() → episodeService.getEpisode()
                 ↓
                 → animeService.getAnimeById()
→ Returns: { title, cover, type, year, description, episodes[], totalEpisodes }
```

**API Endpoints:**
- `/api/episode/:animeId/:season/:episode` - Returns video playback info (existing, unchanged)
- `/api/anime/:animeId` - Returns anime details including cover and episode list (existing, underutilized)

**Performance Consideration:**
The two API calls will be made in parallel using `Promise.all()` to minimize loading time.

## Dependencies

- Existing `/api/anime/:id` endpoint (already implemented in `cycani-proxy/src/server.js:1146`)
- Existing `animeService.getAnimeById()` method (already implemented in `frontend/src/services/anime.service.ts:24`)
- No new external dependencies required

## Success Criteria

- Cover image displays correctly on the WatchView page
- Episode list shows all available episodes for the anime
- Anime metadata (type, year, description) is displayed in the sidebar
- Page load performance is not significantly degraded (parallel API calls)
- Existing functionality (video playback, autoplay, navigation) remains intact
