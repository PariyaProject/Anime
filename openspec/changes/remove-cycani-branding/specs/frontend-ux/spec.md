## ADDED Requirements

### Requirement: Generic Branding Display
The frontend SHALL display simplified, generic branding without references to "次元城动画" (Cycani Animation).

#### Scenario: Website title uses generic branding
- **GIVEN** the application loads
- **WHEN** the user views the browser tab title
- **THEN** the title SHALL display "动画" instead of "Cycani - 次元城动画"

#### Scenario: Navigation bar displays simplified brand
- **GIVEN** the navigation bar is rendered
- **WHEN** the user views the brand link
- **THEN** the brand text SHALL display "动画" instead of "次元城动画"
- **AND** the aria-label SHALL say "动画 首页" instead of "次元城动画 首页"

#### Scenario: Footer copyright is generic
- **GIVEN** the footer is rendered
- **WHEN** the user views the copyright text
- **THEN** the copyright SHALL NOT mention "次元城动画网站"
- **AND** the text SHALL use generic copyright wording

#### Scenario: Page titles use simplified format
- **GIVEN** a user navigates to any page
- **WHEN** no specific page title is set
- **THEN** the document title SHALL default to "动画" instead of "Cycani - 次元城动画"

### Requirement: Clean Anime Episode Titles
The backend SHALL strip all branding suffixes from scraped anime episode titles.

#### Scenario: Remove branding from detail page titles
- **GIVEN** the source website has a title like "不擅吸血的吸血鬼_TV番组 - 次元城动画 - 海量蓝光番剧免费看！"
- **WHEN** the server scrapes the anime information
- **THEN** the stored title SHALL be "不擅吸血的吸血鬼" without any branding suffix

#### Scenario: Remove branding from play page titles
- **GIVEN** the source website has a title like "不擅吸血的吸血鬼_第01集_TV番组 - 次元城动画 - 海量蓝光番剧免费看！"
- **WHEN** the server scrapes the episode information
- **THEN** the stored episode title SHALL be "不擅吸血的吸血鬼_第01集" without the branding suffix

#### Scenario: Handle various title formats
- **GIVEN** the source website title contains "_TV番组" followed by any branding text
- **WHEN** the server processes the title
- **THEN** everything from "_TV番组" onwards SHALL be removed
- **AND** the result SHALL be trimmed of whitespace
