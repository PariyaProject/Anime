# Spec: State Management

## ADDED Requirements

### Requirement: Centralized State Management

The frontend MUST use Pinia for centralized state management to replace scattered global variables.

**Rationale**: The current frontend uses 10+ global variables (player, currentEpisodeData, autoPlay, currentPage, etc.) which are difficult to track and synchronize. Pinia provides a reactive, type-safe, and debuggable state management solution.

#### Scenario: Store Structure
**Given** a Vue 3 application with Pinia
**When** organizing state
**Then** stores MUST be organized by domain:
- `animeStore` - Anime list, current anime, pagination
- `playerStore` - Video player state, playback position
- `historyStore` - Watch history, continue watching, last positions
- `uiStore` - Dark mode, filters, notifications

**Each store MUST**:
- Use TypeScript for type safety
- Export typed use functions (e.g., `useAnimeStore()`)
- Provide state, getters, and actions
- Persist to localStorage where appropriate
- Support Pinia dev tools debugging

#### Scenario: Anime Store
**Given** the animeStore
**When** managing anime-related state
**Then** it MUST provide:

**State**:
```typescript
interface AnimeState {
  animeList: Anime[]           // Current page of anime
  currentAnime: Anime | null   // Selected anime for viewing
  totalCount: number           // Total anime count
  currentPage: number          // Current page number
  totalPages: number           // Total pages
  loading: boolean             // Loading indicator
  error: string | null         // Error message
}
```

**Getters**:
- `filteredAnimeList` - Apply search and filters to animeList
- `hasNextPage` - Check if next page exists
- `hasPrevPage` - Check if previous page exists

**Actions**:
- `loadAnimeList(params)` - Fetch anime list from API
- `loadAnimeById(id)` - Fetch single anime details
- `setCurrentAnime(anime)` - Set current anime
- `nextPage()` - Go to next page
- `prevPage()` - Go to previous page
- `clearError()` - Clear error state

**Example**:
```typescript
export const useAnimeStore = defineStore('anime', () => {
  const state = reactive<AnimeState>({
    animeList: [],
    currentAnime: null,
    totalCount: 0,
    currentPage: 1,
    totalPages: 1,
    loading: false,
    error: null
  })

  const loadAnimeList = async (params: FilterParams) => {
    state.loading = true
    state.error = null
    try {
      const response = await animeService.getAnimeList(params)
      state.animeList = response.data.animeList
      state.totalCount = response.data.totalCount
      state.totalPages = response.data.totalPages
      state.currentPage = response.data.currentPage
    } catch (error) {
      state.error = 'Failed to load anime list'
      throw error
    } finally {
      state.loading = false
    }
  }

  return { state, loadAnimeList }
})
```

#### Scenario: Player Store
**Given** the playerStore
**When** managing video player state
**Then** it MUST provide:

**State**:
```typescript
interface PlayerState {
  currentEpisode: EpisodeData | null  // Current episode data
  currentVideoUrl: string             // Current video URL
  isPlaying: boolean                  // Is video playing
  currentTime: number                 // Current playback position (seconds)
  duration: number                    // Video duration (seconds)
  autoPlay: boolean                   // Auto-play next episode
  lastPosition: number                // Last saved position
  loading: boolean                    // Video loading state
  error: string | null                // Video error
}
```

**Getters**:
- `progressPercentage` - Calculate watch progress (0-100)
- `isCompleted` - Check if episode is completed (> 90% watched)

**Actions**:
- `loadEpisode(animeId, season, episode)` - Load episode data
- `play()` - Start video playback
- `pause()` - Pause video playback
- `seekTo(time)` - Seek to specific time
- `setAutoPlay(enabled)` - Toggle auto-play
- `loadNextEpisode()` - Load next episode in sequence
- `saveCurrentPosition()` - Save current playback position
- `reset()` - Reset player state

**Reactivity**:
- State changes MUST automatically update UI
- Video player MUST react to `currentVideoUrl` changes
- Position MUST sync with video element time updates

#### Scenario: History Store
**Given** the historyStore
**When** managing watch history
**Then** it MUST provide:

