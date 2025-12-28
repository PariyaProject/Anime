## 1. Implementation

- [ ] 1.1 Modify `AnimeCard.vue` to conditionally render metadata badges (only show when data exists)
- [ ] 1.2 Remove the "查看详情" button and its `handleDetails` event handler from `AnimeCard.vue`
- [ ] 1.3 Remove the unused `@details` event binding from `HomeView.vue`
- [ ] 1.4 Remove the unused `handleViewDetails` function from `HomeView.vue`
- [ ] 1.5 Update unit tests in `AnimeCard.test.ts` to reflect the new UI behavior

## 2. Testing

- [ ] 2.1 Verify anime cards with complete metadata still display all badges correctly
- [ ] 2.2 Verify anime cards with missing metadata hide the badges entirely
- [ ] 2.3 Verify the single "选择播放" button correctly navigates to the Watch page
- [ ] 2.4 Run all unit tests to ensure no regressions
- [ ] 2.5 Manual verification in browser
