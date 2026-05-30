"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { QuakeEvent } from "@/app/types/quake";
import { Station } from "@/app/types/station";
import { feature } from "topojson-client";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

interface GlobeViewProps {
  live: QuakeEvent[];
  archived: QuakeEvent[];
  focusedQuake: QuakeEvent | null;
  replayingId: string | null;
  autoTrack: boolean;
  stations: Station[];
  showStations: boolean;
  showArchived: boolean;
}

function getColor(mag: number) {
  if (mag < 3) return "rgba(0, 255, 0, 0.6)";
  if (mag < 5) return "rgba(255, 255, 0, 0.6)";
  return "rgba(255, 0, 0, 0.6)";
}

export default function GlobeView({
  live,
  archived,
  focusedQuake,
  replayingId,
  autoTrack,
  stations,
  showStations,
  showArchived,
}: GlobeViewProps) {
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState<any[]>([]);

  useEffect(() => {
    fetch("//unpkg.com/world-atlas@2/countries-110m.json")
      .then((res) => res.json())
      .then((world) => {
        const geojson = feature(world, world.objects.countries) as any;
        setCountries(geojson.features || []);
      })
      .catch((err) => console.error("Failed to load countries:", err));
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    if (autoTrack && focusedQuake) {
      globeRef.current.pointOfView(
        { lat: focusedQuake.lat, lng: focusedQuake.lon, altitude: 0.5 },
        2000
      );
    }
  }, [autoTrack, focusedQuake]);

  // Rings only for LIVE quakes + the one being replayed
  const ringSources = [...live];
  if (replayingId) {
    const replayed = archived.find((q) => q.id === replayingId);
    if (replayed && !ringSources.find((q) => q.id === replayed.id)) {
      ringSources.push(replayed);
    }
  }

  const ringsData = ringSources.map((q) => ({
    lat: q.lat,
    lng: q.lon,
    maxR: Math.max(0.5, q.mag * 2),
    propagationSpeed: 2,
    repeatPeriod: 1000,
    color: getColor(q.mag),
  }));

  // Points for quakes
  const visibleQuakes = showArchived ? [...live, ...archived] : [...live];
  const pointsData = visibleQuakes.map((q) => ({
    lat: q.lat,
    lng: q.lon,
    size: Math.max(0.2, q.mag * 0.4),
    color: getColor(q.mag),
  }));

  const stationPoints = showStations
    ? stations.map((s) => ({
        lat: s.lat,
        lng: s.lon,
        size: 0.15,
        color: s.active ? "rgba(0, 200, 255, 0.7)" : "rgba(100, 100, 100, 0.4)",
        name: s.name,
      }))
    : [];

  const labelData = showStations
    ? stationPoints
    : [];

  return (
    <div className="relative w-full h-full">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="rgba(60, 120, 200, 0.5)"
        atmosphereAltitude={0.15}
        polygonsData={countries}
        polygonGeoJsonGeometry={(d: any) => d.geometry}
        polygonSideColor={() => "rgba(100, 100, 100, 0.15)"}
        polygonCapColor={() => "rgba(50, 50, 50, 0.05)"}
        polygonStrokeColor={() => "rgba(120, 120, 120, 0.4)"}
        polygonLabel={() => ""}
        ringsData={ringsData}
        ringColor={(d: any) => d.color}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringAltitude={0.03}
        pointsData={[...pointsData, ...stationPoints]}
        pointAltitude={0.03}
        pointRadius="size"
        pointColor={(d: any) => d.color}
        labelsData={labelData}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => d.name}
        labelSize={0.15}
        labelColor={() => "rgba(200, 220, 255, 0.6)"}
        labelAltitude={0.04}
        labelDotRadius={0.1}
        labelDotOrientation={() => "top"}
      />
    </div>
  );
}
