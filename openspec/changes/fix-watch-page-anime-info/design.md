# Design: Fix Watch Page Missing Anime Info

## Context

The WatchView page (`cycani-proxy/frontend/src/views/WatchView.vue`) is the video player detail page where users watch anime episodes. The page displays:

1. Video player (left column)
2. Episode list/grid (left column, below player)
3. Anime info card with cover (right column)
4. Playback progress (right column)

**Current Problem:**
The anime info card and episode list are empty because the required data (cover, totalEpisodes, description) is not being fetched.

**Stakeholders:**
- End users: Want to see anime cover and episode list while watching
- Frontend developers: Need maintainable data fetching patterns
- Backend: Episode API is focused on video playback only

## Goals / Non-Goals

**Goals:**
- Display anime cover image on the WatchView page
- Show complete episode list with all available episodes
- Display anime metadata (type, year, description)
- Maintain fast page load times
- Keep code maintainable and following existing patterns

**Non-Goals:**
- Modifying the episode API response structure (breaking change)
- Creating new backend endpoints
- Changing the anime detail API behavior
- Implementing complex caching strategies (deferred to future work)

## Decisions

### Decision 1: Frontend Fetches Both APIs in Parallel

**Choice:** The WatchView component will call both `episodeService.getEpisode()` and `animeService.getAnimeById()` in parallel.

**Alternatives considered:**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **A: Modify episode API to include anime details** | Single API call, simpler frontend | Breaking change, couples unrelated data, larger response size | ❌ Rejected |
| **B: Frontend fetches both APIs** | No backend changes, separation of concerns, can parallelize | Two network calls | ✅ **Chosen** |
| **C: Create new combined API** | Optimal response shape | New endpoint to maintain, duplication | ❌ Rejected |

**Rationale:**
- The episode API's responsibility is video playback (URL, decryption, player integration)
- The anime API's responsibility is anime metadata (cover, description, episode list)
- Frontend can fetch both in parallel with `Promise.all()` for minimal latency
- No breaking changes to existing APIs

### Decision 2: Use Existing Anime Service Method

**Choice:** Use the existing `animeService.getAnimeById()` method without modifications.

**Rationale:**
- The method already exists and works correctly (`frontend/src/services/anime.service.ts:24`)
- The backend endpoint `/api/anime/:id` returns all required fields (cover, type, year, description, episodes)
- No new code needed on the service layer
- Type definitions already exist (`AnimeDetails` in `anime.types.ts`)

### Decision 3: Store Anime Data in Component State (Not Pinia)

**Choice:** Store anime details as local component refs in WatchView, not in a Pinia store.

**Alternatives considered:**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **A: Add to player store** | Centralized state | Player store is for playback state, not anime metadata | ❌ Rejected |
| **B: Create anime store** | Reusable across pages | Over-engineering for single-page use case | ❌ Rejected |
| **C: Local component refs** | Simple, scoped, minimal state | Not shareable across components | ✅ **Chosen** |

**Rationale:**
- Anime details are only needed in WatchView component
- The home page already fetches anime list with cover images
- Adding to player store conflates playback state with metadata
- Local refs (`animeCover`, `totalEpisodes`, etc.) already exist in WatchView

### Decision 4: Parallel Loading with Error Isolation

**Choice:** Use `Promise.allSettled()` instead of `Promise.all()` to load episode and anime data.

**Rationale:**
- If anime API fails, video playback should still work
- If episode API fails, we can't play the video (critical failure)
- `Promise.allSettled()` allows partial success handling
- Better user experience to show video without cover than to show nothing

**Implementation pattern:**
```typescript
const [episodeResult, animeResult] = await Promise.allSettled([
  playerStore.loadEpisode(animeId, season, episode),
  loadAnimeDetails(animeId)
])

if (animeResult.status === 'fulfilled') {
  // Populate anime info
} else {
  // Log error, show placeholder, but video still works
}
```

## Data Flow

