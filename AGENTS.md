<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# QuakeMonitor 3D - Agent Guide

## Project Overview
Full-stack real-time seismic monitoring dashboard. Receives earthquake data from a modified GlobalQuake Java server and visualizes it on an interactive 3D globe.

## Tech Stack
- **Framework**: Next.js 16+ (App Router, Turbopack)
- **Package Manager**: Bun
- **Styling**: Tailwind CSS v4
- **3D Globe**: react-globe.gl (client-side only, dynamic import with `ssr: false`)
- **Icons**: lucide-react
- **Dates**: date-fns
- **GeoJSON**: topojson-client
- **Real-time**: Server-Sent Events (SSE) via native EventSource

## Project Structure
```
app/
  api/
    webhook/quake/route.ts      # POST receiver from GlobalQuake (saves to global.latestQuake)
    webhook/station/route.ts    # POST receiver for station data
    stream/quakes/route.ts      # SSE endpoint for quake events
    stream/stations/route.ts    # SSE endpoint for station data
  components/
    GlobeView.tsx               # 3D globe (rings, points, stations, country borders)
    LiveDashboard.tsx           # Live quake cards (main + secondary)
    QuakeMap.tsx                # Main layout (globe + overlays)
    Sidebar.tsx                 # Right panel (archived quakes, controls, simulate)
  hooks/
    useLocalQuakes.ts           # SSE quake state with live/archived split, 90s timer, 10s rotation
    useStations.ts              # SSE station state with Map-based diffing
  types/
    quake.ts                    # QuakeEvent interface
    station.ts                  # Station interface
lib/
  events.ts                     # Node.js EventEmitters (quakeEmitter, stationEmitter)
```

## Key Architecture Patterns

### Data Flow
1. GlobalQuake (Java) sends POST to `/api/webhook/quake` or `/api/webhook/station`
2. Route handler validates payload and emits via EventEmitter
3. SSE route handler listens to same emitter and streams to clients
4. Frontend hooks connect via EventSource and update React state

### Live vs Archived Quakes
- **Live**: Quakes updated < 90s ago. Shown in left cards + animated rings on globe.
- **Archived**: Quakes with no update for 90s+. Shown in right sidebar.
- Focus rotates every 10s among live quakes.
- Click archived quake to replay its ring animation temporarily.

### Performance Notes
- `useStations` uses Map-based diffing to avoid full re-renders of the globe.
- `react-globe.gl` is loaded dynamically with `ssr: false`.
- All colors must be **string rgba()** (not arrays) to avoid d3-color runtime errors.
- Altitude for rings/points is set to `0.03` to render above the globe surface.

### Important Hooks
- **DO NOT** run `git commit/push/rebase` unless explicitly asked.
- **DO NOT** modify files outside the project directory.
- When editing existing files, always read first with `Read`.
- Prefer editing over writing new files when possible.

## GlobalQuake Java Modifications
- Source cloned to `globalquake-src/` (GitHub tag `v0.10.1`)
- Uses Maven (`mvn package -DskipTests`)
- Modified files:
  - `GlobalQuakeCore/src/main/java/globalquake/core/webhook/WebhookService.java`
  - `GlobalQuakeCore/src/main/java/globalquake/core/earthquake/EarthquakeAnalysis.java`
  - `GlobalQuakeServer/src/main/java/gqserver/server/GlobalQuakeServer.java`
- Built JARs copied to root:
  - `GlobalQuakeServer_v0.10.1_webhook.jar`
  - `GlobalQuakeClient_v0.10.1_webhook.jar`

## Build Commands
```bash
bun run dev          # Start Next.js dev server
bun run build        # Production build
mvn package -DskipTests -q   # Build GlobalQuake Java (from globalquake-src/)
```

## Known Issues / Gotchas
- `react-globe.gl` colors MUST be rgba strings, not arrays.
- `HttpClient` in Java MUST use `HTTP_1_1` to connect to Next.js dev server.
- The dev server port may vary (3000, 3001, 3002). Check with netstat.
