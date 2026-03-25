# Repository Note

This repository no longer uses OpenSpec. Use `docs/project-overview.md` as the current high-level project reference.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains projects for cycani.org (次元城动画网站):

1. **Backend Service** (`backend/`): Express-based scraping, playback, and history APIs
2. **Vue.js Frontend** (`frontend/`): Modern Vue 3 web application
3. **Legacy Tampermonkey Userscripts**: Archived userscripts for automatic video playback (see `data/archive/legacy-userscripts/`)

### Backend Service (`backend/`)

This is a Node.js Express server that provides a web interface for browsing and watching anime from cycani.org with enhanced features like watch history, position memory, and multi-user architecture support.

### Vue.js Frontend (`frontend/`)

A modern Vue 3 + TypeScript web application with:
- **Vue 3** with Composition API and `<script setup>` syntax
- **TypeScript** for type safety
- **Pinia** for state management
- **Vue Router** for navigation
- **Element Plus** for UI components
- **Plyr** for video playback
- **Tailwind CSS** for custom styling
- **Vite** for fast development and optimized production builds
- **Vitest** for unit testing (96 tests passing)

## Architecture

### Proxy Server System

**Core Components:**
- **Express Server** (`backend/src/server.js`): Main API server with CORS proxy and web scraping
- **HTTP Client** (`backend/src/httpClient.js`): Enhanced HTTP client with anti-bot protection features:
  - User-Agent rotation with modern browser signatures
  - Request rate limiting (configurable via `RATE_LIMIT_DELAY` env var, default 1000ms)
  - Automatic retry with exponential backoff on 403, 429, 503 errors
  - Enhanced browser headers (Sec-Ch-Ua, Sec-Fetch-*, Referer)
- **WatchHistoryManager** (`backend/src/WatchHistoryManager.js`): Class-based system for managing user watch history and position tracking
- **Vue.js Frontend** (`frontend/`): Modern Vue 3 web application (see Vue Frontend Architecture below)
- **Puppeteer Integration**: Advanced video URL extraction for complex player implementations

**Deployment:**
- The Express server automatically detects and serves the Vue frontend from `dist/` if available
- Some legacy `public/` fallback references still exist in code, but they should be treated as migration remnants unless the directory is restored
- Supports Vue Router's history mode with SPA fallback for client-side routing

**Key Features:**
- Cross-origin proxy for cycani.org content
- Real-time anime list scraping with proper episode counts
- Watch position memory with event-driven saving (localStorage + backend sync)
- Multi-user data architecture (currently single user, expandable)
- Modern responsive UI with video player integration
- JSON-based persistent storage for watch history

### Watch Progress Sync Strategy

The frontend uses an **event-driven synchronization strategy** for watch progress:

**Storage Architecture:**
- **Primary**: Frontend localStorage (fast, always available, immediate save)
- **Secondary**: Backend API (cross-device sync, debounced to 2 seconds)
- **Priority Load**: Backend → localStorage → Default to 0

**Save Triggers:**
- Page exit/visibility change (`visibilitychange`, `pagehide`, `beforeunload`)
- Manual seek operations (Plyr `seeked` event)
- Play/pause button clicks (Plyr `play`/`pause` events)
- Video end (before next episode loads)
- Fallback interval: 5 minutes (safety net for long sessions)

**Benefits:**
- Reduced server load: ~120 requests/hour → ~3-5 requests/hour (96% reduction)
- Better offline support: localStorage works without network
- Immediate persistence: critical actions trigger instant saves
- Cross-device sync: backend still enables continuation on other devices

### Legacy Userscript System (Archived)

The project previously included a dual-script Tampermonkey system for automatic video playback. These scripts are now archived in `data/archive/legacy-userscripts/` for reference.

### Vue Frontend Architecture

