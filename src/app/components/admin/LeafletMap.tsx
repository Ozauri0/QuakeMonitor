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

interface StationCanvasLayer extends L.Layer {
  setStations(stations: GQStation[]): void;
  setSelectedId(id: string | null): void;
  getStationAt(latlng: L.LatLng, radiusPx: number): GQStation | null;
}

const ACTIVE_COLOR = "#00e5ff";
const AVAILABLE_COLOR = "#4ade80";
const SELECTED_STROKE = "#ffffff";

const StationCanvasLayerClass = L.Layer.extend({
  initialize: function (this: any, options: any) {
    L.setOptions(this, options);
    this._stations = [] as GQStation[];
    this._selectedId = null as string | null;
    this._rAF = null as number | null;
    this._canvas = null as HTMLCanvasElement | null;
    this._ctx = null as CanvasRenderingContext2D | null;
    this._map = null as L.Map | null;
  },

  setStations: function (this: any, stations: GQStation[]) {
    this._stations = stations;
    this._redraw();
  },

  setSelectedId: function (this: any, id: string | null) {
    this._selectedId = id;
    this._redraw();
  },

  getStationAt: function (this: any, latlng: L.LatLng, radiusPx: number): GQStation | null {
    const map = this._map as L.Map | null;
    if (!map || this._stations.length === 0) return null;

    const click = map.latLngToLayerPoint(latlng);
    const bounds = map.getBounds().pad(0.15);
    let nearest: GQStation | null = null;
    let minD2 = radiusPx * radiusPx;

    for (const s of this._stations) {
      if (!bounds.contains([s.lat, s.lon])) continue;
      const p = map.latLngToLayerPoint([s.lat, s.lon]);
      const dx = p.x - click.x;
      const dy = p.y - click.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) {
        minD2 = d2;
        nearest = s;
      }
    }
    return nearest;
  },

  onAdd: function (this: any, map: L.Map) {
    this._map = map;

    const pane = map.getPane(this.options.pane) || map.createPane(this.options.pane);
    const canvas = L.DomUtil.create("canvas", "leaflet-layer leaflet-zoom-hide") as HTMLCanvasElement;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    pane.appendChild(canvas);
    this._canvas = canvas;
    this._ctx = canvas.getContext("2d");

    this._updateSize();

    this._onResize = this._updateSize.bind(this);
    this._onMove = this._redraw.bind(this);

    map.on("resize", this._onResize);
    map.on("moveend zoomend", this._onMove);

    this._redraw();
  },

  onRemove: function (this: any, map: L.Map) {
    map.off("resize", this._onResize);
    map.off("moveend zoomend", this._onMove);
    if (this._canvas) {
      L.DomUtil.remove(this._canvas);
    }
    if (this._rAF) {
      cancelAnimationFrame(this._rAF);
      this._rAF = null;
    }
    this._canvas = null;
    this._ctx = null;
    this._map = null;
  },

  _updateSize: function (this: any) {
    const map = this._map as L.Map | null;
    const canvas = this._canvas as HTMLCanvasElement | null;
    const ctx = this._ctx as CanvasRenderingContext2D | null;
    if (!map || !canvas || !ctx) return;

    const size = map.getSize();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = size.x * ratio;
    canvas.height = size.y * ratio;
    canvas.style.width = size.x + "px";
    canvas.style.height = size.y + "px";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  },

  _redraw: function (this: any) {
    if (this._rAF) cancelAnimationFrame(this._rAF);
    this._rAF = requestAnimationFrame(() => this._draw());
  },

  _draw: function (this: any) {
    this._rAF = null;
    const map = this._map as L.Map | null;
    const canvas = this._canvas as HTMLCanvasElement | null;
    const ctx = this._ctx as CanvasRenderingContext2D | null;
    if (!map || !canvas || !ctx) return;

    const size = map.getSize();
    ctx.clearRect(0, 0, size.x, size.y);

    if (this._stations.length === 0) return;

    const bounds = map.getBounds().pad(0.2);
    const selectedId = this._selectedId as string | null;

    for (const s of this._stations) {
      if (!bounds.contains([s.lat, s.lon])) continue;

      const p = map.latLngToLayerPoint([s.lat, s.lon]);
      const isActive = s.isActive;
      const radius = isActive ? 4 : 3;
      const color = isActive ? ACTIVE_COLOR : AVAILABLE_COLOR;
      const isSelected = selectedId === s.id;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();

      ctx.globalAlpha = 0.85;
      ctx.lineWidth = isSelected ? 2.5 : isActive ? 1.5 : 1;
      ctx.strokeStyle = isSelected ? SELECTED_STROKE : color;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  },
}) as any;

function createStationLayer(): StationCanvasLayer {
  return new StationCanvasLayerClass({ pane: "overlayPane" }) as StationCanvasLayer;
}

function LeafletMap({ stations, onToggleStation, onHighlightStation, activating }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const stationLayerRef = useRef<StationCanvasLayer | null>(null);
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
      zoomAnimation: false,
      markerZoomAnimation: false,
      fadeAnimation: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      noWrap: true,
      updateWhenIdle: false,
      updateWhenZooming: true,
    }).addTo(map);

    const stationLayer = createStationLayer();
    stationLayer.addTo(map);
    stationLayerRef.current = stationLayer;
    mapInstanceRef.current = map;

    // Force size recalculation after React paints the container
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      stationLayerRef.current = null;
    };
  }, []);

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

  // Sync stations to canvas layer
  useEffect(() => {
    const layer = stationLayerRef.current;
    if (!layer) return;
    layer.setStations(stations);
  }, [stations]);

  // Sync selected station highlight
  useEffect(() => {
    const layer = stationLayerRef.current;
    if (!layer) return;
    layer.setSelectedId(selectedStationId);
  }, [selectedStationId]);

  // Fit bounds on first load
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || stations.length === 0 || initializedRef.current) return;
    const bounds = L.latLngBounds(stations.map((s) => [s.lat, s.lon]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
    initializedRef.current = true;
  }, [stations]);

  // Map click: select nearest station or clear selection
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = stationLayerRef.current;
    if (!map || !layer) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const station = layer.getStationAt(e.latlng, 10);
      if (station) {
        handleMarkerClick(station.id, station.lat, station.lon);
      } else {
        setSelectedStationId(null);
        onHighlightStation(null);
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [handleMarkerClick, onHighlightStation]);

  const handleToggle = useCallback(() => {
    if (!selectedStation) return;
    onToggleStation(selectedStation.id, !selectedStation.isActive);
  }, [selectedStation, onToggleStation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0" />

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
