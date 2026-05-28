# QuakeMonitor 3D

A real-time 3D seismic monitoring dashboard focused on **Chilean seismic activity**, built to receive, analyze, and visualize earthquake data from a modified [GlobalQuake](https://github.com/xspanger3770/GlobalQuake) Java server on an interactive WebGL globe.

> While initially designed with Chilean seismic monitoring in mind, the system is fully global — it can receive, process, and visualize earthquakes from anywhere on Earth in near real-time.

---

## Overview

QuakeMonitor 3D bridges the gap between raw seismic station data and human-readable visualization. It listens to a fleet of Seedlink seismic stations via GlobalQuake, processes earthquake detections in real-time, and streams them to a Next.js frontend where they are rendered as animated shockwave rings on a 3D globe.

Key features:

- **Live earthquake tracking** with animated epicentral rings and magnitude-based color coding
- **Station monitoring** — visualize all active seismic stations on the globe
- **Country border overlays** for quick geographic reference
- **Live vs. Archived split** — earthquakes under active revision appear in a left-side live panel; confirmed earthquakes move to the right archive after 90 seconds
- **Auto-tracking camera** that rotates between live events every 10 seconds
- **Replay archived earthquakes** by clicking them in the sidebar
- **Toggle layers** — independently show/hide stations and archived earthquakes

---

## Architecture

```
┌─────────────────┐     HTTP POST      ┌──────────────────┐
│  GlobalQuake    │ ─────────────────> │  Next.js Backend │
│  (Java Server)  │   /api/webhook/*   │  (EventEmitter)  │
└─────────────────┘                    └────────┬─────────┘
                                                │ SSE
                                                ▼
                                       ┌──────────────────┐
                                       │  React Frontend  │
                                       │  react-globe.gl  │
                                       └──────────────────┘
```

1. **GlobalQuake Server** (modified Java) detects earthquakes and sends them via HTTP POST to the Next.js webhook.
2. **Next.js backend** receives the payload, validates it, stores it in-memory (`global.latestQuake`), logs it to the terminal, and broadcasts it via Node.js `EventEmitter`.
3. **SSE endpoints** (`/api/stream/quakes`, `/api/stream/stations`) stream events to all connected browser clients.
4. **React frontend** connects via native `EventSource`, maintains live/archived state with a 90-second expiry timer, and renders the globe.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Next.js 16+ (App Router, Turbopack) |
| 3D Globe | react-globe.gl (client-only, dynamic import) |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Dates | date-fns |
| GeoJSON | topojson-client |
| Real-time | Server-Sent Events (native EventSource) |
| Package Manager | Bun |
| Backend Language | TypeScript / Node.js |
| Seismic Processor | GlobalQuake v0.10.1 (Java, modified) |
| Build Tool (Java) | Maven |

---

## Project Structure

```
quakesystem/
├── app/
│   ├── api/
│   │   ├── webhook/quake/route.ts      # Earthquake receiver
│   │   ├── webhook/station/route.ts    # Station receiver
│   │   ├── stream/quakes/route.ts      # SSE quake stream
│   │   └── stream/stations/route.ts    # SSE station stream
│   ├── components/
│   │   ├── GlobeView.tsx               # 3D globe (rings, points, stations, borders)
│   │   ├── LiveDashboard.tsx           # Live quake cards (main + secondary)
│   │   ├── QuakeMap.tsx                # Main layout
│   │   └── Sidebar.tsx                 # Right panel (archived, controls, simulate)
│   ├── hooks/
│   │   ├── useLocalQuakes.ts           # Quake state with live/archived split
│   │   └── useStations.ts              # Station state with Map-based diffing
│   └── types/
│       ├── quake.ts
│       └── station.ts
├── lib/
│   └── events.ts                       # EventEmitters for quakes & stations
├── globalquake-src/                    # Modified GlobalQuake Java source
├── GlobalQuakeServer_v0.10.1_webhook.jar  # Pre-built server JAR
├── GlobalQuakeClient_v0.10.1_webhook.jar  # Pre-built client JAR
└── AGENTS.md                           # Detailed agent/developer guide
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.3+)
- [Node.js](https://nodejs.org/) (v18+ for Next.js dev server)
- Java 17+ (for running GlobalQuake)
- Maven (only if rebuilding GlobalQuake from source)

### 1. Install Frontend Dependencies

```bash
bun install
```

### 2. Start the Next.js Dev Server

```bash
bun run dev
```

The dashboard will be available at `http://localhost:3000`.

### 3. Start GlobalQuake Server

```bash
java -jar GlobalQuakeServer_v0.10.1_webhook.jar
```

On first launch, configure your Seedlink networks and station sources via the GUI (or use existing data in `.GlobalQuakeServerData/`).

GlobalQuake will automatically ping `http://localhost:3000/api/webhook/quake` on startup to verify connectivity.

### 4. Simulate an Earthquake (for testing)

Click the **"Simulate Test Earthquake"** button in the right panel. A synthetic quake will be injected into the same pipeline and appear on the globe immediately.

---

## Rebuilding GlobalQuake from Source

If you modify the Java source in `globalquake-src/`:

```bash
cd globalquake-src
mvn package -DskipTests -q
```

Then copy the fat JARs:

```bash
cp GlobalQuakeServer/target/GlobalQuakeServer-0.10.1-jar-with-dependencies.jar ../GlobalQuakeServer_v0.10.1_webhook.jar
cp GlobalQuakeClient/target/GlobalQuake-0.10.1-jar-with-dependencies.jar ../GlobalQuakeClient_v0.10.1_webhook.jar
```

### Key Java Modifications

- **`GlobalQuakeCore/src/main/java/globalquake/core/webhook/WebhookService.java`** — Added `HttpClient` POST logic for earthquakes and station data.
- **`GlobalQuakeCore/src/main/java/globalquake/core/earthquake/EarthquakeAnalysis.java`** — Injected webhook calls on `updateHypocenter` and `updateMagnitudeOnly`.
- **`GlobalQuakeServer/src/main/java/gqserver/server/GlobalQuakeServer.java`** — Added scheduled task to broadcast station list every 10 seconds.

---

## Live vs. Archived Behavior

- **Live (≤ 90s since last update):** Appears in the top-left card with a pulsing "LIVE" indicator. Animated rings on the globe. Camera auto-tracks and rotates every 10s between multiple live events.
- **Archived (> 90s):** Moves to the right sidebar. Shown as a static dot on the globe. Click any archived card to replay its ring animation temporarily.

---

## Known Issues & Notes

- `react-globe.gl` colors **must** be `rgba()` strings (not arrays) to avoid `d3-color` runtime errors.
- Java `HttpClient` must use `HTTP_1_1` to communicate reliably with the Next.js dev server (Turbopack).
- The dev server port may vary (3000, 3001, 3002). Check your terminal output.
- Station data is diffed with a Map to avoid full globe re-renders every 10 seconds.

---

## License

This project inherits the license of the original GlobalQuake codebase. See `globalquake-src/LICENSE` for details.

## Acknowledgments

- [GlobalQuake](https://github.com/xspanger3770/GlobalQuake) by xspanger3770 — the core seismic detection engine.
- [react-globe.gl](https://github.com/vasturiano/react-globe.gl) by Vasco Asturiano — the 3D globe visualization library.
