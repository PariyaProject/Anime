# API Parameter Analysis and Correction Proposal

## Problem Statement

The current proxy server API implementation has significant issues with parameter handling for anime list retrieval and filtering. After investigating the original cycani.org website, I found that:

1. **Search functionality** only accepts a single keyword parameter `wd`
2. **No complex filtering** is supported by the original website (no year/month genre combinations)
3. **URL structure** follows specific patterns for different filter types
4. **Current API** accepts parameters that don't exist on the original site

## Original Website URL Structure Analysis

### 1. Base Anime List URL
- Pattern: `https://www.cycani.org/show/20.html`
- Pagination: `https://www.cycani.org/show/20.html?page={number}` or `https://www.cycani.org/show/20/page/{number}.html`

### 2. Search URL
- Pattern: `https://www.cycani.org/search?wd={keyword}`
- Only supports single keyword search

### 3. Channel Filters (Primary Level)
Different channels have different content types:
- **TV番组**: `https://www.cycani.org/show/20.html` (ID: 20)
- **剧场番组**: `https://www.cycani.org/show/21.html` (ID: 21)
- **4K专区**: `https://www.cycani.org/show/26.html` (ID: 26)
- **国漫（外部源）**: `https://www.cycani.org/show/27.html` (ID: 27)

### 4. Secondary Filters (Within Channels)
- **Genre Filter**: `https://www.cycani.org/show/{channelId}/class/{genre}.html`
  - Examples: 热血, 原创, 漫画改, 小说改, 游戏改, etc.
- **Year Filter**: `https://www.cycani.org/show/{channelId}/year/{year}.html`
  - Examples: 2024, 2023, 2022, etc.
- **Letter Filter**: `https://www.cycani.org/show/{channelId}/letter/{letter}.html`
  - Examples: A, B, C, ..., Z, 0-9
- **Sort Order**: `https://www.cycani.org/show/{channelId}/by/{sort_type}.html`
  - Options: time (latest), hits (popular), score (rating)

### 5. Combined Filters
The website supports combining some filters within the same channel:
- Example: `https://www.cycani.org/show/20/class/热血/year/2024.html`
- Example: `https://www.cycani.org/show/26/by/score.html` (4K专区按评分排序)

## Key Issues with Current Implementation

### 1. Invalid Parameter Support
Current API accepts: `page`, `limit`, `search`, `genre`, `year`, `sort`
Reality: Missing `channel` parameter and incorrect URL construction for filters

### 2. Search Verification
The website implements search verification with CAPTCHA:
- Endpoint: `/index.php/ajax/verify_check?type=search&verify={code}`
- This blocks automated search requests

### 3. No Backend API
All filtering is done through URL rewriting, not query parameters
- No AJAX APIs for filtering
- Static HTML pages with different URLs

## Additional Discovery: Weekly Anime Schedule

During analysis, I discovered that the homepage (`https://www.cycani.org/`) contains a "新番就要追着看" (New Anime Weekly Schedule) section with:

### Weekly Schedule Structure
- **Monday to Sunday tabs**: Each day shows anime airing that day
- **Complete schedule page**: `https://www.cycani.org/index.php/label/weekday.html`
- **Data includes**:
  - Anime title and cover image
  - Broadcasting time (e.g., "11|周一24:05后")
  - Status (completed/ongoing)
  - Rating
  - Direct links to anime pages

### Sample Data Structure
From Monday's schedule:
- 小手指同学，请别乱摸 (5.5) - 已完结
- 3年Z班银八老师 (6.5) - 11|周一24:05后
- 素材采集家的异世界旅行记 (4.0) - 已完结
- 异世界四重奏 第三季 (6.7) - 10|周一更新
- 胖子与爱情以及过错！ (2.7) - 11|周一23:05后
- 这里是充满笑容的职场。(6.6) - 11|周一21:35后

## Proposed Solution

### Phase 1: URL Structure Correction
1. **Update anime-list API** to construct proper URLs based on filter combinations
2. **Remove unsupported parameters** from API interface
3. **Implement proper URL mapping** for different filter types

### Phase 2: Search Functionality
1. **Implement search result scraping** from search pages
2. **Handle search verification** if required
3. **Cache search results** to avoid verification triggers

### Phase 3: Filter Combination Support
1. **Support single filters**: genre, year, letter, sort
2. **Support limited combinations** that the website actually supports
3. **Fallback to client-side filtering** for unsupported combinations

### Phase 4: Weekly Schedule API (NEW)
1. **Implement weekly schedule scraping** from homepage and dedicated page
2. **Create structured data format** for daily anime schedules
3. **Add caching for weekly schedule** (updates weekly)
4. **Provide day-filtered responses** for specific weekdays

