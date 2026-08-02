import { test, expect } from '@playwright/test';

test.describe('Multi-Device Responsive & Interaction Suite', () => {
  test.setTimeout(60000);

  test('Initial Page Load & Header Alignment', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1:has-text("ROADR")', { timeout: 15000 });

    // Verify Header Logo & Navigation elements are rendered
    const brandHeading = page.locator('h1:has-text("ROADR")');
    await expect(brandHeading).toBeVisible();

    // Verify no horizontal overflow beyond viewport width
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);

    // Save screenshot for device profile
    const deviceName = testInfo.project.name.replace(/\s+/g, '_').toLowerCase();
    await page.screenshot({
      path: `tests/screenshots/initial_${deviceName}.png`,
      fullPage: true,
    });
  });

  test('Route Planner Open & Route Calculation', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1:has-text("ROADR")', { timeout: 15000 });

    const isMobile = testInfo.project.name.includes('iPhone');
    if (isMobile) {
      // Click mobile dock button to open planner if collapsed
      const dockBtn = page.locator('button:has-text("Plan a route"), button:has-text("Route details")');
      if (await dockBtn.isVisible()) {
        await dockBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Fill Origin & Destination
    const originInput = page.locator('input[placeholder*="Search a town"]').first();
    const destInput = page.locator('input[placeholder*="Search a town"]').nth(1);

    await originInput.fill('Manchester');
    await page.waitForTimeout(500);
    const originFirstResult = page.locator('button:has-text("Manchester")').first();
    if (await originFirstResult.isVisible()) {
      await originFirstResult.click();
    } else {
      await originInput.press('Enter');
    }

    await destInput.fill('London');
    await page.waitForTimeout(500);
    const destFirstResult = page.locator('button:has-text("London")').first();
    if (await destFirstResult.isVisible()) {
      await destFirstResult.click();
    } else {
      await destInput.press('Enter');
    }

    // Click Calculate Route
    const calcBtn = page.locator('button:has-text("Calculate route")');
    await expect(calcBtn).toBeEnabled({ timeout: 10000 });
    await calcBtn.click();

    // Wait for route telemetry to appear or calculate button to finish
    await page.waitForTimeout(3000);

    // Verify zero horizontal scrolling overflow after route calculation
    const overflowAfterCalc = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflowAfterCalc).toBe(false);

    // Save screenshot of calculated route
    const deviceName = testInfo.project.name.replace(/\s+/g, '_').toLowerCase();
    await page.screenshot({
      path: `tests/screenshots/route_calculated_${deviceName}.png`,
      fullPage: true,
    });
  });
});

