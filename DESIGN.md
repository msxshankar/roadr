# Design System Contract (Flighty Aesthetic)

<!-- THESIS: Map-first driving telemetry workspace inspired by the Flighty app. Full-bleed map canvas with liquid glass controls, flight-board telemetry cards, 3D HUD preview overlays, and high-density monospace metrics. -->

## 1. Visual World

### Colors & Materials
- **Canvas / Background**: Obsidian Black `#050608` (Dark) / `#E9F0F7` (Light)
- **Glass Surfaces**: Liquid Glass (`rgba(10, 12, 16, 0.85)` dark, `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255, 255, 255, 0.12)`)
- **Teal / Cyan (Primary Accent)**: `#2DD4BF` / `#06B6D4` — Active routes, primary HUD telemetry, flight badges
- **Amber / Gold (Secondary Accent)**: `#F59E0B` / `#FBBF24` — Fuel cost calculations, hairpin pace notes, warnings
- **Violet / Purple (Admin Role)**: `#A855F7` / `#C084FC` — Admin dashboard & security badges
- **Emerald (Status & Connection)**: `#10B981` / `#34D399` — Active Mapbox key, session active badges

### Typography
- **Display / Headers**: `Outfit` (800 / 700 / 600 weight, bold tracking)
- **Body & Labels**: `Inter` (400 / 500 / 600 weight)
- **Tabular Data & Badges**: `JetBrains Mono` (500 / 600 weight, tabular numerals)

### Components & Micro-Interactions
- **Header**: Floating liquid glass top-bar with flight status style badges, vehicle picker, theme switch, admin link, and user profile pill.
- **Telemetry Cards**: Flighty-style departure/arrival status board layout (`LON → EDI`), large tabular distance & duration display, grid of pace notes (hairpins, curves, straights), elevation gain profile, and fuel cost breakdown.
- **Route HUD**: Full-screen 3D cockpit preview HUD with compass bearing, camera zoom slider, playback timeline, speed multiplier, and map style switcher.
- **Modals**: Glassmorphic modal overlays with 24px-32px border radii, high-contrast typography, and smooth scale-in animations.
