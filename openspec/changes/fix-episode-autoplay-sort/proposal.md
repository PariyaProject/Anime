# Change: Fix Episode Autoplay Sorting Bug

## Why

The auto-play next episode feature was incorrectly jumping from episode 1 to episode 11 instead of episode 2.

**User Report:**
"目前这个自动连续播放功能就是当第一集看完之后会自动跳转到下一集播放，我发现第一集播放完之后它会跳转到第十一集播放我怀疑这个排序是有问题的哦"

Translation: "Currently, the auto-play feature plays the next episode after finishing one. I found that after finishing episode 1, it jumps to episode 11. I suspect there is a sorting problem."

**Root Cause Analysis:**

The backend API (`/api/episode/:animeId/:season/:episode`) returns episode data with `season` and `episode` as **strings** (from URL parameters). The frontend was directly assigning these string values to `episode.value` without type conversion.

**The Bug:**
```javascript
episode.value = '1'  // string from API
episode.value + 1    // '1' + 1 = '11' (string concatenation, not addition!)
```

This caused `playNext()` to perform string concatenation (`'1' + 1 = '11'`) instead of numeric addition (`1 + 1 = 2`).

**Actual Data Flow:**
```
Backend: URL params → req.params.episode = '1' (string)
Frontend: data.episode = '1' → episode.value = '1' (string)
playNext(): episode.value + 1 = '1' + 1 = '11' ❌
```

## What Changes

- **Fix type conversion**: Convert backend `data.season` and `data.episode` (strings) to numbers before assigning to refs
- **Ensure numeric operations**: `episode.value + 1` now correctly performs numeric addition
- **Sync jumpEpisode**: Ensure `jumpEpisode.value` is also updated with numeric value

## Impact

- **Affected specs**:
  - `watch-progress` (spec delta updated)
- **Affected code**:
  - `cycani-proxy/frontend/src/views/WatchView.vue:315-318` (loadEpisode type conversion)
  - `cycani-proxy/frontend/src/views/WatchView.vue:769-776` (route query watcher)

## Technical Context

**Before (Broken):**
```typescript
episode.value = data.episode  // '1' (string)
playNext() { selectEpisode(episode.value + 1) }  // '1' + 1 = '11'
```

**After (Fixed):**
```typescript
episode.value = Number(data.episode)  // 1 (number)
playNext() { selectEpisode(episode.value + 1) }  // 1 + 1 = 2
```

## Dependencies

- No new dependencies required
- No API changes required
- Pure frontend type safety fix

## Success Criteria

- Episode 1 correctly auto-plays to episode 2 (not episode 11)
- Episode 11 correctly auto-plays to episode 12 (not episode 111)
- Manual "下一集" button works correctly
- Auto-play at video end works correctly
