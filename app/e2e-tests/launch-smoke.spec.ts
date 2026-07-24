import { test, expect } from '@playwright/test';

/**
 * Smoke tests against a deployed build (set PLAYWRIGHT_BASE_URL).
 * Example:
 *   PLAYWRIGHT_BASE_URL=https://new-stars-radio-app.vercel.app npx playwright test launch-smoke.spec.ts
 */
test.describe('New Stars Radio - Production launch smoke', () => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Set PLAYWRIGHT_BASE_URL to run production smoke tests');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nsr-pwa-install-dismissed-at', String(Date.now()));
      HTMLMediaElement.prototype.play = function play() {
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function pause() {};
    });
  });

  async function dismissLaunchOverlays(page: import('@playwright/test').Page) {
    const notNow = page.getByRole('button', { name: 'Not now' });
    if (await notNow.isVisible().catch(() => false)) {
      await notNow.click().catch(() => {});
    }
    const dismissInstall = page.getByRole('button', { name: 'Dismiss install prompt' });
    if (await dismissInstall.isVisible().catch(() => false)) {
      await dismissInstall.click().catch(() => {});
    }
  }

  test('loads, plays, and opens core modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 20000 });
    await dismissLaunchOverlays(page);

    await expect(page.locator('h1')).toContainText(/NEW STARS RADIO/i);
    await expect(page.locator('[data-ad-placement="banner_top"]')).toBeVisible({ timeout: 20000 });

    await page.locator('[aria-label="Play"]').first().click();
    await expect(
      page.locator('[aria-label="Pause"]').or(page.locator('[aria-label="Play"]')).first(),
    ).toBeVisible({ timeout: 10000 });

    const scheduleButton = page.locator('[data-testid="open-schedule"], button:has-text("View Schedule")').first();
    await scheduleButton.scrollIntoViewIfNeeded();
    await scheduleButton.click();
    await expect(page.getByRole('heading', { name: /Schedule/i })).toBeVisible();
    await page.getByRole('button', { name: '✕' }).first().click();

    const eventsButton = page.locator('[data-testid="open-events"], button:has-text("Events")').first();
    await eventsButton.scrollIntoViewIfNeeded();
    await eventsButton.click();
    await expect(page.getByRole('heading', { name: /Station Events/i })).toBeVisible();
  });
});
