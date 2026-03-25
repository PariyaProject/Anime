# Website Experience Optimization

## Objective

Define a staged product and UX improvement roadmap that strengthens discovery, decision-making, playback resilience, and long-term retention without disrupting the current watch flow. The current app already supports homepage browsing, playback, and history, but it still routes users directly from list cards into playback with no dedicated detail layer, limited discovery surfaces, and light-weight history management; the plan should prioritize the highest-leverage gaps first based on the existing structure in `frontend/src/router/index.ts:3`, `frontend/src/components/anime/AnimeCard.vue:1`, `frontend/src/views/HomeView.vue:1`, `frontend/src/views/WatchView.vue:1`, and `frontend/src/views/HistoryView.vue:1`.

## Implementation Plan

- [ ] 1. Add a dedicated anime detail experience between listing and playback so users can understand a title before committing to watch it. The current router exposes only Home, Watch, and History routes in `frontend/src/router/index.ts:3`, while list cards in `frontend/src/components/anime/AnimeCard.vue:1` only emit a direct “play” action. This phase should introduce a detail route and view, define how cards and weekly schedule items navigate there, and present the data already available from the backend detail endpoint instead of forcing the play page to double as the only information surface.

- [ ] 2. Expand the homepage from a searchable archive into a discovery-oriented landing page. Today the homepage mainly consists of continue-watching, weekly schedule, filters, and a paginated grid in `frontend/src/views/HomeView.vue:3`. This phase should add recommendation-style sections such as recently updated, high-score picks, newly added titles, and fast-return shelves, while preserving the existing filter/search workflow so the page supports both browsing intent and precise retrieval intent.

- [ ] 3. Turn the current history page into a personal library layer that supports ongoing usage, not just raw record viewing. The existing history page in `frontend/src/views/HistoryView.vue:25` is limited to search, basic status filtering, and resume actions over flattened watch records. This phase should define additional list states such as favorites, watchlist, completed archive, and grouped title management, plus lightweight bulk actions and clearer differentiation between synced and local-only progress so the site better supports long-term use.

- [ ] 4. Improve playback-state communication and failure recovery on the watch page. The watch view already supports direct media playback, iframe fallback, autoplay toggling, and progress tracking in `frontend/src/views/WatchView.vue:38`, but the current experience still leaves technical choices such as player mode exposed in settings and provides only a generic no-source state. This phase should design clearer playback status messaging, automatic recovery guidance, source-switching UX, and better contextual messaging around refreshes, fallback mode, and episode continuity so failures feel recoverable instead of opaque.

- [ ] 5. Optimize mobile-first watch interactions and episode navigation. The current theater layout in `frontend/src/views/WatchView.vue:38` prioritizes a desktop split panel with video, metadata, progress, and a dense episode grid. This phase should identify a mobile-specific structure for collapsing metadata, improving one-handed episode switching, keeping progress visible without crowding the screen, and preserving core actions like previous/next episode and autoplay in smaller viewports.

- [ ] 6. Clarify global navigation and state awareness in the header and surrounding shell. The navbar in `frontend/src/components/layout/AppNavbar.vue:1` currently mixes channel selection, continue-watching, server state, theme mode, and player mode into compact dropdowns. This phase should simplify the information architecture, decide which controls belong in global navigation versus page-level context, and surface more user-centered signals such as “what changed since last visit” or “where to continue next” rather than relying on technical settings as primary navigation value.

- [ ] 7. Standardize UX and data contracts needed to support these new surfaces without fragmenting behavior. Existing screens already share anime covers, placeholders, route-driven state, and history-derived data across multiple components such as `frontend/src/views/HomeView.vue:199`, `frontend/src/views/WatchView.vue:166`, and `frontend/src/views/HistoryView.vue:137`. This phase should define reusable view-models, shared UI patterns, empty/error/loading language, and image/fallback rules so the new detail, library, and recommendation surfaces feel coherent and do not duplicate inconsistent logic.

- [ ] 8. Roll out the improvements in value-ranked phases to reduce delivery risk. Based on the current state, the recommended order is: anime detail page first, homepage discovery second, history/library upgrade third, playback recovery UX fourth, and broader mobile/navigation refinement fifth. Each phase should include an explicit success metric and a narrow release surface so that improvements can be validated incrementally without destabilizing the watch path that already works today.

## Verification Criteria

- [ ] The roadmap clearly separates short-term, medium-term, and later-stage product work, and each phase can be executed without blocking unrelated improvements.
- [ ] Every proposed improvement maps back to a current code surface or user-flow gap documented in the existing frontend routes and views.
- [ ] The highest-priority work improves user decision-making before playback, not only visual polish.
- [ ] The plan preserves the current functioning watch flow while identifying where new navigation and data surfaces should be inserted.
- [ ] The roadmap gives a future implementation pass enough detail to start building features without needing to rediscover the product rationale.

## Potential Risks and Mitigations

1. **The plan could over-index on new surfaces while underestimating the fragility of the playback path.**
   Mitigation: keep playback recovery and watch-flow stability as a standing requirement in every phase, and avoid shipping discovery-oriented features that increase navigation complexity before confirming the play path still feels fast and dependable.

2. **Adding detail, library, and recommendation layers could duplicate backend fetching logic or produce inconsistent anime metadata across views.**
   Mitigation: define shared frontend data contracts and reusable loading/error states early, then align new screens around the existing detail and list endpoints before introducing new APIs.

3. **Homepage and navigation improvements may become visually denser without improving clarity, especially on mobile.**
   Mitigation: treat mobile layout and information hierarchy as explicit design constraints in each phase rather than as final polish.

4. **History, favorites, and watchlist concepts can blur together and confuse users if the information architecture is not intentional.**
   Mitigation: define the semantics of each collection up front and reserve history for passive tracking while using separate “saved” states for active intent.

## Alternative Approaches

1. **Playback-first optimization only:** focus exclusively on the watch page, player recovery, and performance before adding detail or library features. This is lower risk for engineering effort, but it leaves the site weak in discovery and reduces the chance of improving overall session depth.
2. **Content-discovery-first redesign:** prioritize homepage sections, detail pages, and recommendation shelves before refining history or player UX. This can make the site feel richer quickly, but it risks sending more users into a playback experience that still lacks the clearest recovery and state messaging.
3. **Library-centric approach:** prioritize favorites, watchlist, and progress management before broader discovery changes. This is best for repeat users, but it delivers less value to first-time visitors who still need better title evaluation and navigation cues.
