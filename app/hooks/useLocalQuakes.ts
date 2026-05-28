"use client";

import { useState, useEffect, useCallback } from "react";
import { QuakeEvent } from "@/app/types/quake";

const LIVE_WINDOW_MS = 90_000;
const ROTATION_INTERVAL_MS = 10_000;

interface QuakeState {
  live: QuakeEvent[];
  archived: QuakeEvent[];
  focusedLiveIndex: number;
  lastReceivedAt: Record<string, number>;
}

export function useLocalQuakes() {
  const [state, setState] = useState<QuakeState>({
    live: [],
    archived: [],
    focusedLiveIndex: 0,
    lastReceivedAt: {},
  });
  const [connected, setConnected] = useState(false);

  const processQuake = useCallback((quake: QuakeEvent) => {
    const now = Date.now();
    setState((prev) => {
      const newLastReceived = { ...prev.lastReceivedAt, [quake.id]: now };

      // 1. If already archived, update silently
      const archivedIndex = prev.archived.findIndex((q) => q.id === quake.id);
      if (archivedIndex !== -1) {
        const newArchived = [...prev.archived];
        newArchived[archivedIndex] = quake;
        return {
          ...prev,
          archived: newArchived,
          lastReceivedAt: newLastReceived,
        };
      }

      // 2. If in live, update data and re-sort by recency
      const liveIndex = prev.live.findIndex((q) => q.id === quake.id);
      let newLive: QuakeEvent[];
      let newFocusedIndex = prev.focusedLiveIndex;

      if (liveIndex !== -1) {
        newLive = [...prev.live];
        newLive[liveIndex] = quake;
        newLive.sort((a, b) => newLastReceived[b.id] - newLastReceived[a.id]);
        // Don't reset focus on update, let rotation handle it
      } else {
        // 3. New quake -> add to live, reset focus to newest
        newLive = [quake, ...prev.live];
        newLive.sort((a, b) => newLastReceived[b.id] - newLastReceived[a.id]);
        newFocusedIndex = 0;
      }

      return {
        ...prev,
        live: newLive,
        lastReceivedAt: newLastReceived,
        focusedLiveIndex: newFocusedIndex,
      };
    });
  }, []);

  // Expiry timer: move quakes older than 90s to archived
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const toArchive: QuakeEvent[] = [];
        const remainingLive: QuakeEvent[] = [];

        prev.live.forEach((q) => {
          const lastRec = prev.lastReceivedAt[q.id] || 0;
          if (now - lastRec > LIVE_WINDOW_MS) {
            toArchive.push(q);
          } else {
            remainingLive.push(q);
          }
        });

        if (toArchive.length === 0) return prev;

        const newArchived = [...toArchive, ...prev.archived];
        const archivedMap = new Map<string, QuakeEvent>();
        newArchived.forEach((q) => archivedMap.set(q.id, q));

        let newFocusedIndex = prev.focusedLiveIndex;
        if (remainingLive.length === 0) {
          newFocusedIndex = 0;
        } else if (newFocusedIndex >= remainingLive.length) {
          newFocusedIndex = 0;
        }

        return {
          ...prev,
          live: remainingLive,
          archived: Array.from(archivedMap.values()),
          focusedLiveIndex: newFocusedIndex,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Rotation timer: cycle focus every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.live.length <= 1) return prev;
        return {
          ...prev,
          focusedLiveIndex: (prev.focusedLiveIndex + 1) % prev.live.length,
        };
      });
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // SSE connection
  useEffect(() => {
    const eventSource = new EventSource("/api/stream/quakes");

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const quake: QuakeEvent = JSON.parse(event.data);
        processQuake(quake);
      } catch (e) {
        console.error("Failed to parse SSE message", e);
      }
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [processQuake]);

  const focusedLiveQuake =
    state.live.length > 0 ? state.live[state.focusedLiveIndex] : null;

  const secondaryLiveQuakes = state.live.filter(
    (_, i) => i !== state.focusedLiveIndex
  );

  return {
    live: state.live,
    archived: state.archived,
    focusedLiveQuake,
    secondaryLiveQuakes,
    connected,
  };
}
