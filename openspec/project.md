# Project Context

## Purpose
Dual-component system for enhancing cycani.org (次元城动画网站) anime streaming experience:
- **Tampermonkey Userscripts**: Automated video playback and episode progression
- **Node.js Proxy Server**: Web-based proxy service with watch history management

## Tech Stack

### Userscripts
- **JavaScript ES6+**: Core userscript functionality
- **Tampermonkey**: Browser extension for userscript execution
- **GM_xmlhttpRequest**: Cross-domain data fetching
- **URL Parameters**: Cross-domain communication mechanism
- **HTML5 Video API**: Playback control and monitoring

### Proxy Server
- **Node.js**: Runtime environment
- **Express.js**: Web server framework
- **Puppeteer**: Web scraping and video URL extraction
- **Bootstrap 5**: Frontend UI framework
- **JSON**: Data storage and API format

### Development Tools
- **Chrome MCP**: Real-world testing and debugging
- **CORS Proxy**: Cross-origin resource sharing
- **Chrome DevTools**: Browser automation for testing

## Project Conventions

### Code Style
- **JavaScript**: ES6+ with async/await patterns
- **File Naming**: kebab-case for files, camelCase for variables
- **Version Control**: Semantic versioning (v14.x stable)
- **Clean Directory**: Production-ready code in `clean/` folder
- **Error Handling**: User-friendly notifications with fallback strategies

### Architecture Patterns
- **Dual-Script Architecture**: Separate scripts for main site vs player domain
- **Cross-Domain Communication**: URL parameters instead of localStorage
- **Progressive Enhancement**: Start with basic functionality, add enhancements
- **Single Purpose Components**: Each script handles one domain specifically
- **Stateless Design**: Scripts operate independently with minimal shared state

### Testing Strategy
- **Real-World Testing**: Chrome MCP for live website testing
- **Manual Verification**: Browser-based testing on actual cycani.org URLs
- **Snapshot Testing**: Visual inspection of player states
- **Error Scenarios**: Test autoplay restrictions, network failures, missing elements
- **Cross-Browser**: Chrome-focused with Firefox compatibility considerations

### Git Workflow
- **Feature Branching**: Separate branches for major features
- **Incremental Versioning**: Update version numbers for significant changes
- **Clean/Production Separation**: Development code separate from production code
- **Commit Messages**: Clear descriptions of functional changes
- **Tagging**: Version tags for stable releases

## Domain Context

### Anime Streaming Ecosystem
- **cycani.org**: Main anime streaming website (watch pages)
- **player.cycanime.com**: Video player domain (embedded player)
- **Video Sources**: Multiple streaming CDNs and video hosts
- **Episode Progression**: Sequential episode numbering and navigation
- **Player Variants**: Different video player implementations (MuiPlayer PRO, custom HTML5)

### Browser Security Constraints
- **Same-Origin Policy**: Prevents cross-domain iframe control
- **Autoplay Restrictions**: Requires user interaction or muted playback
- **Cross-Domain Storage**: localStorage doesn't work across different domains
- **Content Security Policy**: May restrict certain operations

### User Experience Goals
- **Seamless Playback**: Automatically start videos when episodes load
- **Smart Sound Recovery**: Regain audio after initial muted autoplay
- **Automatic Progression**: Navigate to next episode without user intervention
- **Position Memory**: Remember and restore playback position across sessions
- **Responsive Design**: Work on desktop and mobile browsers

## Important Constraints

### Technical Constraints
- **Browser Security**: Must work within same-origin policy limitations
- **Autoplay Policies**: Must handle browser audio/video autoplay restrictions
- **Cross-Domain Barriers**: Cannot directly control iframes across different domains
- **Video Player Diversity**: Must adapt to different player implementations
- **Network Variability**: Must handle slow loading and connection failures

### Legal/Compliance
- **Terms of Service**: Respect website usage policies
- **Copyright**: Don't modify or redistribute content, only enhance user experience
- **Privacy**: Don't collect or store user data beyond local watch history

### Performance Constraints
- **Lightweight**: Minimal impact on page load times
- **Battery Efficient**: Avoid excessive resource consumption
- **Network Friendly**: Minimal additional HTTP requests
- **Memory Conscious**: Clean up event listeners and references

## External Dependencies

### Core Website Dependencies
- **cycani.org**: Primary anime streaming website
- **player.cycanime.com**: Video player domain
- **Multiple Video CDNs**: Various hosting providers for video content

### Development Dependencies
- **Tampermonkey Extension**: Required for userscript execution
- **Node.js/npm**: For proxy server development
- **Puppeteer**: For web scraping and video URL extraction
- **Chrome Browser**: Primary testing environment

### Optional Development Tools
- **Chrome MCP Extension**: For automated testing and debugging
- **Browser DevTools**: For inspecting video elements and network requests
- **JSON Editor**: For managing watch history data files

## Deployment Architecture

### Userscript Deployment
- **Production Code**: `clean/main-script.user.js` and `clean/player-script.user.js`
- **Target Domains**:
  - `https://www.cycani.org/watch/*` (main script)
  - `https://player.cycanime.com/*` (player script)
- **Version Management**: Increment version numbers for breaking changes

### Proxy Server Deployment
- **Port Configuration**: Default 3017, configurable via PORT environment variable
- **Data Storage**: JSON files in project directory
- **API Endpoints**: RESTful API for anime data and watch history
- **Static Files**: Served from `public/` directory

## Current Status
- ✅ **Userscripts**: Stable v14.x with automatic playback and episode progression
- ✅ **Proxy Server**: Functional with watch history and responsive UI
- ✅ **Cross-Domain Communication**: Reliable URL parameter transfer system
- ✅ **Testing**: Comprehensive real-world testing with Chrome MCP
