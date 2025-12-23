## 1. Investigation
- [x] 1.1 Test current headers against cycani.org to confirm 403 error
- [x] 1.2 Analyze successful browser requests to identify missing headers
- [x] 1.3 Test if rate limiting is the issue

## 2. Implementation
- [x] 2.1 Enhance DEFAULT_HEADERS with additional browser headers (Referer, Cookie handling, etc.)
- [x] 2.2 Add request rate limiting (axios interceptor or middleware)
- [x] 2.3 Implement retry logic with exponential backoff
- [x] 2.4 Add more realistic User-Agent rotation
- [x] 2.5 Consider adding TLS/Certificate handling if needed (not needed - current headers work)

## 3. Testing
- [x] 3.1 Test anime list API endpoint returns 200 instead of 403
- [x] 3.2 Test episode API endpoint still works
- [x] 3.3 Test image proxy still works
- [x] 3.4 Verify cache invalidation works properly

## 4. Documentation
- [x] 4.1 Update CLAUDE.md with new anti-bot evasion notes
- [x] 4.2 Document rate limiting configuration
- [x] 4.3 Document any new environment variables or configuration
