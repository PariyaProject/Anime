# Design: Anti-Bot Protection Bypass

## Context

The cycani.org website has implemented or enhanced anti-bot protection that is now blocking our proxy server's HTTP requests with 403 errors. This is a common pattern for websites to prevent automated scraping.

**Constraints:**
- Must respect the website's terms of service
- Should minimize load on the target server
- Need to maintain cache to reduce redundant requests
- Current implementation uses axios with basic headers

**Stakeholders:**
- Proxy server users who need reliable anime list data
- cycani.org (target website) - should not be abused

## Goals / Non-Goals

**Goals:**
- Bypass 403 errors to restore API functionality
- Implement respectful scraping practices (rate limiting, caching)
- Add robustness to handle temporary blocks
- Maintain backward compatibility with existing API

**Non-Goals:**
- Aggressive scraping that harms the target website
- Bypassing intentional access controls (login required content)
- Evading IP bans (if our IP is permanently blocked)

## Decisions

### Decision 1: Enhanced Browser Headers

**What:** Add additional HTTP headers to more closely mimic legitimate browser requests.

**Why:** Many anti-bot systems check for specific headers that real browsers always send.

**Headers to add:**
- `Referer`: Set to cycani.org homepage
- `Sec-Ch-Ua`: Real browser brand information
- `Sec-Ch-Ua-Mobile`: Mobile indicator
- `Sec-Ch-Ua-Platform`: Platform information
- `Sec-Fetch-User`: Navigation indicator
- Enhanced `Accept` and `Accept-Language` headers

**Alternatives considered:**
- Puppeteer-only approach: Too resource-heavy for simple list fetching
- No changes: API remains broken

### Decision 2: Request Rate Limiting

**What:** Implement rate limiting for outgoing requests to cycani.org.

**Why:** Sending too many requests quickly can trigger anti-bot detection.

**Implementation:**
- Use axios interceptor to throttle requests
- Minimum 1-2 second delay between requests to same domain
- Configurable via environment variable

**Alternatives considered:**
- No rate limiting: May trigger 429 (Too Many Requests) or IP ban
- External proxy service: Adds complexity and cost

### Decision 3: Retry with Exponential Backoff

**What:** Implement retry logic for failed requests with increasing delays.

**Why:** Temporary failures (503, 429, some 403s) can be resolved by retrying.

**Implementation:**
- Retry on 403, 429, 503 status codes
- Initial delay: 1000ms, exponential backoff
- Max retries: 3
- Jitter to avoid thundering herd

**Alternatives considered:**
- Immediate retry: May worsen the situation
- No retry: Single point of failure

### Decision 4: User-Agent Rotation

**What:** Maintain a pool of realistic User-Agent strings and rotate them.

**Why:** Same UA for all requests looks suspicious; real browsers have variety.

**Implementation:**
- Pool of 5-10 recent Chrome/Firefox/Edge UAs
- Random selection per request
- Periodically update UAs

**Alternatives considered:**
- Single UA: Easier to fingerprint
- No UA: Obvious bot signature

## Risks / Trade-offs

**Risk: IP Ban**
- **Mitigation:** Rate limiting, respectful delays, cache utilization

**Risk: Arms Race with Anti-Bot System**
- **Mitigation:** Keep implementation simple, don't over-engineer

**Trade-off: Response Time vs. Success Rate**
- Adding delays increases latency but improves reliability
- Cache helps mitigate this for frequently accessed data

**Trade-off: Complexity vs. Maintainability**
- More headers and retry logic add complexity
- Keep it well-documented and isolated

## Migration Plan

**Steps:**
1. Update DEFAULT_HEADERS in server.js
2. Create axios interceptor for rate limiting
3. Add retry wrapper around axios calls
4. Test against cycani.org to verify 403 is resolved
5. Monitor for any new errors

**Rollback:**
- Keep original headers code commented for reference
- Can revert to previous version if new approach causes issues

## Open Questions

- Is our IP already permanently blocked by cycani.org?
- Does cycani.org require JavaScript execution (would need Puppeteer)?
- What is the appropriate rate limit to avoid detection?
