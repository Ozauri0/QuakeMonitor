"use client";

import { useState, useEffect } from "react";
import { Station } from "@/app/types/station";

export function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/stream/stations");

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const data: Station[] = JSON.parse(event.data);
        setStations(data);
      } catch (e) {
        console.error("Failed to parse station SSE message", e);
      }
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, []);

  return { stations, connected };
}
