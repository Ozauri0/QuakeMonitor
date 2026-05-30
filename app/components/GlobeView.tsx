"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { QuakeEvent } from "@/app/types/quake";
import { Station } from "@/app/types/station";
import { feature } from "topojson-client";
import { useSettings } from "@/app/context/SettingsContext";

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

/* stable accessor functions — same reference across renders */
const accLat = (d: any) => d.lat;
const accLng = (d: any) => d.lng;
const accMaxR = (d: any) => d.maxR;
const accPropagation = (d: any) => d.propagationSpeed;
const accRepeat = (d: any) => d.repeatPeriod;
const accSize = (d: any) => d.size;
const accColor = (d: any) => d.color;
const accName = (d: any) => d.name;
const accGeoJson = (d: any) => d.geometry;
const constLabelDotOrientation = (): "top" => "top";
const constPolygonLabel = () => "";

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
  const { settings } = useSettings();
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

  const getColor = (mag: number) => {
    if (mag < 3) return settings.quakePointColorLow;
    if (mag < 5) return settings.quakePointColorMid;
    return settings.quakePointColorHigh;
  };

  /* ── memoized quake datasets ── */
  const ringsData = useMemo(() => {
    const ringSources = [...live];
    if (replayingId) {
      const replayed = archived.find((q) => q.id === replayingId);
      if (replayed && !ringSources.find((q) => q.id === replayed.id)) {
        ringSources.push(replayed);
      }
    }
    return ringSources.map((q) => ({
      lat: q.lat,
      lng: q.lon,
      maxR: Math.max(0.5, q.mag * 2),
      propagationSpeed: settings.ringPropagationSpeed,
      repeatPeriod: settings.ringRepeatPeriod,
      color: getColor(q.mag),
    }));
  }, [live, archived, replayingId, settings]);

  const pointsData = useMemo(() => {
    const visibleQuakes = showArchived ? [...live, ...archived] : [...live];
    return visibleQuakes.map((q) => ({
      lat: q.lat,
      lng: q.lon,
      size: Math.max(0.2, q.mag * settings.quakePointSizeBase),
      color: getColor(q.mag),
    }));
  }, [live, archived, showArchived, settings]);

  /* ── memoized station datasets ── */
  const stationPoints = useMemo(() => {
    if (!showStations) return [];
    return stations.map((s) => ({
      lat: s.lat,
      lng: s.lon,
      size: settings.stationPointSize,
      color: s.active ? settings.stationColorActive : settings.stationColorInactive,
      name: s.name,
    }));
  }, [stations, showStations, settings]);

  const allPoints = useMemo(
    () => [...pointsData, ...stationPoints],
    [pointsData, stationPoints]
  );

  /* ── stable color accessors from settings ── */
  const polygonSideColor = useMemo(() => () => settings.polygonSideColor, [settings.polygonSideColor]);
  const polygonCapColor = useMemo(() => () => settings.polygonCapColor, [settings.polygonCapColor]);
  const polygonStrokeColor = useMemo(() => () => settings.polygonStrokeColor, [settings.polygonStrokeColor]);
  const labelColor = useMemo(() => () => settings.stationColorActive, [settings.stationColorActive]);

  return (
    <div className="relative w-full h-full">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor={settings.globeBackgroundColor}
        atmosphereColor={settings.atmosphereColor}
        atmosphereAltitude={settings.atmosphereAltitude}
        polygonsData={countries}
        polygonGeoJsonGeometry={accGeoJson}
        polygonSideColor={polygonSideColor}
        polygonCapColor={polygonCapColor}
        polygonStrokeColor={polygonStrokeColor}
        polygonLabel={constPolygonLabel}
        ringsData={ringsData}
        ringColor={accColor}
        ringMaxRadius={accMaxR}
        ringPropagationSpeed={accPropagation}
        ringRepeatPeriod={accRepeat}
        ringAltitude={settings.ringAltitude}
        pointsData={allPoints}
        pointAltitude={settings.pointAltitude}
        pointRadius={accSize}
        pointColor={accColor}
        labelsData={stationPoints}
        labelLat={accLat}
        labelLng={accLng}
        labelText={accName}
        labelSize={0.15}
        labelColor={labelColor}
        labelAltitude={settings.labelAltitude}
        labelDotRadius={0.1}
        labelDotOrientation={constLabelDotOrientation}
      />
    </div>
  );
}
