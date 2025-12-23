# Lighthouse Audits

This directory contains Lighthouse configuration and reports for performance, accessibility, best practices, and SEO audits.

## Running Lighthouse

### Option 1: Using npm script
```bash
# Start dev server first
npm run dev

# In another terminal, run Lighthouse
npm run lighthouse
```

### Option 2: Using Lighthouse CI (recommended)
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run with custom URL
lhci autorun --collect.url=http://localhost:5173
```

### Option 3: Using Chrome DevTools
1. Open Chrome and navigate to the app
2. Press F12 to open DevTools
3. Go to Lighthouse tab
4. Select categories to audit
5. Click "Generate report"

## Target Scores

| Category | Target | Current |
|----------|--------|---------|
| Performance | > 90 | TBD |
| Accessibility | > 90 | TBD |
| Best Practices | > 90 | TBD |
| SEO | > 90 | TBD |

## Notes

- Run audits on production builds for accurate results
- Network throttling affects Performance scores
- Mobile emulation affects Performance scores
- Accessibility checks include ARIA labels, color contrast, and screen reader support