**Directory Structure:**
```
frontend/src/
├── components/
│   ├── anime/          # Anime-related components (AnimeCard, AnimeGrid)
│   ├── common/         # Common components (LoadingSpinner, ErrorMessage)
│   ├── history/        # History-related components (HistoryCard, GroupedContinueWatchingCard)
│   ├── layout/         # Layout components (AppNavbar, AppContainer)
│   ├── player/         # Player components (VideoPlayer, EpisodeList)
│   ├── schedule/       # Weekly schedule component (WeeklySchedule)
│   └── VirtualList.vue # Virtual scrolling component
├── composables/
│   ├── useAnimeApi.ts  # Anime API composable
│   ├── useDarkMode.ts  # Dark mode toggle
│   ├── useGroupedHistory.ts  # Group watch history by anime (for improved UX)
│   ├── useHistory.ts   # Watch history management
│   ├── useKeyboardShortcuts.ts  # Keyboard shortcuts (Space, Ctrl+Right)
│   ├── useNotification.ts       # Toast notifications
│   ├── usePlayer.ts    # Video player management
│   ├── useServerStatus.ts       # Server health monitoring
│   └── useWeeklySchedule.ts     # Weekly anime schedule with current day auto-select
├── stores/
│   ├── anime.ts        # Anime store (list, current anime, pagination)
│   ├── history.ts      # Watch history store
│   ├── player.ts       # Player state store
│   └── ui.ts           # UI state store (dark mode, notifications)
├── services/
│   ├── api.ts          # Axios instance with retry logic
│   ├── anime.service.ts
│   ├── episode.service.ts
│   └── history.service.ts
├── types/              # TypeScript type definitions
├── utils/              # Utility functions (format, retry)
└── views/
    ├── HomeView.vue    # Main anime list page with grouped continue watching
    ├── WatchView.vue   # Video player page
    └── HistoryView.vue # Watch history page
```

**Key Features:**
- Dark mode with localStorage persistence
- Watch history with position memory
- Grouped continue watching display (episodes grouped by anime/season)
- Weekly schedule with auto-select current day
- Keyboard shortcuts (Space: play/pause, Ctrl+Right: next episode)
- Server status monitoring with health indicator
- Responsive design (mobile/tablet/desktop)
- Virtual scrolling for large lists
- Auto-save watch position every 30 seconds
- Toast notifications for errors/success

**Grouped History Pattern:**
The `useGroupedHistory` composable transforms flat watch records into a grouped structure by anime and season. This provides a better UX for users watching multiple episodes of the same anime:

```typescript
// Usage in components
const { groupedAnime } = useGroupedHistory(continueWatching)

// groupedAnime structure:
// [
//   {
//     animeId: string
//     animeTitle: string
//     animeCover: string
//     season: number
//     episodes: WatchedEpisode[]  // All watched episodes for this anime/season
//     totalWatched: number
//     latestEpisode: WatchedEpisode
//     overallProgress: number  // 0-100
//   }
// ]
```

**Weekly Schedule Pattern:**
The `useWeeklySchedule` composable provides current day detection and schedule data:

```typescript
const { getCurrentDayKey, loadSchedule } = useWeeklySchedule()
const currentDay = getCurrentDayKey()  // Returns 'monday', 'tuesday', etc.
loadSchedule(currentDay, true)  // Load today's anime
```

### Cross-Domain Data Flow

The project uses URL parameters instead of localStorage for cross-domain communication:

```
Main Site (cycani.org) → URL Parameters → Player Site (player.cycanime.com)

URL Structure:
https://player.cycanime.com/?url=VIDEO_URL&episode=NUMBER&bangumiId=ID&season=SEASON&current_url=URL&next_episode=NUMBER&next_url=URL&timestamp=TIMESTAMP
```

### Multi-Channel Architecture

The system supports multiple anime channels (TV and Theater) with a unified index architecture:

**Channel Types:**
- **TV** (`tv`, channel 20): TV番组 - Regular TV anime series
- **Theater** (`movie`, channel 21): 剧场番组 - Theatrical releases and movies
- **Future**: 4K (channel 26), 国漫 (channel 27)

**Channel Map (urlConstructor.js):**
```javascript
{
    'tv': 20,      // TV番组
    'movie': 21,   // 剧场番组
    '4k': 26,      // 4K专区
    'guoman': 27,  // 国漫
    'default': 20
}
```

**Unified Index Strategy:**
- Single `anime-index.json` contains both TV and theater anime
- Each index entry has `channel` field to distinguish source
- Search returns results from all channels (no channel filtering in search)
- Existing entries without `channel` field are treated as TV

