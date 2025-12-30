# Implementation Tasks (Simplified - Unified Index)

## 1. Backend Multi-Channel Support

### 1.1 Update animeIndexManager.js for channel parameter
- [x] 1.1.1 Modify `buildCategoryUrl()` method signature to accept `channel` parameter
  - Current: `buildCategoryUrl(genre, year, page = 1)`
  - New: `buildCategoryUrl(genre, year, page = 1, channel = 'tv')`
  - Replace hardcoded `channelId = 20` with dynamic lookup from channel map
  - Import urlConstructor to get channel ID mapping

- [x] 1.1.2 Update `buildInitialIndex()` to support channel parameter
  - Add `channel` parameter to method: `buildInitialIndex(channel = 'tv')`
  - Pass channel to `buildCategoryUrl()` calls
  - Store channel in index entries: `anime.channel = channel`
  - Appends to existing index (TV entries preserved when building movie)

- [x] 1.1.3 Update `incrementalUpdate()` to accept channel parameter
  - Change signature: `incrementalUpdate(animeList, channel = 'tv')`
  - Add channel field to each anime entry: `anime.channel = channel`
  - **NO changes to search() method** - already works with unified index!

- [x] 1.1.4 Add helper method for channel ID mapping
  - Add `getChannelId(channel)` method
  - Returns: tv=20, movie=21, 4k=26, guoman=27
  - Used by buildCategoryUrl for dynamic channel ID lookup

### 1.2 Build Theater Anime Index
- [ ] 1.2.1 Run index builder for Movie channel (new)
  - `buildInitialIndex('movie')` appends to existing `anime-index.json`
  - Scrape years 1980-2025 from `/show/21.html`
  - Same pagination and safety limits as TV channel
  - TV entries remain untouched (not rebuilt)

- [ ] 1.2.2 Verify unified index structure
  - Single file: `config/anime-index.json`
  - Contains both TV and movie entries
  - Each entry has `channel` field (movie entries have 'movie', TV entries have 'tv' or missing)

### 1.3 Update API Endpoint
- [x] 1.3.1 Update `/api/anime-list` incremental update trigger
  - Locate existing incrementalUpdate call in server.js (around line 1080)
  - Extract channel from request: `const channel = req.query.channel || 'tv'`
  - Pass channel to incrementalUpdate: `incrementalUpdate(animeList, channel)`
  - Test with both tv and movie channels

- [x] 1.3.2 **NO CHANGES needed** to `/api/search-local`
  - Already searches unified index
  - No modification needed!

- [ ] 1.3.3 OPTIONAL: Enhance `/api/index-status` with channel breakdown
  - Could add `byChannel: { tv: 5247, movie: 1243 }` field
  - This is optional - current format works fine
  - Defer to future if needed

## 2. Frontend State Management

### 2.1 Update TypeScript type definitions
- [x] 2.1.1 Add channel to FilterState interface (ui.ts:11-17)
  ```typescript
  export interface FilterState {
    search: string
    genre: string
    year: string
    month: string
    sort: 'time' | 'hits' | 'score'
    channel: 'tv' | 'movie'  // NEW
  }
  ```

- [x] 2.1.2 Add channel to FilterParams type (anime.types.ts:24-32)
  ```typescript
  export interface FilterParams {
    page?: number
    limit?: number
    search?: string
    genre?: string
    year?: string
    month?: string
    sort?: 'time' | 'hits' | 'score'
    channel?: 'tv' | 'movie'  // NEW
  }
  ```

- [x] 2.1.3 Add channel to Anime interface (anime.types.ts:1-12)
  ```typescript
  export interface Anime {
    id: number | string
    title: string
    cover: string
    type?: string
    channel?: 'tv' | 'movie'  // NEW - for search results
    year?: string
    episodes?: number
    score?: number
    status?: string
    description?: string
    genres?: string[]
  }
  ```

### 2.2 Update ui.ts store
- [x] 2.2.1 Add channel to filters state (line 23-29)
  - Initialize `channel: 'tv'` in filters ref
  - Update resetFilters() to reset channel to 'tv'

- [x] 2.2.2 Add channel action to updateFilters()
  - Ensure channel updates trigger filter reactivity
  - No special handling needed, spread operator covers it

- [ ] 2.2.3 Add URL query sync for channel
  - Watch filters.channel changes
  - Update router query with channel parameter
  - On mount, read channel from route.query and update filters

### 2.3 Update anime.service.ts
- [x] 2.3.1 Modify `getAnimeList()` to pass channel parameter (line 20-36)
  - Extract channel from params: `const { search, channel = 'tv', ...filterParams } = params`
  - Pass channel to API: `params: { ...filterParams, channel, useCache: ... }`
  - Ensure search mode doesn't interfere with channel

