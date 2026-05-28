"use client";

import { useState, useEffect, useCallback } from "react";
import { Station } from "@/app/types/station";

export function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [connected, setConnected] = useState(false);

  const mergeStations = useCallback((incoming: Station[]) => {
    setStations((prev) => {
      const prevMap = new Map(prev.map((s) => [s.id, s]));
      let changed = false;

      for (const s of incoming) {
        const existing = prevMap.get(s.id);
        if (!existing) {
          prevMap.set(s.id, s);
          changed = true;
        } else if (
          existing.lat !== s.lat ||
          existing.lon !== s.lon ||
          existing.active !== s.active ||
          existing.name !== s.name ||
          existing.network !== s.network
        ) {
          prevMap.set(s.id, s);
          changed = true;
        }
      }

      // Remove stations no longer present (optional, keeps list clean)
      if (incoming.length < prev.length) {
        const incomingIds = new Set(incoming.map((s) => s.id));
        for (const id of prevMap.keys()) {
          if (!incomingIds.has(id)) {
            prevMap.delete(id);
            changed = true;
          }
        }
      }

      if (!changed) return prev;
      return Array.from(prevMap.values());
    });
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("/api/stream/stations");

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const data: Station[] = JSON.parse(event.data);
        mergeStations(data);
      } catch (e) {
        console.error("Failed to parse station SSE message", e);
      }
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [mergeStations]);

  return { stations, connected };
}
