# Proposal: Fix Continue Watching Sync and Text Overflow Issues

## Summary

Fix two issues affecting the continue watching feature:
1. **Watch history not appearing immediately after starting playback** - When a user starts watching an episode and navigates back to homepage, the anime doesn't appear in "继续观看" (Continue Watching) section
2. **Long anime titles overflowing card boundaries** - In the Continue Watching section, anime titles exceed card width instead of being truncated with ellipsis

## Problem Statement

### Issue 1: Watch History Not Syncing on Navigation

**User Feedback**: "当我点开一部动画时它开始播放几秒钟后我再点击【动画】回到主页后发现没有刚才动画的观看历史（也就是在继续观看列表中没有找到它）"

**Root Cause Analysis**:

1. **play Event Has Condition** (`WatchView.vue:968-987`):
   ```javascript
   player.on('play', () => {
     if (currentTime.value > 0) {  // ⚠️ Problem: condition may fail on autoplay
       historyStore.savePositionImmediate(...)
     }
   })
   ```
   - When video first starts autoplaying, `currentTime` may be 0 or very small
   - The condition `if (currentTime.value > 0)` may not pass
   - No record is created on backend

2. **Navigation Events May Not Fire Reliably**:
   - `visibilitychange` can fire before video metadata loads
   - User may navigate away before triggering `play`/`pause` events
   - Backend sync is async, may not complete before user arrives at homepage

3. **Continue Watching Only Shows Backend Data**:
   - `useGroupedHistory` only processes data from `/api/continue-watching`
   - localStorage data is not included (even though it's saved locally)

### Issue 2: Text Overflow in Continue Watching Cards

**User Feedback**: "在主页中的继续观看列表中我发现有的动画名称很长，会导致文字等内容超出边框显示"

**Current Implementation** (`GroupedContinueWatchingCard.vue:15`):
```vue
<h6 class="card-title mb-1 text-truncate">{{ anime.animeTitle }}</h6>
```

**Bootstrap's `text-truncate` requires**:
- `white-space: nowrap`
- `overflow: hidden`
- `text-overflow: ellipsis`

**Missing** in current CSS:
- `.card-title` doesn't have overflow constraints
- Parent flex container needs `min-width: 0` to allow shrinking

## Proposed Solution

### Fix 1: Remove play Event Condition

Modify `WatchView.vue` play event handler to always save, including on first autoplay:

```javascript
player.on('play', () => {
  // Always save, including first autoplay
  historyStore.savePositionImmediate(
    { id: currentAnimeId.value, title: animeTitle.value, cover: animeCover.value },
    { season: season.value, episode: episode.value, title: episodeTitle.value, duration: duration.value },
    currentTime.value,
    0  // No threshold - always save on play
  )
})
```

### Fix 2: Add Router Navigation Guard

Use Vue Router's `onBeforeRouteLeave` in `WatchView.vue`:

```javascript
onBeforeRouteLeave((to, from, next) => {
  if (currentTime.value > 0) {
    historyStore.savePositionImmediate(...)
  }
  next()  // Don't block navigation
})
```

### Fix 3: Merge localStorage Data in Continue Watching

Modify `useGroupedHistory` composable to include localStorage-only entries:

- Read localStorage entries with key prefix `watch_position_`
- Merge with backend data, deduplicating by `${animeId}_${season}_${episode}`
- Add `isLocalOnly` flag to distinguish localStorage-only records
- Show "未同步" (Not Synced) badge for local-only entries

### Fix 4: Fix Text Overflow CSS

Add CSS rules to `GroupedContinueWatchingCard.vue`:

```css
.grouped-history-card .card-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0; /* Allow flex item to shrink */
}
```

Add `:title` attribute for tooltip:
```vue
<h6 class="card-title mb-1 text-truncate" :title="anime.animeTitle">
  {{ anime.animeTitle }}
</h6>
```

## Scope

### In Scope
- Modify `WatchView.vue` play event handler to remove condition
- Modify `WatchView.vue` to add router navigation guard
- Modify `useGroupedHistory.ts` composable to merge localStorage data
- Modify `GroupedContinueWatchingCard.vue` to fix text overflow CSS
- Add visual indicator for localStorage-only watch records

### Out of Scope
- Backend API changes
- Watch history data structure changes
- Other UI components (WeeklySchedule already works correctly)

## Impact

### Affected Specs
- `frontend-ux` - Grouped Continue Watching Display requirement

### Affected Code
- `cycani-proxy/frontend/src/views/WatchView.vue`
- `cycani-proxy/frontend/src/composables/useGroupedHistory.ts`
- `cycani-proxy/frontend/src/components/history/GroupedContinueWatchingCard.vue`

## Related Changes
- `improve-watch-progress-sync` - Event-driven save strategy (already implemented)
- `save-progress-on-url-refresh` - Backend save before URL refresh (already implemented)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| More frequent savePositionImmediate calls | Low | Existing deduplication logic prevents duplicate saves |
| Router guard may delay navigation | Low | Synchronous localStorage save is instant, async backend save doesn't block |
| localStorage data merge complexity | Medium | Use compound key for deduplication, prefer backend data |
| CSS changes may affect layout | Low | Bootstrap's `text-truncate` is well-tested |

## Open Questions

1. Should "未同步" badge be clickable to trigger manual sync? (Answer: No, keep it simple)
2. How long should we keep localStorage-only entries in the merged list? (Answer: 30 days, same as existing `LS_MAX_AGE`)