## Technical Implementation Details

### 1. URL Construction Logic
```javascript
function constructAnimeListUrl(filters) {
  // Channel mapping
  const channelMap = {
    'tv': 20,      // TV番组
    'movie': 21,   // 剧场番组
    '4k': 26,      // 4K专区
    'guoman': 27,  // 国漫（外部源）
    'default': 20  // Default to TV番组
  };

  const channelId = channelMap[filters.channel] || channelMap.default;

  if (filters.search) {
    return `https://www.cycani.org/search?wd=${encodeURIComponent(filters.search)}`;
  }

  // Base URL for the selected channel
  let baseUrl = `https://www.cycani.org/show/${channelId}.html`;

  // Apply primary filter (only one can be primary)
  if (filters.genre) {
    baseUrl = `https://www.cycani.org/show/${channelId}/class/${encodeURIComponent(filters.genre)}.html`;
  } else if (filters.year) {
    baseUrl = `https://www.cycani.org/show/${channelId}/year/${filters.year}.html`;
  } else if (filters.letter) {
    baseUrl = `https://www.cycani.org/show/${channelId}/letter/${filters.letter}.html`;
  }

  // Apply secondary filters (sort, pagination)
  if (filters.sort && filters.sort !== 'time') {
    baseUrl = baseUrl.replace('.html', `/by/${filters.sort}.html`);
  }

  if (filters.page && filters.page > 1) {
    baseUrl = baseUrl.replace('.html', `/page/${filters.page}.html`);
  }

  return baseUrl;
}
```

### 2. API Parameter Changes
```javascript
// BEFORE (current)
app.get('/api/anime-list', async (req, res) => {
  const { page = 1, limit = 24, search = '', genre = '', year = '', sort = 'time' } = req.query;
  // ... implementation that doesn't work
});

// AFTER (proposed)
app.get('/api/anime-list', async (req, res) => {
  const { page = 1, limit = 24, search = '', genre = '', year = '', letter = '', channel = 'tv', sort = 'time' } = req.query;

  // Validate parameter combinations
  if (search && (genre || year || letter)) {
    return res.status(400).json({
      success: false,
      error: 'Search cannot be combined with other filters'
    });
  }

  // Validate channel
  const validChannels = ['tv', 'movie', '4k', 'guoman'];
  if (channel && !validChannels.includes(channel)) {
    return res.status(400).json({
      success: false,
      error: `Invalid channel: ${channel}. Valid channels: ${validChannels.join(', ')}`
    });
  }

  // Construct proper URL and scrape results
  const targetUrl = constructAnimeListUrl({ search, genre, year, letter, channel, sort, page });
  // ... scraping implementation
});
```

### 3. Weekly Schedule API Design
```javascript
// New API Endpoint: /api/weekly-schedule
app.get('/api/weekly-schedule', async (req, res) => {
  const { day = 'all' } = req.query; // day: 'monday', 'tuesday', ..., 'all'

  try {
    const scheduleData = await scrapeWeeklySchedule(day);

    res.json({
      success: true,
      data: {
        schedule: scheduleData,
        updated: new Date().toISOString(),
        filter: day
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Data Structure
{
  "schedule": {
    "monday": [
      {
        "id": "6008",
        "title": "3年Z班银八老师",
        "cover": "https://gimg1.baidu.com/gimg/app=2001&src=...",
        "rating": "6.5",
        "status": "连载中",
        "broadcastTime": "11|周一24:05后",
        "url": "https://www.cycani.org/bangumi/6008.html"
      }
    ],
    "tuesday": [...],
    // ... other days
  }
}
```

### 4. Error Handling
1. **Invalid filter combinations** return appropriate error messages
2. **Search verification failures** handled gracefully
3. **Fallback responses** when filters don't work as expected
4. **Weekly schedule scraping failures** return cached data when available

## Benefits

1. **Accurate API behavior** that matches the original website
2. **Proper error handling** for unsupported operations
3. **Better user experience** with realistic expectations
4. **Maintainable code** that aligns with actual website structure

## Risks and Mitigations

1. **Search limitations**: May require CAPTCHA solving or rate limiting
2. **Website structure changes**: Implement monitoring and fallback mechanisms
3. **Performance**: Add caching for frequently requested filters

## Testing Strategy

1. **Manual testing** of each filter combination against live website
2. **Automated tests** for URL construction logic
3. **Load testing** for new scraping patterns
4. **Error scenario testing** for edge cases

This proposal ensures that the proxy server API accurately reflects the capabilities and limitations of the original cycani.org website.