**Frontend Channel Selection:**
- Navbar tabs: [TV] [剧场] for channel switching
- URL sync: `?channel=movie` query parameter
- Channel badges on anime cards (TV=blue, 剧场=purple)
- Channel state persists in uiStore

**Type vs Channel Distinction:**
- **Channel** (`channel`): Content source category (tv/movie/4k/guoman) - determines which listing page to scrape
- **Type** (`type`): Anime format classification (TV/剧场/OVA/OAD/电影) - displayed as metadata badge

## Testing and Debugging

### Chrome MCP Integration

The project has been extensively tested using Chrome MCP (Model Context Protocol) for real-world debugging:

**Debug Commands:**
```bash
# Test URL parameter parsing
mcp__chrome-devtools__evaluate_script -f "() => new URLSearchParams(window.location.search)"

# Test video element detection and playback
mcp__chrome-devtools__evaluate_script -f "() => {
    const video = document.querySelector('video');
    if (video) {
        video.muted = true;
        return video.play().then(() => 'Playback successful').catch(e => e.message);
    }
    return 'No video element found';
}"

# Take snapshots for visual inspection
mcp__chrome-devtools__take_snapshot -v false -f "debug-snapshot.json"
```

**Real Test URL for Development:**
```
https://player.cycanime.com/?url=cycani-dcd01-7c0057fe4756658131a29301cfc4cf0f1754962525&episode=14&bangumiId=3944&season=1&current_url=cycani-dcd01-7c0057fe4756658131a29301cfc4cf0f1754962525&next_episode=15&next_url=https%3A%2F%2Fplayer.cycanime.com%2F%3Furl%3Dplaceholder%26episode%3D15&next_mainUrl=https%3A%2F%2Fwww.cycani.org%2Fwatch%2F3944%2F1%2F15.html&timestamp=1766291969333
```

### Key Technical Challenges Solved

- **Cross-Origin iframe Control**: Impossible due to same-origin policy - solved by dual-script architecture
- **LocalStorage Sharing**: Doesn't work across different domains - solved by URL parameter transfer
- **Browser Autoplay Restrictions**: Requires muted playback and user interaction for sound - solved with progressive sound recovery
- **Video Element Detection**: Enhanced to find video in various player implementations (MuiPlayer PRO)
- **Automatic Sound Recovery**: Multiple strategies to bypass autoplay limitations while maintaining user experience

## Current Status (v14.x)

The project has reached a stable state with:
- ✅ Automatic muted video playback working (100% success rate)
- ✅ Smart sound recovery with multiple fallback strategies (30-80% success rate)
- ✅ Cross-domain data transfer via URL parameters (reliable)
- ✅ Enhanced video element detection (supports various player types)
- ✅ User-friendly error handling and notifications
- ✅ Automatic episode progression

## Project Structure

```text
Anime/
├── backend/                       # Express backend service
│   ├── src/                       # Backend source code
│   ├── config/                    # Runtime data directory in containerized layouts
│   ├── package.json               # Backend dependencies
│   └── README.md                  # Backend notes
├── frontend/                      # Vue 3 frontend
│   ├── src/                       # Frontend source code
│   ├── index.html                 # Vite entry HTML
│   ├── vite.config.ts             # Vite config
│   └── package.json               # Frontend dependencies
├── config/                        # Local runtime data in this repository
├── data/                          # Test and archived data only
├── dist/                          # Built Vue frontend
├── docs/                          # Project documentation
├── scripts/                       # Utility scripts
├── CLAUDE.md                      # Project instructions
└── README.md                      # Project documentation
```

**Legacy Tampermonkey Userscripts:**
The userscripts are now archived in `data/archive/legacy-userscripts/` for reference. They are no longer actively maintained but can be used if needed.

## Commands

### Quick Start (Recommended)

**Install all dependencies:**
```bash
# From project root
npm run install:all
```

**Start development environment (both frontend and backend):**
```bash
# From project root - starts both services concurrently
npm run dev
```

**Stop all services:**
```bash
npm run stop
```

### Unified Development Commands

Run all commands from the project root directory:

