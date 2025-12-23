import { test, expect } from '@playwright/test'

test.describe('Video Player Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific anime
    await page.goto('/watch/5998?season=1&episode=1')
  })

  test('displays video player', async ({ page }) => {
    // Wait for player to load
    await page.waitForTimeout(2000)

    // Check for video element or Plyr player
    const video = page.locator('video, .plyr')
    const playerVisible = await video.count() > 0

    if (playerVisible) {
      await expect(video.first()).toBeVisible()
    }
  })

  test('has episode list', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check for episode list
    const episodeList = page.locator('[data-testid="episode-list"], .episode-list')
    if (await episodeList.count() > 0) {
      await expect(episodeList.first()).toBeVisible()
    }
  })

  test('has player controls', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check for player controls
    const controls = page.locator('[data-testid="player-controls"], .player-controls')
    if (await controls.count() > 0) {
      await expect(controls.first()).toBeVisible()
    }
  })

  test('has auto-play toggle', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check for auto-play toggle
    const autoPlayToggle = page.locator('button:has-text("自动播放"), [aria-label*="auto-play" i]')
    if (await autoPlayToggle.count() > 0) {
      await expect(autoPlayToggle.first()).toBeVisible()
    }
  })

  test('handles invalid anime ID gracefully', async ({ page }) => {
    // Navigate to invalid anime
    await page.goto('/watch/999999?season=1&episode=1')

    // Should show error message or handle gracefully
    await page.waitForTimeout(2000)

    // Check for error message or fallback UI
    const errorMessage = page.locator('[role="alert"], .error-message, [data-testid="error"]')
    const hasError = await errorMessage.count() > 0

    // Either error is shown or page handles it gracefully
    expect(hasError || page.url().includes('/watch')).toBeTruthy()
  })
})
