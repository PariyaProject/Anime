# Anime Detail Page

## Objective

Introduce a dedicated anime detail page that sits between homepage discovery and playback, so users can inspect title information, episode scope, and next actions before entering the watch view. This should reuse the existing backend detail endpoint in `backend/src/routes/anime.js:876`, the frontend detail-fetching service in `frontend/src/services/anime.service.ts:31`, and the already-consumed metadata patterns from `frontend/src/views/WatchView.vue:266`, instead of forcing users to jump directly from list cards into playback as they do today through `frontend/src/components/anime/AnimeCard.vue:3` and `frontend/src/router/index.ts:3`.

## Status

Implemented for the current scope. The dedicated detail route, core page layout, homepage/detail navigation split, progress-aware actions, and basic verification have landed. The originally proposed "加入想看" action is intentionally deferred and is not part of this phase.

## Implementation Plan

- [x] 1. Add a new `/anime/:animeId` route and standalone detail view so the app has a stable place for title-level information before playback. The current router only exposes Home, Watch, and History in `frontend/src/router/index.ts:3`, which means list browsing and content evaluation are compressed into a single step. The new route should become the default navigation target from cards, weekly schedule items, and other title-level entry points.

- [x] 2. Define the detail page around the data already available from the backend detail API and avoid inventing a second metadata source. The backend returns `title`, `cover`, `type`, `year`, `description`, `episodes`, `totalEpisodes`, and `totalSeasons` in `backend/src/routes/anime.js:1110`, and the frontend types already model those fields in `frontend/src/types/anime.types.ts:35`. The page should be designed to degrade gracefully when score, status, or genres are empty because those fields are currently sparse.

- [x] 3. Create a clear hero section that helps the user decide whether to watch now. The hero should present cover, title, type, year, total episode count, and a short description using the same metadata fields already surfaced in the watch page sidebar at `frontend/src/views/WatchView.vue:97`. It should also include primary actions such as “立即播放” and “继续观看” with action priority based on whether the user has existing watch progress. The originally proposed “加入想看” action is deferred from this phase.

- [x] 4. Add a detail-page episode section that emphasizes starting points instead of exposing only a raw numeric grid. The backend detail response already provides structured episode entries in `frontend/src/types/anime.types.ts:28`, while the watch page currently reduces selection to a compact grid in `frontend/src/views/WatchView.vue:118`. The detail page should support first-episode entry, continue-watching entry, and a readable episode list that can scale for longer series without overwhelming mobile users.

- [x] 5. Connect detail-page actions to the existing watch-history state so the page feels personalized immediately. Continue-watching data is already available on the homepage and navbar through grouped history flows in `frontend/src/views/HomeView.vue:3` and `frontend/src/components/layout/AppNavbar.vue:18`. The detail page should use the same progress signals to show whether the user has watched this title before, what the next episode is, and whether they should resume or start fresh.

- [x] 6. Update homepage and card navigation so title clicks and play clicks serve different intents. At present the anime card click target and button both trigger direct playback in `frontend/src/components/anime/AnimeCard.vue:3`. The new interaction model should reserve the card surface for “查看详情”, keep an explicit quick-play action for fast users, and ensure weekly schedule cards and continue-watching surfaces choose the right destination based on user intent.
Current state: homepage cards and weekly schedule entries now open detail pages by default, cards keep a separate quick-play button, and continue-watching surfaces intentionally remain direct-to-playback.

- [x] 7. Keep the watch page focused on playback by moving title-evaluation responsibilities out of it. The current watch page mixes player concerns with metadata, progress, and episode browsing in `frontend/src/views/WatchView.vue:38`. Once the detail page exists, the watch page should continue to show essential context, but it no longer needs to shoulder the full burden of discovery and selection for first-time viewers.
Current state: the watch page now links back to the detail page and remains intentionally dual-purpose for playback plus lightweight context in this phase, rather than being reduced further.

- [x] 8. Design the detail page for incomplete metadata and network failure as a first-class case. The backend currently defaults several fields such as `score`, `status`, and `genres` when scraping does not find richer information in `backend/src/routes/anime.js:1116`. The page should have intentional empty states, loading skeletons, and fallback copy so it still feels polished even when the upstream source is inconsistent.

- [x] 9. Add lightweight SEO-style and sharing improvements inside the SPA shell where practical. Even if this remains a client-rendered app, the detail route should still set a more useful document title and expose clearer route semantics than the generic playback title handling currently set in `frontend/src/router/index.ts:38`. This improves browser history readability and makes the app feel more complete.

- [x] 10. Validate the detail page as the first phase of the broader UX roadmap before layering on recommendations or a full personal library. This page is the highest-leverage missing surface because it improves user confidence, supports future recommendation blocks, and reduces pressure on the watch page without requiring a major backend redesign.

## Verification Criteria

- [x] The app has a dedicated route for anime details, separate from the watch page.
- [x] Homepage and recommendation-style entry points can send users to a detail page without breaking existing quick-play flows.
- [x] The detail page renders usefully with only the fields currently guaranteed by the backend detail endpoint.
- [x] Users with existing progress can clearly resume from the detail page instead of manually finding the next episode.
- [x] The watch page remains focused on playback and no longer acts as the only place to understand a title.

## Potential Risks and Mitigations

1. **The detail page could feel redundant if it simply mirrors the watch page sidebar without adding decision value.**
   Mitigation: treat the detail page as a title-level planning surface with stronger actions, richer episode context, and clearer progress entry points instead of a visual copy of watch metadata.

2. **Sparse upstream metadata may make some titles look unfinished or inconsistent.**
   Mitigation: design the layout around the fields that are reliably present today and make optional blocks disappear cleanly when score, genres, or status are missing.

3. **Changing card navigation can frustrate users who are used to immediate playback.**
   Mitigation: preserve an explicit quick-play button while shifting the larger card click target to detail, so both intent paths remain available.

4. **Adding one more route can increase implementation scope if every existing entry surface is changed at once.**
   Mitigation: roll out navigation changes in phases, starting with homepage cards and weekly schedule items, then expand to other surfaces after validating the detail page flow.

## Alternative Approaches

1. **Modal detail preview:** show title information in a homepage modal instead of adding a route. This is faster to ship, but weaker for deep linking, browser history, and future expansion.
2. **Expand the watch page only:** keep a two-page app and make the watch page do more. This avoids new routing work, but it keeps playback and title evaluation tightly coupled.
3. **Quick-play as default, details as secondary link:** preserve current behavior and add a small “详情” affordance. This is lower risk for habitual users, but it under-delivers on the product gap because the main navigation path still skips the missing decision layer.
