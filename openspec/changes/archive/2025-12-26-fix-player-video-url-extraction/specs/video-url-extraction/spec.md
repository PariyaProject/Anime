# Spec: Video URL Extraction

## ADDED Requirements

### Requirement: HTTP-Based Video URL Extraction

The proxy server MUST extract video URLs using direct HTTP requests instead of Puppeteer browser automation.

#### Scenario: Successful video URL extraction from player page

**Given** a valid episode URL like `https://www.cycani.org/watch/3944/1/21.html`
**When** the backend fetches the watch page
**And** extracts the player iframe URL
**And** fetches the player page HTML
**And** parses the `config` object from `<script>` tags
**Then** the system MUST extract the encrypted `config.url` and `config.vkey`
**And** decrypt the URL using AES-128-CBC
**And** return the decrypted video URL (e.g., `https://p9-dcd-sign.byteimg.com/...`)

#### Scenario: Player page with valid config

**Given** a player page URL like `https://player.cycanime.com/?url=cycani-dcd01-39aaa93004d357631fea86e2bc8442431756347877`
**When** the backend fetches the player page
**Then** the system MUST find a `<script>` tag with `var config = {`
**And** extract the `url` field (Base64-encoded encrypted URL)
**And** extract the `vkey` field (MD5 hash suffix)

#### Scenario: AES decryption of video URL

**Given** an encrypted URL from `config.url`
**And** a video ID from the URL parameter
**When** the system derives the decryption key using MD5(videoId + 'cfg')
**And** splits the hash: first 32 hex chars as key, last 32 hex chars as IV
**And** decrypts using AES-128-CBC with PKCS7 padding
**Then** the system MUST return a valid HTTP(S) video URL
**And** the URL MUST point to byteimg.com or similar CDN

#### Scenario: Fallback to alternative extraction methods

**Given** AES decryption fails or config is missing
**When** the system cannot decrypt the video URL
**Then** the system MUST try alternative methods:
  - Parse MuiPlayer configuration
  - Search for direct .mp4/.m3u8 URLs in HTML
  - Return the player URL for frontend handling

#### Scenario: Error handling for invalid config

**Given** a player page without valid config
**When** the system cannot find `var config = {` in script tags
**Or** config.url or config.vkey is missing
**Then** the system MUST return a clear error message
**And** log the failure for debugging
**And** NOT crash the server

### Requirement: Remove Puppeteer from Video URL Extraction

The proxy server MUST NOT use Puppeteer for video URL extraction as the primary method.

#### Scenario: Direct HTTP fetch preferred over Puppeteer

**Given** the need to extract a video URL
**When** the system can fetch the player page via HTTP
**Then** the system MUST use `parseWithAxios()` first
**And** MUST NOT launch Puppeteer unless all HTTP methods fail

#### Scenario: Puppeteer as emergency fallback only

**Given** all HTTP-based extraction methods fail
**When** the system has exhausted all alternatives
**Then** the system MAY try Puppeteer as last resort
**And** MUST log the fallback decision
**And** MUST timeout after 5 seconds (not 12 seconds)

### Requirement: Crypto-JS Integration

The proxy server MUST use the crypto-js library for AES decryption.

#### Scenario: Dependency installation

**Given** the backend package.json
**When** the system is installed
**Then** crypto-js@^4.2.0 MUST be in dependencies
**And** MUST be automatically installed with `npm install`

#### Scenario: Import and usage

**Given** the server.js file
**When** the system starts up
**Then** crypto-js MUST be imported
**And** available for AES decryption operations

### Requirement: API Response Consistency

The `/api/episode` endpoint MUST maintain consistent response format.

#### Scenario: Successful video URL response

**Given** a valid episode request to `/api/episode/3944/1/21`
**When** the video URL is successfully extracted
**Then** the response MUST include:
  - `success: true`
  - `data.realVideoUrl`: The decrypted video URL
  - `data.videoUrl`: The original encrypted ID (for reference)
  - `data.nextUrl`: Next episode URL if available

#### Scenario: Partial success with player URL

**Given** decryption fails but player URL is available
**When** the system cannot decrypt the video URL
**Then** the response MUST include:
  - `success: true`
  - `data.realVideoUrl`: The player.cycanime.com URL
  - `data.videoUrl`: The original encrypted ID
  - A warning in logs about decryption failure

#### Scenario: Complete failure response

**Given** an episode request for non-existent content
**When** the system cannot extract any URL
**Then** the response MUST include:
  - `success: false`
  - `error`: Descriptive error message
  - HTTP status code 404 or 500

### Requirement: Performance Optimization

The video URL extraction MUST complete within 2 seconds for successful cases.

#### Scenario: Fast HTTP-based extraction

**Given** a normal network connection
**When** the system extracts a video URL using HTTP
**Then** the operation MUST complete within 2 seconds
**And** MUST NOT launch any browser processes

#### Scenario: Timeout for slow responses

**Given** a slow or unresponsive player page
**When** the HTTP request takes longer than 5 seconds
**Then** the system MUST timeout
**And** return an error or fallback URL
**And** NOT wait indefinitely

## MODIFIED Requirements

### Requirement: Video URL Extraction Method

The proxy server MUST use HTTP-based AES decryption instead of Puppeteer browser automation for video URL extraction. This change replaces the previous approach of intercepting network requests in a headless browser.

#### Scenario: Method selection

**Given** a request to extract a video URL
**When** the system chooses extraction method
**Then** HTTP-based decryption MUST be tried first
**And** Puppeteer MUST only be used as emergency fallback
**And** The method MUST be logged for debugging

#### Scenario: Deprecation of Puppeteer for video URLs

**Given** the current Puppeteer-based implementation
**When** the new HTTP-based method is implemented
**Then** old Puppeteer code SHOULD be removed
**Or** marked as deprecated with clear comments
**And** Documentation MUST be updated
