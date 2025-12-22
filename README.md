# Cycani Proxy Server

A Node.js Express server that provides a web interface for browsing and watching anime from cycani.org with enhanced features like watch history, position memory, and multi-user architecture support.

## Features

- **Cross-origin proxy**: Access cycani.org content through a local proxy
- **Real-time anime scraping**: Up-to-date anime list with proper episode counts
- **Watch history management**: Track your viewing progress and resume from where you left off
- **Responsive web interface**: Modern Bootstrap-based UI for browsing and watching
- **Position memory**: Automatic saving of playback position every 30 seconds
- **Multi-user architecture**: Currently supports single user, designed for future expansion

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone or download this repository
2. Navigate to the proxy server directory:
   ```bash
   cd cycani-proxy
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**On a different port:**
```bash
npx cross-env PORT=3017 npm start
```

### Access

Open your browser and navigate to:
- http://localhost:3006 (default port)
- http://localhost:YOUR_PORT (if using custom port)

## Project Structure

```
D:\Code\ClaudeCode\
├── cycani-proxy/                   # Proxy server
│   ├── src/                        # Server source code
│   │   └── server.js               # Main Express server
│   ├── public/                     # Static web files
│   │   ├── index.html              # Main web interface
│   │   ├── style.css               # Styles
│   │   └── script.js               # Client-side JavaScript
│   ├── package.json                # Dependencies
│   └── package-lock.json           # Lock file
├── data/                           # Unified data storage
│   ├── proxy/                      # Proxy server data
│   │   ├── watch-history.json      # User watch history
│   │   ├── anime-list-detail.json  # Detailed anime information
│   │   └── current-anime-list.json # Current anime list
│   ├── testing/                    # Test and debug artifacts
│   │   ├── snapshots/              # Test snapshots
│   │   ├── debug/                  # Debug files
│   │   └── screenshots/            # Screenshots
│   └── archive/                    # Archived data
│       └── legacy-userscripts/     # Archived Tampermonkey scripts
├── openspec/                       # Project specifications
├── docs/                          # Documentation
├── .gitignore                     # Version control rules
├── CLAUDE.md                      # Project instructions
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
- Static file serving from `/public` directory

## Data Storage

Watch history and position data are stored in `data/proxy/watch-history.json`:

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

1. Modify `cycani-proxy/src/server.js` for backend changes
2. Update `cycani-proxy/public/` files for frontend changes
3. Test with `npm run dev` for automatic reloading

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
4. Use the OpenSpec system for major changes (see `openspec/` directory)

## License

This project is for educational and personal use only. Please respect the original content providers and terms of service.

## Troubleshooting

### Common Issues

- **Port already in use**: Change port using `PORT=3001 npm start`
- **Dependencies not found**: Run `npm install` in cycani-proxy directory
- **Anime list not loading**: Check cycani.org connectivity and console for errors

### Getting Help

Check the browser console and server logs for detailed error information. For issues related to the original cycani.org site, verify that the site is accessible directly.