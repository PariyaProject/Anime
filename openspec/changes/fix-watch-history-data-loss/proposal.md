# Proposal: Fix Watch History Data Loss Issues

## Summary

Fix critical bugs causing watch history data loss:
1. **100-record hard limit** causing automatic deletion of old entries
2. **Event listener leak** causing duplicate history save requests
3. **Missing animeId** causing save failures during route transitions
4. **Frontend display limitation** (only 4 items shown)

## Problem Statement

### Issue 1: 100-Record Hard Limit (Backend)
**Location**: `cycani-proxy/src/server.js:380-381`

```javascript
// 限制历史记录数量（保留最近100条）
if (userHistory.watchHistory.length > 100) {
    userHistory.watchHistory = userHistory.watchHistory.slice(0, 100);
}
```

**Impact**: When total watch history exceeds 100 records, the oldest records are **permanently deleted** without user consent.

**User Feedback**: "我之前也没看过超过一百条记录他也没了" - User reported losing history even with fewer than 100 records, indicating this is a UX issue.

### Issue 2: Event Listener Leak (Frontend)
**Location**: `cycani-proxy/frontend/src/views/WatchView.vue:717-720`

```javascript
window.addEventListener('visibilitychange', handlePageHide)
window.addEventListener('pagehide', handlePageHide)
window.addEventListener('beforeunload', handlePageHide)
```

These listeners are **never removed** in `onUnmounted`, causing:
- Multiple listeners accumulate when switching between episodes
- Switching tabs triggers all accumulated listeners
- Multiple simultaneous save requests

**User Feedback**: "当我切换tab页的时候也就是标签页的时候我会发现他突然请求了很多次历史提交"

### Issue 3: Missing animeId During Route Transitions
**Location**: `cycani-proxy/frontend/src/views/WatchView.vue:160`

```javascript
const animeId = computed(() => route.params.animeId as string)
```

During route transitions (e.g., clicking "next episode"), the computed property may temporarily return `undefined` or `"undefined"` (string), causing save failures:

```
❌ Invalid animeInfo: missing animeId {
  title: '一拳超人 第三季',
  cover: '/api/image-proxy?url=...'
}
```

### Issue 4: Frontend Display Limitation
**Location**: `cycani-proxy/frontend/src/views/HomeView.vue:10`

```vue
<GroupedContinueWatchingCard
  v-for="anime in groupedAnime.slice(0, 4)"
  :key="`${anime.animeId}-${anime.season}`"
  :anime="anime"
  @resume="resumeWatching"
/>
```

Only the first 4 grouped anime are shown, with no scroll container.

## Proposed Solution

### Fix 1: Remove 100-Record Limit (Backend)
- **Remove** the hard limit in `WatchHistoryManager.addToWatchHistory()`
- Keep the limit as an optional config setting for future use
- Add logging when history grows large (for monitoring)

### Fix 2: Fix Event Listener Leak (Frontend)
- Store listener references for removal
- Add `removeEventListener` calls in `onUnmounted`
- Ensure cleanup happens even if component errors

### Fix 3: Cache animeId to Prevent Loss (Frontend)
- Store `animeId` in a `ref` on component mount
- Use cached value in all save operations
- Prevents route transition timing issues

### Fix 4: Add Scroll Container for Continue Watching (Frontend)
- Remove `.slice(0, 4)` limitation
- Add scrollable container with max-height
- Show all grouped anime with smooth scrolling

## Questions

1. **Should we completely remove the limit or increase it significantly?**
   - Option A: Remove entirely (true permanent storage)
   - Option B: Increase to 1000 or 10000 (practically unlimited)

2. **Should we add pagination for the history page instead of infinite scroll?**
   - Currently `getWatchHistory()` limits to 20 items
   - Could add client-side pagination

## Related Changes

- **investigate-watch-history-deletion**: Initial investigation proposal
- **fix-watch-history-animeid-bug**: Related animeId bug proposal

## References

- Backend: `cycani-proxy/src/server.js` lines 379-382
- Frontend WatchView: `cycani-proxy/frontend/src/views/WatchView.vue`
- Frontend HomeView: `cycani-proxy/frontend/src/views/HomeView.vue`
- History Store: `cycani-proxy/frontend/src/stores/history.ts`
