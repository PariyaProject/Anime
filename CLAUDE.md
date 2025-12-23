<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains projects for cycani.org (次元城动画网站):

1. **Node.js Proxy Server** (`cycani-proxy/` directory): Web-based proxy service with watch history management
2. **Vue.js Frontend** (`cycani-proxy/frontend/` directory): Modern Vue 3 web application
3. **Legacy Tampermonkey Userscripts**: Archived userscripts for automatic video playback (see `data/archive/legacy-userscripts/`)

### Proxy Server Project (cycani-proxy/)

This is a Node.js Express server that provides a web interface for browsing and watching anime from cycani.org with enhanced features like watch history, position memory, and multi-user architecture support.

### Vue.js Frontend (cycani-proxy/frontend/)

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
- **Express Server** (`src/server.js`): Main API server with CORS proxy and web scraping
- **HTTP Client** (`src/httpClient.js`): Enhanced HTTP client with anti-bot protection features:
  - User-Agent rotation with modern browser signatures
  - Request rate limiting (configurable via `RATE_LIMIT_DELAY` env var, default 1000ms)
  - Automatic retry with exponential backoff on 403, 429, 503 errors
  - Enhanced browser headers (Sec-Ch-Ua, Sec-Fetch-*, Referer)
- **WatchHistoryManager**: Class-based system for managing user watch history and position tracking
- **Vue.js Frontend** (`frontend/`): Modern Vue 3 web application (see Vue Frontend Architecture below)
- **Legacy Web Interface** (`public/`): Bootstrap-based responsive web application (fallback)
- **Puppeteer Integration**: Advanced video URL extraction for complex player implementations

**Deployment:**
- The Express server automatically detects and serves the Vue frontend from `dist/` if available
- Falls back to the legacy Bootstrap frontend in `public/` if `dist/` doesn't exist
- Supports Vue Router's history mode with SPA fallback for client-side routing

**Key Features:**
- Cross-origin proxy for cycani.org content
- Real-time anime list scraping with proper episode counts
- Watch position memory with automatic saving (30-second intervals)
- Multi-user data architecture (currently single user, expandable)
- Modern responsive UI with video player integration
- JSON-based persistent storage for watch history

### Legacy Userscript System (Archived)

The project previously included a dual-script Tampermonkey system for automatic video playback. These scripts are now archived in `data/archive/legacy-userscripts/` for reference.

### Vue Frontend Architecture

**Directory Structure:**
```
frontend/src/
├── components/
│   ├── anime/          # Anime-related components (AnimeCard, AnimeGrid)
│   ├── common/         # Common components (LoadingSpinner, ErrorMessage)
│   ├── history/        # History-related components (HistoryCard)
│   ├── layout/         # Layout components (AppNavbar, AppContainer)
│   ├── player/         # Player components (VideoPlayer, EpisodeList)
│   └── VirtualList.vue # Virtual scrolling component
├── composables/
│   ├── useAnimeApi.ts  # Anime API composable
│   ├── useDarkMode.ts  # Dark mode toggle
│   ├── useHistory.ts   # Watch history management
│   ├── useKeyboardShortcuts.ts  # Keyboard shortcuts (Space, Ctrl+Right)
│   ├── useNotification.ts       # Toast notifications
│   ├── usePlayer.ts    # Video player management
│   └── useServerStatus.ts       # Server health monitoring
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
    ├── HomeView.vue    # Main anime list page
    ├── WatchView.vue   # Video player page
    └── HistoryView.vue # Watch history page
```

**Key Features:**
- Dark mode with localStorage persistence
- Watch history with position memory
- Keyboard shortcuts (Space: play/pause, Ctrl+Right: next episode)
- Server status monitoring with health indicator
- Responsive design (mobile/tablet/desktop)
- Virtual scrolling for large lists
- Auto-save watch position every 30 seconds
- Toast notifications for errors/success

### Cross-Domain Data Flow

The project uses URL parameters instead of localStorage for cross-domain communication:

