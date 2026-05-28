import { NextResponse } from "next/server";
import { QuakeEvent } from "@/app/types/quake";
import { broadcastQuake } from "@/lib/events";

declare global {
  var latestQuake: QuakeEvent | null;
}

if (typeof global.latestQuake === "undefined") {
  global.latestQuake = null;
}

export async function GET() {
  if (!global.latestQuake) {
    return NextResponse.json({ message: "No quake received yet" }, { status: 200 });
  }
  return NextResponse.json(global.latestQuake, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.id !== "string" ||
      typeof body.lat !== "number" ||
      typeof body.lon !== "number" ||
      typeof body.depth !== "number" ||
      typeof body.mag !== "number" ||
      typeof body.locationName !== "string" ||
      typeof body.time !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid payload structure" },
        { status: 400 }
      );
    }

    const quake: QuakeEvent = {
      id: body.id,
      lat: body.lat,
      lon: body.lon,
      depth: body.depth,
      mag: body.mag,
      locationName: body.locationName,
      time: body.time,
      isUpdate: body.isUpdate === true,
    };

    global.latestQuake = quake;

    console.log("\n🌍 [GLOBALQUAKE WEBHOOK RECEIVED] 🌍");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  ID:       ${quake.id}`);
    console.log(`  Location: ${quake.locationName}`);
    console.log(`  Lat:      ${quake.lat}`);
    console.log(`  Lon:      ${quake.lon}`);
    console.log(`  Depth:    ${quake.depth} km`);
    console.log(`  Mag:      ${quake.mag}`);
    console.log(`  Time:     ${new Date(quake.time).toISOString()}`);
    console.log(`  Update:   ${quake.isUpdate}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    broadcastQuake(quake);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
