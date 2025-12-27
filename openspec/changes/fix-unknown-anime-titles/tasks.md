# Tasks: Fix Unknown Anime Titles

## Overview
Fix the anime title parsing logic in the backend to correctly extract anime titles from cycani.org HTML, eliminating the "【未知动画】" fallback for anime that have valid titles.

## Tasks

### 1. Analyze Current Title Parsing Implementation
- [x] Read and understand the current 4-step strategy in `cycani-proxy/src/server.js:1242-1300`
- [x] Identify why Strategy 1 fails for anime other than "间谍过家家"
- [x] Document the cycani.org HTML title format variations

### 2. Design Improved Title Parsing Strategy
- [x] Create design.md with 5-step strategy proposal
- [x] Define regex pattern for parsing `<title>` tag format
- [x] Add Strategy 5 for JavaScript `player_aaaa.vod_data.vod_name` extraction
- [x] Document fallback chain order

### 3. Create Spec Delta for Anime Title Parsing
- [x] Create `openspec/changes/fix-unknown-anime-titles/specs/anime-title-parsing/spec.md`
- [x] Define requirements for title extraction reliability
- [x] Add scenarios for various title formats
- [x] Define validation criteria

### 4. Implement Improved Title Parsing (Backend)
- [x] Modify Strategy 1: Remove hardcoded "间谍过家家" check
- [x] Add generic title tag parsing with regex: `^(.+?)_第\d+集_` and `^(.+?)_TV番组`
- [x] Add Strategy 5: Extract title from `player_aaaa.vod_data.vod_name` JavaScript variable
- [x] Update strategy statistics logging
- [x] Update CSS selector list with `.this-title` and `.player-title-link`

### 5. Test Title Extraction with Real Anime
- [x] Test with anime ID 6001 (不擅吸血的吸血鬼) - Result: Correct title extracted via Strategy 1
- [x] Test with anime ID 6010 (明明只是暗杀者，我的面板数值却比勇者还要强) - Result: Correct title extracted via Strategy 1
- [x] Test with known working anime (e.g., 5998 赛马娘 芦毛灰姑娘 第2部分) - Result: No regression
- [x] Verify no regression for existing titles

### 6. Validate Proposal
- [x] Run `npx openspec validate fix-unknown-anime-titles --strict` - Result: Valid
- [x] Fix any validation errors
- [x] Ensure all required fields are present

## Dependencies
- Task 1 must complete before Task 2
- Task 2 must complete before Task 3
- Task 3 must complete before Task 4
- Task 4 must complete before Task 5
- Task 5 must complete before Task 6

## Validation Criteria
- [x] Anime ID 6001 returns "不擅吸血的吸血鬼" (Previously: "【未知动画】")
- [x] Anime ID 6010 returns "明明只是暗杀者，我的面板数值却比勇者还要强" (Previously: "【未知动画】")
- [x] No regression for anime that already work
- [x] All OpenSpec validation checks pass

## Implementation Summary

**Changes Made to `cycani-proxy/src/server.js`:**

1. **Improved Strategy 1** (lines 1246-1260):
   - Removed hardcoded "间谍过家家" check
   - Added generic regex patterns:
     - `^(.+?)_第\d+集_` for watch pages (e.g., `不擅吸血的吸血鬼_第01集_TV番组...`)
     - `^(.+?)_TV番组` for detail pages (e.g., `不擅吸血的吸血鬼_TV番组...`)
   - Now works for all anime, not just specific ones

2. **Updated Strategy 3** (lines 1265-1279):
   - Added `.this-title` selector (most reliable)
   - Added `.player-title-link` selector (reliable)
   - Added `h2 .player-title-link` selector (alternative)
   - CSS selectors now include working selectors from cycani.org

3. **Added Strategy 5** (lines 1301-1323):
   - Extracts title from `player_aaaa.vod_data.vod_name` JavaScript object
   - Decodes Unicode escape sequences (e.g., `\u4e0d` → `不`)
   - Provides robust fallback when HTML parsing fails

4. **Updated logging**:
   - Strategy 1 now logs "🎯 策略1: 从页面标题提取: {title}"
   - Strategy 4 now logs "🎯 策略4: 使用硬编码标题修复动画ID {id}: {title}"
   - Strategy 5 logs "🎯 策略5: 从JavaScript对象提取: {title}"
   - Final result now shows "🎯 5步策略解析结果: {title} (策略{n})"

## Test Results

| Anime ID | Expected Title | Result | Strategy Used |
|----------|---------------|--------|---------------|
| 6001 | 不擅吸血的吸血鬼 | ✅ Correct | Strategy 1 |
| 6010 | 明明只是暗杀者，我的面板数值却比勇者还要强 | ✅ Correct | Strategy 1 |
| 5998 | 赛马娘 芦毛灰姑娘 第2部分 | ✅ No Regression | Strategy 1 |
