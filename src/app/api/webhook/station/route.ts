import { NextResponse } from "next/server";
import { Station } from "@/app/types/station";
import { broadcastStations } from "@/lib/events";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.stations)) {
      return NextResponse.json(
        { error: "Invalid payload: stations must be an array" },
        { status: 400 }
      );
    }

    const stations: Station[] = body.stations.map((s: any) => ({
      id: String(s.id),
      lat: Number(s.lat),
      lon: Number(s.lon),
      name: String(s.name || (s.network && s.stationCode ? s.network + "." + s.stationCode : "Unknown")),
      active: undefined as any, // Don't override active — let initial fetch / action route control it
      network: s.network ? String(s.network) : undefined,
    }));

    broadcastStations(stations);

    return NextResponse.json({ success: true, count: stations.length }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
