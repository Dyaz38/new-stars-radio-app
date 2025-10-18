import { test, expect } from '@playwright/test';

test.describe('New Stars Radio - Mobile Experience', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
  });

  test('should load and display radio station on mobile', async ({ page }) => {
    // Check if main elements are visible
    await expect(page.locator('h1')).toContainText('New Stars Radio');
    await expect(page.locator('[data-testid="current-song"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Play"]')).toBeVisible();
  });

  test('should play/pause audio with touch interactions', async ({ page }) => {
    const playButton = page.locator('[aria-label="Play"]').first();
    
    // Test touch interaction
    await playButton.tap();
    
    // Should show pause button after playing
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible({ timeout: 5000 });
    
    // Test pause
    await page.locator('[aria-label="Pause"]').tap();
    await expect(page.locator('[aria-label="Play"]')).toBeVisible();
  });

  test('should synchronize both heart buttons on mobile', async ({ page }) => {
    // Wait for metadata to load
    await page.waitForTimeout(2000);
    
    const heartButtons = page.locator('[aria-label*="Like current song"]');
    const firstHeart = heartButtons.first();
    
    // Tap the first heart button
    await firstHeart.tap();
    
    // Both heart buttons should now show as "unliked" state
    await expect(page.locator('[aria-label*="Unlike current song"]')).toHaveCount(2);
    
    // Tap again to unlike
    await page.locator('[aria-label*="Unlike current song"]').first().tap();
    
    // Both should return to "like" state
    await expect(page.locator('[aria-label*="Like current song"]')).toHaveCount(2);
  });

  test('should handle volume control on mobile', async ({ page }) => {
    const volumeSlider = page.locator('input[type="range"]');
    
    // Test volume slider interaction
    await volumeSlider.fill('50');
    
    // Should update volume display
    await expect(page.locator('text=/50/')).toBeVisible();
  });

  test('should display metadata and update automatically', async ({ page }) => {
    // Check initial metadata load
    const currentSongElement = page.locator('[data-testid="current-song"]');
    await expect(currentSongElement).not.toBeEmpty();
    
    // Check that metadata contains meaningful content (not just default)
    const songText = await currentSongElement.textContent();
    expect(songText?.length).toBeGreaterThan(5);
  });

  test('should show listener count', async ({ page }) => {
    const listenersElement = page.locator('[data-testid="listeners"]');
    await expect(listenersElement).toBeVisible();
    await expect(listenersElement).toContainText(/\d+.*listeners?/i);
  });

  test('should maintain responsive design on different mobile sizes', async ({ page }) => {
    // Test on different mobile viewport sizes
    const sizes = [
      { width: 375, height: 667 }, // iPhone 8
      { width: 414, height: 896 }, // iPhone 11 Pro Max
      { width: 360, height: 740 }, // Samsung Galaxy S20
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      
      // Check that key elements are still visible and accessible
      await expect(page.locator('[aria-label="Play"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-song"]')).toBeVisible();
      await expect(page.locator('input[type="range"]')).toBeVisible();
      
      // Check that elements don't overflow
      const body = await page.locator('body').boundingBox();
      expect(body?.width).toBeLessThanOrEqual(size.width);
    }
  });

  test('should handle device orientation changes', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[aria-label="Play"]')).toBeVisible();
    
    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await expect(page.locator('[aria-label="Play"]')).toBeVisible();
    
    // All main controls should still be accessible
    await expect(page.locator('[data-testid="current-song"]')).toBeVisible();
    await expect(page.locator('input[type="range"]')).toBeVisible();
  });
});

