# Design: Fix Unknown Anime Titles

## Context

The backend anime details endpoint (`/api/anime/:animeId` in `cycani-proxy/src/server.js`) parses HTML from cycani.org to extract anime information. One of the most critical fields is the anime title, which is used throughout the frontend and stored in watch history.

**Current Problem:**
Many anime display as "【未知动画】" (Unknown Anime) because the 4-step title parsing strategy fails to extract valid titles from the HTML.

**Affected Examples:**
- Anime ID 6001: Should be "不擅吸血的吸血鬼" → Shows "【未知动画】"
- Anime ID 6010: Should be "明明只是暗杀者，我的面板数值却比勇者还要强" → Shows "【未知动画】"

**Stakeholders:**
- End users: Want to see correct anime titles in watch history and UI
- Frontend: Relies on backend to provide accurate titles
- Backend: Needs robust title parsing that works with cycani.org HTML structure

## Goals / Non-Goals

**Goals:**
- Extract correct anime titles for all anime on cycani.org
- Eliminate "【未知动画】" fallback for anime with valid titles
- Maintain backward compatibility with anime that already work
- Add robust fallback strategies for various HTML structures

**Non-Goals:**
- Changing the frontend display logic (frontend already displays whatever title backend returns)
- Creating new API endpoints
- Modifying data storage formats
- Implementing caching or database solutions

## Current Implementation Analysis

### 4-Step Strategy (cycani-proxy/src/server.js:1242-1300)

**Strategy 1: Page Title with Hardcoded Check**
```javascript
const pageTitle = $('title').text().trim();
if (pageTitle && pageTitle.includes('间谍过家家')) {
    title = pageTitle.replace('_TV番组 - 次元城动画 - 海量蓝光番剧免费看！', '').trim();
}
```
**Problem:** Only works for "间谍过家家" - hardcoded check is too restrictive.

**Strategy 2: Generic H1 Tag**
```javascript
const fullTitle = $('h1').text().trim() || '';
const titleText = fullTitle.replace('_TV番组 - 次元城动画 - 海量蓝光番剧免费看！', '').trim();
if (titleText && titleText !== '未知动画') {
    title = titleText;
}
```
**Problem:** H1 tag often contains "未知动画" or irrelevant text.

**Strategy 3: CSS Selectors**
```javascript
const selectors = [
    '.detail-title h1',
    '.anime-title h1',
    '.page-title h1',
    '.bangumi-title h1',
    '.info-title h1',
    'h1.anime-title',
    '.title h1',
    'h1.title'
];
```
**Problem:** None of these selectors match the actual cycani.org HTML structure.

**Strategy 4: Hardcoded Fallback**
```javascript
if (animeId === '5998') {
    title = '间谍过家家 第三季';
} else {
    title = '未知动画';
}
```
**Problem:** Only has one hardcoded fix, not scalable.

## cycani.org HTML Analysis

### Actual Title Locations

**1. Title Tag Format:**
```html
<title>不擅吸血的吸血鬼_第01集_TV番组 - 次元城动画 - 海量蓝光番剧免费看！</title>
```
Pattern: `{animeTitle}_第{episode}集_TV番组 - 次元城动画 - 海量蓝光番剧免费看！`

**2. JavaScript Object:**
```javascript
var player_aaaa={
    "vod_data":{
        "vod_name":"\u4e0d\u64c5\u5438\u8840\u7684\u5438\u8840\u9b3c"
    }
}
```
The `vod_data.vod_name` contains Unicode-escaped anime title.

**3. HTML Elements:**
```html
<div class="cor4 this-title">不擅吸血的吸血鬼</div>
<h2><a class="player-title-link">不擅吸血的吸血鬼</a></h2>
```

### Key Findings

1. **Title tag is most reliable**: Always present, consistent format
2. **JavaScript object is accurate**: Contains the exact title used by the player
3. **CSS selectors exist**: `.this-title` and `.player-title-link` are present on all pages

## Decisions

### Decision 1: Generic Title Tag Parsing (Improved Strategy 1)

**Choice:** Remove hardcoded "间谍过家家" check and parse title tag generically with regex.

**Implementation:**
```javascript
// Strategy 1: Parse page title with generic regex
const pageTitle = $('title').text().trim();
const titleMatch = pageTitle.match(/^(.+?)_第\d+集_/);
if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
    strategyUsed = 1;
    console.log(`🎯 策略1: 从页面标题提取: ${title}`);
}
```

**Rationale:**
- Title tag format is consistent: `{animeTitle}_第{episode}集_TV番组...`
- Regex `^(.+?)_第\d+集_` extracts everything before `_第XX集_`
- Works for all anime, not just specific ones
- Removes the hardcoded limitation

### Decision 2: Add JavaScript Object Parsing (Strategy 5)

**Choice:** Extract title from `player_aaaa.vod_data.vod_name` as a new Strategy 5.

**Implementation:**
```javascript
// Strategy 5: Parse from JavaScript player_aaaa object
if (!title || title === '未知动画') {
    const scriptContent = $('script:contains("player_aaaa")').html();
    const vodNameMatch = scriptContent.match(/"vod_name"\s*:\s*"\\u([0-9a-fA-F]+)"/);
    if (vodNameMatch) {
        // Decode Unicode escape sequences
        title = JSON.parse(`"\\u${vodNameMatch[1]}"`);
        strategyUsed = 5;
        console.log(`🎯 策略5: 从JavaScript对象提取: ${title}`);
    }
}
```

**Rationale:**
- `player_aaaa` object is present on all anime pages
- `vod_data.vod_name` contains the authoritative title
- Unicode-escaped format is reliable
- Acts as a robust fallback when HTML parsing fails

### Decision 3: Update CSS Selector List (Improved Strategy 3)

