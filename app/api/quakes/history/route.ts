import { NextResponse } from "next/server";
import { getRecentQuakes } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = Math.min(Number(searchParams.get("hours")) || 2, 24);
    const quakes = await getRecentQuakes(hours);
    return NextResponse.json(quakes, { status: 200 });
  } catch (err) {
    console.error("[HISTORY] Error fetching quakes:", err);
    return NextResponse.json([], { status: 200 });
  }
}
