import { stationEmitter } from "@/lib/events";
import { Station } from "@/app/types/station";

const GQ_API_URL = process.env.GQ_API_URL || "http://localhost:8081";

async function fetchActiveStations(): Promise<Station[]> {
  try {
    const res = await fetch(`${GQ_API_URL}/api/stations`, {
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    if (!data.stations) return [];
    return data.stations
      .filter((s: any) => s.isActive === true)
      .map((s: any) => ({
        id: String(s.id),
        lat: Number(s.lat),
        lon: Number(s.lon),
        name: String(s.stationCode || "Unknown"),
        active: true,
        network: s.network ? String(s.network) : undefined,
      }));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const sendEvent = (stations: Station[]) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(stations)}\n\n`)
          );
        } catch {
          closed = true;
        }
      };

      const sendPing = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          closed = true;
        }
      };

      // Send initial active stations from REST API
      const initial = await fetchActiveStations();
      if (initial.length > 0 && !closed) {
        sendEvent(initial);
      }

      stationEmitter.on("stations", sendEvent);
      const pingInterval = setInterval(sendPing, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(pingInterval);
        stationEmitter.off("stations", sendEvent);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);

      const checkInterval = setInterval(() => {
        if (closed) {
          clearInterval(checkInterval);
          cleanup();
        }
      }, 30000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
