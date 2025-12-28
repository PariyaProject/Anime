# Change: Refactor Anime Card UI - Hide Empty Metadata, Consolidate Buttons, and Fix Grid Layout

## Why

The current anime card UI has several usability issues:

1. **Placeholder metadata**: Displays "TV", "未知", "未知集" even when source data doesn't exist, creating visual clutter
2. **Duplicate buttons**: "选择播放" and "查看详情" perform identical actions - redundancy wastes UI space
3. **Uneven grid**: 48 items per page with 5 items per row creates 9.6 rows, leaving 2 empty slots on the last row (48 ÷ 5 = 9 R 3)

## What Changes

- Hide anime metadata badges (type, year, episode count) when the data is not available from the source
- Remove the "查看详情" button since it performs the same action as "选择播放"
- Adjust grid layout: change xl breakpoint from 5 to 6 items per row (48 ÷ 6 = 8 full rows, no gaps)
- Simplify the anime card interface to show only meaningful information

## Impact

- Affected specs: `frontend-ui` (new capability)
- Affected code:
  - `frontend/src/components/anime/AnimeCard.vue` (metadata display and button rendering)
  - `frontend/src/views/HomeView.vue:94` (grid layout: `row-cols-xl-5` → `row-cols-xl-6`)
  - `frontend/src/components/anime/AnimeCard.test.ts` (test updates)
