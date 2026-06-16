"use client";

import { useState, useEffect } from "react";
import GlobeView from "./GlobeView";
import Sidebar from "./Sidebar";
import { LiveMainCard, LiveSecondaryCard } from "./LiveDashboard";
import { useLocalQuakes } from "@/app/hooks/useLocalQuakes";
import { useStations } from "@/app/hooks/useStations";

export default function QuakeMap() {
  const {
    live,
    archived,
    focusedLiveQuake,
    secondaryLiveQuakes,
    connected,
  } = useLocalQuakes();
  const { stations } = useStations();
  const [autoTrack, setAutoTrack] = useState(true);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [showStations, setShowStations] = useState(true);
  const [showArchived, setShowArchived] = useState(true);

  const VISIBLE_ARCHIVED = 10;
  const archivedForDisplay = archived.slice(0, VISIBLE_ARCHIVED);

  // Auto-stop replay after 10 seconds
  useEffect(() => {
    if (!replayingId) return;
    const timeout = setTimeout(() => setReplayingId(null), 10_000);
    return () => clearTimeout(timeout);
  }, [replayingId]);

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      <div className="absolute inset-0 z-0 globe-wrapper">
        <GlobeView
          live={live}
          archived={archivedForDisplay}
          archivedAll={archived}
          focusedQuake={focusedLiveQuake}
          replayingId={replayingId}
          autoTrack={autoTrack}
          stations={stations}
          showStations={showStations}
          showArchived={showArchived}
        />
      </div>

      {/* Live Main Card - Top Left */}
      {focusedLiveQuake && (
        <div className="absolute top-3 left-3 md:top-4 md:left-4 z-50 w-full max-w-[18rem] md:w-80">
          <LiveMainCard quake={focusedLiveQuake} />
        </div>
      )}

      {/* Secondary Live Cards - Left Center */}
      {secondaryLiveQuakes.length > 0 && (
        <div
          className={`absolute left-3 md:left-4 z-50 flex flex-col gap-2 max-h-[calc(100vh-240px)] md:max-h-[calc(100vh-260px)] overflow-y-auto pb-4 w-full max-w-[16rem] md:w-auto ${
            focusedLiveQuake ? "top-52 md:top-60" : "top-3 md:top-4"
          }`}
        >
          {secondaryLiveQuakes.map((q) => (
            <LiveSecondaryCard key={q.id} quake={q} />
          ))}
        </div>
      )}

      {/* Archived Sidebar - Right */}
      <div className="absolute right-0 top-0 bottom-0 z-50 w-full max-w-[20rem] md:w-96 pointer-events-none">
        <Sidebar
          archived={archivedForDisplay}
          archivedTotal={archived.length}
          connected={connected}
          autoTrack={autoTrack}
          onAutoTrackChange={setAutoTrack}
          onReplayArchived={setReplayingId}
          replayingId={replayingId}
          onStopReplay={() => setReplayingId(null)}
          showStations={showStations}
          onToggleStations={() => setShowStations((v) => !v)}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((v) => !v)}
        />
      </div>
    </div>
  );
}
