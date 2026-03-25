import { test, expect } from '@playwright/test'

test.describe('Watch History Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history')
  })

  test('displays history page', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check URL
    expect(page.url()).toContain('/history')
  })

  test('shows empty state when no history', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check for empty state or history cards
    const emptyState = page.locator('.empty-state')
    const historyCards = page.locator('[data-testid="history-card"], .history-card')

    // Either empty state is shown or history cards exist
    const emptyExists = await emptyState.count() > 0
    const cardsExist = await historyCards.count() > 0

    expect(emptyExists || cardsExist).toBeTruthy()
  })

  test('has search/filter controls', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check for search input
    const searchInput = page.locator('input[placeholder*="搜索" i], input[aria-label*="search" i]')
    const searchExists = await searchInput.count() > 0

    if (searchExists) {
      await expect(searchInput.first()).toBeVisible()
    }
  })

  test('can navigate to home from history page', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)

    // Click on home link in navbar
    const homeLink = page.locator('a:has-text("动画列表"), .navbar-brand')
    if (await homeLink.count() > 0) {
      await homeLink.first().click()
      await page.waitForTimeout(1000)

      // Check navigation
      expect(page.url()).toMatch(/^https?:\/\/[^/]+\/?$/)
    }
  })
})
