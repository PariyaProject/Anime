# API Parameter Fix Design Document

## System Architecture Overview

The current proxy server incorrectly assumes that cycani.org supports complex query-based filtering when in reality it uses URL-based routing for different filter types. This design outlines the necessary architectural changes.

## Current Architecture Problems

### 1. Misunderstood API Model
```
Current (Incorrect) Assumption:
/api/anime-list?genre=热血&year=2024&sort=score

Reality:
- Search: /search?wd=keyword
- Genre: /show/20/class/热血.html
- Year: /show/20/year/2024.html
- Sort: /show/20/by/score.html
```

### 2. Invalid Parameter Handling
The API accepts parameters that don't exist on the original website, leading to failed requests or incorrect results.

## New Architecture Design

### 1. URL Construction Layer

```javascript
class AnimeListUrlConstructor {
  constructor(baseUrl = 'https://www.cycani.org') {
    this.baseUrl = baseUrl;
    this.showPath = '/show/20';
  }

  construct(filters) {
    const { search, genre, year, letter, sort, page = 1 } = filters;

    // Search has completely different URL pattern
    if (search) {
      if (this.hasConflictingFilters(search, { genre, year, letter })) {
        throw new Error('Search cannot be combined with other filters');
      }
      return `${this.baseUrl}/search?wd=${encodeURIComponent(search)}`;
    }

    // Base URL for filtered lists
    let url = `${this.baseUrl}${this.showPath}.html`;

    // Apply primary filter (only one can be primary)
    if (genre) {
      url = `${this.baseUrl}${this.showPath}/class/${encodeURIComponent(genre)}.html`;
    } else if (year) {
      url = `${this.baseUrl}${this.showPath}/year/${year}.html`;
    } else if (letter) {
      url = `${this.baseUrl}${this.showPath}/letter/${letter}.html`;
    }

    // Apply secondary filters (sort, pagination)
    if (sort && sort !== 'time') {
      url = url.replace('.html', `/by/${sort}.html`);
    }

    if (page > 1) {
      url = url.replace('.html', `/page/${page}.html`);
    }

    return url;
  }

  hasConflictingFilters(search, otherFilters) {
    return Object.values(otherFilters).some(filter => filter && filter !== '');
  }
}
```

### 2. Parameter Validation Layer

```javascript
class ApiParameterValidator {
  static validateAnimeListFilters(params) {
    const errors = [];
    const { search, genre, year, letter, sort, page } = params;

    // Validate search conflicts
    if (search && (genre || year || letter)) {
      errors.push('Search cannot be combined with genre, year, or letter filters');
    }

    // Validate sort options
    const validSorts = ['time', 'hits', 'score'];
    if (sort && !validSorts.includes(sort)) {
      errors.push(`Invalid sort option: ${sort}. Valid options: ${validSorts.join(', ')}`);
    }

    // Validate year format
    if (year && !/^\d{4}$/.test(year)) {
      errors.push('Year must be a 4-digit number (e.g., 2024)');
    }

    // Validate letter format
    if (letter && !/^[A-Z]$|^0-9$/.test(letter)) {
      errors.push('Letter must be A-Z or 0-9');
    }

    // Validate page number
    if (page && (page < 1 || page > 1000)) {
      errors.push('Page must be between 1 and 1000');
    }

    return errors;
  }
}
```

### 3. Enhanced API Endpoint

```javascript
app.get('/api/anime-list', async (req, res) => {
  try {
    // Extract parameters with defaults
    const {
      page = 1,
      limit = 24,
      search = '',
      genre = '',
      year = '',
      letter = '',
      sort = 'time'
    } = req.query;

    // Validate parameters
    const validationErrors = ApiParameterValidator.validateAnimeListFilters({
      search, genre, year, letter, sort, page
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: validationErrors
      });
    }

    // Construct target URL
    const urlConstructor = new AnimeListUrlConstructor();
    const targetUrl = urlConstructor.construct({
      search, genre, year, letter, sort, page
    });

    console.log(`🔍 Fetching anime list: ${targetUrl}`);

    // Scrape results
    const response = await axios.get(targetUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const animeList = parseAnimeList($);

    // Get pagination info
    const pagination = parsePaginationInfo($);

    res.json({
      success: true,
      data: {
        animeList: animeList.slice(0, limit),
        currentPage: parseInt(page),
        totalPages: pagination.totalPages,
        totalCount: pagination.totalCount,
        filters: {
          search, genre, year, letter, sort
        }
      }
    });

  } catch (error) {
    console.error('❌ 获取动画列表失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 4. Caching Strategy

```javascript
class AnimeListCache {
  constructor(ttl = 10 * 60 * 1000) { // 10 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }

  getCacheKey(filters) {
    // Create consistent cache key based on filters
    return JSON.stringify({
      search: filters.search || '',
      genre: filters.genre || '',
      year: filters.year || '',
      letter: filters.letter || '',
      sort: filters.sort || 'time',
      page: filters.page || 1
    });
  }

  get(filters) {
    const key = this.getCacheKey(filters);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    return null;
  }

  set(filters, data) {
    const key = this.getCacheKey(filters);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old entries periodically
    this.cleanup();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}
```

## Error Handling Strategy

### 1. Parameter Validation Errors
Return clear, actionable error messages:
```json
{
  "success": false,
  "error": "Invalid parameters",
  "details": [
    "Search cannot be combined with genre, year, or letter filters",
    "Invalid sort option: popularity. Valid options: time, hits, score"
  ]
}
```

### 2. Website Structure Changes
- Implement monitoring to detect when selectors change
- Provide fallback responses when scraping fails
- Log errors for debugging and improvement

### 3. Search Verification Issues
- Handle CAPTCHA requirements gracefully
- Implement retry logic with exponential backoff
- Provide cached results when fresh requests fail

## Migration Strategy

### Phase 1: Backward Compatibility
- Support old parameter names with deprecation warnings
- Map old parameters to new URL structure
- Gradually phase out unsupported features

### Phase 2: Feature Flagging
- Use feature flags to enable/disable new behaviors
- Allow gradual rollout with monitoring
- Quick rollback if issues arise

### Phase 3: Full Migration
- Remove deprecated parameters
- Update documentation
- Communicate changes to API consumers

## Performance Considerations

### 1. Caching
- Cache results for each unique filter combination
- Intelligent cache invalidation based on content updates
- LRU eviction for memory management

### 2. Request Optimization
- Minimize HTTP requests through batching
- Use connection pooling for concurrent requests
- Implement request timeouts and retries

### 3. Response Compression
- Compress API responses for bandwidth efficiency
- Use appropriate caching headers
- Implement response streaming for large datasets

## Monitoring and Observability

### 1. Metrics to Track
- API response times by filter type
- Cache hit/miss ratios
- Error rates by parameter combination
- Request patterns and popular filters

### 2. Alerting
- High error rates for specific filters
- Cache performance degradation
- Website structure changes affecting scraping
- Unusual request patterns indicating abuse

### 3. Logging
- Detailed request/response logging
- Error context and stack traces
- Performance metrics and timing information
- Cache operation logging

## Testing Strategy

### 1. Unit Tests
- URL construction logic
- Parameter validation
- Cache operations
- Error handling

### 2. Integration Tests
- End-to-end API functionality
- Real website scraping
- Filter combination scenarios
- Error recovery

### 3. Performance Tests
- Load testing with concurrent requests
- Cache performance under load
- Memory usage optimization
- Response time benchmarks

This design ensures that the proxy server API accurately reflects the capabilities and limitations of the original cycani.org website while providing robust error handling and performance optimization.