```bash
# Start both frontend and backend concurrently
npm run dev

# Start only backend server (port 3006 by default)
npm run dev:backend

# Start only frontend dev server (port 3000 by default)
npm run dev:frontend

# Build frontend for production
npm run build

# Start production server (serves built frontend)
npm run start

# Stop all running services
npm run stop

# Install all dependencies (root + backend + frontend)
npm run install:all
```

### Custom Port Configuration

**Via environment variables:**
```bash
# Set custom ports
BACKEND_PORT=3017 FRONTEND_PORT=3001 npm run dev
```

**Via configuration file:**
Edit `dev.config.js` in the project root to customize default ports and service settings.

### Individual Service Commands

These commands still work if you prefer to navigate to subdirectories:

### Vue Frontend Development

**Start Development Server:**
```bash
cd frontend
npm run dev  # Vite dev server on http://localhost:3000
```

**Build for Production:**
```bash
cd frontend
npm run build  # Outputs to ../dist/
```

**Run Unit Tests:**
```bash
cd frontend
npm test              # Run tests in watch mode
npm test -- --run     # Run tests once
npm test -- --ui      # Run tests with UI
```

**Install Dependencies:**
```bash
cd frontend
npm install
```

### Proxy Server Development

**Start Development Server:**
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

**Start Production Server:**
```bash
cd backend
npm start
```

**Install Dependencies:**
```bash
cd backend
npm install
```

**Run on Different Port:**
```bash
cd backend
npx cross-env PORT=3017 npm start  # Or any available port
```

### Testing and Debugging

**Chrome MCP Integration (for testing):**
```bash
# Test anime list API
curl -s "http://localhost:3017/api/anime-list" | head -c 200

# Test episode info API
curl -s "http://localhost:3017/api/episode/5998/1/1"

# Check watch history data
curl -s "http://localhost:3017/api/continue-watching"
```

**Browser Testing:**
- Access: http://localhost:3017 (or configured port)
- Use browser dev tools to inspect network requests
- Debug info panel shows real-time activity logs

## Key API Endpoints

**Anime Management:**
- `GET /api/anime-list` - Fetch paginated anime list with metadata
  - Parameters: `page`, `limit`, `search`, `genre`, `year`, `sort`, `channel` (tv|movie)
  - `channel` filters anime by channel (default: 'tv')
- `GET /api/anime/:id` - Get detailed anime information
- `GET /api/episode/:animeId/:season/:episode` - Get episode video URL
- `GET /api/weekly-schedule` - Get weekly anime schedule
- `GET /api/search-local` - Search anime using local index (searches all channels, channel-agnostic)
- `GET /api/index-status` - Get anime index statistics (total anime count, last updated, building status)

**Watch History:**
- `GET /api/continue-watching` - Get incomplete content for resumption
- `POST /api/watch-history` - Add/update watch history records
- `GET /api/last-position/:animeId/:season/:episode` - Get saved position
- `POST /api/last-position` - Save current playback position

**Health Check:**
- `GET /api/health` - Lightweight health check endpoint (used by frontend server status monitoring)

**Utility:**
- `GET /api/placeholder-image` - Fallback image service
- Static file serving from `/dist` for built frontend output

## Data Storage

### Storage Location and Resilience

**New Location (since data storage resilience update):**
- **Primary**: `config/watch-history.json` - Runtime data inside this repository
- **Legacy**: `data/proxy/watch-history.json` - Automatically migrated on first run

**Key Features:**
- ✅ **Automatic directory creation**: Config directory is created if missing
- ✅ **Automatic migration**: Legacy data files are migrated on startup
- ✅ **Backup before writes**: Creates timestamped backups before each write
- ✅ **Corrupted file recovery**: Preserves corrupted files with `.corrupted.*` suffix
- ✅ **Graceful degradation**: Server continues running even if data files are deleted/corrupted
- ✅ **Automatic cleanup**: Keeps only 5 most recent backups

**Backup Files:**
- `watch-history.json.backup.YYYY-MM-DDTHH-MM-SS-mssZ` - Automatic backups (5 most recent)
- `watch-history.json.corrupted.YYYY-MM-DDTHH-MM-SS-mssZ` - Preserved corrupted files
- `data/proxy/watch-history.json.migrated.YYYY-MM-DDTHH-MM-SS-mssZ` - Legacy file after migration

