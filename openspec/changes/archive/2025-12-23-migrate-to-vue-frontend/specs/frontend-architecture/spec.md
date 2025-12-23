# Spec: Frontend Architecture

## MODIFIED Requirements

### Requirement: Modern Frontend Framework

The proxy server frontend MUST use a modern component-based framework to replace the existing vanilla JavaScript architecture.

**Rationale**: The current 1320-line monolithic `app.js` file is difficult to maintain, error-prone, and lacks proper separation of concerns. A component-based framework will improve code organization, reusability, and developer experience.

#### Scenario: Framework Selection
**Given** the project requires a modern frontend framework
**When** evaluating framework options
**Then** Vue.js 3 MUST be chosen for:
- Smaller learning curve and better TypeScript support
- Single File Components (.vue) for co-located logic
- Pinia for simpler state management vs Redux
- Smaller bundle size and better performance
- Strong Chinese documentation (relevant for anime project)

#### Scenario: Build Tool Configuration
**Given** a Vue.js 3 frontend project
**When** setting up the build system
**Then** the project MUST:
- Use Vite as the build tool for fast HMR and optimized builds
- Configure TypeScript for type safety
- Use Vue Router 4 for client-side routing
- Build to static files that can be served from Express
- Support environment variable configuration

#### Scenario: Project Structure
**Given** a Vue.js frontend in `cycani-proxy/frontend/`
**When** organizing the codebase
**Then** the project MUST have:
```
frontend/
├── src/
│   ├── components/     # Reusable Vue components
│   ├── composables/    # Composition API functions
│   ├── stores/         # Pinia state stores
│   ├── services/       # API service layer
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── views/          # Page-level components
│   ├── App.vue         # Root component
│   └── main.ts         # Application entry point
├── public/             # Static assets
├── index.html          # HTML template
└── vite.config.ts      # Vite configuration
```

### Requirement: TypeScript Integration

All frontend code MUST use TypeScript for type safety and improved developer experience.

**Rationale**: TypeScript catches errors at compile time, provides better IDE support, and improves code maintainability.

#### Scenario: Type Coverage
**Given** a Vue.js frontend with TypeScript
**When** measuring type coverage
**Then** the project MUST maintain:
- TypeScript coverage > 80% of codebase
- No `any` types except for external library compatibility
- Proper type definitions for all API responses
- Strict mode enabled in tsconfig.json

#### Scenario: Type Definitions
**Given** the existing API endpoints
**When** defining TypeScript types
**Then** the following types MUST be defined:
- `Anime` interface (id, title, cover, score, episodes, etc.)
- `Episode` interface (season, episode, title, duration)
- `EpisodeData` interface (videoUrl, realVideoUrl, etc.)
- `WatchRecord` interface (animeId, position, duration, completed)
- `FilterParams` interface (search, genre, year, month, sort)
- All API response types with `success` and `data` fields

### Requirement: Development Experience

The frontend MUST provide an excellent developer experience with modern tooling.

**Rationale**: Better developer experience leads to faster development and fewer bugs.

#### Scenario: Hot Module Replacement
**Given** a Vue.js frontend in development mode
**When** a developer saves a file
**Then** changes MUST appear instantly without:
- Full page reload
- Loss of component state
- Manual browser refresh

#### Scenario: Developer Tools
**Given** a Vue.js frontend project
**When** debugging the application
**Then** developers MUST have access to:
- Vue DevTools for component inspection
- Pinia DevTools for state debugging
- TypeScript compiler errors in real-time
- ESLint warnings and errors
- Source maps for debugging

#### Scenario: Build Performance
**Given** the Vue.js frontend codebase
**When** building for production
**Then** the build process MUST:
- Complete in under 30 seconds
- Generate optimized bundles with code splitting
- Produce source maps for production debugging
- Minify JavaScript and CSS
- Gzip/brotli compression ready

### Requirement: Bundle Size Optimization

The frontend bundle MUST be optimized for fast loading times.

**Rationale**: Large bundle sizes lead to slow page loads and poor user experience.

#### Scenario: Bundle Size Limits
**Given** a production build of the Vue.js frontend
**When** measuring the bundle size
**Then** the total size MUST be:
- Less than 500KB when gzipped
- Split into vendor, app, and async chunks
- Tree-shake unused code from dependencies

#### Scenario: Code Splitting
**Given** the Vue.js frontend application
**When** implementing code splitting
**Then** the following MUST be lazy-loaded:
- Route components (HomeView, WatchView)
- Heavy components (EpisodeList with virtual scrolling)
- Third-party libraries (Plyr video player)

#### Scenario: Dependency Optimization
**Given** the frontend dependencies
**When** importing from libraries
**Then** the following MUST be done:
- Import only used components from Element Plus
- Use tree-shakeable imports from Vue
- Avoid large utility libraries in favor of native APIs
- Analyze bundle size with `npm run build -- --report`

### Requirement: Backward Compatibility

The new Vue.js frontend MUST work with the existing Express backend without API changes.

**Rationale**: Minimizing backend changes reduces migration risk and allows gradual rollout.

#### Scenario: API Compatibility
**Given** the existing Express backend API
**When** the Vue.js frontend makes API calls
**Then** ALL existing endpoints MUST work unchanged:
- `GET /api/anime-list` - Fetch paginated anime list
- `GET /api/anime/:id` - Get anime details
- `GET /api/episode/:animeId/:season/:episode` - Get episode video URL
- `GET /api/continue-watching` - Get watch history
- `GET /api/watch-history` - Get full history
- `POST /api/watch-history` - Save watch record
- `POST /api/last-position` - Save playback position

#### Scenario: Data Format Compatibility
**Given** existing watch history data in JSON files
**When** the Vue.js frontend reads/writes watch data
**Then** the data format MUST:
- Preserve existing JSON structure
- Maintain backward compatibility with old frontend
- Support seamless migration between old and new frontends

#### Scenario: Gradual Migration
**Given** both old and new frontends exist
**When** deploying the Vue.js frontend
**Then** it MUST be possible to:
- Run both frontends side-by-side
- Switch between old and new without data loss
- Use Express to serve either frontend

### Requirement: Browser Support

The Vue.js frontend MUST support all modern browsers used by the target audience.

**Rationale**: Anime streaming users use diverse browsers and devices.

#### Scenario: Browser Compatibility
**Given** the Vue.js frontend application
**When** testing across browsers
**Then** the application MUST work on:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

#### Scenario: Progressive Enhancement
**Given** users with older browsers
**When** the Vue.js frontend loads
**Then** the application MUST:
- Degrade gracefully if JavaScript features are unavailable
- Show appropriate browser upgrade message if needed
- Support polyfills for critical features (optional)

### Requirement: Performance Metrics

The Vue.js frontend MUST meet specific performance benchmarks.

**Rationale**: Fast loading times improve user experience and SEO.

#### Scenario: Core Web Vitals
**Given** the Vue.js frontend in production
**When** running Lighthouse audits
**Then** the scores MUST be:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 80 (content site, not critical for web app)

#### Scenario: Loading Performance
**Given** a user visiting the site for the first time
**When** measuring load times
**Then** the following MUST be achieved:
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.0s
- Cumulative Layout Shift (CLS) < 0.1

#### Scenario: Runtime Performance
**Given** the Vue.js frontend application
**When** interacting with the UI
**Then** the following MUST be smooth:
- Anime list scrolling with 100+ items
- Episode grid rendering with 50+ episodes
- Video player controls and seeking
- Filter changes and search results
