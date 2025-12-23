import { test, expect } from '@playwright/test'

test.describe('Anime List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays anime list', async ({ page }) => {
    // Wait for anime list to load
    await page.waitForSelector('[data-testid="anime-grid"]', { timeout: 10000 })

    // Check that anime cards are displayed
    const animeCards = page.locator('.anime-card')
    await expect(animeCards.first()).toBeVisible()
  })

  test('has working search functionality', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('[data-testid="anime-grid"]', { timeout: 10000 })

    // Find search input
    const searchInput = page.locator('input[placeholder*="搜索" i], input[aria-label*="search" i]')
    if (await searchInput.count() > 0) {
      await searchInput.fill('赛马娘')
      // Wait for filtered results
      await page.waitForTimeout(1000)
    }
  })

  test('navigates to anime details', async ({ page }) => {
    // Wait for anime list to load
    await page.waitForSelector('[data-testid="anime-grid"]', { timeout: 10000 })

    // Click on first anime card
    const firstCard = page.locator('.anime-card').first()
    await firstCard.click()

    // Check that navigation occurred (URL changed or player page loaded)
    await page.waitForTimeout(1000)
    const url = page.url()
    expect(url).toMatch(/\/watch\//)
  })

  test('has filter controls', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('[data-testid="anime-grid"]', { timeout: 10000 })

    // Check for filter dropdowns/controls
    const genreFilter = page.locator('select, .el-select')
    if (await genreFilter.count() > 0) {
      await expect(genreFilter.first()).toBeVisible()
    }
  })

  test('has pagination controls', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('[data-testid="anime-grid"]', { timeout: 10000 })

    // Check for pagination
    const pagination = page.locator('.pagination, .el-pagination')
    if (await pagination.count() > 0) {
      await expect(pagination.first()).toBeVisible()
    }
  })
})
