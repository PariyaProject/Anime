/**
 * Lighthouse CI Configuration
 *
 * Run Lighthouse audit:
 * npm run lighthouse
 *
 * Or with custom URL:
 * npm run lighthouse -- http://127.0.0.1:3000
 *
 * This configuration audits the Vue.js frontend for performance,
 * accessibility, best practices, and SEO.
 */

module.exports = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    // Emulate a desktop screen
    formFactor: 'desktop',
    // Use a slower throttling to ensure consistency
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
    // Skip h audit about domain trust
    skips: ['uses-http2'],
  },
}
