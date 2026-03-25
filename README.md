# Anime

A root workspace for browsing and watching anime content from `cycani.org`, built with an Express backend and a Vue 3 frontend.

## Features

- **Cross-origin proxy**: Access cycani.org content through a local proxy
- **Real-time anime scraping**: Up-to-date anime list with proper episode counts
- **Watch history management**: Track your viewing progress and resume from where you left off
- **Modern Vue 3 frontend**: Responsive SPA with dark mode, keyboard shortcuts, and virtual scrolling
- **Position memory**: Automatic saving of playback position every 30 seconds
- **Unified development experience**: Single commands to manage frontend and backend services

## Quick Start

### Prerequisites

- Node.js `24.14.0`
- npm
- Optional: `nvm`

### Installation

From the project root directory:

```bash
nvm use

# Install all dependencies (root + backend + frontend)
npm run install:all
```

### Running the Project

**Start development environment (both frontend and backend):**
```bash
npm run dev
```

This will start:
- Backend server at `http://localhost:3006` by default
- Frontend dev server at `http://localhost:3000` by default

If either port is already occupied, the root dev script will automatically move to the next available port and print the final values in the terminal.

**Stop all services:**
```bash
npm run stop
```

**Build for production:**
```bash
npm run build    # Build frontend
npm run start    # Start production server
```

### Individual Service Control

```bash
# Start only backend
npm run dev:backend

# Start only frontend
npm run dev:frontend
```

### Custom Port Configuration

**Via environment variables:**
```bash
BACKEND_PORT=3017 FRONTEND_PORT=3001 npm run dev
```

**Via startup arguments:**
```bash
npm run dev -- --backend 3017 --frontend 3001
```

If the requested port is already occupied, the dev script will keep incrementing until it finds an available one.

**Via local-only environment file:**
```bash
cp .env.example .env.local
```

Then edit `.env.local` and keep your preferred ports there. This file is ignored by Git, so it is safe for machine-local development preferences.

### Access

Open your browser and navigate to:
- **Frontend (development)**: http://localhost:3000
- **Backend API**: http://localhost:3006
- **Production (after `npm run build && npm run start`)**: http://localhost:3006

## Project Structure

```text
Anime/
├── backend/                       # Express backend service
│   ├── src/                       # Backend source code
│   ├── package.json               # Backend dependencies
│   └── README.md                  # Backend notes
├── frontend/                      # Vue 3 frontend app
│   ├── src/                       # Frontend source code
│   ├── package.json               # Frontend dependencies
│   └── vite.config.ts             # Vite configuration
├── config/                        # Runtime data (history, anime index)
├── data/                          # Archived and test artifacts
├── dist/                          # Built frontend output
├── docs/                          # Project documentation
├── scripts/                       # Utility scripts
├── .nvmrc                         # Recommended Node version
├── package.json                   # Root workspace scripts
├── dev.config.js                  # Development configuration reference
├── CLAUDE.md                      # Assistant guidance
└── README.md                      # This file
```

## API Endpoints

### Anime Management
- `GET /api/anime-list` - Get paginated anime list with metadata
- `GET /api/anime/:id` - Get detailed anime information
- `GET /api/episode/:animeId/:season/:episode` - Get episode video URL

### Watch History
- `GET /api/continue-watching` - Get incomplete content for resumption
- `POST /api/watch-history` - Add/update watch history records
- `GET /api/last-position/:animeId/:season/:episode` - Get saved position
- `POST /api/last-position` - Save current playback position

### Utility
- `GET /api/placeholder-image` - Fallback image service
- Static file serving from `/dist` in production builds

## Data Storage

Watch history and position data are stored in `config/watch-history.json`:

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

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3006)
- `NODE_ENV`: Environment mode (development/production)

### Dependencies
- **express**: Web server framework
- **cors**: Cross-origin resource sharing
- **axios**: HTTP client for web scraping
- **cheerio**: HTML parsing and manipulation
- **helmet**: Security middleware
- **puppeteer**: Advanced web scraping (optional)

## Development

### Adding New Features

1. Modify `backend/src/` for backend changes
2. Modify `frontend/src/` for frontend changes
3. Test with `npm run dev`

### Debugging

- Check browser dev tools for network requests
- Server console shows real-time activity logs
- Debug info panel in web interface shows current status

## Legacy Components

### Archived Tampermonkey Scripts

The project previously included Tampermonkey userscripts for automatic video playback. These are now archived in `data/archive/legacy-userscripts/` for reference. The proxy server provides a more robust solution for watching anime with enhanced features.

## Contributing

1. Follow the existing code style and structure
2. Test changes thoroughly before committing
3. Update documentation for any new features
4. Keep project documentation in `docs/` up to date when major behavior changes

## License

This project is for educational and personal use only. Please respect the original content providers and terms of service.

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Option 1: Let the root dev script auto-pick the next available ports
npm run dev

# Option 2: Start searching from your preferred ports
BACKEND_PORT=3017 FRONTEND_PORT=3001 npm run dev

# Option 3: Or pass the starting ports as CLI args
npm run dev -- --backend 3017 --frontend 3001

# Option 4: Save your preferred ports locally
cp .env.example .env.local

# Option 5: Stop the process using the port
npm run stop
```

**Dependencies not found:**
```bash
# Install all dependencies
npm run install:all

# Or install individually
npm install --prefix backend
npm install --prefix frontend
```

**Services won't start:**
- Check that Node.js version is `24.14.0`: `node --version`
- Verify all dependencies are installed
- Check for port conflicts using `npm run stop`
- Review console output for specific error messages

**Anime list not loading:**
- Verify the backend server is running: Check http://localhost:3006/api/anime-list
- Check cycani.org connectivity
- Review server console for scraping errors

**Frontend not connecting to backend:**
- Ensure both services are running: `npm run dev`
- Check that the backend URL is correct in browser console
- Verify CORS settings in server configuration

### Getting Help

- Check the browser console and server logs for detailed error information
- Review `CLAUDE.md` for detailed project documentation
- For issues related to the original cycani.org site, verify that the site is accessible directly
