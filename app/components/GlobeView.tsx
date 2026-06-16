"use client";

import { useRef, useEffect, useState, useMemo, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { QuakeEvent } from "@/app/types/quake";
import { Station } from "@/app/types/station";
import { feature } from "topojson-client";
import { useSettings } from "@/app/context/SettingsContext";
import { CHILE_LOCATIONS } from "@/lib/locationLabels";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

interface GlobeViewProps {
  live: QuakeEvent[];
  archived: QuakeEvent[];
  archivedAll: QuakeEvent[];
  focusedQuake: QuakeEvent | null;
  replayingId: string | null;
  autoTrack: boolean;
  stations: Station[];
  showStations: boolean;
  showArchived: boolean;
}

const accLat = (d: any) => d.lat;
const accLng = (d: any) => d.lng;
const accMaxR = (d: any) => d.maxR;
const accPropagation = (d: any) => d.propagationSpeed;
const accRepeat = (d: any) => d.repeatPeriod;
const accSize = (d: any) => d.size;
const accColor = (d: any) => d.color;
const accGeoJson = (d: any) => d.geometry;
const constPolygonSide = () => "rgba(120, 120, 120, 0.45)";
const constPolygonCap = () => "rgba(0, 0, 0, 0)";
const constPolygonStroke = () => "rgba(140, 140, 140, 0.55)";
const constPolygonLabel = () => "";
const RENDERER_CONFIG = { antialias: false, powerPreference: "high-performance" as const };

function GlobeView({ live, archived, archivedAll, focusedQuake, replayingId, autoTrack, stations, showStations, showArchived }: GlobeViewProps) {
  const { settings } = useSettings();
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const globeReadyRef = useRef(false);
  const ringPool = useRef<Map<string, any>>(new Map());
  const pointPool = useRef<Map<string, any>>(new Map());
  const htmlLabelPool = useRef<Map<string, any>>(new Map());

  function getColor(mag: number) {
    if (mag < settings.quakeMagLowMax) return settings.quakePointColorLow;
    if (mag < settings.quakeMagMidMax) return settings.quakePointColorMid;
    return settings.quakePointColorHigh;
  }

  useEffect(() => {
    fetch("//unpkg.com/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((world) => { setCountries((feature(world, world.objects.countries) as any).features || []); })
      .catch((err) => console.error("Failed to load countries:", err));
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    if (autoTrack && focusedQuake) {
      globeRef.current.pointOfView({ lat: focusedQuake.lat, lng: focusedQuake.lon, altitude: 0.5 }, 2000);
    }
  }, [autoTrack, focusedQuake]);

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    try { globe.renderer()?.setPixelRatio?.(Math.min(window.devicePixelRatio, 1.5)); } catch {}
    globe.pointOfView({ lat: 25, lng: 10, altitude: 2.8 }, 0);
    setTimeout(() => globe.pointOfView({ lat: -35, lng: -70, altitude: 0.8 }, 3000), 400);
    globeReadyRef.current = true;
  }, []);

  const ringsData = useMemo(() => {
    const pool = ringPool.current;
    const result: any[] = [];
    for (const q of live) {
      let obj = pool.get(q.id); if (!obj) { obj = {}; pool.set(q.id, obj); }
      Object.assign(obj, { lat: q.lat, lng: q.lon, maxR: Math.max(0.5, q.mag * 2), propagationSpeed: settings.ringPropagationSpeed, repeatPeriod: settings.ringRepeatPeriod, color: getColor(q.mag) });
      result.push(obj);
    }
    if (replayingId) {
      // Look up in all archived (not just displayed 10) so replays beyond the visible set work
      const r = archivedAll.find((q) => q.id === replayingId);
      if (r && !result.find((x) => x === pool.get(r.id))) {
        let obj = pool.get(r.id); if (!obj) { obj = {}; pool.set(r.id, obj); }
        Object.assign(obj, { lat: r.lat, lng: r.lon, maxR: Math.max(0.5, r.mag * 2), propagationSpeed: settings.ringPropagationSpeed, repeatPeriod: settings.ringRepeatPeriod, color: getColor(r.mag) });
        result.push(obj);
      }
    }
    const ids = new Set(live.map((q) => q.id)); if (replayingId) ids.add(replayingId);
    for (const id of pool.keys()) if (!ids.has(id)) pool.delete(id);
    return result;
  }, [live, archivedAll, replayingId, settings]);

  const pointsData = useMemo(() => {
    const pool = pointPool.current;
    const src = showArchived ? [...live, ...archived] : [...live];
    const result: any[] = [];
    for (const q of src) {
      let obj = pool.get(q.id); if (!obj) { obj = {}; pool.set(q.id, obj); }
      Object.assign(obj, { lat: q.lat, lng: q.lon, size: Math.max(0.2, q.mag * settings.quakePointSizeBase), color: getColor(q.mag) });
      result.push(obj);
    }
    const ids = new Set(src.map((q) => q.id)); for (const id of pool.keys()) if (!ids.has(id)) pool.delete(id);
    return result;
  }, [live, archived, showArchived, settings]);

  const htmlElementsData = useMemo(() => {
    const pool = htmlLabelPool.current;
    const result: any[] = [];
    if (showStations) {
      for (const s of stations) {
        const key = `st-${s.id}`;
        let obj = pool.get(key); if (!obj) { obj = {}; pool.set(key, obj); }
        Object.assign(obj, { lat: s.lat, lng: s.lon, altitude: 0.001, name: s.name, type: "station" });
        result.push(obj);
      }
    }
    for (const loc of CHILE_LOCATIONS) {
      const key = `loc-${loc.name}`;
      let obj = pool.get(key); if (!obj) { obj = {}; pool.set(key, obj); }
      Object.assign(obj, { lat: loc.lat, lng: loc.lng, altitude: settings.labelAltitude, name: loc.name, type: loc.type });
      result.push(obj);
    }
    const ids = new Set([...(showStations ? stations.map((s) => `st-${s.id}`) : []), ...CHILE_LOCATIONS.map((l) => `loc-${l.name}`)]);
    for (const id of pool.keys()) if (!ids.has(id)) pool.delete(id);
    return result;
  }, [stations, showStations, settings.labelAltitude]);

  const htmlElement = useCallback((d: any) => {
    const el = document.createElement("div");
    el.dataset.type = d.type;
    el.dataset.lat = String(d.lat);
    el.dataset.lng = String(d.lng);
    el.style.pointerEvents = "none";
    el.style.userSelect = "none";
    el.style.transition = "opacity 200ms ease";
    el.style.lineHeight = "1";
    el.style.position = "relative";
    el.style.width = "0";
    el.style.height = "0";

    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.left = "50%";
    wrapper.style.transform = "translateX(-50%)";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";
    wrapper.style.whiteSpace = "nowrap";

    if (d.type === "station") {
      wrapper.style.top = "0";
      // Scale triangle with stationPointSize setting (default 0.15 = scale 1.0)
      const scale = settings.stationPointSize / 0.15;
      const halfBase = Math.round(4 * scale);
      const height = Math.round(7 * scale);
      const triangle = document.createElement("div");
      triangle.style.width = "0";
      triangle.style.height = "0";
      triangle.style.borderLeft = `${halfBase}px solid transparent`;
      triangle.style.borderRight = `${halfBase}px solid transparent`;
      triangle.style.borderBottom = `${height}px solid ${settings.stationColorActive}`;
      triangle.style.marginTop = `-${height}px`;
      wrapper.appendChild(triangle);
      const name = document.createElement("div");
      name.textContent = d.name;
      Object.assign(name.style, { fontFamily: "system-ui, sans-serif", fontSize: "9px", fontWeight: "500", color: settings.stationColorActive, textShadow: "0 1px 3px rgba(0,0,0,0.9)", whiteSpace: "nowrap", letterSpacing: "0.01em", marginTop: "1px" });
      wrapper.appendChild(name);
    } else if (d.type === "region") {
      wrapper.style.top = "50%";
      wrapper.style.transform = "translateX(-50%) translateY(-50%)";
      const text = document.createElement("div");
      text.textContent = d.name;
      Object.assign(text.style, { fontFamily: "system-ui, sans-serif", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(210, 195, 170, 0.9)", textShadow: "0 1px 4px rgba(0,0,0,0.95)", whiteSpace: "nowrap" });
      wrapper.appendChild(text);
    } else {
      wrapper.style.top = "50%";
      wrapper.style.transform = "translateX(-50%) translateY(-50%)";
      const text = document.createElement("div");
      text.textContent = d.name;
      Object.assign(text.style, { fontFamily: "system-ui, sans-serif", fontSize: "10px", fontWeight: "500", color: "rgba(225, 225, 225, 0.85)", textShadow: "0 1px 3px rgba(0,0,0,0.9)", whiteSpace: "nowrap", letterSpacing: "0.02em" });
      wrapper.appendChild(text);
    }
    el.appendChild(wrapper);
    return el;
  }, [settings.stationColorActive, settings.stationPointSize]);

  const htmlElementVisibilityModifier = useCallback((el: HTMLElement, isVisible: boolean) => {
    // Hide elements on the far side of the globe — this prevents duplicate labels
    if (!isVisible) {
      el.style.visibility = "hidden";
      return;
    }
    el.style.visibility = "visible";

    // Zoom-based opacity: hide labels when zoomed too far out or too close
    const type = (el as HTMLElement).querySelector("[data-type]")?.getAttribute("data-type")
      || el.dataset?.type || "";

    // Try to get altitude from the globe camera
    let alt = 1;
    try {
      const pov = globeRef.current?.pointOfView?.();
      if (pov) alt = pov.altitude;
    } catch {}

    let opacity = 1;
    if (type === "region") {
      if (alt > 1.2) opacity = 0;
      else if (alt > 0.9) opacity = Math.max(0, (1.2 - alt) / 0.3);
    } else if (type === "city") {
      if (alt > 0.8) opacity = 0;
      else if (alt > 0.5) opacity = Math.max(0, (0.8 - alt) / 0.3);
    } else if (type === "station") {
      if (alt > 1.5) opacity = 0;
      else if (alt > 1.2) opacity = Math.max(0, (1.5 - alt) / 0.3);
    }
    el.style.opacity = String(opacity);
  }, []);

  return (
    <div className="relative w-full h-full">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor={settings.atmosphereColor}
        atmosphereAltitude={settings.atmosphereAltitude}
        rendererConfig={RENDERER_CONFIG}
        onGlobeReady={handleGlobeReady}
        polygonsData={countries}
        polygonGeoJsonGeometry={accGeoJson}
        polygonAltitude={0.001}
        polygonSideColor={constPolygonSide}
        polygonCapColor={constPolygonCap}
        polygonStrokeColor={constPolygonStroke}
        polygonLabel={constPolygonLabel}
        polygonsTransitionDuration={0}
        ringsData={ringsData}
        ringColor={accColor}
        ringMaxRadius={accMaxR}
        ringPropagationSpeed={accPropagation}
        ringRepeatPeriod={accRepeat}
        ringAltitude={settings.ringAltitude}
        pointsData={pointsData}
        pointAltitude={settings.pointAltitude}
        pointRadius={accSize}
        pointColor={accColor}
        htmlElementsData={htmlElementsData}
        htmlElement={htmlElement}
        htmlElementVisibilityModifier={htmlElementVisibilityModifier}
        htmlAltitude="altitude"
      />
    </div>
  );
}

export default memo(GlobeView);