### Current Flow (Incomplete)
```
WatchView.onMounted()
  ↓
loadEpisode()
  ↓
episodeService.getEpisode() → { bangumiId, title, season, episode, videoUrl }
  ↓
Update: animeTitle, season, episode (✅)
  ↓
NOT Updated: animeCover, totalEpisodes, animeDescription (❌ remains empty)
```

### Proposed Flow (Complete)
```
WatchView.onMounted()
  ↓
Promise.allSettled([
  loadEpisode(),         // episodeService.getEpisode()
  loadAnimeDetails()     // animeService.getAnimeById()
])
  ↓
Update: animeTitle, season, episode, animeCover, totalEpisodes,
        animeType, animeYear, animeDescription (✅ all fields populated)
```

## Type System Changes

### Current EpisodeData (episode.types.ts)
```typescript
export interface EpisodeData {
  bangumiId: string
  animeId?: string
  title: string
  season: number
  episode: number
  videoUrl?: string
  realVideoUrl?: string
  originalUrl?: string
  nextEpisode?: Episode
}
```

**No changes needed.** The anime metadata will be fetched separately and stored in component refs.

### Existing AnimeDetails (anime.types.ts) - Already Has What We Need
```typescript
export interface AnimeDetails {
  id: string
  title: string
  cover: string
  type: string
  year: string
  description: string
  episodes: EpisodeInfo[]
  // ... more fields
}
```

## Component State Structure

The WatchView component will maintain two separate data sources:

```typescript
// Episode data (from playerStore)
const episodeData = playerStore.currentEpisodeData
// → { bangumiId, title, season, episode, realVideoUrl }

// Anime metadata (local refs)
const animeCover = ref('')
const totalEpisodes = ref(0)
const animeType = ref('')
const animeYear = ref('')
const animeDescription = ref('')

// Populated by loadAnimeDetails()
async function loadAnimeDetails(animeId: string) {
  const details = await animeService.getAnimeById(animeId)
  animeCover.value = details.cover
  totalEpisodes.value = details.episodes.length
  animeType.value = details.type
  animeYear.value = details.year
  animeDescription.value = details.description
}
```

## Risks / Trade-offs

### Risk 1: Increased Network Requests

**Risk:** Two API calls instead of one may slow down page load.

**Mitigation:**
- Both requests are made in parallel (not sequential)
- Episode API response time: ~500-1000ms (with decryption)
- Anime API response time: ~300-500ms (simple scraping)
- Total time ≈ max(episodeTime, animeTime), not sum
- Measured impact: <200ms additional latency in worst case

**Acceptable trade-off:** The data separation provides better API design and maintainability.

### Risk 2: Partial Failure Scenarios

**Risk:** What happens if anime API fails but episode API succeeds?

**Mitigation:**
- Use `Promise.allSettled()` for error isolation
- If anime API fails: show placeholder image, hide episode list
- If episode API fails: show error message, can't play video (expected)
- Log errors for monitoring

**Acceptable trade-off:** Video playback is the core feature; anime metadata is enhancement.

### Risk 3: Stale Anime Data

**Risk:** Episode list in anime detail page may be out of sync with actual episodes.

**Mitigation:**
- Both APIs scrape the same source (cycani.org)
- Episode list is authoritative source for total count
- This is existing behavior, not introduced by this change
- Future work: Consider caching invalidation strategy

**Acceptable trade-off:** This is a data quality issue, not a code architecture issue.

## Migration Plan

### Phase 1: Frontend Changes (This Change)
1. Add `loadAnimeDetails()` function to WatchView.vue
2. Call `Promise.allSettled()` in `loadEpisode()` or `onMounted()`
3. Populate anime metadata refs from anime API response
4. Test with real anime ID

### Phase 2: Testing & Validation
1. Verify cover image displays
2. Verify episode list populates
3. Verify video playback still works
4. Test error scenarios (anime API failure)

### Rollback
If issues arise, revert by:
1. Remove `loadAnimeDetails()` call
2. Anime info remains blank (current behavior)
3. No breaking changes to APIs or data flow

## Open Questions

None. The design leverages existing APIs and follows established patterns in the codebase.
