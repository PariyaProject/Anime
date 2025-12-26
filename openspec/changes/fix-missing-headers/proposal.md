# Change: Fix Missing DEFAULT_HEADERS and Image Loading Issues

## Why

The proxy server has two critical bugs preventing normal operation:
1. **DEFAULT_HEADERS is not defined** - The code references `DEFAULT_HEADERS['User-Agent']` on lines 1353 and 1488 in `server.js`, but this constant was never imported or defined. This causes Puppeteer video URL extraction to fail with "DEFAULT_HEADERS is not defined" error.
2. **Images not loading on anime list page** - The frontend anime list page cannot display anime cover images, likely due to the image proxy failing or not being properly configured.

These bugs are preventing users from browsing the anime catalog and watching videos.

## What Changes

- **Import missing axios dependency** - Add `const axios = require('axios');` to server.js for the stream proxy endpoint
- **Fix DEFAULT_HEADERS references** - Replace `DEFAULT_HEADERS['User-Agent']` with calls to `getEnhancedHeaders()` function
- **Verify image proxy functionality** - Ensure `/api/image-proxy` endpoint works correctly for loading anime cover images
- **Add error handling for Puppeteer** - Improve error messages and fallback behavior when Puppeteer fails

## Impact

- Affected specs: proxy-server (NEW spec to be created)
- Affected code:
  - `cycani-proxy/src/server.js` (lines 12, 1353, 1488)
  - `cycani-proxy/src/httpClient.js` (already exports `getEnhancedHeaders`)
  - Image proxy endpoint `/api/image-proxy` (verification needed)

## Root Cause Analysis

The `DEFAULT_HEADERS` constant was likely removed during a refactoring when the enhanced HTTP client was introduced in `httpClient.js`. The `getEnhancedHeaders()` function was created to replace the static `DEFAULT_HEADERS` object, but two locations in the code were not updated:
1. Line 1353: Video stream proxy endpoint
2. Line 1488: Puppeteer page setup

Additionally, axios is not imported in server.js but is used directly in the stream proxy endpoint (line 1349).
