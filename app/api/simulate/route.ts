import { NextResponse } from "next/server";
import { broadcastQuake } from "@/lib/events";
import { QuakeEvent } from "@/app/types/quake";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields with defaults
    const lat = typeof body.lat === "number" ? body.lat : parseFloat((Math.random() * 140 - 60).toFixed(4));
    const lon = typeof body.lon === "number" ? body.lon : parseFloat((Math.random() * 360 - 180).toFixed(4));
    const depth = typeof body.depth === "number" ? body.depth : parseFloat((Math.random() * 700).toFixed(1));
    const mag = typeof body.mag === "number" ? body.mag : parseFloat((Math.random() * 6.5 + 2.0).toFixed(1));
    const locationName = typeof body.locationName === "string" ? body.locationName : `Test Earthquake`;
    const isUpdate = body.isUpdate === true;

    const quake: QuakeEvent = {
      id: body.id || `sim-${Date.now()}`,
      lat,
      lon,
      depth,
      mag,
      locationName,
      time: typeof body.time === "number" ? body.time : Date.now(),
      isUpdate,
    };

    broadcastQuake(quake);

    return NextResponse.json({ success: true, quake }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
