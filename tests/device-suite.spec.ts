import { test, expect } from '@playwright/test';

test.describe('Multi-Device Interactive & Diagnostic Test Suite', () => {
  test.setTimeout(60000);

  test('1. Initial Page Load & Responsive Layout Audit', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1:has-text("ROADR")', { timeout: 15000 });

    // Verify brand heading & navigation items
    const brandHeading = page.locator('h1:has-text("ROADR")');
    await expect(brandHeading).toBeVisible();

    // Verify zero horizontal scrolling overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);

    // Save screenshot
    const deviceName = testInfo.project.name.replace(/\s+/g, '_').toLowerCase();
    await page.screenshot({
      path: `tests/screenshots/1_initial_${deviceName}.png`,
      fullPage: true,
    });
  });

  test('2. Route Calculation, Telemetry & Export Interactivity', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1:has-text("ROADR")', { timeout: 15000 });

    const isMobile = testInfo.project.name.includes('iPhone');
    if (isMobile) {
      const dockBtn = page.locator('button:has-text("Plan a route"), button:has-text("Route details")');
      if (await dockBtn.isVisible()) {
        await dockBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Input Origin (Manchester) & Destination (London)
    const originInput = page.locator('input[placeholder*="Search a town"]').first();
    const destInput = page.locator('input[placeholder*="Search a town"]').nth(1);

    await originInput.fill('Manchester');
    await page.waitForTimeout(400);
    const originFirstResult = page.locator('button:has-text("Manchester")').first();
    if (await originFirstResult.isVisible()) {
      await originFirstResult.click();
    } else {
      await originInput.press('Enter');
    }

    await destInput.fill('London');
    await page.waitForTimeout(400);
    const destFirstResult = page.locator('button:has-text("London")').first();
    if (await destFirstResult.isVisible()) {
      await destFirstResult.click();
    } else {
      await destInput.press('Enter');
    }

    // Trigger Calculate Route
    const calcBtn = page.locator('button:has-text("Calculate route")');
    await expect(calcBtn).toBeEnabled({ timeout: 10000 });
    await calcBtn.click();

    // Wait for telemetry board to mount
    await page.waitForTimeout(3000);

    // Verify zero horizontal scrolling overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);

    // Screenshot after route calculation
    const deviceName = testInfo.project.name.replace(/\s+/g, '_').toLowerCase();
    await page.screenshot({
      path: `tests/screenshots/2_route_calculated_${deviceName}.png`,
      fullPage: true,
    });
  });

  test('3. Garage & Vehicle Selector Modal Interactivity', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1:has-text("ROADR")', { timeout: 15000 });

    // Open Garage Modal from Header button
    const garageBtn = page.locator('button:has-text("Garage")').first();
    if (await garageBtn.isVisible()) {
      await garageBtn.click();
      await page.waitForTimeout(400);

      // Verify Modal Title
      const modalTitle = page.locator('text=Garage & Vehicles');
      await expect(modalTitle).toBeVisible({ timeout: 5000 });

      // Save screenshot
      const deviceName = testInfo.project.name.replace(/\s+/g, '_').toLowerCase();
      await page.screenshot({
        path: `tests/screenshots/3_garage_modal_${deviceName}.png`,
        fullPage: true,
      });

      // Close modal
      const closeBtn = page.locator('button[aria-label="Close modal"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test('4. 3D Cockpit Drive Preview HUD Interactivity', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1:has-text("ROADR")', { timeout: 15000 });

    const isMobile = testInfo.project.name.includes('iPhone');
    if (isMobile) {
      const dockBtn = page.locator('button:has-text("Plan a route"), button:has-text("Route details")');
      if (await dockBtn.isVisible()) {
        await dockBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Input Origin & Destination to enable 3D preview
    const originInput = page.locator('input[placeholder*="Search a town"]').first();
    const destInput = page.locator('input[placeholder*="Search a town"]').nth(1);

    await originInput.fill('Edale');
    await page.waitForTimeout(300);
    await originInput.press('Enter');

    await destInput.fill('Castleton');
    await page.waitForTimeout(300);
    await destInput.press('Enter');

    const calcBtn = page.locator('button:has-text("Calculate route")');
    if (await calcBtn.isEnabled()) {
      await calcBtn.click();
      await page.waitForTimeout(2500);

      // Launch 3D Cockpit Preview
      const launch3DBtn = page.locator('button:has-text("Launch 3D")').first();
      if (await launch3DBtn.isVisible()) {
        await launch3DBtn.click();
        await page.waitForTimeout(800);

        // Verify 3D HUD controls
        const exit3DBtn = page.locator('button:has-text("Exit 3D")');
        await expect(exit3DBtn).toBeVisible({ timeout: 5000 });

        // Save screenshot of 3D preview mode
        const deviceName = testInfo.project.name.replace(/\s+/g, '_').toLowerCase();
        await page.screenshot({
          path: `tests/screenshots/4_3d_preview_${deviceName}.png`,
          fullPage: true,
        });

        // Exit 3D mode
        await exit3DBtn.click();
      }
    }
  });
});
