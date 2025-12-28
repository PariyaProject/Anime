## 1. Implementation

- [ ] 1.1 Modify `AnimeCard.vue` to conditionally render metadata badges (only show when data exists)
- [ ] 1.2 Remove the "查看详情" button and its `handleDetails` event handler from `AnimeCard.vue`
- [ ] 1.3 Remove the unused `@details` event binding from `HomeView.vue`
- [ ] 1.4 Remove the unused `handleViewDetails` function from `HomeView.vue`
- [ ] 1.5 Update grid layout in `HomeView.vue`: change `row-cols-xl-5` to `row-cols-xl-6`
- [ ] 1.6 Update unit tests in `AnimeCard.test.ts` to reflect the new UI behavior

## 2. Testing

- [ ] 2.1 Verify anime cards with complete metadata still display all badges correctly
- [ ] 2.2 Verify anime cards with missing metadata hide the badges entirely
- [ ] 2.3 Verify the single "选择播放" button correctly navigates to the Watch page
- [ ] 2.4 Verify grid displays 6 items per row on xl screens (1200px+), creating 8 full rows with 48 items
- [ ] 2.5 Verify responsive behavior remains correct on smaller screen sizes
- [ ] 2.6 Run all unit tests to ensure no regressions
- [ ] 2.7 Manual verification in browser
