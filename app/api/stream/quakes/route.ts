import { quakeEmitter } from "@/lib/events";
import { QuakeEvent } from "@/app/types/quake";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const sendEvent = (quake: QuakeEvent) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(quake)}\n\n`)
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

      quakeEmitter.on("quake", sendEvent);
      const pingInterval = setInterval(sendPing, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(pingInterval);
        quakeEmitter.off("quake", sendEvent);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);

      // Fallback cleanup if signal is not supported by the runtime
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
