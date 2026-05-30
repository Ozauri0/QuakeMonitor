"use client";

import { QuakeEvent } from "@/app/types/quake";
import { format } from "date-fns";
import {
  Wifi,
  WifiOff,
  Radio,
  Zap,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Square,
  Eye,
  EyeOff,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useSettings } from "@/app/context/SettingsContext";

interface SidebarProps {
  archived: QuakeEvent[];
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

function getMagColorClass(mag: number) {
  if (mag >= 5) return "text-red-400";
  if (mag >= 3) return "text-yellow-400";
  return "text-green-400";
}

export default function Sidebar({
  archived,
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
  const { settings, updateSettings } = useSettings();
  const [isOpen, setIsOpen] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [simLat, setSimLat] = useState("");
  const [simLon, setSimLon] = useState("");
  const [simMag, setSimMag] = useState("");
  const [simDepth, setSimDepth] = useState("");
  const [simName, setSimName] = useState("");

  const handleSimulate = useCallback(async () => {
    setSimulating(true);
    const lat = simLat ? parseFloat(simLat) : parseFloat((Math.random() * 140 - 60).toFixed(4));
    const lon = simLon ? parseFloat(simLon) : parseFloat((Math.random() * 360 - 180).toFixed(4));
    const depth = simDepth ? parseFloat(simDepth) : parseFloat((Math.random() * 700).toFixed(1));
    const mag = simMag ? parseFloat(simMag) : parseFloat((Math.random() * 6.5 + 2.0).toFixed(1));

    const payload = {
      id: `sim-${Date.now()}`,
      lat,
      lon,
      depth,
      mag,
      locationName: simName || `Simulación #${archived.length + 1}`,
      time: Date.now(),
      isUpdate: false,
    };

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("Simulación falló:", await res.text());
      }
    } catch (e) {
      console.error("Error enviando simulación:", e);
    } finally {
      setSimulating(false);
    }
  }, [archived.length, simLat, simLon, simMag, simDepth, simName]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 right-4 z-[60] p-2 rounded-lg bg-gray-800/90 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        title={isOpen ? "Ocultar panel" : "Mostrar panel"}
      >
        {isOpen ? (
          <PanelRightClose className="w-5 h-5" />
        ) : (
          <PanelRightOpen className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <aside className="relative w-full h-full bg-gray-900/80 backdrop-blur-md border-l border-gray-800 flex flex-col text-gray-100">
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

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Camera control */}
            <div className="space-y-2">
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
            </div>

            {/* Layer toggles */}
            <div className="flex gap-2">
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

            {/* Simulate */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Simular Sismo
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Lat"
                  value={simLat}
                  onChange={(e) => setSimLat(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Lon"
                  value={simLon}
                  onChange={(e) => setSimLon(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Mag"
                  value={simMag}
                  onChange={(e) => setSimMag(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Prof (km)"
                  value={simDepth}
                  onChange={(e) => setSimDepth(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <input
                type="text"
                placeholder="Nombre ubicación"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full px-3 py-2 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2 bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-3 h-3" />
                {simulating ? "Enviando..." : "Simular Sismo"}
              </button>
            </div>

            {/* Visual Settings */}
            <div className="space-y-2">
              <button
                onClick={() => setConfigOpen(!configOpen)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configuración Visual
                </span>
                {configOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {configOpen && (
                <div className="space-y-3 p-2 bg-gray-800/40 rounded border border-gray-700/50">
                  {/* Quake colors */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase">Colores Sismos</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500">&lt;3</span>
                        <input
                          type="color"
                          value={settings.quakePointColorLow.replace("rgba", "").replace(/[()]/g, "").split(",").slice(0, 3).map((v, i) => (i === 0 ? parseInt(v.trim()).toString(16).padStart(2, "0") : parseInt(v.trim()).toString(16).padStart(2, "0"))).reduce((a, b) => a + b, "#") || "#00ff00"}
                          onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            updateSettings({ quakePointColorLow: `rgba(${r}, ${g}, ${b}, 0.6)` });
                          }}
                          className="w-full h-6 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500">3-5</span>
                        <input
                          type="color"
                          value={settings.quakePointColorMid.replace("rgba", "").replace(/[()]/g, "").split(",").slice(0, 3).map((v, i) => (i === 0 ? parseInt(v.trim()).toString(16).padStart(2, "0") : parseInt(v.trim()).toString(16).padStart(2, "0"))).reduce((a, b) => a + b, "#") || "#ffff00"}
                          onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            updateSettings({ quakePointColorMid: `rgba(${r}, ${g}, ${b}, 0.6)` });
                          }}
                          className="w-full h-6 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500">&gt;=5</span>
                        <input
                          type="color"
                          value={settings.quakePointColorHigh.replace("rgba", "").replace(/[()]/g, "").split(",").slice(0, 3).map((v, i) => (i === 0 ? parseInt(v.trim()).toString(16).padStart(2, "0") : parseInt(v.trim()).toString(16).padStart(2, "0"))).reduce((a, b) => a + b, "#") || "#ff0000"}
                          onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            updateSettings({ quakePointColorHigh: `rgba(${r}, ${g}, ${b}, 0.6)` });
                          }}
                          className="w-full h-6 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Station colors */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase">Colores Estaciones</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500">Activa</span>
                        <input
                          type="color"
                          value="#00c8ff"
                          onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            updateSettings({ stationColorActive: `rgba(${r}, ${g}, ${b}, 0.7)` });
                          }}
                          className="w-full h-6 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500">Inactiva</span>
                        <input
                          type="color"
                          value="#646464"
                          onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            updateSettings({ stationColorInactive: `rgba(${r}, ${g}, ${b}, 0.4)` });
                          }}
                          className="w-full h-6 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-gray-400 flex justify-between">
                        <span>Altitud Anillos</span>
                        <span>{settings.ringAltitude.toFixed(3)}</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="0.1"
                        step="0.001"
                        value={settings.ringAltitude}
                        onChange={(e) => updateSettings({ ringAltitude: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 flex justify-between">
                        <span>Altitud Puntos</span>
                        <span>{settings.pointAltitude.toFixed(3)}</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="0.1"
                        step="0.001"
                        value={settings.pointAltitude}
                        onChange={(e) => updateSettings({ pointAltitude: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 flex justify-between">
                        <span>Velocidad Anillo</span>
                        <span>{settings.ringPropagationSpeed}</span>
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={settings.ringPropagationSpeed}
                        onChange={(e) => updateSettings({ ringPropagationSpeed: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 flex justify-between">
                        <span>Periodo Repetición (ms)</span>
                        <span>{settings.ringRepeatPeriod}</span>
                      </label>
                      <input
                        type="range"
                        min="500"
                        max="5000"
                        step="100"
                        value={settings.ringRepeatPeriod}
                        onChange={(e) => updateSettings({ ringRepeatPeriod: parseInt(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 flex justify-between">
                        <span>Tamaño Base Puntos</span>
                        <span>{settings.quakePointSizeBase.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={settings.quakePointSizeBase}
                        onChange={(e) => updateSettings({ quakePointSizeBase: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 flex justify-between">
                        <span>Tamaño Estaciones</span>
                        <span>{settings.stationPointSize.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.01"
                        value={settings.stationPointSize}
                        onChange={(e) => updateSettings({ stationPointSize: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Archived list */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Archivados
              </h2>
              {archived.length === 0 && (
                <p className="text-gray-500 text-sm text-center mt-8">
                  No hay sismos archivados...
                </p>
              )}
              {archived.map((quake) => {
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
            {archived.length} eventos archivados
          </div>
        </aside>
      )}
    </>
  );
}
