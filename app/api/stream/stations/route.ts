import { stationEmitter } from "@/lib/events";
import { Station } from "@/app/types/station";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
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
