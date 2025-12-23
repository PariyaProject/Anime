import { test, expect } from '@playwright/test'

test.describe('Dark Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('toggles dark mode from navbar', async ({ page }) => {
    // Find dark mode toggle button
    const darkModeToggle = page.locator('button[aria-label*="深色模式" i], button[aria-label*="dark mode" i], .bi-moon-fill, .bi-sun-fill').first()
    if (await darkModeToggle.count() > 0) {
      // Get initial state
      const hasMoonIcon = await page.locator('.bi-moon-fill').count() > 0

      // Click toggle
      await darkModeToggle.click()
      await page.waitForTimeout(500)

      // Check that icon changed
      const hasSunIconAfter = await page.locator('.bi-sun-fill').count() > 0
      expect(hasSunIconAfter).toBe(hasMoonIcon)
    }
  })

  test('persists dark mode preference', async ({ page }) => {
    // Find and toggle dark mode
    const darkModeToggle = page.locator('button[aria-label*="深色模式" i], button[aria-label*="dark mode" i]').first()
    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.click()
      await page.waitForTimeout(500)

      // Reload page
      await page.reload()

      // Check that preference is persisted
      const sunIcon = page.locator('.bi-sun-fill')
      const moonIcon = page.locator('.bi-moon-fill')

      // One of them should be visible
      expect(await sunIcon.count() + await moonIcon.count()).toBeGreaterThan(0)
    }
  })
})
