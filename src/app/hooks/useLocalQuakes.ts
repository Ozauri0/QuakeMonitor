"use client";

import { useState, useEffect, useCallback } from "react";
import { QuakeEvent } from "@/app/types/quake";

const LIVE_WINDOW_MS = 90_000;
const ROTATION_INTERVAL_MS = 10_000;
const MAX_ARCHIVED = 30;

interface QuakeState {
  live: QuakeEvent[];
  archived: QuakeEvent[];
  focusedLiveIndex: number;
  lastReceivedAt: Record<string, number>;
  historyLoaded: boolean;
}

export function useLocalQuakes() {
  const [state, setState] = useState<QuakeState>({
    live: [],
    archived: [],
    focusedLiveIndex: 0,
    lastReceivedAt: {},
    historyLoaded: false,
  });
  const [connected, setConnected] = useState(false);

  // Load historical quakes from MongoDB on mount
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch("/api/quakes/history?limit=30");
        if (!res.ok) return;
        const quakes: (QuakeEvent & { updatedAt?: number })[] = await res.json();
        if (cancelled || quakes.length === 0) return;

        const now = Date.now();
        const live: QuakeEvent[] = [];
        const archived: QuakeEvent[] = [];
        const lastReceivedAt: Record<string, number> = {};

        for (const q of quakes) {
          // Use updatedAt as lastReceivedAt — falls back to current time if missing
          const receivedAt = q.updatedAt || now;
          lastReceivedAt[q.id] = receivedAt;

          const quakeEvent: QuakeEvent = {
            id: q.id,
            lat: q.lat,
            lon: q.lon,
            depth: q.depth,
            mag: q.mag,
            locationName: q.locationName,
            time: q.time,
            isUpdate: q.isUpdate,
          };

          if (now - receivedAt < LIVE_WINDOW_MS) {
            live.push(quakeEvent);
          } else {
            archived.push(quakeEvent);
          }
        }

        // Sort live by recency
        live.sort((a, b) => lastReceivedAt[b.id] - lastReceivedAt[a.id]);
        // Sort archived by time descending, cap at MAX_ARCHIVED
        archived.sort((a, b) => b.time - a.time);

        setState((prev) => ({
          ...prev,
          live,
          archived: archived.slice(0, MAX_ARCHIVED),
          lastReceivedAt,
          historyLoaded: true,
        }));
      } catch (err) {
        console.error("[HISTORY] Failed to load:", err);
        setState((prev) => ({ ...prev, historyLoaded: true }));
      }
    }

    loadHistory();
    return () => { cancelled = true; };
  }, []);

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

        // Cap archived at MAX_ARCHIVED (most recent first)
        const cappedArchived = Array.from(archivedMap.values()).slice(0, MAX_ARCHIVED);

        return {
          ...prev,
          live: remainingLive,
          archived: cappedArchived,
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

  // Combined list: live + archived, sorted by time descending, capped at 30
  const recentQuakes = [...state.live, ...state.archived]
    .sort((a, b) => b.time - a.time)
    .slice(0, 30);

  return {
    live: state.live,
    archived: recentQuakes,
    focusedLiveQuake,
    secondaryLiveQuakes,
    connected,
  };
}
