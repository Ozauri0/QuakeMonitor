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
}

const ACTIVE_COLOR = "#00e5ff";
const AVAILABLE_COLOR = "#4ade80";
const SELECTED_COLOR = "#ffffff";
const SELECTED_WEIGHT = 3;
const NORMAL_WEIGHT = 1.5;

function LeafletMap({ stations, onToggleStation, onHighlightStation, activating }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const initializedRef = useRef(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const stationsMap = useMemo(() => {
    const m = new Map<string, GQStation>();
    for (const s of stations) m.set(s.id, s);
    return m;
  }, [stations]);

  const selectedStation = selectedStationId ? stationsMap.get(selectedStationId) ?? null : null;

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

      if (existing) {
        // Update existing marker if properties changed
        const newRadius = s.isActive ? 5 : 4;
        const newColor = s.isActive ? ACTIVE_COLOR : AVAILABLE_COLOR;
        const newWeight = isSelected ? SELECTED_WEIGHT : NORMAL_WEIGHT;
        const newFillColor = isSelected ? SELECTED_COLOR : newColor;
        const newFillOpacity = isSelected ? 1 : 0.7;

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
        // Create new marker
        const marker = L.circleMarker([s.lat, s.lon], {
          radius: s.isActive ? 5 : 4,
          color: s.isActive ? ACTIVE_COLOR : AVAILABLE_COLOR,
          weight: isSelected ? SELECTED_WEIGHT : NORMAL_WEIGHT,
          fillColor: isSelected ? SELECTED_COLOR : (s.isActive ? ACTIVE_COLOR : AVAILABLE_COLOR),
          fillOpacity: isSelected ? 1 : 0.7,
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

        marker.on("click", () => {
          const mapInst = mapInstanceRef.current;
          setSelectedStationId((prev) => (prev === s.id ? null : s.id));
          onHighlightStation(s.id);
          if (mapInst) {
            mapInst.setView([s.lat, s.lon], Math.max(mapInst.getZoom(), 6), { animate: true, duration: 0.3 });
          }
        });

        marker.addTo(map);
        markers.set(s.id, marker);
      }
    }

    // Remove stale markers
    for (const [id, marker] of markers) {
      if (!currentIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [stations, selectedStationId, onHighlightStation]);

  // Update selected marker style when selection changes
  useEffect(() => {
    const markers = markersRef.current;
    for (const [id, marker] of markers) {
      const s = stationsMap.get(id);
      if (!s) continue;

      const isSelected = selectedStationId === id;
      const color = s.isActive ? ACTIVE_COLOR : AVAILABLE_COLOR;

      marker.setStyle({
        weight: isSelected ? SELECTED_WEIGHT : NORMAL_WEIGHT,
        fillColor: isSelected ? SELECTED_COLOR : color,
        fillOpacity: isSelected ? 1 : 0.7,
        color,
      });
    }
  }, [selectedStationId, stationsMap]);

  // Map click to deselect
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

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0" />

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

      {selectedStation && (
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
