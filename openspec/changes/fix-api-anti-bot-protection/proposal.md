# Change: Fix API 403 Error from Anti-Bot Protection

## Why

The proxy server is consistently receiving HTTP 403 errors when attempting to fetch anime lists from cycani.org. This indicates the website has enhanced its anti-bot protection, and the current request headers and methods are no longer sufficient to bypass detection.

## What Changes

- Enhance HTTP headers to better mimic legitimate browser requests
- Add request rate limiting to avoid triggering anti-bot measures
- Implement retry logic with exponential backoff
- Add cookie/Session management if needed
- Consider alternative scraping methods (Puppeteer fallback)
- **BREAKING**: May change scraping success rate and latency

## Impact

- Affected specs: [new capability - web-scraping]
- Affected code: `src/server.js`, `src/urlConstructor.js`
- Dependencies: May require additional npm packages for cookie management
