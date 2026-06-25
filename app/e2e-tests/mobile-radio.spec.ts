import { test, expect } from '@playwright/test';

test.describe('New Stars Radio - Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = function play() {
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function pause() {};
    });
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 15000 });
  });

  test('should load and display radio station on mobile', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/NEW STARS RADIO/i);
    await expect(page.locator('[data-testid="current-song"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Play"]').first()).toBeVisible();
  });

  test('should play and pause audio with touch interactions', async ({ page }) => {
    const playButton = page.locator('[aria-label="Play"]').first();
    await playButton.tap();
    await expect(page.locator('[aria-label="Pause"]').first()).toBeVisible({ timeout: 8000 });
    await page.locator('[aria-label="Pause"]').first().tap();
    await expect(page.locator('[aria-label="Play"]').first()).toBeVisible();
  });

  test('should open schedule and events modals', async ({ page }) => {
    await page.locator('[data-testid="open-schedule"]').tap();
    await expect(page.getByRole('heading', { name: /New Stars Radio Schedule/i })).toBeVisible();
    await page.getByRole('button', { name: '✕' }).first().click();

    await page.locator('[data-testid="open-events"]').tap();
    await expect(page.getByRole('heading', { name: /Station Events/i })).toBeVisible();
    await expect(page.locator('[data-ad-placement="events_modal"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show ad banner on main screen', async ({ page }) => {
    const banner = page.locator('[data-ad-placement="banner_top"]');
    await expect(banner).toBeVisible({ timeout: 15000 });
    await expect(banner.locator('img')).toBeVisible();
  });

  test('should show listener count', async ({ page }) => {
    const listenersElement = page.locator('[data-testid="listeners"]');
    await expect(listenersElement).toBeVisible();
    await expect(listenersElement).toContainText(/listeners/i);
  });

  test('should maintain responsive design on different mobile sizes', async ({ page }) => {
    const sizes = [
      { width: 375, height: 667 },
      { width: 414, height: 896 },
      { width: 360, height: 740 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await expect(page.locator('[aria-label*="Play"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="current-song"]')).toBeVisible();
    }
  });
});
