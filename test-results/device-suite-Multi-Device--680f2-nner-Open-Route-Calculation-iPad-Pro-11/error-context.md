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
    97 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="flex items-center justify-between">…</div> from <div class="relative space-y-1.5">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - heading "ROADR" [level=1] [ref=e12]
          - generic [ref=e13]: MAP-FIRST ROUTING
        - paragraph [ref=e14]: Route planning & drive telemetry
      - generic [ref=e15]:
        - button "Recenter route" [ref=e16] [cursor=pointer]:
          - generic [ref=e20]: Recenter
        - button "Mapbox key active" [ref=e21] [cursor=pointer]:
          - generic [ref=e26]: Key
        - button "Switch to light mode" [ref=e27] [cursor=pointer]:
          - generic [ref=e34]: Light
        - button "Sign in to Roadr" [ref=e35] [cursor=pointer]:
          - generic [ref=e39]: Sign in
    - generic [ref=e40]:
      - generic [ref=e41]:
        - generic:
          - region "Map" [ref=e42]
          - button "Map marker" [ref=e43] [cursor=pointer]
          - button "Map marker" [ref=e44] [cursor=pointer]
        - generic:
          - generic [ref=e45]:
            - button "Zoom in" [ref=e46] [cursor=pointer]
            - button "Zoom out" [ref=e48] [cursor=pointer]
            - button "Reset bearing to north" [ref=e50]
          - link "Mapbox homepage" [ref=e53] [cursor=pointer]:
            - /url: https://www.mapbox.com/
      - generic [ref=e54]:
        - button "3D Satellite" [pressed] [ref=e55] [cursor=pointer]
        - button "Outdoors Topo" [ref=e56] [cursor=pointer]
    - button "Hide route planner" [expanded] [ref=e57] [cursor=pointer]
    - generic [ref=e61]:
      - generic [ref=e62]:
        - generic [ref=e64]:
          - paragraph [ref=e65]: Plan a journey
          - paragraph [ref=e66]: Search a place or use a saved destination.
        - button "Import Google Maps Autofill origin, stops and destination" [ref=e73] [cursor=pointer]:
          - generic [ref=e79]:
            - generic [ref=e80]: Import Google Maps
            - generic [ref=e81]: Autofill origin, stops and destination
        - generic [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e86]: Origin
            - generic [ref=e89]: 53.481°, -2.243°
          - generic [ref=e90]:
            - combobox "Origin" [ref=e91]: Manchester
            - button "Clear origin" [ref=e92] [cursor=pointer]
        - generic [ref=e97]:
          - generic [ref=e98]:
            - paragraph [ref=e99]: Journey stops
            - paragraph [ref=e100]: Drag stops to reorder them between origin and destination.
          - button "Add stop" [ref=e101] [cursor=pointer]
        - generic [ref=e103]:
          - generic [ref=e104]:
            - generic [ref=e105]: Destination
            - generic [ref=e108]: 53.381°, -1.470°
          - generic [ref=e109]:
            - combobox "Destination" [expanded] [active] [ref=e110]: London
            - button "Clear destination" [ref=e111] [cursor=pointer]
          - listbox "Destination suggestions" [ref=e115]:
            - option "London place London, Greater London, England, United Kingdom" [selected] [ref=e116] [cursor=pointer]:
              - generic [ref=e120]:
                - generic [ref=e121]:
                  - generic [ref=e122]: London
                  - generic [ref=e123]: place
                - paragraph [ref=e124]: London, Greater London, England, United Kingdom
            - option "Londonderry place Londonderry, Derry City and Strabane, Northern Ireland, United Kingdom" [ref=e125] [cursor=pointer]:
              - generic [ref=e129]:
                - generic [ref=e130]:
                  - generic [ref=e131]: Londonderry
                  - generic [ref=e132]: place
                - paragraph [ref=e133]: Londonderry, Derry City and Strabane, Northern Ireland, United Kingdom
            - option "Greater London district Greater London, England, United Kingdom" [ref=e134] [cursor=pointer]:
              - generic [ref=e138]:
                - generic [ref=e139]:
                  - generic [ref=e140]: Greater London
                  - generic [ref=e141]: district
                - paragraph [ref=e142]: Greater London, England, United Kingdom
            - option "London Gatwick Airport place London Gatwick Airport, West Sussex, England, United Kingdom" [ref=e143] [cursor=pointer]:
              - generic [ref=e147]:
                - generic [ref=e148]:
                  - generic [ref=e149]: London Gatwick Airport
                  - generic [ref=e150]: place
                - paragraph [ref=e151]: London Gatwick Airport, West Sussex, England, United Kingdom
            - option "City of London locality City of London, Greater London, England, United Kingdom" [ref=e152] [cursor=pointer]:
              - generic [ref=e156]:
                - generic [ref=e157]:
                  - generic [ref=e158]: City of London
                  - generic [ref=e159]: locality
                - paragraph [ref=e160]: City of London, Greater London, England, United Kingdom
            - option "London Borough of Barnet place London Borough of Barnet, Greater London, England, United Kingdom" [ref=e161] [cursor=pointer]:
              - generic [ref=e165]:
                - generic [ref=e166]:
                  - generic [ref=e167]: London Borough of Barnet
                  - generic [ref=e168]: place
                - paragraph [ref=e169]: London Borough of Barnet, Greater London, England, United Kingdom
            - option "London Borough of Enfield place London Borough of Enfield, Greater London, England, United Kingdom" [ref=e170] [cursor=pointer]:
              - generic [ref=e174]:
                - generic [ref=e175]:
                  - generic [ref=e176]: London Borough of Enfield
                  - generic [ref=e177]: place
                - paragraph [ref=e178]: London Borough of Enfield, Greater London, England, United Kingdom
            - option "London Borough of Camden locality London Borough of Camden, Greater London, England, United Kingdom" [ref=e179] [cursor=pointer]:
              - generic [ref=e183]:
                - generic [ref=e184]:
                  - generic [ref=e185]: London Borough of Camden
                  - generic [ref=e186]: locality
                - paragraph [ref=e187]: London Borough of Camden, Greater London, England, United Kingdom
            - option "London Borough of Newham locality London Borough of Newham, Greater London, England, United Kingdom" [ref=e188] [cursor=pointer]:
              - generic [ref=e192]:
                - generic [ref=e193]:
                  - generic [ref=e194]: London Borough of Newham
                  - generic [ref=e195]: locality
                - paragraph [ref=e196]: London Borough of Newham, Greater London, England, United Kingdom
            - option "London Borough of Havering locality London Borough of Havering, Greater London, England, United Kingdom" [ref=e197] [cursor=pointer]:
              - generic [ref=e201]:
                - generic [ref=e202]:
                  - generic [ref=e203]: London Borough of Havering
                  - generic [ref=e204]: locality
                - paragraph [ref=e205]: London Borough of Havering, Greater London, England, United Kingdom
        - button "Swap route" [ref=e207] [cursor=pointer]
        - generic [ref=e211]:
          - button "Calculate route" [ref=e212] [cursor=pointer]
          - button "Clear journey" [ref=e216] [cursor=pointer]
        - generic [ref=e220]:
          - generic [ref=e221]:
            - generic [ref=e222]: Export to Google Maps
            - generic [ref=e230]: Direct route
          - generic [ref=e231]:
            - button "Copy Link" [ref=e232] [cursor=pointer]
            - link "Open" [ref=e237] [cursor=pointer]:
              - /url: https://www.google.com/maps/dir/?api=1&origin=53.4808,-2.2426&destination=53.3811,-1.4701&travelmode=driving
      - generic [ref=e243]:
        - generic [ref=e244]:
          - generic [ref=e245]: Route Active · Telemetry Live
          - generic [ref=e248]:
            - button "Export" [ref=e249] [cursor=pointer]
            - link "Open in Google Maps" [ref=e257] [cursor=pointer]:
              - /url: https://www.google.com/maps/dir/?api=1&origin=53.4808,-2.2426&destination=53.3811,-1.4701&travelmode=driving
            - generic [ref=e262]: mapbox
            - button "Routes (1)" [ref=e263] [cursor=pointer]
        - generic [ref=e270]:
          - generic [ref=e271]:
            - generic [ref=e272]: MAN
            - paragraph [ref=e273]: Manchester
          - generic [ref=e274]:
            - generic [ref=e275]: DIRECT
            - generic [ref=e283]: 49.8 mi
          - generic [ref=e284]:
            - generic [ref=e285]: SHE
            - paragraph [ref=e286]: Sheffield
        - generic [ref=e287]:
          - generic [ref=e293]:
            - generic [ref=e294]: Total Distance
            - generic [ref=e295]: 49.8 mi
          - generic [ref=e301]:
            - generic [ref=e302]: Est. Duration
            - generic [ref=e303]: 1h 34m
        - generic [ref=e304]:
          - generic [ref=e305]:
            - generic [ref=e306]: Pace Notes Telemetry
            - generic [ref=e311]: 20 Hairpins
          - generic [ref=e312]:
            - generic [ref=e313]:
              - generic [ref=e314]: "20"
              - text: Hairpins
            - generic [ref=e315]:
              - generic [ref=e316]: "60"
              - text: Sweepers
            - generic [ref=e317]:
              - generic [ref=e318]: "40"
              - text: Straights
        - generic [ref=e319]:
          - generic [ref=e325]:
            - paragraph [ref=e326]: Single-tank range
            - paragraph [ref=e327]: Set up car
          - generic [ref=e328]: Need car
        - generic [ref=e329]:
          - generic [ref=e330]:
            - generic [ref=e331]: Fuel & Cost Estimate
            - generic [ref=e336]: 160.2p/L
          - generic [ref=e339]:
            - generic [ref=e340]:
              - generic [ref=e341]: Est. fuel
              - generic [ref=e342]: 5.4 L
            - generic [ref=e343]:
              - generic [ref=e344]: Est. trip cost
              - generic [ref=e345]: £8.63
          - generic [ref=e346]:
            - generic [ref=e347]:
              - generic [ref=e348]:
                - generic [ref=e349]: MPG
                - generic [ref=e351]: 42 MPG
              - slider "Vehicle MPG" [ref=e352] [cursor=pointer]: "42"
            - generic [ref=e353]:
              - generic [ref=e354]:
                - generic [ref=e355]: Fuel rate
                - generic [ref=e356]: 160.2p / L
              - slider [ref=e357] [cursor=pointer]: "160"
            - generic [ref=e358]:
              - button "Reset rate" [ref=e359] [cursor=pointer]
              - button "Set up car" [ref=e360] [cursor=pointer]
        - button "Road Intelligence & Elevation Details" [ref=e365] [cursor=pointer]
        - generic [ref=e373]:
          - generic [ref=e374]:
            - paragraph [ref=e375]: 3D Cockpit Preview
            - paragraph [ref=e376]: Interactive flight camera
          - button "Start 3D drive preview" [ref=e377] [cursor=pointer]:
            - generic [ref=e381]: Launch 3D
        - button "Record route to car log" [ref=e382] [cursor=pointer]
      - separator "Resize route planner sidebar" [ref=e387]
  - button "Open Next.js Dev Tools" [ref=e393] [cursor=pointer]
  - alert [ref=e397]
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