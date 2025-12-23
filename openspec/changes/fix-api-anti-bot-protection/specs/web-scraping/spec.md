## ADDED Requirements

### Requirement: Browser-Like Request Headers
The proxy server SHALL send HTTP headers that closely mimic legitimate browser requests to avoid anti-bot detection.

#### Scenario: Enhanced header set
- **WHEN** making requests to cycani.org
- **THEN** the request SHALL include all standard browser headers
- **AND** SHALL include `Referer` header set to cycani.org homepage
- **AND** SHALL include `Sec-Ch-Ua` headers with realistic browser information
- **AND** SHALL include `Sec-Fetch-*` headers for navigation context

#### Scenario: User-Agent realism
- **WHEN** sending requests
- **THEN** the User-Agent header SHALL match a current mainstream browser (Chrome, Firefox, Edge)
- **AND** SHALL be rotated from a pool of at least 5 realistic UAs
- **AND** SHALL be updated periodically to remain current

### Requirement: Request Rate Limiting
The proxy server SHALL implement rate limiting on outgoing requests to cycani.org to avoid triggering anti-bot protection.

#### Scenario: Minimum delay between requests
- **WHEN** making multiple requests to cycani.org
- **THEN** the server SHALL enforce a minimum delay between requests
- **AND** the default delay SHALL be at least 1 second
- **AND** the delay SHALL be configurable via environment variable

#### Scenario: Per-domain rate limiting
- **WHEN** rate limiting is implemented
- **THEN** delays SHALL be tracked per target domain
- **AND** requests to different domains SHALL NOT affect each other's timing

### Requirement: Retry with Exponential Backoff
The proxy server SHALL automatically retry failed requests with exponential backoff to handle temporary anti-bot blocks.

#### Scenario: Retry on specific status codes
- **WHEN** a request to cycani.org returns 403, 429, or 503
- **THEN** the server SHALL automatically retry the request
- **AND** SHALL wait before retrying with exponential backoff
- **AND** SHALL limit retries to 3 attempts

#### Scenario: Exponential backoff calculation
- **WHEN** calculating retry delay
- **THEN** initial delay SHALL be at least 1000ms
- **AND** subsequent delays SHALL increase exponentially (2x)
- **AND** SHALL include random jitter to avoid synchronized retries

### Requirement: Caching Strategy
The proxy server SHALL utilize caching to minimize the number of requests sent to cycani.org.

#### Scenario: Cache-first approach for list data
- **WHEN** requesting anime list data
- **THEN** the server SHALL check cache before making HTTP request
- **AND** SHALL serve cached data if available and not expired
- **AND** cache TTL SHALL be at least 10 minutes

#### Scenario: Cache invalidation on error
- **WHEN** a request fails after all retries
- **THEN** stale cache data MAY still be served if available
- **AND** the response SHALL indicate the data is from stale cache
