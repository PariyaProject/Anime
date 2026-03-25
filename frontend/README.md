# Cycani Frontend

Vue 3 frontend for the Anime workspace.

## Tech Stack

- **Vue 3** - Progressive JavaScript framework with Composition API
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool and dev server
- **Pinia** - Official Vue 3 state management
- **Vue Router** - Official Vue.js routing
- **Element Plus** - Vue 3 UI component library
- **Bootstrap 5** - CSS framework
- **Plyr** - Modern HTML5 video player
- **Axios** - HTTP client with retry logic
- **Vitest** - Unit testing framework

## Development

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000` (or next available port).

### Build for Production

```bash
npm run build
```

The build output will be in `../dist/` directory.

### Type Checking

```bash
npm run build:check
```

### Preview Production Build

```bash
npm run preview
```

### Testing

```bash
npm test              # Run tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Generate coverage report
```

### Code Quality

```bash
npm run lint    # Run ESLint
npm run format  # Format with Prettier
```

## Project Structure

```
src/
├── assets/           # Static assets (styles, images)
│   └── styles/       # Global CSS files
├── components/       # Vue components
│   ├── layout/      # Layout components (Navbar, Container)
│   ├── anime/       # Anime-related components (Card, Grid, Filters)
│   ├── player/      # Video player components
│   ├── history/     # Watch history components
│   └── common/      # Shared components (Loading, Error, Empty, VirtualList)
├── composables/     # Reusable composition functions
│   ├── useAnimeApi.ts       # Anime API calls
│   ├── usePlayer.ts         # Video player logic
│   ├── useHistory.ts        # Watch history management
│   ├── useDarkMode.ts       # Dark mode toggle
│   ├── useKeyboardShortcuts.ts  # Keyboard handling
│   ├── useNotification.ts   # Toast notifications
│   └── useServerStatus.ts   # Server health monitoring
├── stores/          # Pinia stores
│   ├── anime.ts      # Anime list state
│   ├── player.ts     # Video player state
│   ├── history.ts    # Watch history state
│   └── ui.ts         # UI state (dark mode, notifications)
├── services/        # API service layer
│   ├── api.ts        # Axios instance with interceptors
│   ├── anime.service.ts    # Anime API endpoints
│   ├── episode.service.ts  # Episode API endpoints
│   └── history.service.ts  # History API endpoints
├── types/           # TypeScript type definitions
│   ├── anime.types.ts
│   ├── episode.types.ts
│   ├── history.types.ts
│   └── api.types.ts
├── utils/           # Utility functions
│   ├── format.ts     # Formatting utilities
│   ├── retry.ts      # Retry logic with exponential backoff
│   └── constants.ts  # App constants
├── router/          # Vue Router configuration
├── views/           # Page-level components
│   ├── HomeView.vue       # Anime list page
│   ├── WatchView.vue      # Video player page
│   └── HistoryView.vue    # Watch history page
├── App.vue          # Root component
└── main.ts          # Application entry point
```

## Features

### Core Features
- 🎬 Watch anime episodes with Plyr video player
- 📜 Continue watching from last position (auto-saved every 30s)
- 🌙 Dark mode with system preference detection
- 🔍 Search, filter, and sort anime
- 📖 Complete watch history with progress tracking
- ⌨️ Keyboard shortcuts for navigation and playback
- 📱 Fully responsive design (mobile, tablet, desktop)
- 🔄 Auto-play next episode
- 🔃 API retry logic with exponential backoff
- 📊 Server status monitoring

### Keyboard Shortcuts

| Shortcut | Location | Action |
|----------|----------|--------|
| `←` / `→` | Home | Previous/Next page |
| `Space` | Watch | Play/Pause |
| `Ctrl + →` | Watch | Next episode |

## API Integration

The frontend integrates with the backend service in this repository:

- **Base URL**: Configurable via `VITE_API_BASE_URL`
- **Retry Logic**: Automatic retry with exponential backoff for 5xx errors
- **Error Handling**: User-friendly error messages
- **Request Interceptor**: Loading state management
- **Response Interceptor**: Error formatting and retry logic

## Performance Optimizations

### Build Optimizations
- Code splitting by route
- Vendor chunking (Vue, Element Plus, Plyr)
- Tree-shaking to remove unused code
- Gzip compression ready

### Runtime Optimizations
- Image lazy loading with native `loading="lazy"`
- Virtual scrolling for large episode lists
- Computed properties for expensive calculations
- Debounced search input

### Bundle Size
- **Total JS + CSS (gzipped)**: ~497 KB (under 500KB target ✓)
- **index.html**: 0.78 KB
- **Vendor JS**: ~111 KB (Vue, Router, Pinia, Axios)
- **UI JS**: ~237 KB (Element Plus - large but comprehensive)
- **Player JS**: ~31 KB (Plyr video player)
- **CSS**: ~147 KB (Element Plus + Bootstrap styles)

*Note: Bootstrap icons (~134 KB WOFF2) loaded separately and cached by browser*

## Environment Variables

Create `.env.local` file in the root directory:

```bash
VITE_API_BASE_URL=http://localhost:3017
```

## Testing

### Unit Tests (Vitest)

The project uses Vitest for unit testing:

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage

# UI mode
npm run test:ui
```

Test files are co-located with source files using `.test.ts` suffix.

### E2E Tests (Playwright)

End-to-end testing with Playwright:

```bash
# Install Playwright browsers (first time only)
npm run test:e2e:install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

**Note**: Playwright browser download may timeout in some regions. If this happens:
1. Use a VPN or proxy
2. Set `PLAYWRIGHT_DOWNLOAD_HOST` environment variable
3. Or manually download browsers from alternative mirrors

E2E tests cover:
- Anime list browsing and filtering
- Video player functionality
- Dark mode toggle
- Watch history navigation

### Lighthouse Audits

Performance and accessibility auditing:

```bash
# Start dev server first
npm run dev

# In another terminal, run Lighthouse
npm run lighthouse
```

This generates an HTML report in `./lighthouse/report.html`.

Target scores:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

## Browser Support

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## Deployment

### Production Build

```bash
npm run build
```

Output: `../dist/` directory

### Deployment Options

1. **Static Hosting**: Deploy `dist/` to any static hosting service
2. **Express Integration**: Serve from backend Express server
3. **CDN**: Upload to CDN for better performance

### SPA Routing

Configure your server to redirect all requests to `index.html` for client-side routing.

## Development Guidelines

### Adding Components

1. Create component in appropriate `src/components/` subdirectory
2. Use `<script setup lang="ts">` syntax
3. Define props with TypeScript interfaces
4. Use scoped styles

### Adding Stores

1. Create store in `src/stores/`
2. Define `state`, `getters`, and `actions`
3. Use `defineStore()` from Pinia

### Adding Composables

1. Create composable in `src/composables/`
2. Export reusable functions
3. Accept refs, return refs where possible

## Troubleshooting

### Port Already in Use

Vite will automatically try the next available port (3001, 3002, etc.)

### HMR Not Working

1. Restart dev server
2. Clear browser cache
3. Check firewall settings

### Build Errors

1. Clear node_modules and dist:
```bash
rm -rf node_modules dist
npm install
npm run build
```

2. Check Node.js version (requires >= 16)

## License

MIT
