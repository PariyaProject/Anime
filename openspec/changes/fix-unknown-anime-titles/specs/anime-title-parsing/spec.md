# anime-title-parsing Specification

## Purpose
Defines requirements for extracting anime titles from cycani.org HTML pages. The backend must reliably parse anime titles to ensure correct display in the frontend and proper storage in watch history.

## Scope
- Backend title extraction from cycani.org anime detail pages
- `/api/anime/:animeId` endpoint response
- Fallback strategies for various HTML structures

## ADDED Requirements

### Requirement: Generic Title Tag Extraction

The backend SHALL extract anime titles from the HTML `<title>` tag using a generic regex pattern that works for all anime.

#### Scenario: Extract title from standard title tag format
- **WHEN** the cycani.org page title follows the format `{animeTitle}_第{episode}集_TV番组 - 次元城动画...`
- **THEN** the backend SHALL extract the anime title using regex `^(.+?)_第\d+集_`
- **AND** the extracted title SHALL NOT include the episode indicator or suffix
- **AND** the title SHALL be trimmed of whitespace

#### Scenario: Handle titles with special characters
- **WHEN** the anime title contains special characters (punctuation, numbers, symbols)
- **THEN** the regex SHALL correctly capture the complete title including special characters
- **AND** the extraction SHALL NOT fail or truncate the title

#### Scenario: Non-standard title format
- **WHEN** the page title does not match the expected format
- **THEN** the backend SHALL fall back to the next strategy in the chain
- **AND** SHALL NOT use an incorrect or partial title

### Requirement: JavaScript Object Title Extraction

The backend SHALL extract anime titles from the `player_aaaa.vod_data.vod_name` JavaScript object as a fallback strategy.

#### Scenario: Extract title from player_aaaa object
- **WHEN** the page contains a `player_aaaa` JavaScript object with `vod_data.vod_name`
- **AND** the value contains Unicode-escape sequences (e.g., `\u4e0d\u64c5...`)
- **THEN** the backend SHALL decode the Unicode escape sequences
- **AND** the decoded title SHALL be returned as a UTF-8 string
- **AND** the title SHALL match the anime's official title

#### Scenario: Handle malformed Unicode sequences
- **WHEN** the Unicode escape sequences are malformed or incomplete
- **THEN** the backend SHALL catch the decoding error
- **AND** SHALL fall back to the next strategy or return '未知动画'

### Requirement: CSS Selector Title Extraction

The backend SHALL attempt to extract titles from HTML elements using CSS selectors.

#### Scenario: Extract from .this-title element
- **WHEN** the page contains a `<div class="this-title">` or similar element
- **THEN** the backend SHALL extract the text content
- **AND** the extracted text SHALL be trimmed
- **AND** SHALL NOT include HTML tags or attributes

#### Scenario: Extract from .player-title-link element
- **WHEN** the page contains a link with class `player-title-link`
- **THEN** the backend SHALL extract the link text
- **AND** the extracted text SHALL be trimmed of whitespace

#### Scenario: Try multiple selectors in order
- **WHEN** the first CSS selector fails to find an element
- **THEN** the backend SHALL try the next selector in the list
- **AND** SHALL continue until a valid title is found or all selectors are exhausted

### Requirement: Strategy Fallback Chain

The backend SHALL implement a prioritized fallback chain for title extraction.

#### Scenario: Execute strategies in priority order
- **WHEN** extracting an anime title
- **THEN** the backend SHALL try strategies in this order:
  1. Generic title tag regex (most reliable)
  2. Generic H1 tag text
  3. CSS selectors (expanded list)
  4. Hardcoded fixes (special cases)
  5. JavaScript object parsing (robust fallback)
- **AND** the first successful strategy SHALL be used
- **AND** subsequent strategies SHALL NOT be executed

#### Scenario: Log strategy used for debugging
- **WHEN** a title is successfully extracted
- **THEN** the backend SHALL log which strategy was used
- **AND** the log SHALL include the strategy number and extracted title
- **EXAMPLE:** `🎯 策略1: 从页面标题提取: 不擅吸血的吸血鬼`

### Requirement: Final Fallback Behavior

The backend SHALL return '未知动画' only when all strategies fail.

#### Scenario: All strategies fail
- **WHEN** all 5 strategies fail to extract a valid title
- **THEN** the backend SHALL return '未知动画'
- **AND** strategy used SHALL be recorded as 0

#### Scenario: Valid title found by any strategy
- **WHEN** any strategy successfully extracts a non-empty title
- **AND** the title is not '未知动画'
- **THEN** the extracted title SHALL be returned
- **AND** the '未知动画' fallback SHALL NOT be used

### Requirement: Known Anime Titles

The backend SHALL support hardcoded title fixes for specific anime IDs when automatic parsing consistently fails.

#### Scenario: Hardcoded fix for anime ID 5998
- **WHEN** animeId is '5998' (间谍过家家)
- **AND** all automatic strategies fail
- **THEN** the backend SHALL return '间谍过家家 第三季' as hardcoded title
- **AND** this SHALL be considered Strategy 4

#### Scenario: No hardcoded fix for other anime
- **WHEN** animeId is not in the hardcoded fix list
- **AND** all automatic strategies fail
- **THEN** the backend SHALL proceed to Strategy 5 (JavaScript object)
- **AND** SHALL NOT return a hardcoded title

## Non-Functional Requirements

### Performance
- Title extraction SHALL complete within 100ms per request
- The regex-based title tag extraction SHALL be tried first (fastest method)
- CSS selector queries SHALL be limited to 12 selectors maximum

### Maintainability
- New CSS selectors MAY be added to the selector list without changing the algorithm
- The regex pattern SHALL be documented with examples
- Each strategy SHALL have clear logging for debugging

### Backward Compatibility
- Existing API response format SHALL NOT change
- Anime that already work correctly SHALL continue to work
- No database migration is required (data format unchanged)

## Validation Criteria

### Test Cases
1. Anime ID 6001 returns "不擅吸血的吸血鬼" (not "【未知动画】")
2. Anime ID 6010 returns "明明只是暗杀者，我的面板数值却比勇者还要强" (not "【未知动画】")
3. Anime ID 5998 returns "间谍过家家 第三季" (no regression)
4. Random anime IDs return valid titles or '未知动画' if truly unavailable
5. Strategy logging shows which method was used for each anime

### Acceptance Tests
- Given any cycani.org anime detail page URL
- When the backend `/api/anime/:id` endpoint is called
- Then the response includes a valid `title` field
- And the title is not '未知动画' unless the page truly lacks title information
- And the strategy used is logged for debugging