**State**:
```typescript
interface HistoryState {
  watchHistory: WatchRecord[]         // Full watch history
  continueWatching: WatchRecord[]     // Incomplete episodes
  lastPositions: Record<string, PositionRecord>  // Last positions by key
  loading: boolean
  error: string | null
}
```

**Getters**:
- `getRecentHistory(limit)` - Get N most recent records
- `getCompletedCount` - Count completed episodes
- `getTotalWatchTime` - Calculate total watch time

**Actions**:
- `loadWatchHistory()` - Fetch full history from API
- `loadContinueWatching()` - Fetch incomplete episodes
- `addToHistory(record)` - Add or update history record
- `savePosition(animeId, season, episode, position)` - Save position
- `getLastPosition(animeId, season, episode)` - Get saved position
- `markAsCompleted(animeId, season, episode)` - Mark episode completed
- `clearHistory()` - Clear all history (for user action)

**Position Key Format**: `{animeId}_{season}_{episode}`

**Auto-Save**:
- Position MUST save every 30 seconds during playback
- Position MUST save on pause
- Position MUST save on video end
- Position MUST save before page unload

#### Scenario: UI Store
**Given** the uiStore
**When** managing UI state
**Then** it MUST provide:

**State**:
```typescript
interface UIState {
  darkMode: boolean                   // Dark mode enabled
  filters: FilterState                // Current filter values
  notifications: Notification[]       // Active notifications
  sidebarOpen: boolean                // Sidebar state (if used)
}

interface FilterState {
  search: string
  genre: string
  year: string
  month: string
  sort: 'time' | 'hits' | 'score'
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timeout: number
  timestamp: number
}
```

**Actions**:
- `toggleDarkMode()` - Toggle dark mode
- `setDarkMode(enabled)` - Set dark mode state
- `updateFilters(filters)` - Update filter values
- `resetFilters()` - Reset filters to defaults
- `addNotification(notification)` - Add notification
- `removeNotification(id)` - Remove notification
- `clearNotifications()` - Clear all notifications

**Persistence**:
- `darkMode` MUST persist to localStorage
- `filters` MAY persist to localStorage (optional)

### Requirement: Store Composition

Stores MUST be able to interact with each other through actions and getters.

**Rationale**: Complex features often require coordination between multiple stores.

#### Scenario: Cross-Store Actions
**Given** multiple stores with related state
**When** an action affects multiple stores
**Then** stores MAY interact through:
- Calling actions from other stores
- Reading state from other stores (via useStore)
- Reacting to state changes with `watch()`

**Example**: Playing an episode updates both playerStore and historyStore:
```typescript
// In playerStore action
const loadEpisode = async (animeId: string, season: number, episode: number) => {
  const historyStore = useHistoryStore()

  // Load episode data
  const data = await episodeService.getEpisode(animeId, season, episode)
  state.currentEpisode = data

  // Check for saved position
  const lastPos = historyStore.getLastPosition(animeId, season, episode)
  state.lastPosition = lastPos

  return data
}
```

#### Scenario: Watch Computed Properties
**Given** derived state from multiple stores
**When** computed properties depend on multiple stores
**Then** components MUST:
- Use `computed()` to derive state from multiple stores
- Re-compute automatically when source state changes
- Not create circular dependencies between stores

**Example**:
```typescript
// In component
const animeStore = useAnimeStore()
const playerStore = usePlayerStore()

const canPlayNextEpisode = computed(() => {
  const currentEp = playerStore.state.currentEpisode
  const anime = animeStore.state.currentAnime

  if (!currentEp || !anime) return false

  // Check if there's a next episode
  const currentEpIndex = anime.episodes.findIndex(
    ep => ep.season === currentEp.season && ep.episode === currentEp.episode
  )

  return currentEpIndex < anime.episodes.length - 1
})
```

### Requirement: State Persistence

Application state MUST persist appropriately across sessions.

**Rationale**: Users expect their preferences and watch history to be preserved.

#### Scenario: localStorage Persistence
**Given** state that should persist across sessions
**When** the page loads
**Then** the following MUST persist to localStorage:
- Dark mode preference
- User filters (optional)
- Last viewed anime (optional)

**When** persisting state:
- Use JSON serialization
- Handle parse errors gracefully
- Provide defaults if no saved data exists
- Watch state changes and auto-save

