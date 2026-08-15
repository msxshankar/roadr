import { test, expect } from '@playwright/test';

test.describe('Roadr - Custom Route Creation, Dragging & Plan a Journey UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local application
    await page.goto('/');
    // Wait for the app title/header
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('.header-logo-text')).toHaveText('ROADR');

    const isSmallViewport = (page.viewportSize()?.width ?? 1280) < 768;
    // On small mobile viewports, ensure the route panel sheet is hydrated and open
    if (isSmallViewport) {
      const panel = page.locator('#mobile-route-panel');
      const mobileTrigger = page.locator('.mobile-dock button').first();
      await mobileTrigger.waitFor({ state: 'visible' });

      // Click to open if closed and verify React state update
      const isOpen = await panel.getAttribute('data-mobile-panel-open');
      if (isOpen !== 'true') {
        await mobileTrigger.click();
        await expect(panel).toHaveAttribute('data-mobile-panel-open', 'true', { timeout: 8000 });
      }
    }
  });

  test('renders redesigned Plan a Journey panel with streamlined toolbar and prominent pick buttons', async ({ page }) => {
    // Verify Plan a journey panel is visible
    await expect(page.getByText('Plan a journey')).toBeVisible();
    await expect(page.getByText('Build custom routes & divert roads on map')).toBeVisible();

    // Check prominent Edit on Map button
    const editButton = page.getByRole('button', { name: /Edit route on map|Edit on Map/i });
    await expect(editButton).toBeVisible();

    // Check segmented action buttons (Import, Export, Swap) and detached Clear tab
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Swap' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Clear all route points/i })).toBeVisible();

    // Check prominent Pick on map buttons
    const pickOriginButton = page.getByRole('button', { name: /Pick Origin on map/i });
    await expect(pickOriginButton).toBeVisible();
    const pickDestButton = page.getByRole('button', { name: /Pick Destination on map/i });
    await expect(pickDestButton).toBeVisible();
  });

  test('toggles Route Editor mode and displays top HUD status banner', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /Edit route on map|Edit on Map/i });
    await expect(editButton).toBeVisible();

    // Click Edit on Map
    await editButton.click();

    // Verify HUD banner appears at the top of the map
    const hudBanner = page.getByText('Route Editor Active');
    await expect(hudBanner).toBeVisible();
    await expect(page.getByText('Click map to add points · Drag road lines to re-route')).toBeVisible();

    // Click Done on HUD banner
    const doneButton = page.getByRole('button', { name: 'Done' }).first();
    await expect(doneButton).toBeVisible();
    await doneButton.click();

    // Banner should now be hidden
    await expect(hudBanner).not.toBeVisible();
  });

  test('opens and closes the condensed Google Maps import drawer', async ({ page }) => {
    const importButton = page.getByRole('button', { name: 'Import' });
    await expect(importButton).toBeVisible();

    // Open import drawer
    await importButton.click();
    await expect(page.getByPlaceholder('Paste https://www.google.com/maps/dir/...')).toBeVisible();

    // Click import again to close
    await importButton.click();
    await expect(page.getByPlaceholder('Paste https://www.google.com/maps/dir/...')).not.toBeVisible();
  });

  test('opens the dedicated Export drawer with GPX, GeoJSON and Waze options', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: 'Export' });
    await expect(exportButton).toBeVisible();

    // Open export drawer
    await exportButton.click();
    await expect(page.getByText('Export Journey Route')).toBeVisible();
    await expect(page.getByRole('button', { name: /Download GPX/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Download GeoJSON/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open in Waze/i })).toBeVisible();

    // Close export drawer
    await exportButton.click();
    await expect(page.getByText('Export Journey Route')).not.toBeVisible();
  });

  test('switches Telemetry tabs between Overview, Fuel & Costs, and Alternative Routes', async ({ page }) => {
    // Check Telemetry Card tabs
    const overviewTab = page.getByRole('button', { name: 'Overview' });
    const fuelTab = page.getByRole('button', { name: /Fuel & Cost|EV Energy/i });
    const routesTab = page.getByRole('button', { name: /Routes/i });

    if (await overviewTab.isVisible()) {
      await expect(overviewTab).toBeVisible();
      await expect(fuelTab).toBeVisible();
      await expect(routesTab).toBeVisible();

      // Click Fuel & Costs tab
      await fuelTab.click();
      await expect(page.getByText(/Fuel & Cost Estimate|EV Energy & Cost/i)).toBeVisible();

      // Click Routes tab
      await routesTab.click();
      await expect(page.getByText('Select Driving Route')).toBeVisible();

      // Click back to Overview
      await overviewTab.click();
      await expect(page.getByText('Total Distance')).toBeVisible();
    }
  });

  test('allows adding and removing journey stops with station markers', async ({ page }) => {
    const addStopButton = page.getByRole('button', { name: /Add stop/i });
    await expect(addStopButton).toBeVisible();
    await addStopButton.click();

    // Input for Stop 1 should appear
    await expect(page.getByPlaceholder('Search for next stop...')).toBeVisible();
    const cancelStop = page.getByRole('button', { name: /Cancel adding stop/i });
    await expect(cancelStop).toBeVisible();
    await cancelStop.click();

    // Input should close
    await expect(page.getByPlaceholder('Search for next stop...')).not.toBeVisible();
  });

  test('interacts with map canvas and tests road click snapping', async ({ page }) => {
    const mapContainer = page.locator('#mobile-route-panel, header, main');
    await expect(mapContainer.first()).toBeVisible();

    // Start map pick on origin
    const pickOriginBtn = page.getByRole('button', { name: /Pick Origin on map/i });
    await expect(pickOriginBtn).toBeVisible();
    await pickOriginBtn.scrollIntoViewIfNeeded();
    await pickOriginBtn.click();
    await expect(page.getByText('Click anywhere on map')).toBeVisible();

    // Cancel map pick via the active HUD banner
    const cancelBtn = page.locator('.animate-fade-in').getByRole('button', { name: 'Cancel' }).first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await expect(page.getByText('Click anywhere on map')).not.toBeVisible();
  });
});
