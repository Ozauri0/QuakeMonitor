"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

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

export default function ProviderManager() {
  const [stations, setStations] = useState<GQStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChile, setFilterChile] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  const fetchStations = useCallback(async () => {
    try {
      const res = await fetch("/api/gq-stations");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || "Failed to fetch stations");
      }
      const data = await res.json();
      const incoming: GQStation[] = data.stations || [];

      // Only update state if data actually changed (avoid unnecessary re-renders)
      setStations((prev) => {
        if (prev.length !== incoming.length) return incoming;
        const prevMap = new Map(prev.map((s) => [s.id, s]));
        for (const s of incoming) {
          const p = prevMap.get(s.id);
          if (!p || p.isActive !== s.isActive || p.selectedChannel !== s.selectedChannel) {
            return incoming;
          }
        }
        return prev; // unchanged — skip re-render
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Could not connect to GlobalQuake server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
    const interval = setInterval(fetchStations, 30000);
    return () => clearInterval(interval);
  }, [fetchStations]);

  const toggleStation = useCallback(
    async (stationId: string, activate: boolean) => {
      setActivating(stationId);
      try {
        const res = await fetch("/api/gq-stations/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationId, action: activate ? "activate" : "deactivate" }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(`Error: ${data.error || data.detail || "Unknown error"}`);
          return;
        }

        // Refresh from server to get definitive state
        await fetchStations();
      } catch (e: any) {
        alert(`Error: ${e?.message || "Could not reach server"}`);
      } finally {
        setActivating(null);
      }
    },
    [fetchStations]
  );

  // Filter stations for the map: only available (has channel) or active
  const mapStations = useMemo(() => {
    return stations.filter((s) => {
      if (!s.hasAvailableChannel && !s.isActive) return false;
      if (filterChile && (s.lat < -55 || s.lat > -17.5 || s.lon < -75.5 || s.lon > -66.5)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!s.id.toLowerCase().includes(q) && !s.network.toLowerCase().includes(q) && !s.stationCode.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [stations, filterChile, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterChile, showInactive]);

  // Filter stations for the table
  const tableStations = useMemo(() => {
    return stations.filter((s) => {
      if (!showInactive && !s.hasAvailableChannel && !s.isActive) return false;
      if (filterChile && (s.lat < -55 || s.lat > -17.5 || s.lon < -75.5 || s.lon > -66.5)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!s.id.toLowerCase().includes(q) && !s.network.toLowerCase().includes(q) && !s.stationCode.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [stations, filterChile, searchTerm, showInactive]);

  const totalPages = Math.max(1, Math.ceil(tableStations.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedStations = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return tableStations.slice(start, start + PAGE_SIZE);
  }, [tableStations, safePage]);

  const activeCount = stations.filter((s) => s.isActive).length;
  const availableCount = stations.filter((s) => s.hasAvailableChannel).length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Estaciones</h1>
            <p className="text-sm text-gray-400 mt-1">
              Activa/desactiva estaciones de GlobalQuake en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-400 font-bold">{activeCount}</span>
            <span className="text-gray-500">activas</span>
            <span className="text-gray-700">|</span>
            <span className="text-gray-400">{mapStations.length}</span>
            <span className="text-gray-500">en mapa</span>
            <span className="text-gray-700">|</span>
            <span className="text-gray-500">{stations.length}</span>
            <span className="text-gray-600">total</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Buscar por código, red..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => setFilterChile(!filterChile)}
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                filterChile
                  ? "bg-green-700 text-white border border-green-600"
                  : "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
              }`}
            >
              {filterChile ? "✓ Chile" : "Solo Chile"}
            </button>
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                showInactive
                  ? "bg-amber-700 text-white border border-amber-600"
                  : "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
              }`}
            >
              {showInactive ? "✓ Mostrar no disp." : "Solo disponibles"}
            </button>
            <button
              onClick={() => fetchStations()}
              className="px-4 py-2 rounded text-sm font-semibold bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
            >
              Actualizar
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Map */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-4">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              Mapa interactivo — clic para activar/desactivar ({mapStations.length} estaciones)
            </span>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> Activa
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Disponible
              </span>
            </div>
          </div>
          <div className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Cargando estaciones de GlobalQuake...
              </div>
            ) : (
              <LeafletMap
                stations={mapStations}
                onToggleStation={toggleStation}
                onHighlightStation={setHighlightId}
                activating={activating}
                onBulkActionComplete={fetchStations}
              />
            )}
          </div>
        </div>

        {/* Station table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
            <span className="text-xs font-semibold text-gray-400">
              {tableStations.length} estaciones {filterChile ? "en Chile" : ""}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Estado</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">ID</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Red</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Lat</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Lon</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Canal</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {!loading && tableStations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {error ? "Error conectando a GlobalQuake" : "No hay estaciones disponibles"}
                    </td>
                  </tr>
                )}
                {pagedStations.map((s) => (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      highlightId === s.id ? "bg-cyan-900/20" : s.isActive ? "bg-green-950/10" : "hover:bg-gray-800/30"
                    }`}
                    onMouseEnter={() => setHighlightId(s.id)}
                    onMouseLeave={() => setHighlightId(null)}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          s.isActive
                            ? "bg-green-900/50 text-green-400"
                            : s.hasAvailableChannel
                            ? "bg-yellow-900/30 text-yellow-500"
                            : "bg-gray-800 text-gray-600"
                        }`}
                      >
                        {s.isActive ? "Activa" : s.hasAvailableChannel ? "Disponible" : "No disp."}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-300 text-xs font-mono">{s.id}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{s.network}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs font-mono">{s.lat.toFixed(3)}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs font-mono">{s.lon.toFixed(3)}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {s.selectedChannel || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {s.hasAvailableChannel ? (
                        <button
                          onClick={() => toggleStation(s.id, !s.isActive)}
                          disabled={activating === s.id}
                          className={`px-3 py-1 rounded text-[10px] font-semibold transition-colors ${
                            activating === s.id
                              ? "bg-gray-700 text-gray-500 cursor-wait"
                              : s.isActive
                              ? "bg-red-900/50 text-red-400 hover:bg-red-800/50 border border-red-800"
                              : "bg-green-900/50 text-green-400 hover:bg-green-800/50 border border-green-800"
                          }`}
                        >
                          {activating === s.id ? "..." : s.isActive ? "Desactivar" : "Activar"}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-[10px] text-gray-500">
            <span>
              {tableStations.length} de {stations.length} estaciones | {activeCount} activas | {availableCount} disponibles
            </span>
            {tableStations.length > PAGE_SIZE && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2 py-1 rounded bg-gray-700 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  Anterior
                </button>
                <span className="text-gray-400">
                  Página {safePage} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1 rounded bg-gray-700 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