**Example**:
```typescript
// In uiStore
const darkMode = ref(false)

// Load from localStorage on init
const savedDarkMode = localStorage.getItem('darkMode')
if (savedDarkMode === 'enabled') {
  darkMode.value = true
}

// Watch changes and save
watch(darkMode, (value) => {
  localStorage.setItem('darkMode', value ? 'enabled' : 'disabled')
})
```

#### Scenario: Server-Side Persistence
**Given** critical user data (watch history, positions)
**When** state changes
**Then** the following MUST sync with server:
- Watch history records
- Playback positions
- Continue watching list

**Sync Strategy**:
- Optimistic updates (update UI, then sync)
- Retry failed requests with exponential backoff
- Merge server responses with local state
- Handle conflicts (server wins)

### Requirement: State Testing

Stores MUST have unit tests to ensure correct behavior.

**Rationale**: State management bugs can cause complex UI issues that are hard to debug.

#### Scenario: Store Unit Tests
**Given** a Pinia store
**When** writing unit tests
**Then** tests MUST cover:
- Initial state values
- Action behavior (state updates)
- Getter computations
- Async action behavior (loading, success, error)
- Persistence (localStorage)
- Cross-store interactions

**Example**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAnimeStore } from '@/stores/anime'

describe('Anime Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has correct initial state', () => {
    const store = useAnimeStore()
    expect(store.state.animeList).toEqual([])
    expect(store.state.loading).toBe(false)
    expect(store.state.error).toBe(null)
  })

  it('loads anime list successfully', async () => {
    const store = useAnimeStore()
    await store.loadAnimeList({ page: 1 })

    expect(store.state.animeList.length).toBeGreaterThan(0)
    expect(store.state.loading).toBe(false)
    expect(store.state.error).toBe(null)
  })

  it('handles load errors', async () => {
    const store = useAnimeStore()
    // Mock API error
    await expect(store.loadAnimeList({ page: 999 })).rejects.toThrow()
    expect(store.state.error).toBeTruthy()
  })
})
```

### Requirement: DevTools Integration

Stores MUST be debuggable with Vue DevTools.

**Rationale**: DevTools makes debugging state issues much easier.

#### Scenario: Pinia DevTools
**Given** the Vue application with Pinia
**When** opening Vue DevTools
**Then** developers MUST be able to:
- See all registered stores
- Inspect current state of each store
- See state changes over time (time-travel debugging)
- Inspect getters and their values
- Dispatch actions manually
- Persist state to localStorage from DevTools
- Reset stores to initial state

**Store Naming**:
- Store names MUST be descriptive ('anime', 'player', 'history')
- Store structure SHOULD be self-documenting
- Action names SHOULD clearly indicate what they do

### Requirement: Performance Optimization

State management MUST be optimized for performance.

**Rationale**: Inefficient reactivity can cause performance issues with frequent updates.

#### Scenario: Reactive Optimization
**Given** stores with frequent state updates
**When** optimizing performance
**Then** the following MUST be done:
- Use `shallowRef` for large objects that don't need deep reactivity
- Batch state updates in single actions
- Avoid computationally expensive getters
- Debounce rapid state changes (e.g., search input)
- Use `computed` for derived state instead of methods

#### Scenario: Memory Management
**Given** long-running application sessions
**When** managing memory
**Then** stores MUST:
- Clean up old state when no longer needed
- Limit history arrays to reasonable size (e.g., last 100 records)
- Clear notifications after they expire
- Dispose of watchers when components unmount
- Avoid memory leaks in circular references

**Example**: Limiting history size
```typescript
const addToHistory = (record: WatchRecord) => {
  // Remove duplicate if exists
  const index = state.watchHistory.findIndex(
    r => r.animeId === record.animeId &&
         r.season === record.season &&
         r.episode === record.episode
  )
  if (index >= 0) {
    state.watchHistory.splice(index, 1)
  }

  // Add new record to front
  state.watchHistory.unshift(record)

  // Keep only last 100 records
  if (state.watchHistory.length > 100) {
    state.watchHistory = state.watchHistory.slice(0, 100)
  }
}
```
