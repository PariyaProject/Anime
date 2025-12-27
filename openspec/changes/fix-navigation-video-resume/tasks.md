## 1. Implementation

- [ ] 1.1 Add unique key to router-view in App.vue to force component remount on navigation
- [ ] 1.2 Test navigation from WatchView → Home → Continue Watching
- [ ] 1.3 Verify Plyr player re-initializes correctly after navigation
- [ ] 1.4 Confirm saved position is applied after re-initialization
- [ ] 1.5 Test multiple navigation cycles to ensure stability
- [ ] 1.6 Remove unnecessary route watcher code if key-based approach is successful

## 2. Verification

- [ ] 2.1 Test "Continue Watching" from home page with existing saved position
- [ ] 2.2 Test direct navigation to watch page with saved position
- [ ] 2.3 Test navigation between different episodes
- [ ] 2.4 Test navigation to the same episode from different sources
- [ ] 2.5 Verify no console errors during navigation
- [ ] 2.6 Test with both iframe player and Plyr player scenarios

## 3. Edge Cases

- [ ] 3.1 Test rapid navigation (clicking "Continue Watching" multiple times quickly)
- [ ] 3.2 Test navigation while video is playing
- [ ] 3.3 Test navigation with saved position at 0 (new episode)
- [ ] 3.4 Test navigation with saved position near end (completed episode)
- [ ] 3.5 Test with network delays (slow API responses)