### Watch History Data Structure

```json
{
  "default": {
    "userId": "default",
    "watchHistory": [
      {
        "animeId": "5998",
        "animeTitle": "赛马娘 芦毛灰姑娘 第2部分",
        "season": 1,
        "episode": 1,
        "position": 245,
        "watchDate": "2025-12-21T09:00:00.000Z",
        "completed": false
      }
    ],
    "lastPositions": {
      "5998_1_1": {
        "position": 245,
        "lastUpdated": "2025-12-21T09:00:00.000Z"
      }
    },
    "createdAt": "2025-12-21T09:00:00.000Z",
    "updatedAt": "2025-12-21T09:00:00.000Z"
  }
}
```

### Anime Index Data Structure

**Location:** `config/anime-index.json`

The anime index is a unified searchable database of all anime from TV and Theater channels:

```json
{
  "meta": {
    "version": 1,
    "lastUpdated": "2025-12-30T10:00:00.000Z",
    "totalAnime": 6500
  },
  "anime": {
    "1234": {
      "id": "1234",
      "title": "Example TV Series",
      "cover": "https://...",
      "year": "2024",
      "type": "TV",
      "status": "连载中",
      "episodes": "12",
      "score": "8.5",
      "url": "https://www.cycani.org/show/1234.html",
      "channel": "tv",
      "indexedAt": "2025-12-30T10:00:00.000Z"
    },
    "5678": {
      "id": "5678",
      "title": "Example Movie",
      "cover": "https://...",
      "year": "2024",
      "type": "剧场",
      "status": "已完结",
      "episodes": "1",
      "score": "9.0",
      "url": "https://www.cycani.org/show/5678.html",
      "channel": "movie",
      "indexedAt": "2025-12-30T10:00:00.000Z"
    }
  }
}
```

**Building the Index:**
- TV index: `buildInitialIndex('tv')` - Scrapes `/show/20.html` (TV番组)
- Theater index: `buildInitialIndex('movie')` - Appends `/show/21.html` (剧场番组) to existing index
- Incremental updates happen automatically on every `/api/anime-list` request

**Index Manager Methods:**
- `buildInitialIndex(channel)` - Build index for specific channel (appends to existing)
- `incrementalUpdate(animeList, channel)` - Add new anime from browsing to index
- `searchAnime(query)` - Fast text search across all channels

### Data Storage Organization

**Configuration vs. Runtime Data:**
- `config/` - Runtime user data (watch history, anime index, auto-created)
  - `watch-history.json` - User watch history and positions
  - `anime-index.json` - Unified searchable anime index (TV + Theater)
- `backend/src/` - Backend source code
- `frontend/src/` - Frontend source code
- `data/` - Test and archived artifacts only (not used for runtime data)

**Benefits:**
- Deleting runtime data doesn't affect server startup
- Clear separation between application and user data
- Easy to find and manage for users
- Better organization for backups and migrations

### Troubleshooting Data File Issues

**Server won't start due to data file errors:**
- The server now handles all data file errors gracefully
- Check console logs for specific error messages
- Corrupted files are automatically backed up with `.corrupted.*` extension
- Missing files are automatically created with default structure

**Manually recovering data from backups:**
1. Navigate to `config/`
2. Find the most recent backup file: `watch-history.json.backup.*`
3. Copy it to `watch-history.json`
4. Restart the server

**Data migration status:**
- Migration happens automatically on first startup
- Check console for migration messages: `📦 Migrated watch history from legacy location`
- Legacy files are backed up with `.migrated.*` extension

## Legacy Development Notes

The project evolved through multiple approaches before reaching the current stable architecture:

### Historical Approaches (No Longer Used):
- **v1.0-v8.0**: Attempted iframe control via postMessage (blocked by same-origin policy)
- **v9.0**: Direct navigation to player domain (functional but limited)
- **v10.0**: Custom HTML5 video player creation (URL decryption challenges)
- **v11.0-v13.0**: Enhanced iframe approaches (still limited by cross-origin restrictions)

