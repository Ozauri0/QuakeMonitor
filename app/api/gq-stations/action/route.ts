import { NextResponse } from "next/server";

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
