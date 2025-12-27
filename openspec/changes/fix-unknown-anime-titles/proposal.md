# Change: Fix Unknown Anime Titles

## Why

Some anime titles display as 【未知动画】 (Unknown Anime) in the frontend and watch history. This issue affects anime IDs 6001 and 6010, among potentially others.

**Observed Behavior:**
- Anime ID 6001: Should be "不擅吸血的吸血鬼" but shows as "【未知动画】"
- Anime ID 6010: Should be "明明只是暗杀者，我的面板数值却比勇者还要强" but shows as "【未知动画】"

**Root Cause:**
The backend anime details endpoint (`/api/anime/:animeId` in `cycani-proxy/src/server.js:1242-1300`) implements a 4-step title parsing strategy with the following flaws:

1. **Strategy 1 (lines 1246-1251)**: Only works for anime containing "间谍过家家" in the title (hardcoded check)
2. **Strategy 2 (lines 1253-1261)**: Tries to extract from `h1` tag, but the resulting title is often "未知动画" or filtered out
3. **Strategy 3 (lines 1263-1285)**: Tries 8 CSS selectors that don't match the actual HTML structure of cycani.org
4. **Strategy 4 (lines 1287-1297)**: Has only one hardcoded fix for anime ID 5998

**Analysis of cycani.org HTML structure:**
The actual cycani.org pages contain the anime title in multiple reliable locations:
- `<title>` tag: `{animeTitle}_第{episode}集_TV番组 - 次元城动画 - 海量蓝光番剧免费看！`
- JavaScript `player_aaaa` object: `vod_data.vod_name` contains the Unicode-escaped anime title
- Multiple HTML elements: `.this-title`, `.player-title-link`

The current code fails because Strategy 1 has an unnecessary hardcoded check, and the generic fallback doesn't properly parse the title tag format.

## What Changes

- **Fix Strategy 1**: Remove the hardcoded "间谍过家家" check and parse the page title generically
- **Add Strategy 5**: Parse the JavaScript `player_aaaa.vod_data.vod_name` field as an additional fallback
- **Improve regex patterns**: Better handle the cycani.org title format
- **Remove hardcoded-only approach**: Make the title parsing work for all anime, not just specific ones

## Impact

- **Affected specs**:
  - `anime-title-parsing` (new spec to be created)
- **Affected code**:
  - `cycani-proxy/src/server.js:1242-1300` (parseAnimeDetails function, 4-step strategy)

## Technical Context

**Current Data Flow (Broken):**
```
cycani.org HTML → parseAnimeDetails() → 4-step strategy → title = '未知动画'
```

**Proposed Data Flow (Fixed):**
```
cycani.org HTML → parseAnimeDetails() → Improved 5-step strategy → title = actual anime title
```

**HTML Sources for Anime Titles:**
1. `<title>` tag: `不擅吸血的吸血鬼_第01集_TV番组 - 次元城动画 - 海量蓝光番剧免费看！`
2. JavaScript: `var player_aaaa={"vod_data":{"vod_name":"\u4e0d\u64c5\u5438\u8840\u7684\u5438\u8840\u9b3c"}}`
3. CSS selectors: `.this-title`, `.player-title-link`

## Dependencies

- Existing backend endpoint `/api/anime/:animeId` (already implemented)
- No frontend changes required (frontend already displays whatever title the backend returns)
- No new external dependencies required

## Success Criteria

- Anime ID 6001 returns "不擅吸血的吸血鬼" instead of "【未知动画】"
- Anime ID 6010 returns "明明只是暗杀者，我的面板数值却比勇者还要强" instead of "【未知动画】"
- All anime pages that have valid titles in their HTML return correct titles
- Watch history displays correct anime titles instead of "【未知动画】"
- No regression for anime that already work correctly