**Choice:** Add `.this-title` and `.player-title-link` to selector list.

**Implementation:**
```javascript
const selectors = [
    '.this-title',           // NEW - Most reliable
    '.player-title-link',    // NEW - Reliable
    'h2 .player-title-link', // NEW - Alternative
    '.detail-title h1',
    '.anime-title h1',
    '.page-title h1',
    '.bangumi-title h1',
    '.info-title h1',
    'h1.anime-title',
    '.title h1',
    'h1.title'
];
```

**Rationale:**
- `.this-title` is the primary title element on the page
- `.player-title-link` is the link to the anime details page
- Both are consistently present on all cycani.org anime pages
- Placed first in the list for priority

### Decision 4: Fallback Chain Order

**Choice:** Maintain original fallback order with improvements.

**New 5-Step Strategy:**
1. **Generic title tag regex** (most reliable, works for all)
2. **Generic H1 tag** (as before)
3. **CSS selectors** (expanded list, including working selectors)
4. **Hardcoded fixes** (existing, for special cases)
5. **JavaScript object** (new robust fallback)
6. **Final fallback**: '未知动画' (only if all strategies fail)

**Rationale:**
- Keeps fastest methods first (title tag, H1)
- Adds robust fallback (JavaScript object)
- Maintains backward compatibility
- Only returns '未知动画' if title truly doesn't exist in page

## Data Flow

### Current Flow (Broken)
```
cycani.org HTML
  ↓
parseAnimeDetails() - 4-step strategy
  ↓
Strategy 1: Hardcoded check → FAILS (not "间谍过家家")
  ↓
Strategy 2: H1 tag → Returns "未知动画" or empty
  ↓
Strategy 3: CSS selectors → None match
  ↓
Strategy 4: Hardcoded → Only works for 5998
  ↓
title = '未知动画' ❌
```

### Proposed Flow (Fixed)
```
cycani.org HTML
  ↓
parseAnimeDetails() - 5-step strategy
  ↓
Strategy 1: Generic title regex → SUCCESS for most ✅
  ↓ (if fails)
Strategy 2: Generic H1 tag → (unchanged)
  ↓ (if fails)
Strategy 3: CSS selectors → Expanded list, higher success rate ✅
  ↓ (if fails)
Strategy 4: Hardcoded → (unchanged)
  ↓ (if fails)
Strategy 5: JavaScript object → Robust fallback ✅
  ↓ (if all fail)
title = '未知动画' (only when truly unavailable)
```

## Implementation Details

### Regex Pattern Explanation

**Pattern:** `^(.+?)_第\d+集_`

- `^` - Start of string
- `(.+?)` - Capture group: one or more characters (non-greedy)
- `_第\d+集_` - Literal `_第`, digits, `集_`
- This captures everything before the episode indicator

**Examples:**
- `"不擅吸血的吸血鬼_第01集_TV番组..."` → `"不擅吸血的吸血鬼"`
- `"明明只是暗杀者，我的面板数值却比勇者还要强_第01集_TV番组..."` → `"明明只是暗杀者，我的面板数值却比勇者还要强"`

### Unicode Decoding

The `vod_name` field uses Unicode escape sequences:
```
"vod_name":"\u4e0d\u64c5\u5438\u8840\u7684\u5438\u8840\u9b3c"
```

To decode:
```javascript
// Method 1: JSON.parse
JSON.parse('"\\u4e0d"') → "不"

// Method 2: Direct replacement
str.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) =>
    String.fromCharCode(parseInt(hex, 16))
)
```

## Risks / Trade-offs

### Risk 1: Title Format Changes

**Risk:** cycani.org might change their title tag format.

**Mitigation:**
- Multiple fallback strategies (CSS selectors, JavaScript object)
- Strategy 5 (JavaScript object) is unlikely to change (player data)
- If format changes, strategies 3-5 provide alternatives

**Acceptable trade-off:** The multi-strategy approach provides redundancy.

### Risk 2: Special Characters in Titles

**Risk:** Some anime titles might contain underscores or numbers that confuse the regex.

**Mitigation:**
- Regex is non-greedy `(.+?)` - stops at first match
- Pattern `_第\d+集_` is specific to episode numbering
- Underscores in titles are rare in anime names

**Acceptable trade-off:** The regex pattern is specific enough to avoid false matches.

### Risk 3: Unicode Decoding Failures

**Risk:** Malformed Unicode escape sequences could cause decoding errors.

**Mitigation:**
- Wrap in try-catch block
- Fall back to '未知动画' if decoding fails
- Log errors for monitoring

**Acceptable trade-off:** Unicode is a standard format; decoding is reliable.

## Migration Plan

### Phase 1: Implementation
1. Modify `cycani-proxy/src/server.js` lines 1242-1300
2. Update Strategy 1 with generic regex
3. Add Strategy 5 for JavaScript object parsing
4. Update CSS selector list in Strategy 3
5. Add logging for each strategy used

### Phase 2: Testing
1. Test with anime ID 6001 (expected: "不擅吸血的吸血鬼")
2. Test with anime ID 6010 (expected: "明明只是暗杀者，我的面板数值却比勇者还要强")
3. Test with anime ID 5998 (expected: "间谍过家家 第三季" - no regression)
4. Test with random anime IDs to verify general robustness

### Phase 3: Validation
1. Run `npx openspec validate fix-unknown-anime-titles --strict`
2. Verify all scenarios pass
3. Check that watch history displays correct titles

### Rollback
If issues arise, revert by:
1. Restore original 4-step strategy code
2. Remove Strategy 5 implementation
3. No data migration needed (API response format unchanged)

## Open Questions

None. The design is straightforward and builds upon existing patterns in the codebase.
