# Design: Frontend-Backend Integration Fixes

## Overview
This document describes the technical approach to fix integration gaps between the Vue.js frontend and Express.js backend.

## Architecture

### Current Service Layer

```
frontend/src/services/
├── api.ts                 # Axios instance with interceptors
├── anime.service.ts       # Anime list and details
├── episode.service.ts     # Episode data and video URL parsing
└── history.service.ts     # Watch history (HAS BUGS)
```

### Backend API Endpoints

```
/api/anime-list            ✅ Used by anime.service.ts
/api/anime/:id             ✅ Used by anime.service.ts
/api/episode/:id/:s/:e     ✅ Used by episode.service.ts
/api/watch-history         ✅ Used by history.service.ts
/api/continue-watching     ✅ Used by history.service.ts
/api/last-position/:id/:s/:e ✅ GET used by history.service.ts
/api/weekly-schedule       ❌ NOT USED
/api/search-anime          ❌ NOT USED
/api/image-proxy           ⚠️  Used directly in components, not service
/api/video-proxy           ❌ NOT USED
/api/stream                ❌ NOT USED
```

## Detailed Issues and Solutions

### Issue 1: History Service POST Endpoint Bug

**Current Code (history.service.ts:19-31):**
```typescript
async saveWatchPosition(
  animeId: string,
  season: number,
  episode: number,
  position: number
): Promise<void> {
  await api.post('/api/last-position', {
    animeId,
    season,
    episode,
    position
  })
}
```

**Problem**: Backend only has `GET /api/last-position/:animeId/:season/:episode`. No POST endpoint exists.

**Backend Implementation (server.js:825-846):**
```javascript
app.get('/api/last-position/:animeId/:season/:episode', async (req, res) => {
    // Returns position, does NOT save
})
```

**Solution**: The watch position should be saved via `/api/watch-history` which already accepts position data. The backend's `addToWatchHistory` method accepts a `position` parameter (line 61-108).

**Fixed Code:**
```typescript
async saveWatchPosition(
  animeInfo: { id: string; title: string; cover: string },
  episodeInfo: { season: number; episode: number; title?: string; duration?: number },
  position: number
): Promise<void> {
  await api.post('/api/watch-history', {
    animeInfo,
    episodeInfo,
    position
  })
}
```

### Issue 2: Missing Weekly Schedule Service

**Backend Endpoint**: `GET /api/weekly-schedule?day={monday|tuesday|...|all}`

**Response Structure** (from server.js:876-881):
```javascript
{
  schedule: {
    monday: [{ id, title, cover, rating, status, broadcastTime, url, day }],
    tuesday: [...],
    // ... other days
  },
  updated: ISO date string,
  filter: 'all' or specific day
}
```

**New Service**: `weeklySchedule.service.ts`
```typescript
import api from './api'

export interface WeeklyAnime {
  id: string
  title: string
  cover: string
  rating: string
  status: string
  broadcastTime: string
  url: string
  watchUrl: string | null
  day: string
}

export interface WeeklyScheduleResponse {
  schedule: Record<string, WeeklyAnime[]>
  updated: string
  filter: string
}

export const weeklyScheduleService = {
  async getWeeklySchedule(day: string = 'all'): Promise<WeeklyScheduleResponse> {
    const response = await api.get<{ success: boolean; data: WeeklyScheduleResponse }>(
      '/api/weekly-schedule',
      { params: { day } }
    )
    return response.data.data
  }
}
```

### Issue 3: Missing Dedicated Search Service

**Backend Endpoint**: `GET /api/search-anime?q={query}`

**Current Frontend**: Uses `/api/anime-list?search=` which works but the dedicated endpoint may be optimized.

**Add to `anime.service.ts`:**
```typescript
async searchAnime(query: string): Promise<{ animeList: Anime[]; searchQuery: string; totalCount: number }> {
  if (!query || query.trim().length < 2) {
    return { animeList: [], searchQuery: query, totalCount: 0 }
  }
  const response = await api.get<{ success: boolean; data: any }>('/api/search-anime', {
    params: { q: query }
  })
  return response.data.data
}
```

### Issue 4: Image Proxy URL Handling

**Backend**: `/api/image-proxy?url={encoded_url}` proxies external images

**Current Issue**: Image URLs in anime list are formatted as `/api/image-proxy?url=...` but frontend components may not handle these correctly.

**Solution**: Add a utility helper to `anime.service.ts`:
```typescript
/**
 * Get properly proxied image URL
 * Returns proxy URL for external images, null for invalid URLs
 */
getImageProxyUrl(originalUrl: string | null | undefined): string | null {
  if (!originalUrl) return null
  if (originalUrl.startsWith('/api/')) return originalUrl // Already proxied
  if (originalUrl.startsWith('http')) {
    return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`
  }
  return null
}
```

### Issue 5: Missing Type Definitions

**Add to `types/anime.types.ts`:**
```typescript
// Weekly schedule types
export interface WeeklyAnime {
  id: string
  title: string
  cover: string
  rating: string
  status: string
  broadcastTime: string
  url: string
  watchUrl: string | null
  day: string
}

export interface WeeklySchedule {
  schedule: Record<string, WeeklyAnime[]>
  updated: string
  filter: string
}

// Search result types (may differ from Anime list)
export interface SearchResult {
  id: string
  title: string
  cover: string
  url: string
}

export interface SearchResponse {
  animeList: SearchResult[]
  searchQuery: string
  totalCount: number
}

// Backend wrapper type
export interface BackendResponse<T> {
  success: boolean
  data: T
  error?: string
  details?: string[]
}
```

### Issue 6: Response Validation

**Problem**: Services don't check the `success` field in backend responses.

**Solution**: Add response validation interceptor to `api.ts`:
```typescript
api.interceptors.response.use(
  (response) => {
    // Check for backend success wrapper
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (!response.data.success) {
        throw {
          message: response.data.error || 'API request failed',
          status: response.status,
          code: response.data.code
        }
      }
    }
    return response
  },
  // ... existing error handler
)
```

## Implementation Order

1. **Fix history.service.ts** - Critical bug affecting core functionality
2. **Add missing types** - Foundation for other changes
3. **Add response validation** - Improves error handling across all services
4. **Add weekly schedule service** - New feature
5. **Add search method** - Enhancement to existing service
6. **Add image proxy helper** - Utility function

## Testing Considerations

- **Unit Tests**: Update existing tests for `history.service.ts`
- **Integration Tests**: Add tests for new services
- **Type Tests**: Ensure type definitions match actual backend responses
- **E2E Tests**: Test watch position saving end-to-end

## Backward Compatibility

- Changing `saveWatchPosition` signature is a **breaking change** for any code calling it
- Consider adding deprecated method that wraps the new implementation
- Document migration path in code comments