```
Main Site (cycani.org) → URL Parameters → Player Site (player.cycanime.com)

URL Structure:
https://player.cycanime.com/?url=VIDEO_URL&episode=NUMBER&bangumiId=ID&season=SEASON&current_url=URL&next_episode=NUMBER&next_url=URL&timestamp=TIMESTAMP
```

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

```
D:\Code\ClaudeCode\
├── cycani-proxy/                   # Proxy server
│   ├── src/                        # Server source code
│   │   ├── server.js               # Main Express server
│   │   ├── httpClient.js           # Enhanced HTTP client with anti-bot protection
│   │   └── urlConstructor.js       # URL construction utilities
│   ├── frontend/                   # Vue 3 Frontend
│   │   ├── src/
│   │   │   ├── components/         # Vue components
│   │   │   ├── composables/        # Vue composables
│   │   │   ├── stores/             # Pinia stores
│   │   │   ├── services/           # API services
│   │   │   ├── types/              # TypeScript types
│   │   │   ├── utils/              # Utility functions
│   │   │   └── views/              # Page views
│   │   ├── public/                 # Static assets
│   │   ├── index.html              # Entry HTML
│   │   ├── vite.config.ts          # Vite config
│   │   ├── vitest.config.ts        # Vitest config
│   │   └── package.json            # Frontend dependencies
│   ├── dist/                       # Built Vue frontend (auto-generated)
│   ├── public/                     # Legacy Bootstrap web files (fallback)
│   ├── package.json                # Server dependencies
│   └── package-lock.json           # Lock file
├── data/                           # Unified data storage
│   ├── proxy/                      # Proxy server data
│   │   ├── watch-history.json
│   │   ├── anime-list-detail.json
│   │   └── current-anime-list.json
│   ├── testing/                    # Test and debug artifacts
│   │   ├── snapshots/              # Test snapshots
│   │   ├── debug/                  # Debug files
│   │   └── screenshots/            # Screenshots
│   └── archive/                    # Archived data
│       └── legacy-userscripts/     # Archived userscripts
├── openspec/                       # Specifications
├── docs/                          # Documentation
├── .gitignore                     # Version control rules
├── CLAUDE.md                      # Project instructions
└── README.md                      # Project documentation
```

**Legacy Tampermonkey Userscripts:**
The userscripts are now archived in `data/archive/legacy-userscripts/` for reference. They are no longer actively maintained but can be used if needed.

## Commands

### Vue Frontend Development

**Start Development Server:**
```bash
cd cycani-proxy/frontend
npm run dev  # Vite dev server on http://localhost:5173
```

**Build for Production:**
```bash
cd cycani-proxy/frontend
npm run build  # Outputs to ../dist/
```

**Run Unit Tests:**
```bash
cd cycani-proxy/frontend
npm test              # Run tests in watch mode
npm test -- --run     # Run tests once
npm test -- --ui      # Run tests with UI
```

**Install Dependencies:**
```bash
cd cycani-proxy/frontend
npm install
```

### Proxy Server Development

**Start Development Server:**
```bash
cd cycani-proxy
npm run dev  # Uses nodemon for auto-reload
```

**Start Production Server:**
```bash
cd cycani-proxy
npm start
```

**Install Dependencies:**
```bash
cd cycani-proxy
npm install
```

**Run on Different Port:**
```bash
cd cycani-proxy
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
- `GET /api/anime/:id` - Get detailed anime information
- `GET /api/episode/:animeId/:season/:episode` - Get episode video URL

**Watch History:**
- `GET /api/continue-watching` - Get incomplete content for resumption
- `POST /api/watch-history` - Add/update watch history records
- `GET /api/last-position/:animeId/:season/:episode` - Get saved position
- `POST /api/last-position` - Save current playback position

**Utility:**
- `GET /api/placeholder-image` - Fallback image service
- Static file serving from `/dist` (Vue frontend) or `/public` (legacy) directory

## Data Storage

**Watch History Structure:**
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
    }
  }
}
```

Data is stored in `data/proxy/watch-history.json` with automatic backup and recovery mechanisms. Additional data files are organized in the `data/` directory structure:
- `data/proxy/`: Proxy server operational data
- `data/testing/`: Debug and test artifacts
- `data/archive/`: Legacy and archived files

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