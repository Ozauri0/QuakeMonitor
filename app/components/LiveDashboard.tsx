"use client";

import { QuakeEvent } from "@/app/types/quake";
import { format } from "date-fns";

interface LiveMainCardProps {
  quake: QuakeEvent;
}

export function LiveMainCard({ quake }: LiveMainCardProps) {
  return (
    <div className="bg-gray-900/90 backdrop-blur-md border border-red-500/50 rounded-xl p-4 shadow-lg shadow-red-900/20">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span className="text-red-400 font-bold text-sm tracking-widest uppercase">
          Movimiento Sísmico Detectado
        </span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-white">
          M {quake.mag.toFixed(1)}
        </span>
      </div>
      <p className="text-gray-200 font-medium text-sm mb-2">
        {quake.locationName}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>Lat: {quake.lat.toFixed(2)}°</span>
        <span>Lon: {quake.lon.toFixed(2)}°</span>
        <span>Prof: {quake.depth.toFixed(1)} km</span>
        <span>{format(quake.time, "HH:mm:ss")}</span>
      </div>
      <div className="mt-2 text-[10px] text-gray-500 uppercase tracking-wider">
        Revisando magnitud...
      </div>
    </div>
  );
}

interface LiveSecondaryCardProps {
  quake: QuakeEvent;
}

export function LiveSecondaryCard({ quake }: LiveSecondaryCardProps) {
  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/60 rounded-lg p-2 w-64">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">
          En Vivo
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold text-white">
          M {quake.mag.toFixed(1)}
        </span>
      </div>
      <p className="text-xs text-gray-300 truncate">{quake.locationName}</p>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>{quake.depth.toFixed(1)} km</span>
        <span>{format(quake.time, "HH:mm:ss")}</span>
      </div>
    </div>
  );
}