### 2.4 Update anime.ts store
- [x] 2.4.1 Ensure loadAnimeList passes channel from uiStore
  - Current code: `loadAnimeList(params: FilterParams = {})`
  - Caller should provide channel from uiStore.filters.channel
  - Verify channel is included in params passed to service

## 3. Frontend UI Components

### 3.1 Add channel tabs to AppNavbar.vue
- [x] 3.1.1 Add channel tabs HTML after nav-links (line 8-11)
  ```html
  <div class="channel-tabs">
    <router-link
      to="/"
      class="channel-tab"
      :class="{ active: currentChannel === 'tv' }"
      @click="setChannel('tv')"
    >TV</router-link>
    <router-link
      to="/"
      class="channel-tab"
      :class="{ active: currentChannel === 'movie' }"
      @click="setChannel('movie')"
    >剧场</router-link>
  </div>
  ```

- [x] 3.1.2 Add channel tab state and methods (script section)
  - Import useUiStore
  - Computed: `currentChannel = () => uiStore.filters.channel`
  - Method: `setChannel(channel)` updates uiStore.filters.channel
  - Method: Sync channel to route.query

- [x] 3.1.3 Add channel tab styles
  - Tab styling similar to nav-link but with active state
  - Active tab: different background color, bottom border
  - Hover effects for inactive tabs
  - Responsive: hide text on very small screens if needed

### 3.2 Update HomeView.vue
- [x] 3.2.1 Display current channel in section header
  - Add channel badge next to "动画列表" title
  - Show "TV番剧" or "剧场番剧" based on current channel

- [x] 3.2.2 Ensure filters work with channel
  - Verify genre, year, sort dropdowns pass channel in API call
  - Current code uses `filters.value` which should include channel

- [ ] 3.2.3 Add channel indicator to empty state
  - When no anime found, show which channel was searched
  - Example: "未找到剧场番剧"

### 3.3 Update HistoryView.vue (if needed)
- [ ] 3.3.1 Verify continue watching displays all channels
  - Current implementation already shows all history
  - No filtering by channel needed (as per spec)
  - Add channel badge to history cards for clarity

### 3.4 Update WatchView.vue
- [ ] 3.4.1 Ensure anime details load with correct channel
  - When navigating from history or search
  - Pass channel parameter to getAnimeById if needed
  - Verify episode list works for both channels

### 3.5 Add Channel Badges to Search Results
- [x] 3.5.1 Update AnimeCard component to show channel badge
  - Add channel badge to anime cards when result has channel field
  - Display "TV" badge for channel='tv' results
  - Display "剧场" badge for channel='movie' results
  - Style badges distinctively (TV=blue, 剧场=purple)
  - Position badge in top-right or top-left corner
  - Ensure badge doesn't cover important cover image areas
  - Only show badge in search mode or when channel is present

- [x] 3.5.2 Update search result handling
  - Ensure search results include `channel` field from API response
  - Verify channel field is passed through to AnimeCard component
  - Handle missing channel field (treat as TV)

## 4. Router Integration

### 4.1 URL query parameter handling
- [x] 4.1.1 Read channel from URL on page load
  - In HomeView.vue onMounted(): read `route.query.channel`
  - Update uiStore.filters.channel if valid ('tv' or 'movie')
  - Default to 'tv' if invalid or missing

- [x] 4.1.2 Write channel to URL on change
  - Watch uiStore.filters.channel changes
  - Update router.push({ query: { ...route.query, channel: newChannel } })
  - Replace mode to avoid history pollution

- [ ] 4.1.3 Test URL sharing
  - Open `/?channel=movie&genre=科幻` in new tab
  - Verify theater anime with sci-fi filter loads
  - Verify channel tab shows "剧场" as active

## 5. Testing

### 5.1 Backend testing
- [ ] 5.1.1 Test animeIndexManager with channel parameter
  - Call `buildInitialIndex('movie')` → verify entries appended to anime-index.json
  - Verify new entries have `channel: 'movie'`
  - Verify TV entries remain unchanged

- [ ] 5.1.2 Test API endpoint with channel parameter
  - `GET /api/anime-list?channel=tv&page=1` → returns TV anime
  - `GET /api/anime-list?channel=movie&page=1` → returns theater anime
  - `GET /api/anime-list?channel=movie&genre=科幻` → returns theater sci-fi anime

- [ ] 5.1.3 Test incremental updates
  - Browse TV anime → verify index updated with channel='tv'
  - Browse theater anime → verify index updated with channel='movie'
  - Verify all entries in unified index

