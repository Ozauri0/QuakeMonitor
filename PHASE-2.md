# Phase 2 — Admin Panel Redesign

## Objectives
1. Staging + Apply changes (no auto-commit on each slider move)
2. N customizable earthquake color ranges (not 3 fixed)
3. Direct navigation to /admin/providers
4. Migration from old settings format

## Files touched
- `src/app/context/SettingsContext.tsx` — new shape + migration + staging
- `src/app/admin/AdminContent.tsx` — new ranges UI + Apply/Discard
- `src/app/admin/AdminShell.tsx` (new) — header with nav cards
- `src/app/admin/providers/page.tsx` — breadcrumb back to admin
- `src/app/components/GlobeView.tsx` — consume new ranges
- `src/app/components/Sidebar.tsx` — consume new ranges

## New GlobeSettings shape
```ts
interface MagnitudeRange {
  id: string              // stable key for React
  label: string           // user-editable
  minMagnitude: number    // inclusive
  color: string           // rgba
}

interface GlobeSettings {
  quakeColorRanges: MagnitudeRange[]
  stationColorActive: string
  stationColorInactive: string
  ringAltitude: number
  pointAltitude: number
  labelAltitude: number
  ringPropagationSpeed: number
  ringRepeatPeriod: number
  stationPointSize: number
  quakePointSizeBase: number
  polygonStrokeColor: string
  polygonSideColor: string
  polygonCapColor: string
  atmosphereColor: string
  atmosphereAltitude: number
  globeBackgroundColor: string
}
```

## Default ranges (sensible seismology)
- Micro:    0.0 – 2.0  verde
- Leve:     2.0 – 4.0  amarillo
- Moderado: 4.0 – 5.0  naranja
- Fuerte:   5.0 – 6.0  rojo
- Mayor:    6.0+       violeta

## SettingsContext API additions
```ts
interface SettingsContextType {
  settings: GlobeSettings          // committed
  pending: GlobeSettings           // staging
  hasPending: boolean              // dirty flag
  updatePending: (partial: Partial<GlobeSettings>) => void
  apply: () => void                // commit pending → settings + persist
  discard: () => void              // reset pending from settings
  resetSettings: () => void        // defaults
}
```

## Migration (one-time, on load)
Detect old fields (`quakePointColorLow/Mid/High`, `quakeMagLowMax/MidMax`) in localStorage,
convert to `quakeColorRanges` (3 ranges), drop old fields, save.

## UI (admin page)
- Sticky header with title + nav cards
- "Earthquake Colors" section:
  - List of rows (label | min input | color picker | remove)
  - "+ Add range" button
  - Live preview on globe (pending state)
- Floating bottom bar appears when `hasPending`:
  - "X cambios sin guardar"
  - [Aplicar cambios] (primary)
  - [Descartar]

## Rollout
1. Update SettingsContext + migration
2. Update GlobeView + Sidebar consumers
3. Update AdminContent (new ranges UI + Apply bar)
4. Add AdminShell with nav
5. Update providers page breadcrumb
6. Test locally (apply/discard/add/remove ranges)
7. Commit + push
