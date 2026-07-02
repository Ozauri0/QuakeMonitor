"use client";

import { QuakeEvent } from "@/app/types/quake";
import { format } from "date-fns";
import {
  Wifi,
  WifiOff,
  Radio,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Square,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { useSettings } from "@/app/context/SettingsContext";

interface SidebarProps {
  archived: QuakeEvent[];
  archivedTotal: number;
  connected: boolean;
  autoTrack: boolean;
  onAutoTrackChange: (enabled: boolean) => void;
  onReplayArchived: (id: string) => void;
  replayingId: string | null;
  onStopReplay: () => void;
  showStations: boolean;
  onToggleStations: () => void;
  showArchived: boolean;
  onToggleArchived: () => void;
}

export default function Sidebar({
  archived,
  archivedTotal,
  connected,
  autoTrack,
  onAutoTrackChange,
  onReplayArchived,
  replayingId,
  onStopReplay,
  showStations,
  onToggleStations,
  showArchived,
  onToggleArchived,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { pending } = useSettings();

  const SIDEBAR_MAX_ARCHIVED = 30;
  const displayArchived = archived.slice(0, SIDEBAR_MAX_ARCHIVED);

  function getMagColorClass(mag: number) {
    // Tailwind classes per pending range (positions match default ranges)
    const r = pending.quakeColorRanges;
    const last = r[r.length - 1];
    if (r.length === 0) return "text-gray-400";
    for (let i = r.length - 1; i >= 0; i--) {
      if (mag >= r[i].minMagnitude) {
        // Map range index to a tailwind color class
        const palette = ["text-green-400", "text-yellow-400", "text-orange-400", "text-red-400", "text-purple-400"];
        return palette[Math.min(i, palette.length - 1)] ?? "text-red-400";
      }
    }
    return "text-gray-400";
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 right-4 z-[60] p-2 rounded-lg bg-gray-800/90 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors pointer-events-auto"
        title={isOpen ? "Ocultar panel" : "Mostrar panel"}
      >
        {isOpen ? (
          <PanelRightClose className="w-5 h-5" />
        ) : (
          <PanelRightOpen className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <aside className="relative w-full h-full bg-gray-900/80 backdrop-blur-md border-l border-gray-800 flex flex-col text-gray-100 pointer-events-auto">
          <div className="p-4 border-b border-gray-800">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Radio className="w-6 h-6 text-red-500" />
              QuakeMonitor 3D
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {connected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">
                    Conectado al servidor local
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Desconectado</span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 border-b border-gray-800 space-y-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Control de Cámara
            </h2>
            <button
              onClick={() => onAutoTrackChange(!autoTrack)}
              className={`w-full px-3 py-2 rounded text-xs font-semibold transition-colors ${
                autoTrack
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {autoTrack ? "Auto-Seguimiento: ON" : "Auto-Seguimiento: OFF"}
            </button>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onToggleStations}
                className={`flex-1 px-2 py-1.5 rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                  showStations
                    ? "bg-cyan-900/60 text-cyan-300 border border-cyan-800"
                    : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
                }`}
              >
                {showStations ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
                Estaciones
              </button>
              <button
                onClick={onToggleArchived}
                className={`flex-1 px-2 py-1.5 rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                  showArchived
                    ? "bg-amber-900/60 text-amber-300 border border-amber-800"
                    : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
                }`}
              >
                {showArchived ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
                Archivados
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displayArchived.length === 0 && (
              <p className="text-gray-500 text-sm text-center mt-8">
                No hay sismos recientes...
              </p>
            )}
            {displayArchived.map((quake) => {
              const isReplaying = replayingId === quake.id;
              return (
                <div
                  key={quake.id}
                  onClick={() => onReplayArchived(quake.id)}
                  className={`bg-gray-800/60 rounded-lg p-3 border transition-colors cursor-pointer select-none ${
                    isReplaying
                      ? "border-red-500/70 bg-red-900/20"
                      : "border-gray-700/50 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-lg font-bold ${getMagColorClass(
                        quake.mag
                      )}`}
                    >
                      M {quake.mag.toFixed(1)}
                    </span>
                    <div className="flex items-center gap-2">
                      {isReplaying && (
                        <span className="text-[10px] bg-red-600/40 text-red-300 px-1.5 py-0.5 rounded animate-pulse">
                          Reproduciendo
                        </span>
                      )}
                      <Play className="w-3 h-3 text-gray-500" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 font-medium">
                    {quake.locationName}
                  </p>
                  <div className="mt-1 text-xs text-gray-500 flex justify-between">
                    <span>
                      {quake.lat.toFixed(2)}°, {quake.lon.toFixed(2)}°
                    </span>
                    <span>{quake.depth.toFixed(1)} km</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(quake.time, "HH:mm:ss dd/MM/yyyy")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Stop replay button */}
          {replayingId && (
            <div className="p-3 border-t border-gray-800">
              <button
                onClick={onStopReplay}
                className="w-full px-3 py-2 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2 bg-red-700 text-white hover:bg-red-600"
              >
                <Square className="w-3 h-3" />
                Detener Animación Repetida
              </button>
            </div>
          )}

          <div className="p-3 border-t border-gray-800 text-xs text-gray-600 text-center">
            {archivedTotal > displayArchived.length
              ? `${displayArchived.length} de ${archivedTotal} sismos recientes`
              : `${archivedTotal} sismos recientes`}
          </div>
        </aside>
      )}
    </>
  );
}
