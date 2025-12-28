# Change: Refactor Anime Card UI - Hide Empty Metadata and Consolidate Buttons

## Why

The current anime card UI displays placeholder metadata ("TV", "未知", "未知集") even when the source website doesn't provide this information, creating visual clutter and confusion. Additionally, there are two buttons ("选择播放" and "查看详情") that perform identical actions, which is redundant and wastes UI space.

## What Changes

- Hide anime metadata badges (type, year, episode count) when the data is not available from the source
- Remove the "查看详情" button since it performs the same action as "选择播放"
- Simplify the anime card interface to show only meaningful information

## Impact

- Affected specs: `frontend-ui` (new capability)
- Affected code:
  - `frontend/src/components/anime/AnimeCard.vue` (metadata display and button rendering)
  - `frontend/src/views/HomeView.vue` (event handler cleanup)
  - `frontend/src/components/anime/AnimeCard.test.ts` (test updates)
