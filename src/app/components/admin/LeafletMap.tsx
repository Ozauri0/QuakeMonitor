"use client";

import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GQStation {
  id: string;
  network: string;
  stationCode: string;
  lat: number;
  lon: number;
  elevation: number;
  hasAvailableChannel: boolean;
  isActive: boolean;
  selectedChannel?: string;
  selectedLocation?: string;
  sampleRate?: number;
}

interface LeafletMapProps {
  stations: GQStation[];
  onToggleStation: (id: string, activate: boolean) => void;
  onHighlightStation: (id: string | null) => void;
  activating: string | null;
  onBulkActionComplete: () => void;
}

const ACTIVE_COLOR = "#00e5ff";
const AVAILABLE_COLOR = "#4ade80";
const SELECTED_COLOR = "#ffffff";
const BULK_SELECTED_COLOR = "#fbbf24";
const SELECTED_WEIGHT = 3;
const NORMAL_WEIGHT = 1.5;

function LeafletMap({ stations, onToggleStation, onHighlightStation, activating, onBulkActionComplete }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const initializedRef = useRef(false);

  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectRect, setSelectRect] = useState<{
    left: number; top: number; width: number; height: number;
  } | null>(null);

  const selectStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stationsMap = useMemo(() => {
    const m = new Map<string, GQStation>();
    for (const s of stations) m.set(s.id, s);
    return m;
  }, [stations]);

  const selectedStation = selectedStationId ? stationsMap.get(selectedStationId) ?? null : null;

  const bulkStations = useMemo(() => {
    return Array.from(bulkSelectedIds)
      .map((id) => stationsMap.get(id))
      .filter((s): s is GQStation => s != null);
  }, [bulkSelectedIds, stationsMap]);

  const bulkActiveCount = bulkStations.filter((s) => s.isActive).length;
  const bulkInactiveCount = bulkStations.length - bulkActiveCount;

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-33.45, -70.67],
      zoom: 4,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
      worldCopyJump: false,
      preferCanvas: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      noWrap: true,
    }).addTo(map);

    const renderer = L.canvas({ padding: 0.5 });
    renderer.addTo(map);
    canvasRendererRef.current = renderer;

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
      canvasRendererRef.current = null;
    };
  }, []);

  // Sync markers with stations data
  useEffect(() => {
    const map = mapInstanceRef.current;
    const renderer = canvasRendererRef.current;
    if (!map || !renderer) return;

    const currentIds = new Set<string>();
    const markers = markersRef.current;

    for (const s of stations) {
      currentIds.add(s.id);

      const existing = markers.get(s.id);
      const isSelected = selectedStationId === s.id;
      const isBulkSelected = bulkSelectedIds.has(s.id);

      const baseColor = s.isActive ? ACTIVE_COLOR : AVAILABLE_COLOR;

      if (existing) {
        const newRadius = s.isActive ? 5 : 4;
        const newColor = isBulkSelected ? BULK_SELECTED_COLOR : baseColor;
        const newWeight = isSelected || isBulkSelected ? SELECTED_WEIGHT : NORMAL_WEIGHT;
        const newFillColor = isSelected ? SELECTED_COLOR : (isBulkSelected ? BULK_SELECTED_COLOR : baseColor);
        const newFillOpacity = isSelected || isBulkSelected ? 1 : 0.7;

        if (
          existing.getLatLng().lat !== s.lat ||
          existing.getLatLng().lng !== s.lon
        ) {
          existing.setLatLng([s.lat, s.lon]);
        }

        const opts = existing.options as any;
        if (
          opts.radius !== newRadius ||
          opts.color !== newColor ||
          opts.weight !== newWeight ||
          opts.fillColor !== newFillColor ||
          opts.fillOpacity !== newFillOpacity
        ) {
          existing.setStyle({
            radius: newRadius,
            color: newColor,
            weight: newWeight,
            fillColor: newFillColor,
            fillOpacity: newFillOpacity,
          });
        }
      } else {
        const marker = L.circleMarker([s.lat, s.lon], {
          radius: s.isActive ? 5 : 4,
          color: isBulkSelected ? BULK_SELECTED_COLOR : baseColor,
          weight: isSelected || isBulkSelected ? SELECTED_WEIGHT : NORMAL_WEIGHT,
          fillColor: isSelected ? SELECTED_COLOR : (isBulkSelected ? BULK_SELECTED_COLOR : baseColor),
          fillOpacity: isSelected || isBulkSelected ? 1 : 0.7,
          renderer,
          interactive: true,
          bubblingMouseEvents: false,
        });

        marker.bindTooltip(`${s.network}.${s.stationCode}`, {
          direction: "top",
          offset: [0, -6],
          className: "station-tooltip",
          opacity: 0.9,
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);

          if (selectionMode) {
            setBulkSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(s.id)) {
                next.delete(s.id);
              } else {
                next.add(s.id);
              }
              return next;
            });
          } else {
            const mapInst = mapInstanceRef.current;
            setSelectedStationId((prev) => (prev === s.id ? null : s.id));
            onHighlightStation(s.id);
            if (mapInst) {
              mapInst.setView([s.lat, s.lon], Math.max(mapInst.getZoom(), 6), { animate: true, duration: 0.3 });
            }
          }
        });

        marker.addTo(map);
        markers.set(s.id, marker);
      }
    }

    for (const [id, marker] of markers) {
      if (!currentIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [stations, selectedStationId, bulkSelectedIds, selectionMode, onHighlightStation]);

  // Map click to deselect (only when not in selection mode)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = () => {
      setSelectedStationId(null);
      onHighlightStation(null);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [onHighlightStation]);

  // Rectangle selection using DOM overlay to avoid Leaflet dragging conflicts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!selectionMode) return;
      if (e.button !== 0) return;
      if ((e.target as HTMLElement)?.closest("path, circle")) return;

      const rect = container.getBoundingClientRect();
      selectStartRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setIsSelecting(true);
      setSelectRect({ left: e.clientX - rect.left, top: e.clientY - rect.top, width: 0, height: 0 });
      e.stopImmediatePropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isSelecting || !selectStartRef.current) return;

      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const start = selectStartRef.current;

      setSelectRect({
        left: Math.min(start.x, currentX),
        top: Math.min(start.y, currentY),
        width: Math.abs(currentX - start.x),
        height: Math.abs(currentY - start.y),
      });
    };

    // Capture phase: intercept mousedown before Leaflet's drag handler
    container.addEventListener("mousedown", handleMouseDown, true);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown, true);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [selectionMode, isSelecting]);

  // Handle mouseup to finalize selection
  useEffect(() => {
    if (!isSelecting) return;

    const handleMouseUp = (e: MouseEvent) => {
      const map = mapInstanceRef.current;
      const container = containerRef.current;
      if (!map || !container || !selectStartRef.current) {
        setIsSelecting(false);
        setSelectRect(null);
        selectStartRef.current = null;
        return;
      }

      const rect = container.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      const start = selectStartRef.current;

      const left = Math.min(start.x, endX);
      const top = Math.min(start.y, endY);
      const right = Math.max(start.x, endX);
      const bottom = Math.max(start.y, endY);

      // Convert screen coords to lat/lng
      const topLeft = map.containerPointToLatLng([left, top]);
      const bottomRight = map.containerPointToLatLng([right, bottom]);
      const bounds = L.latLngBounds(topLeft, bottomRight);

      // Find stations inside bounds
      const insideIds: string[] = [];
      for (const s of stations) {
        if (bounds.contains([s.lat, s.lon])) {
          insideIds.push(s.id);
        }
      }

      if (insideIds.length > 0) {
        const additive = e.shiftKey;
        setBulkSelectedIds((prev) => {
          const next = additive ? new Set(prev) : new Set<string>();
          for (const id of insideIds) {
            next.add(id);
          }
          return next;
        });
      }

      setIsSelecting(false);
      setSelectRect(null);
      selectStartRef.current = null;
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isSelecting, stations]);

  // Fit bounds on first load
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || stations.length === 0 || initializedRef.current) return;
    const bounds = L.latLngBounds(stations.map((s) => [s.lat, s.lon]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
    }
    initializedRef.current = true;
  }, [stations]);

  const handleToggle = useCallback(() => {
    if (!selectedStation) return;
    onToggleStation(selectedStation.id, !selectedStation.isActive);
  }, [selectedStation, onToggleStation]);

  const handleBulkAction = useCallback(async (action: "activate" | "deactivate") => {
    const ids = Array.from(bulkSelectedIds);
    if (ids.length === 0) return;

    setBulkBusy(true);
    try {
      const res = await fetch("/api/gq-stations/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationIds: ids, action }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`Errores: ${data.failed} de ${ids.length} fallaron`);
      }
      setBulkSelectedIds(new Set());
      onBulkActionComplete();
    } catch (e: any) {
      alert(`Error: ${e?.message || "No se pudo ejecutar la acción"}`);
    } finally {
      setBulkBusy(false);
    }
  }, [bulkSelectedIds, onBulkActionComplete]);

  const handleClearSelection = useCallback(() => {
    setBulkSelectedIds(new Set());
  }, []);

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode - clear bulk selection
        setBulkSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={(el) => { (mapRef as any).current = el; (containerRef as any).current = el; }} className="absolute inset-0" />

      {/* Selection rectangle (DOM-based, no Leaflet dragging conflicts) */}
      {selectRect && isSelecting && (
        <div
          className="absolute pointer-events-none border border-yellow-400 bg-yellow-400/15 z-[600]"
          style={{
            left: selectRect.left,
            top: selectRect.top,
            width: selectRect.width,
            height: selectRect.height,
          }}
        />
      )}

      <style>{`
        .station-tooltip {
          background: rgba(17, 24, 39, 0.95) !important;
          border: 1px solid rgba(75, 85, 99, 0.6) !important;
          border-radius: 4px !important;
          color: #d1d5db !important;
          font-size: 10px !important;
          font-family: monospace !important;
          padding: 2px 6px !important;
          box-shadow: none !important;
        }
        .station-tooltip::before {
          border-top-color: rgba(17, 24, 39, 0.95) !important;
        }
      `}</style>

      {/* Selection mode toggle */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
        <button
          onClick={handleToggleSelectionMode}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
            selectionMode
              ? "bg-yellow-600/80 text-white border-yellow-500 shadow-lg shadow-yellow-500/20"
              : "bg-gray-900/90 text-gray-300 border-gray-600 hover:bg-gray-800"
          }`}
        >
          {selectionMode ? "✓ Modo selección" : "Selección por región"}
        </button>
      </div>

      {/* Selection hint */}
      {selectionMode && (
        <div className="absolute top-16 right-4 z-[1000] pointer-events-none">
          <span className="text-[10px] text-yellow-300/80 bg-gray-900/70 px-2 py-1 rounded">
            Arrastra para seleccionar &middot; Shift para sumar &middot; Click en estación para toggle
          </span>
        </div>
      )}

      {/* Bulk action bar */}
      {bulkSelectedIds.size > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
          <div className="flex items-center gap-3 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl px-4 py-3 shadow-2xl">
            <span className="text-sm text-gray-300 font-medium">
              {bulkSelectedIds.size} estación{bulkSelectedIds.size !== 1 ? "es" : ""} seleccionada{bulkSelectedIds.size !== 1 ? "s" : ""}
            </span>

            <span className="text-gray-600">|</span>

            <button
              onClick={() => handleBulkAction("activate")}
              disabled={bulkBusy || bulkInactiveCount === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-700/80 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-green-600"
            >
              Activar {bulkInactiveCount > 0 ? `(${bulkInactiveCount})` : "todas"}
            </button>

            <button
              onClick={() => handleBulkAction("deactivate")}
              disabled={bulkBusy || bulkActiveCount === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-700/80 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-red-600"
            >
              Desactivar {bulkActiveCount > 0 ? `(${bulkActiveCount})` : "todas"}
            </button>

            <span className="text-gray-600">|</span>

            <button
              onClick={handleClearSelection}
              disabled={bulkBusy}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Single station detail panel (hidden in selection mode) */}
      {selectedStation && !selectionMode && (
        <div className="absolute top-4 left-4 z-[1000] w-72 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl pointer-events-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {selectedStation.network}.{selectedStation.stationCode}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">{selectedStation.id}</p>
              </div>
              <button
                onClick={() => { setSelectedStationId(null); onHighlightStation(null); }}
                className="text-gray-500 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-3">
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                  selectedStation.isActive
                    ? "bg-green-900/50 text-green-400 border border-green-800"
                    : selectedStation.hasAvailableChannel
                    ? "bg-yellow-900/30 text-yellow-400 border border-yellow-800"
                    : "bg-gray-800 text-gray-500 border border-gray-700"
                }`}
              >
                {selectedStation.isActive
                  ? "✓ Activa"
                  : selectedStation.hasAvailableChannel
                  ? "○ Disponible"
                  : "× No disponible"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-gray-500 text-[10px]">Latitud</p>
                <p className="text-gray-300 font-mono">{selectedStation.lat.toFixed(4)}°</p>
              </div>
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-gray-500 text-[10px]">Longitud</p>
                <p className="text-gray-300 font-mono">{selectedStation.lon.toFixed(4)}°</p>
              </div>
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-gray-500 text-[10px]">Elevación</p>
                <p className="text-gray-300 font-mono">{selectedStation.elevation}m</p>
              </div>
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-gray-500 text-[10px]">Canal</p>
                <p className="text-gray-300 font-mono">{selectedStation.selectedChannel || "—"}</p>
              </div>
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-gray-500 text-[10px]">Ubicación</p>
                <p className="text-gray-300 font-mono">{selectedStation.selectedLocation || "—"}</p>
              </div>
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-gray-500 text-[10px]">Sample Rate</p>
                <p className="text-gray-300 font-mono">{selectedStation.sampleRate || "—"} sps</p>
              </div>
            </div>

            {selectedStation.hasAvailableChannel ? (
              <button
                onClick={handleToggle}
                disabled={activating === selectedStation.id}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
                  activating === selectedStation.id
                    ? "bg-gray-700 text-gray-500 cursor-wait"
                    : selectedStation.isActive
                    ? "bg-red-900/60 text-red-300 hover:bg-red-800/60 border border-red-700"
                    : "bg-green-900/60 text-green-300 hover:bg-green-800/60 border border-green-700"
                }`}
              >
                {activating === selectedStation.id
                  ? "Procesando..."
                  : selectedStation.isActive
                  ? "Desactivar estación"
                  : "Activar estación"}
              </button>
            ) : (
              <div className="text-center text-gray-600 text-xs py-2">
                No hay canal disponible
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(LeafletMap);
