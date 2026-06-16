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

function LeafletMap({ stations, onToggleStation, onHighlightStation, activating }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const initializedRef = useRef(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // Derived station map — no state, no extra re-render
  const stationsMap = useMemo(() => {
    const m = new Map<string, GQStation>();
    for (const s of stations) m.set(s.id, s);
    return m;
  }, [stations]);

  // Selected station derived from id + map
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
      renderer: L.canvas({ padding: 0.5 }),
      preferCanvas: true,
      // Performance: skip animations for pan/zoom
      zoomAnimation: false,
      markerZoomAnimation: false,
      fadeAnimation: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      // Cache tiles for faster panning
      updateWhenIdle: true,
      updateWhenZooming: false,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Stable click handler — doesn't depend on onHighlightStation changing
  const handleMarkerClick = useCallback(
    (stationId: string, lat: number, lon: number) => {
      setSelectedStationId((prev) => (prev === stationId ? null : stationId));
      onHighlightStation(stationId);
      const map = mapInstanceRef.current;
      if (map) {
        map.setView([lat, lon], Math.max(map.getZoom(), 6), { animate: true, duration: 0.3 });
      }
    },
    [onHighlightStation]
  );

  // Optimized marker update — only add/remove/update what changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentIds = new Set(stations.map((s) => s.id));
    const existingIds = new Set(markersRef.current.keys());

    // Remove stale markers
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const marker = markersRef.current.get(id)!;
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    }

    // Add new markers / update existing
    for (const s of stations) {
      const fillColor = s.isActive ? "#00e5ff" : "#4ade80";
      const radius = s.isActive ? 4 : 3;
      const weight = s.isActive ? 1.5 : 1;

      let marker = markersRef.current.get(s.id);

      if (!marker) {
        // New marker
        marker = L.circleMarker([s.lat, s.lon], {
          radius,
          fillColor,
          fillOpacity: 0.7,
          color: fillColor,
          weight,
          opacity: 0.8,
        });

        const sid = s.id;
        const slat = s.lat;
        const slon = s.lon;
        marker.on("click", (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          handleMarkerClick(sid, slat, slon);
        });

        markersRef.current.set(sid, marker);
        marker.addTo(map);
      } else {
        // Update only if style actually changed
        if (marker.options.fillColor !== fillColor) {
          marker.setStyle({ fillColor, color: fillColor, radius, weight });
        }
      }
    }
  }, [stations, handleMarkerClick]);

  // Fit bounds on first load only
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || stations.length === 0 || initializedRef.current) return;
    const bounds = L.latLngBounds(stations.map((s) => [s.lat, s.lon]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
    initializedRef.current = true;
  }, [stations]);

  // Close panel on map click
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const handleMapClick = () => setSelectedStationId(null);
    map.on("click", handleMapClick);
    return () => { map.off("click", handleMapClick); };
  }, []);

  const handleToggle = useCallback(() => {
    if (!selectedStation) return;
    onToggleStation(selectedStation.id, !selectedStation.isActive);
    // Optimistic local update
    setSelectedStationId((prev) => prev); // keep same id, station data will update from parent
  }, [selectedStation, onToggleStation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Station Detail Panel */}
      {selectedStation && (
        <div className="absolute top-4 left-4 z-[1000] w-72 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl pointer-events-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {selectedStation.network}.{selectedStation.stationCode}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {selectedStation.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedStationId(null)}
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
