# Improve Watch Progress Sync Strategy

## Summary

Replace the current interval-based (every 30 seconds) backend synchronization with an event-driven strategy that uses frontend localStorage as the primary storage and syncs to backend on specific user actions. This reduces unnecessary backend requests, improves reliability, and enables cross-device continuation.

## Motivation

### Current Issues
1. **Excessive Backend Requests**: Progress is saved to backend every 30 seconds via `setInterval`, regardless of user activity
2. **No Local Fallback**: If backend fails or user is offline, progress is lost
3. **Inefficient Network Usage**: Continuous polling wastes bandwidth and server resources
4. **No Event-Driven Saves**: Critical moments (page exit, manual seek, episode change) don't trigger immediate sync

### User Requirements
- Save progress to backend only on specific events:
  - Browser/tab close or navigation away
  - User manually seeks to a new position
  - User manually pauses or resumes playback
  - Automatic transition to next episode
- Use frontend localStorage as default progress storage
- Load with priority: Backend → Frontend localStorage → Start from 0

## Proposed Solution

### Event-Driven Synchronization
Replace `setInterval` with event listeners:
- **Page Visibility/BeforeUnload**: Sync when user leaves page
- **Video Seek Events**: Sync after user drags progress bar
- **Play/Pause Events**: Sync when user clicks play or pause button
- **Video Ended Event**: Sync when episode completes (before next episode loads)
- **Optional Fallback Interval**: Configurable backup interval (e.g., 5 minutes) for long sessions

### Hybrid Storage Strategy
- **Primary**: Frontend localStorage (fast, always available)
- **Secondary**: Backend API (cross-device sync)
- **Priority Load**: Check backend first, fall back to localStorage, default to 0

### Benefits
1. **Reduced Server Load**: From 2 requests/minute to ~3-5 requests per viewing session
2. **Better Offline Support**: localStorage works without network
3. **Immediate Persistence**: Critical actions trigger instant saves
4. **Cross-Device Sync**: Backend still enables continuation on other devices

## Scope

### In Scope
- Modify progress save logic in `WatchView.vue`
- Update `useHistory.ts` composable for event-driven saves
- Add localStorage caching layer in `history.service.ts`
- Implement priority loading in `loadEpisode()`
- Update `history.ts` store for hybrid storage

### Out of Scope
- Backend API changes (existing endpoints remain compatible)
- UI/UX changes (no visible behavior changes to user)
- Watch history records (only position tracking is modified)

## Related Changes
- `fix-player-progress-bar`: May have overlapping player state concerns
- Existing history service endpoints (`/api/last-position`, `/api/watch-history`)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| BeforeUnload event unreliable | Medium | Add visibilitychange + pagehide as fallback |
| localStorage quota exceeded | Low | Add error handling with fallback to memory-only |
| Race condition between saves | Low | Debounce rapid events, use last-write-wins |
| Lost progress if crash occurs | Low | Keep minimal fallback interval (5 min) |

## Open Questions

1. Should the fallback interval be configurable or disabled entirely?
2. Should we show sync status indicators to users?
3. How to handle conflicts when backend and localStorage both have data?