- [ ] 5.1.4 Test search functionality (no changes needed)
  - Search for common term (e.g., "间谍")
  - Verify results include both TV and theater anime
  - Verify each result has channel field
  - **No backend code changes needed for search!**

### 5.2 Frontend testing
- [ ] 5.2.1 Test channel switching via tabs
  - Click [TV] tab → URL becomes `/?channel=tv`, anime list shows TV
  - Click [剧场] tab → URL becomes `/?channel=movie`, anime list shows theater
  - Verify active tab styling changes

- [ ] 5.2.2 Test filters with channel
  - Select theater channel, choose genre "科幻", year "2024"
  - Verify URL: `/?channel=movie&genre=科幻&year=2024`
  - Verify results are theater anime from 2024, sci-fi genre

- [ ] 5.2.3 Test search behavior
  - Search while on TV channel → search returns all channels (as per spec)
  - Search while on theater channel → same result (search is channel-agnostic)
  - After search, click theater tab → filters reset to theater channel
  - Verify search results show channel badges

- [ ] 5.2.4 Test URL sharing
  - Copy URL `/?channel=movie&genre=冒险`
  - Open in new browser/incognito window
  - Verify theater anime with adventure genre loads
  - Verify theater tab is active

### 5.3 Watch history testing
- [ ] 5.3.1 Test watch history across channels
  - Watch episode of TV anime → verify history saved
  - Watch episode of theater anime → verify history saved
  - View continue watching → verify both appear
  - Each history card should show correct channel badge

- [ ] 5.3.2 Test resume from history
  - Click continue watching for TV anime → loads correctly
  - Click continue watching for theater anime → loads correctly
  - Verify no channel confusion when resuming

### 5.4 Edge case testing
- [ ] 5.4.1 Test invalid channel parameter
  - `/?channel=invalid` → should default to 'tv'
  - `/?channel=` (empty) → should default to 'tv'
  - No error should be shown, graceful degradation

- [ ] 5.4.2 Test rapid channel switching
  - Quickly click [TV] [剧场] [TV] [剧场]
  - Verify no duplicate API calls
  - Verify UI doesn't get stuck in intermediate state

- [ ] 5.4.3 Test with all filter combinations
  - Channel + genre + year + sort + page
  - Verify URL is correctly constructed
  - Verify API request succeeds

## 6. Documentation

### 6.1 Update CLAUDE.md
- [ ] 6.1.1 Add channel architecture section
  - Document type vs channel distinction
  - Document channel configuration
  - Add channel to API endpoints documentation
  - Document unified index approach with channel field

### 6.2 Add inline code comments
- [ ] 6.2.1 Comment channel parameter usage
  - In animeIndexManager.js, explain channel field addition
  - In ui.ts, explain URL sync for channel
  - In components, explain channel tab behavior

## 7. Validation and Cleanup

### 7.1 Code quality
- [ ] 7.1.1 Run ESLint
  - Fix any linting issues
  - Ensure consistent code style

- [ ] 7.1.2 Run TypeScript compiler
  - Fix any type errors
  - Verify channel types are correct

### 7.2 Testing
- [ ] 7.2.1 Run existing unit tests
  - Ensure all tests pass
  - No regressions in existing functionality

- [ ] 7.2.2 Manual browser testing
  - Test in Chrome, Firefox, Safari
  - Test responsive design (mobile, tablet, desktop)
  - Test dark mode with channel tabs

### 7.3 Final verification
- [ ] 7.3.1 Verify all requirements from spec are met
  - Multi-channel anime listing ✓
  - Channel selection UI ✓
  - Channel filtering with other filters ✓
  - Per-channel anime index ✓
  - Channel parameter validation ✓
  - Channel-aware watch history ✓
  - Type field distinction ✓
  - Search scope ✓

- [ ] 7.3.2 Verify success criteria
  - Users can switch between TV and Theater via UI ✓
  - Anime list displays correct content per channel ✓
  - Single unified index works ✓
  - Watch history works across channels ✓
  - Channel selection persists via URL ✓
  - All filters work with channel ✓
  - URL sharing works ✓
  - Search returns results from all channels ✓

---

## Summary of Simplified Approach

**Key simplifications from separate index approach:**
1. **Single index file** - no migration, no file renaming
2. **No search code changes** - works as-is
3. **Just add channel field** to index entries
4. **Append theater anime** to existing index

**Files that need changes:**
- `animeIndexManager.js` - add channel parameter support
- `server.js` - pass channel to incrementalUpdate
- Frontend files - same as originally planned

**Files that DON'T need changes:**
- `/api/search-local` - already works
- `/api/index-status` - current format works
- Index file structure - just add field to entries
