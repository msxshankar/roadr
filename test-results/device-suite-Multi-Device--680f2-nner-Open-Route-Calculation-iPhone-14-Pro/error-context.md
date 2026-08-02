# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: device-suite.spec.ts >> Multi-Device Responsive & Interaction Suite >> Route Planner Open & Route Calculation
- Location: tests/device-suite.spec.ts:34:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Calculate route")')
    - locator resolved to <button type="button" class="theme-primary-button flex flex-1 items-center justify-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex items-center justify-between">…</div> from <div class="relative space-y-1.5">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex items-center justify-between">…</div> from <div class="relative space-y-1.5">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    99 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="flex items-center justify-between">…</div> from <div class="relative space-y-1.5">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "ROADR" [level=1] [ref=e12]
      - generic [ref=e13]:
        - button "Recenter route" [ref=e14] [cursor=pointer]
        - button "Mapbox key active" [ref=e18] [cursor=pointer]
        - button "Switch to light mode" [ref=e23] [cursor=pointer]
        - button "Sign in to Roadr" [ref=e30] [cursor=pointer]
    - generic [ref=e34]:
      - generic [ref=e35]:
        - generic:
          - region "Map" [ref=e36]
          - button "Map marker" [ref=e37] [cursor=pointer]
          - button "Map marker" [ref=e38] [cursor=pointer]
        - generic:
          - button "Reset bearing to north" [ref=e40]
          - link "Mapbox homepage" [ref=e43] [cursor=pointer]:
            - /url: https://www.mapbox.com/
      - generic [ref=e44]:
        - button "3D Satellite" [pressed] [ref=e45] [cursor=pointer]
        - button "Outdoors Topo" [ref=e46] [cursor=pointer]
    - generic [ref=e47]:
      - button "Close route details" [expanded] [ref=e48] [cursor=pointer]:
        - generic [ref=e50]: Close planner
      - generic [ref=e53]: 49.8 mi
    - generic [ref=e59]:
      - generic [ref=e60]:
        - generic [ref=e61]:
          - generic [ref=e62]:
            - paragraph [ref=e63]: Plan a journey
            - paragraph [ref=e64]: Search a place or use a saved destination.
          - button "Close route planner" [ref=e70] [cursor=pointer]
        - button "Import Google Maps Autofill origin, stops and destination" [ref=e75] [cursor=pointer]:
          - generic [ref=e81]:
            - generic [ref=e82]: Import Google Maps
            - generic [ref=e83]: Autofill origin, stops and destination
        - generic [ref=e86]:
          - generic [ref=e87]:
            - generic [ref=e88]: Origin
            - generic [ref=e91]: 53.481°, -2.243°
          - generic [ref=e92]:
            - combobox "Origin" [ref=e93]: Manchester
            - button "Clear origin" [ref=e94] [cursor=pointer]
        - generic [ref=e99]:
          - generic [ref=e100]:
            - paragraph [ref=e101]: Journey stops
            - paragraph [ref=e102]: Drag stops to reorder them between origin and destination.
          - button "Add stop" [ref=e103] [cursor=pointer]
        - generic [ref=e105]:
          - generic [ref=e106]:
            - generic [ref=e107]: Destination
            - generic [ref=e110]: 53.381°, -1.470°
          - generic [ref=e111]:
            - combobox "Destination" [expanded] [active] [ref=e112]: London
            - button "Clear destination" [ref=e113] [cursor=pointer]
          - listbox "Destination suggestions" [ref=e117]:
            - option "London place London, Greater London, England, United Kingdom" [selected] [ref=e118] [cursor=pointer]:
              - generic [ref=e122]:
                - generic [ref=e123]:
                  - generic [ref=e124]: London
                  - generic [ref=e125]: place
                - paragraph [ref=e126]: London, Greater London, England, United Kingdom
            - option "Londonderry place Londonderry, Derry City and Strabane, Northern Ireland, United Kingdom" [ref=e127] [cursor=pointer]:
              - generic [ref=e131]:
                - generic [ref=e132]:
                  - generic [ref=e133]: Londonderry
                  - generic [ref=e134]: place
                - paragraph [ref=e135]: Londonderry, Derry City and Strabane, Northern Ireland, United Kingdom
            - option "Greater London district Greater London, England, United Kingdom" [ref=e136] [cursor=pointer]:
              - generic [ref=e140]:
                - generic [ref=e141]:
                  - generic [ref=e142]: Greater London
                  - generic [ref=e143]: district
                - paragraph [ref=e144]: Greater London, England, United Kingdom
            - option "London Gatwick Airport place London Gatwick Airport, West Sussex, England, United Kingdom" [ref=e145] [cursor=pointer]:
              - generic [ref=e149]:
                - generic [ref=e150]:
                  - generic [ref=e151]: London Gatwick Airport
                  - generic [ref=e152]: place
                - paragraph [ref=e153]: London Gatwick Airport, West Sussex, England, United Kingdom
            - option "City of London locality City of London, Greater London, England, United Kingdom" [ref=e154] [cursor=pointer]:
              - generic [ref=e158]:
                - generic [ref=e159]:
                  - generic [ref=e160]: City of London
                  - generic [ref=e161]: locality
                - paragraph [ref=e162]: City of London, Greater London, England, United Kingdom
            - option "London Borough of Barnet place London Borough of Barnet, Greater London, England, United Kingdom" [ref=e163] [cursor=pointer]:
              - generic [ref=e167]:
                - generic [ref=e168]:
                  - generic [ref=e169]: London Borough of Barnet
                  - generic [ref=e170]: place
                - paragraph [ref=e171]: London Borough of Barnet, Greater London, England, United Kingdom
            - option "London Borough of Enfield place London Borough of Enfield, Greater London, England, United Kingdom" [ref=e172] [cursor=pointer]:
              - generic [ref=e176]:
                - generic [ref=e177]:
                  - generic [ref=e178]: London Borough of Enfield
                  - generic [ref=e179]: place
                - paragraph [ref=e180]: London Borough of Enfield, Greater London, England, United Kingdom
            - option "London Borough of Camden locality London Borough of Camden, Greater London, England, United Kingdom" [ref=e181] [cursor=pointer]:
              - generic [ref=e185]:
                - generic [ref=e186]:
                  - generic [ref=e187]: London Borough of Camden
                  - generic [ref=e188]: locality
                - paragraph [ref=e189]: London Borough of Camden, Greater London, England, United Kingdom
            - option "London Borough of Newham locality London Borough of Newham, Greater London, England, United Kingdom" [ref=e190] [cursor=pointer]:
              - generic [ref=e194]:
                - generic [ref=e195]:
                  - generic [ref=e196]: London Borough of Newham
                  - generic [ref=e197]: locality
                - paragraph [ref=e198]: London Borough of Newham, Greater London, England, United Kingdom
            - option "London Borough of Havering locality London Borough of Havering, Greater London, England, United Kingdom" [ref=e199] [cursor=pointer]:
              - generic [ref=e203]:
                - generic [ref=e204]:
                  - generic [ref=e205]: London Borough of Havering
                  - generic [ref=e206]: locality
                - paragraph [ref=e207]: London Borough of Havering, Greater London, England, United Kingdom
        - button "Swap route" [ref=e209] [cursor=pointer]
        - generic [ref=e213]:
          - button "Calculate route" [ref=e214] [cursor=pointer]
          - button "Clear journey" [ref=e218] [cursor=pointer]
        - generic [ref=e222]:
          - generic [ref=e223]:
            - generic [ref=e224]: Export to Google Maps
            - generic [ref=e232]: Direct route
          - generic [ref=e233]:
            - button "Copy Link" [ref=e234] [cursor=pointer]
            - link "Open" [ref=e239] [cursor=pointer]:
              - /url: https://www.google.com/maps/dir/?api=1&origin=53.4808,-2.2426&destination=53.3811,-1.4701&travelmode=driving
      - generic [ref=e245]:
        - generic [ref=e246]:
          - generic [ref=e247]: Route Active · Telemetry Live
          - generic [ref=e250]:
            - button "Export" [ref=e251] [cursor=pointer]
            - link "Open in Google Maps" [ref=e259] [cursor=pointer]:
              - /url: https://www.google.com/maps/dir/?api=1&origin=53.4808,-2.2426&destination=53.3811,-1.4701&travelmode=driving
            - generic [ref=e264]: mapbox
            - button "Routes (1)" [ref=e265] [cursor=pointer]
        - generic [ref=e272]:
          - generic [ref=e273]:
            - generic [ref=e274]: MAN
            - paragraph [ref=e275]: Manchester
          - generic [ref=e276]:
            - generic [ref=e277]: DIRECT
            - generic [ref=e285]: 49.8 mi
          - generic [ref=e286]:
            - generic [ref=e287]: SHE
            - paragraph [ref=e288]: Sheffield
        - generic [ref=e289]:
          - generic [ref=e295]:
            - generic [ref=e296]: Total Distance
            - generic [ref=e297]: 49.8 mi
          - generic [ref=e303]:
            - generic [ref=e304]: Est. Duration
            - generic [ref=e305]: 1h 34m
        - generic [ref=e306]:
          - generic [ref=e307]:
            - generic [ref=e308]: Pace Notes Telemetry
            - generic [ref=e313]: 20 Hairpins
          - generic [ref=e314]:
            - generic [ref=e315]:
              - generic [ref=e316]: "20"
              - text: Hairpins
            - generic [ref=e317]:
              - generic [ref=e318]: "60"
              - text: Sweepers
            - generic [ref=e319]:
              - generic [ref=e320]: "40"
              - text: Straights
        - generic [ref=e321]:
          - generic [ref=e327]:
            - paragraph [ref=e328]: Single-tank range
            - paragraph [ref=e329]: Set up car
          - generic [ref=e330]: Need car
        - generic [ref=e331]:
          - generic [ref=e332]:
            - generic [ref=e333]: Fuel & Cost Estimate
            - generic [ref=e338]: 160.2p/L
          - generic [ref=e341]:
            - generic [ref=e342]:
              - generic [ref=e343]: Est. fuel
              - generic [ref=e344]: 5.4 L
            - generic [ref=e345]:
              - generic [ref=e346]: Est. trip cost
              - generic [ref=e347]: £8.63
          - generic [ref=e348]:
            - generic [ref=e349]:
              - generic [ref=e350]:
                - generic [ref=e351]: MPG
                - generic [ref=e353]: 42 MPG
              - slider "Vehicle MPG" [ref=e354] [cursor=pointer]: "42"
            - generic [ref=e355]:
              - generic [ref=e356]:
                - generic [ref=e357]: Fuel rate
                - generic [ref=e358]: 160.2p / L
              - slider [ref=e359] [cursor=pointer]: "160"
            - generic [ref=e360]:
              - button "Reset rate" [ref=e361] [cursor=pointer]
              - button "Set up car" [ref=e362] [cursor=pointer]
        - button "Road Intelligence & Elevation Details" [ref=e367] [cursor=pointer]
        - generic [ref=e375]:
          - generic [ref=e376]:
            - paragraph [ref=e377]: 3D Cockpit Preview
            - paragraph [ref=e378]: Interactive flight camera
          - button "Start 3D drive preview" [ref=e379] [cursor=pointer]:
            - generic [ref=e383]: Launch 3D
        - button "Record route to car log" [ref=e384] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e394] [cursor=pointer]
  - alert [ref=e398]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Multi-Device Responsive & Interaction Suite', () => {
  4  |   test.setTimeout(60000);
  5  | 
  6  |   test('Initial Page Load & Header Alignment', async ({ page }, testInfo) => {
  7  |     const consoleErrors: string[] = [];
  8  |     page.on('console', (msg) => {
  9  |       if (msg.type() === 'error') consoleErrors.push(msg.text());
  10 |     });
  11 | 
  12 |     await page.goto('/');
  13 |     await page.waitForLoadState('domcontentloaded');
  14 |     await page.waitForSelector('h1:has-text("ROADR")', { timeout: 15000 });
  15 | 
  16 |     // Verify Header Logo & Navigation elements are rendered
  17 |     const brandHeading = page.locator('h1:has-text("ROADR")');
  18 |     await expect(brandHeading).toBeVisible();
  19 | 
  20 |     // Verify no horizontal overflow beyond viewport width
  21 |     const overflow = await page.evaluate(() => {
  22 |       return document.documentElement.scrollWidth > window.innerWidth;
  23 |     });
  24 |     expect(overflow).toBe(false);
  25 | 
  26 |     // Save screenshot for device profile
  27 |     const deviceName = testInfo.project.name.replace(/\s+/g, '_').toLowerCase();
  28 |     await page.screenshot({
  29 |       path: `tests/screenshots/initial_${deviceName}.png`,
  30 |       fullPage: true,
  31 |     });
  32 |   });
  33 | 
  34 |   test('Route Planner Open & Route Calculation', async ({ page }, testInfo) => {
  35 |     await page.goto('/');
  36 |     await page.waitForLoadState('domcontentloaded');
  37 |     await page.waitForSelector('h1:has-text("ROADR")', { timeout: 15000 });
  38 | 
  39 |     const isMobile = testInfo.project.name.includes('iPhone');
  40 |     if (isMobile) {
  41 |       // Click mobile dock button to open planner if collapsed
  42 |       const dockBtn = page.locator('button:has-text("Plan a route"), button:has-text("Route details")');
  43 |       if (await dockBtn.isVisible()) {
  44 |         await dockBtn.click();
  45 |         await page.waitForTimeout(400);
  46 |       }
  47 |     }
  48 | 
  49 |     // Fill Origin & Destination
  50 |     const originInput = page.locator('input[placeholder*="Search a town"]').first();
  51 |     const destInput = page.locator('input[placeholder*="Search a town"]').nth(1);
  52 | 
  53 |     await originInput.fill('Manchester');
  54 |     await page.waitForTimeout(500);
  55 |     const originFirstResult = page.locator('button:has-text("Manchester")').first();
  56 |     if (await originFirstResult.isVisible()) {
  57 |       await originFirstResult.click();
  58 |     } else {
  59 |       await originInput.press('Enter');
  60 |     }
  61 | 
  62 |     await destInput.fill('London');
  63 |     await page.waitForTimeout(500);
  64 |     const destFirstResult = page.locator('button:has-text("London")').first();
  65 |     if (await destFirstResult.isVisible()) {
  66 |       await destFirstResult.click();
  67 |     } else {
  68 |       await destInput.press('Enter');
  69 |     }
  70 | 
  71 |     // Click Calculate Route
  72 |     const calcBtn = page.locator('button:has-text("Calculate route")');
  73 |     await expect(calcBtn).toBeEnabled({ timeout: 10000 });
> 74 |     await calcBtn.click();
     |                   ^ Error: locator.click: Test timeout of 60000ms exceeded.
  75 | 
  76 |     // Wait for route telemetry to appear or calculate button to finish
  77 |     await page.waitForTimeout(3000);
  78 | 
  79 |     // Verify zero horizontal scrolling overflow after route calculation
  80 |     const overflowAfterCalc = await page.evaluate(() => {
  81 |       return document.documentElement.scrollWidth > window.innerWidth;
  82 |     });
  83 |     expect(overflowAfterCalc).toBe(false);
  84 | 
  85 |     // Save screenshot of calculated route
  86 |     const deviceName = testInfo.project.name.replace(/\s+/g, '_').toLowerCase();
  87 |     await page.screenshot({
  88 |       path: `tests/screenshots/route_calculated_${deviceName}.png`,
  89 |       fullPage: true,
  90 |     });
  91 |   });
  92 | });
  93 | 
  94 | 
```