# Design: Fix Frontend UX Issues

## Architecture Overview

This change introduces new components and state management patterns while maintaining the existing Vue 3 + Pinia + TypeScript architecture.

## Component Structure

### New Components

```
frontend/src/components/
├── schedule/
│   └── WeeklySchedule.vue        # Weekly anime schedule display
├── player/
│   └── AutoplayToggle.vue        # Autoplay preference toggle
└── history/
    └── HistoryCard.vue           # History entry card (may already exist)
```

### New Composables

```
frontend/src/composables/
└── useAutoplay.ts                # Autoplay preference state management
```

### New Views

```
frontend/src/views/
└── HistoryView.vue               # Dedicated watch history page
```

## Data Flow

### Weekly Schedule Flow

```
HomeView.vue
    ↓ (on mount)
animeService.getWeeklySchedule(day)
    ↓
GET /api/weekly-schedule?day=all
    ↓
WeeklySchedule.vue (render schedule data)
```

### Autoplay Preference Flow

```
WatchView.vue
    ↓
useAutoplay() composable
    ↓ (read/write)
localStorage: 'autoplay-preference'
    ↓
Apply to:
  - iframe player URL (?autoplay=1)
  - Plyr player config (autoplay: true)
```

### Watch History Flow

```
HistoryView.vue (mounted)
    ↓
historyStore.loadWatchHistory()
    ↓
GET /api/watch-history
    ↓ (render list)
User clicks "Resume"
    ↓
router.push('/watch?...&startTime=X')
    ↓
WatchView.vue (seeks to startTime)
```

## State Management

### useAutoplay Composable

```typescript
interface AutoplayState {
  autoplay: boolean
  loadPreference(): void
  toggleAutoplay(): void
  savePreference(): void
}

// Storage key: 'anime-autoplay-preference'
// Default: true (autoplay enabled)
```

### New Store Extensions (if needed)

The existing `historyStore` may need:
- `deleteHistoryRecord(animeId, season, episode)` method
- `clearAllHistory()` method

## Routing Changes

### New Route

```typescript
{
  path: '/history',
  name: 'History',
  component: () => import('@/views/HistoryView.vue'),
  meta: { title: '观看历史' }
}
```

### Navigation Updates

Add history link to `AppNavbar.vue`:
```vue
<router-link to="/history">
  <i class="bi bi-clock-history"></i>
  历史
</router-link>
```

## API Integration

### Weekly Schedule API

**Endpoint**: `GET /api/weekly-schedule?day=all`

**Response Structure**:
```typescript
{
  success: true,
  data: {
    schedule: {
      monday: AnimeScheduleItem[],
      tuesday: AnimeScheduleItem[],
      // ... other days
    },
    updated: string,
    filter: 'all'
  }
}

interface AnimeScheduleItem {
  id: string
  title: string
  cover: string
  rating: string
  status: string
  broadcastTime: string
  url: string
  day: string
}
```

## TypeScript Types

### New Types in `types/anime.types.ts`

```typescript
// Weekly schedule types
export interface AnimeScheduleItem {
  id: string
  title: string
  cover: string
  rating: string
  status: string
  broadcastTime: string
  url: string
  watchUrl?: string
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
}

export interface WeeklyScheduleResponse {
  schedule: Record<string, AnimeScheduleItem[]>
  updated: string
  filter: string
}
```

## CSS/Styling Considerations

- Use existing Tailwind utility classes
- Maintain consistency with `AnimeCard` component styling
- Responsive grid layout for weekly schedule (tabs per day)
- Dark mode support via existing `useDarkMode` composable

## Browser Compatibility

- localStorage for autoplay preference (fallback to default if unavailable)
- Modern browser APIs (already supported by Vue 3 requirements)

## Performance Considerations

- Weekly schedule: Backend has 24-hour cache, minimal frontend impact
- Autoplay: Single localStorage read/write, negligible impact
- History: Limit to most recent 100 records (already implemented in backend)

## Security Considerations

- No new security concerns - all data stored client-side only
- Autoplay preference is user preference only, no sensitive data
- History data already persisted server-side in `watch-history.json`

## Testing Strategy

### Unit Tests
- `useAutoplay.ts`: localStorage read/write, toggle functionality
- Weekly schedule API service integration
- History store methods

### Integration Tests
- Weekly schedule rendering with various data states
- Autoplay toggle persistence across page reloads
- History page navigation and resume watching flow

### E2E Tests (if needed)
- Navigate from home → history → resume watching
- Toggle autoplay → navigate to new episode → verify autoplay state
