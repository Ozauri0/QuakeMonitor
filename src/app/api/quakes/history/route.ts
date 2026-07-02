import { NextResponse } from "next/server";
import { getRecentQuakes } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 200);
    const hours = Number(searchParams.get("hours")) || 0;

    const quakes = await getRecentQuakes(hours || undefined, limit);
    return NextResponse.json(quakes, { status: 200 });
  } catch (err) {
    console.error("[HISTORY] Error fetching quakes:", err);
    return NextResponse.json([], { status: 200 });
  }
}
