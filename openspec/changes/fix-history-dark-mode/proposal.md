# Change: Fix History Page Dark Mode Styling

## Why

The History page (`/history`) does not support dark mode. When dark mode is enabled, the page continues to display with white backgrounds and black text, while the Home page and Watch page correctly switch to dark styling. This creates an inconsistent user experience.

The root cause is that `HistoryView.vue` uses Bootstrap CSS classes (`card`, `card-body`, `form-control`, etc.) which are not integrated with the project's CSS variable-based dark mode system. In contrast, `HomeView.vue` and `WatchView.vue` use custom CSS with CSS variables (`--bg-primary`, `--text-primary`, etc.) that respond to the `.dark-mode` class on `document.documentElement`.

## What Changes

- Replace Bootstrap classes in `HistoryView.vue` with semantic class names
- Add scoped CSS styles using CSS variables for all components
- Ensure all colors (background, text, borders, buttons, progress bars, badges) respond to dark mode
- Maintain existing functionality (search, filter, sort, pagination)

## Impact

- Affected specs: `frontend-ux`
- Affected code: `cycani-proxy/frontend/src/views/HistoryView.vue`
- No API or backend changes required
- No breaking changes to functionality
