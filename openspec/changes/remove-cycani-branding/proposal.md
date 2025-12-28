# Change: Remove Cycani Branding from Frontend

## Why

The frontend currently displays "次元城动画" (Cycani Animation) branding in multiple places, including:
1. The website title and page titles
2. Navigation bar brand link and label
3. Footer copyright text
4. Anime episode titles scraped from the source website

This creates unnecessary branding exposure and clutter in the user interface. The user wants a cleaner, more generic anime viewing experience with simplified branding.

## What Changes

- **Simplify website title** from "Cycani - 次元城动画" to just "动画" (Animation)
- **Remove branding from navigation bar**: Change "次元城动画" to "动画"
- **Clean up footer copyright**: Change from "次元城动画网站" to generic copyright
- **Strip branding from anime titles**: Remove " - 次元城动画 - 海量蓝光番剧免费看！" suffix from episode titles in server-side scraping logic
- **Update page title format**: Change default title from "Cycani - 次元城动画" to "动画"

**Note**: This change only affects source code files. Historical data files (watch-history.json, backups, corrupted files) are NOT modified.

## Impact

- **Affected specs**:
  - `frontend-ux` (MODIFIED - update branding requirements)
- **Affected code**:
  - `cycani-proxy/frontend/index.html:7` - Document title
  - `cycani-proxy/frontend/src/components/layout/AppNavbar.vue:4,6` - Navbar brand
  - `cycani-proxy/frontend/src/components/layout/AppFooter.vue:7` - Footer copyright
  - `cycani-proxy/frontend/src/router/index.ts:32` - Page title format
  - `cycani-proxy/src/server.js:1528` - Episode title scraping logic

## Success Criteria

- Website title displays "动画" instead of "Cycani - 次元城动画"
- Navigation bar shows "动画" instead of "次元城动画"
- Footer copyright no longer mentions "次元城动画网站"
- Anime episode titles are clean without the " - 次元城动画 - 海量蓝光番剧免费看！" suffix
- Page titles use the new simplified format

## Technical Context

**Current Title Scraping Logic (server.js:1528):**
```javascript
const titleText = fullTitle.replace('_TV番组 - 次元城动画 - 海量蓝光番剧免费看！', '').trim();
```

This regex only removes one specific pattern. The fix needs to handle both patterns:
- `_TV番组 - 次元城动画 - 海量蓝光番剧免费看！` (detail pages)
- `_第XX集_TV番组 - 次元城动画 - 海量蓝光番剧免费看！` (play pages)

**Updated regex pattern:**
```javascript
const titleText = fullTitle.replace(/_TV番组.*$/, '').trim();
```

This simpler pattern removes everything from "_TV番组" onwards, handling both cases.
