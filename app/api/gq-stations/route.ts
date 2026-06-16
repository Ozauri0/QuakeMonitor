import { NextResponse } from "next/server";

const GQ_API_URL = process.env.GQ_API_URL || "http://localhost:8081";

export async function GET() {
  try {
    const res = await fetch(`${GQ_API_URL}/api/stations`, {
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    const isConnRefused = e?.message?.includes("ECONNREFUSED") || e?.cause?.code === "ECONNREFUSED";
    const detail = isConnRefused
      ? "GlobalQuake server is not running"
      : e?.message || "Unknown error";
    return NextResponse.json(
      { error: "Could not reach GlobalQuake server", detail },
      { status: 502 }
    );
  }
}
