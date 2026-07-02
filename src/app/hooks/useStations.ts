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
          // New station — only add if active
          if (s.active) {
            prevMap.set(s.id, s);
            changed = true;
          }
        } else {
          // Existing station — update position/name/network, preserve active
          // unless the incoming data explicitly sets active
          const merged = { ...existing };
          let fieldChanged = false;

          if (existing.lat !== s.lat) { merged.lat = s.lat; fieldChanged = true; }
          if (existing.lon !== s.lon) { merged.lon = s.lon; fieldChanged = true; }
          if (existing.name !== s.name) { merged.name = s.name; fieldChanged = true; }
          if (existing.network !== s.network) { merged.network = s.network; fieldChanged = true; }

          // Only update active if incoming explicitly provides it
          // (webhook data has active=undefined, action/initial data has active=true/false)
          if (s.active !== undefined && existing.active !== s.active) {
            merged.active = s.active;
            fieldChanged = true;
          }

          if (fieldChanged) {
            // If station became inactive, remove it from the list
            if (merged.active === false) {
              prevMap.delete(s.id);
            } else {
              prevMap.set(s.id, merged);
            }
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
