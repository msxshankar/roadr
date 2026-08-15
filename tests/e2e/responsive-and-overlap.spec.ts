import { test, expect } from '@playwright/test';

test.describe('Roadr - Responsive Layout & UI Collision / Overlap Detection', () => {
  test('header and top controls do not overlap across viewport', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();

    // Verify map style switcher (on desktop/tablet) is below or clear of the header
    const styleControls = page.locator('.map-control-safe');
    if (await styleControls.isVisible()) {
      const styleBox = await styleControls.boundingBox();
      if (styleBox && headerBox) {
        // Style controls top should be >= header bottom or non-intersecting
        expect(styleBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 4);
      }
    }
  });

  test('HUD banners do not collide with top header when active', async ({ page }) => {
    await page.goto('/');
    const isSmallViewport = (page.viewportSize()?.width ?? 1280) < 768;

    if (isSmallViewport) {
      const panel = page.locator('#mobile-route-panel');
      const mobileTrigger = page.locator('.mobile-dock button').first();
      await mobileTrigger.waitFor({ state: 'visible' });

      const isOpen = await panel.getAttribute('data-mobile-panel-open');
      if (isOpen !== 'true') {
        await mobileTrigger.click();
        await expect(panel).toHaveAttribute('data-mobile-panel-open', 'true', { timeout: 8000 });
      }
    }

    // Toggle Route Editor Mode
    const editBtn = page.getByRole('button', { name: /Edit route on map|Edit on Map/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();

      const hudBanner = page.locator('.animate-fade-in').filter({ hasText: 'Route Editor Active' });
      await expect(hudBanner).toBeVisible();

      const header = page.locator('header');
      const headerBox = await header.boundingBox();
      const hudBox = await hudBanner.boundingBox();

      if (headerBox && hudBox) {
        // The top of HUD banner must be strictly below the bottom of the header
        expect(hudBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
      }

      // Done button inside HUD must be clickable and dismiss the HUD
      const doneBtn = hudBanner.getByRole('button', { name: 'Done' });
      await expect(doneBtn).toBeVisible();
      await doneBtn.click();
      await expect(hudBanner).not.toBeVisible();
    }
  });

  test('mobile bottom dock and route sheet are cleanly arranged without visual overlap', async ({ page }) => {
    await page.goto('/');
    const isSmallViewport = (page.viewportSize()?.width ?? 1280) < 768;

    if (isSmallViewport) {
      const mobileDock = page.locator('.mobile-dock');
      await expect(mobileDock).toBeVisible();
      const dockBox = await mobileDock.boundingBox();
      expect(dockBox).not.toBeNull();

      // Open the sheet
      const panel = page.locator('#mobile-route-panel');
      const plannerBtn = mobileDock.getByRole('button').first();
      await plannerBtn.click();
      await expect(panel).toHaveAttribute('data-mobile-panel-open', 'true', { timeout: 8000 });

      const sheetBox = await panel.boundingBox();
      if (dockBox && sheetBox) {
        // Sheet bottom should stay above dock top or within safe container
        expect(sheetBox.y + sheetBox.height).toBeLessThanOrEqual(dockBox.y + dockBox.height);
      }
    } else {
      // On desktop/tablet, route sidebar should be visible and properly positioned
      const sidebar = page.locator('#mobile-route-panel');
      await expect(sidebar).toBeVisible();
    }
  });

  test('interactive tab bar buttons in Plan a Journey panel have adequate touch targets', async ({ page }) => {
    await page.goto('/');
    const isSmallViewport = (page.viewportSize()?.width ?? 1280) < 768;

    if (isSmallViewport) {
      const panel = page.locator('#mobile-route-panel');
      const mobileTrigger = page.locator('.mobile-dock button').first();
      await mobileTrigger.waitFor({ state: 'visible' });

      const isOpen = await panel.getAttribute('data-mobile-panel-open');
      if (isOpen !== 'true') {
        await mobileTrigger.click();
        await expect(panel).toHaveAttribute('data-mobile-panel-open', 'true', { timeout: 8000 });
      }
    }

    const importBtn = page.getByRole('button', { name: 'Import' });
    const exportBtn = page.getByRole('button', { name: 'Export' });
    const swapBtn = page.getByRole('button', { name: 'Swap' });
    const clearBtn = page.getByRole('button', { name: /Clear all route points/i });

    await expect(importBtn).toBeVisible();
    await expect(exportBtn).toBeVisible();
    await expect(swapBtn).toBeVisible();
    await expect(clearBtn).toBeVisible();

    const importBox = await importBtn.boundingBox();
    const clearBox = await clearBtn.boundingBox();

    // Verify touch targets are at least 24px height
    if (importBox) expect(importBox.height).toBeGreaterThanOrEqual(24);
    if (clearBox) expect(clearBox.height).toBeGreaterThanOrEqual(24);
  });

  test('condenses top header navigation buttons into compact icons and M letter on mobile viewports', async ({ page }) => {
    await page.goto('/');
    const isSmallViewport = (page.viewportSize()?.width ?? 1280) < 640;

    const garageBtn = page.getByRole('button', { name: /Open garage|Garage/i });
    const drivesBtn = page.getByRole('button', { name: /Open drives manager/i });
    const themeBtn = page.getByRole('button', { name: /Open theme manager/i });
    const menuBtn = page.getByRole('button', { name: /Sign in to Roadr/i });

    await expect(drivesBtn).toBeVisible();
    await expect(themeBtn).toBeVisible();
    await expect(menuBtn).toBeVisible();

    if (isSmallViewport) {
      await expect(garageBtn).toBeVisible();
      // Verify capital "M" single-letter badge is rendered inside menu button
      await expect(menuBtn.getByText('M')).toBeVisible();
    }
  });
});