### Current v14.x Architecture Success Factors:
1. **Accepting technical limitations** instead of fighting browser security policies
2. **Leveraging domain navigation** as the primary communication method
3. **URL parameter encoding** for reliable cross-domain data transfer
4. **Simplified, focused approach** prioritizing core functionality over complex workarounds

## Current Status (v14.x)

The project has reached a stable state with:
- ✅ Automatic muted video playback working
- ✅ Smart sound recovery with multiple fallback strategies
- ✅ Cross-domain data transfer via URL parameters
- ✅ Enhanced video element detection
- ✅ User-friendly error handling and notifications

The archived userscripts in `data/archive/legacy-userscripts/` contain the final production-ready versions for reference.

## Docker Deployment

The project supports Docker containerization for production deployment with automatic updates.

### Quick Start

**Build and run locally:**
```bash
# Build the Docker image
docker build -t app-service .

# Run the container
docker run -d -p 3006:3006 -v ./config:/app/config -v ./logs:/app/logs app-service
```

**Deploy with Docker Compose:**
```bash
# Create project directory
mkdir -p ~/anime-project/config ~/anime-project/logs ~/anime-project/scripts
cd ~/anime-project

# Create docker-compose.yml (see DEPLOYMENT.md for full example)
# Then start services
docker-compose up -d
```

### Docker Files

- **Dockerfile**: Multi-stage build with frontend compilation and JavaScript code obfuscation (uses Node.js 24 Alpine)
- **Dockerfile.update-agent**: Lightweight image for watchdog service
- **docker-compose.yml**: Service orchestration with data persistence
- **.dockerignore**: Build context exclusion rules
- **scripts/update-agent.sh**: Update polling script (checks every 5 minutes)

### Key Features

- **Code Obfuscation**: JavaScript source code is obfuscated during build for protection
- **Multi-Architecture**: Supports both linux/amd64 and linux/arm64 (Apple Silicon)
- **Data Persistence**: Config and logs are stored in local bind mounts
- **Auto-Updates**: Watchdog service polls GHCR every 5 minutes and deploys new versions
- **Health Checks**: Built-in health check endpoint for monitoring

### CI/CD Pipeline

GitHub Actions automatically builds and pushes Docker images on every push to master:

- **Trigger**: Push to `master` branch or manual workflow dispatch
- **Registry**: GitHub Container Registry (GHCR)
- **Platforms**: linux/amd64, linux/arm64
- **Tags**: `latest`, `watchdog` + commit SHA

### Update Process

1. Push code to master branch
2. GitHub Actions builds and pushes new image to GHCR (~5-10 minutes)
3. Watchdog detects new version within 5 minutes
4. Automatically pulls new image and restarts containers
5. Data persists in local bind mounts

### Manual Update

```bash
cd ~/anime-project
docker-compose pull
docker-compose up -d
docker image prune -f
```

### Monitoring

```bash
# View logs
docker-compose logs -f app-service
docker-compose logs -f app-watchdog

# Check health status
docker inspect --format='{{.State.Health.Status}}' app-main

# View resource usage
docker stats
```

### Data Management

**Backup:**
```bash
cp -r ~/anime-project/config ~/anime-project/config.backup.$(date +%Y%m%d)
```

**Restore:**
```bash
docker-compose down
rm -rf config
cp -r config.backup.20251231 config
docker-compose up -d
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Important

- That ports 3000 and 3006 are currently open, with the frontend and backend services deployed respectively. Please do not start or stop the services. If necessary, use Chrome MCP for debugging.
- When using Chrome MCP, please do not use take_snapshot/screenshots to verify correctness. If necessary, please let me know, and I will make the judgment.
- Do not use `>nul` in PowerShell scripts. While `>nul` works perfectly in the traditional Command Prompt (CMD), using it in PowerShell will create a physical file named "nul" on the disk. Because "nul" is a reserved system keyword, Windows will struggle to delete or read this file later, often causing "Invalid File Handle" errors. In PowerShell, you must redirect to $null (the automatic variable for null) or pipe to Out-Null. like `Start-Process "app.exe" > $null` or `Start-Process "app.exe" *> $null`
- In the traditional Command Prompt, `nul` is treated as a virtual device (Bit bucket), so it is safe to use.
