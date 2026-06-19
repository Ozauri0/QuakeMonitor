import { NextResponse } from "next/server";
import { broadcastStations } from "@/lib/events";

const GQ_API_URL = process.env.GQ_API_URL || "http://localhost:8081";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stationId, action } = body;

    if (!stationId || typeof stationId !== "string") {
      return NextResponse.json({ error: "Missing stationId" }, { status: 400 });
    }

    if (action !== "activate" && action !== "deactivate") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const url = `${GQ_API_URL}/api/stations/${stationId}/${action}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json();

    // After successful toggle, fetch updated station data and broadcast via SSE
    // so the main page (/) also reflects the change immediately
    if (res.ok) {
      try {
        const stationsRes = await fetch(`${GQ_API_URL}/api/stations`, {
          signal: AbortSignal.timeout(10_000),
        });
        const stationsData = await stationsRes.json();
        if (stationsData.stations) {
          broadcastStations(
            stationsData.stations.map((s: any) => ({
              id: String(s.id),
              lat: Number(s.lat),
              lon: Number(s.lon),
              name: String(s.stationCode || "Unknown"),
              active: s.isActive === true,
              network: s.network ? String(s.network) : undefined,
            }))
          );
        }
      } catch {
        // Broadcast failed, not critical — the webhook will eventually sync
      }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    const isTimeout = e?.name === "TimeoutError" || e?.code === "ABORT_ERR";
    const isConnRefused = e?.message?.includes("ECONNREFUSED") || e?.cause?.code === "ECONNREFUSED";

    let detail = e?.message || "Unknown error";
    if (isConnRefused) {
      detail = "GlobalQuake server is not running. Start it with: java -jar GlobalQuakeServer_v0.10.1_webhook.jar";
    } else if (isTimeout) {
      detail = "GlobalQuake server did not respond in time (10s)";
    }

    return NextResponse.json(
      { error: "Could not reach GlobalQuake server", detail },
      { status: 502 }
    );
  }
}
