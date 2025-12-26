# proxy-server Specification

## Purpose
Define requirements for the cycani-proxy server, including HTTP client configuration, image proxy, and video streaming capabilities.

## ADDED Requirements

### Requirement: HTTP Client Configuration
The proxy server SHALL properly import and use HTTP client utilities including `axios`, `httpClient`, and `getEnhancedHeaders` from the httpClient module.

#### Scenario: Server startup imports
- **WHEN** the server starts
- **THEN** it SHALL import `axios` for direct HTTP requests
- **AND** SHALL import `httpClient` for enhanced HTTP client with retry logic
- **AND** SHALL import `getEnhancedHeaders` function for generating browser headers

#### Scenario: Headers for video stream proxy
- **WHEN** proxying video streams through `/api/stream-proxy`
- **THEN** the server SHALL use `getEnhancedHeaders(url)['User-Agent']` for the User-Agent header
- **AND** SHALL NOT reference undefined `DEFAULT_HEADERS` constant

#### Scenario: Headers for Puppeteer
- **WHEN** launching Puppeteer to extract video URLs
- **THEN** the server SHALL use `getEnhancedHeaders()` to set the browser User-Agent
- **AND** SHALL NOT reference undefined `DEFAULT_HEADERS` constant

### Requirement: Image Proxy Service
The proxy server SHALL provide an image proxy endpoint that fetches remote images and serves them with proper CORS headers.

#### Scenario: Successful image proxy
- **WHEN** a client requests `/api/image-proxy?url=<encoded-image-url>`
- **THEN** the server SHALL fetch the remote image using `httpClient`
- **AND** SHALL set proper Content-Type header based on the image type
- **AND** SHALL set Cache-Control header for 24-hour caching
- **AND** SHALL set Access-Control-Allow-Origin to '*'

#### Scenario: Image proxy fallback
- **WHEN** the remote image fails to load (timeout, 404, network error)
- **THEN** the server SHALL redirect to `/api/placeholder-image`
- **AND** SHALL log the error for debugging

#### Scenario: Invalid image URL
- **WHEN** the URL parameter is missing or invalid
- **THEN** the server SHALL return 400 status with error message
- **OR** redirect to `/api/placeholder-image`

### Requirement: Placeholder Image Service
The proxy server SHALL provide a fallback placeholder image endpoint for when anime covers cannot be loaded.

#### Scenario: Placeholder image generation
- **WHEN** a client requests `/api/placeholder-image`
- **THEN** the server SHALL return an SVG placeholder image
- **AND** SHALL display text "无封面" (No Cover)
- **AND** SHALL set Content-Type to `image/svg+xml`
- **AND** SHALL set Cache-Control header for 24-hour caching

### Requirement: Video Stream Proxy
The proxy server SHALL provide a video stream proxy endpoint that forwards video requests to remote CDNs.

#### Scenario: Successful video stream proxy
- **WHEN** a client requests `/api/stream-proxy?url=<encoded-video-url>`
- **THEN** the server SHALL validate the video URL
- **AND** SHALL use axios to fetch the video stream with proper headers
- **AND** SHALL include User-Agent from `getEnhancedHeaders()`
- **AND** SHALL include Range header from the original request for seeking support
- **AND** SHALL pipe the stream directly to the response

#### Scenario: Invalid video URL
- **WHEN** the video URL is invalid or missing
- **THEN** the server SHALL return 400 status with error message

### Requirement: Puppeteer Video URL Extraction
The proxy server SHALL use Puppeteer to extract real video URLs from player pages when available.

#### Scenario: Successful Puppeteer extraction
- **WHEN** a video URL needs to be extracted from player.cycanime.com
- **THEN** the server SHALL launch Puppeteer with proper User-Agent
- **AND** SHALL monitor network requests for video resources
- **AND** SHALL capture and return the real video URL
- **AND** SHALL close the browser after extraction

#### Scenario: Puppeteer fallback
- **WHEN** Puppeteer is not installed or fails to extract URL
- **THEN** the server SHALL log the failure
- **AND** SHALL return the decrypted video ID as fallback
- **AND** SHALL NOT crash the server

#### Scenario: Puppeteer not available
- **WHEN** Puppeteer module is not installed
- **THEN** the server SHALL log a warning at startup
- **AND** SHALL skip Puppeteer extraction
- **AND** SHALL use alternative methods for URL resolution

### Requirement: Import Validation
The proxy server SHALL validate all required imports at startup and fail fast with clear error messages.

#### Scenario: Missing required imports
- **WHEN** a required module (axios, express, etc.) fails to import
- **THEN** the server SHALL log a clear error message
- **AND** SHALL exit with non-zero status code
- **AND** SHALL NOT start with broken functionality

#### Scenario: Optional module missing
- **WHEN** an optional module (puppeteer) is not installed
- **THEN** the server SHALL log a warning message
- **AND** SHALL continue running with reduced functionality
