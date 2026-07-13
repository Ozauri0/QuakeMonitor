import { NextResponse } from "next/server";
import { broadcastStations } from "@/lib/events";

const GQ_API_URL = process.env.GQ_API_URL || "http://localhost:8081";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stationIds, action } = body;

    if (!Array.isArray(stationIds) || stationIds.length === 0) {
      return NextResponse.json({ error: "Missing or empty stationIds" }, { status: 400 });
    }
    if (action !== "activate" && action !== "deactivate") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const results: { stationId: string; ok: boolean; error?: string }[] = [];

    for (const id of stationIds) {
      try {
        const url = `${GQ_API_URL}/api/stations/${id}/${action}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) {
          results.push({ stationId: id, ok: true });
        } else {
          const data = await res.json().catch(() => ({}));
          results.push({ stationId: id, ok: false, error: data.message || `Status ${res.status}` });
        }
      } catch (e: any) {
        results.push({ stationId: id, ok: false, error: e?.message || "Request failed" });
      }
    }

    // Broadcast updated stations after bulk action
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
      // non-critical
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      ok: failed === 0,
      succeeded,
      failed,
      results,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Could not reach GlobalQuake server", detail: e?.message || "Unknown error" },
      { status: 502 }
    );
  }
}
