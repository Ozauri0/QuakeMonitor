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
const accGeoJson = (d: any) => d.geometry;
const constPolygonSide = () => "rgba(120, 120, 120, 0.45)";
const constPolygonCap = () => "rgba(0, 0, 0, 0)";
const constPolygonStroke = () => "rgba(140, 140, 140, 0.55)";
const constPolygonLabel = () => "";

const pathPointLat = (pt: any) => pt.lat;
const pathPointLng = (pt: any) => pt.lng;
const pathPoints = (d: any) => d.points;
const constPathColor = () => "rgba(140, 140, 140, 0.55)";
const constPathStroke = () => 1;

const RENDERER_CONFIG = { antialias: false, powerPreference: "high-performance" as const };

function GlobeView({
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
  const globeReadyRef = useRef(false);

  // Stable object pools keyed by ID — only create new objects for new items
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

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    try {
      const renderer = globe.renderer();
      if (renderer && typeof renderer.setPixelRatio === "function") {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      }
    } catch {
      // renderer may not be available
    }

    // Start view: Europe/Africa, then animate to Chile
    globe.pointOfView({ lat: 25, lng: 10, altitude: 2.8 }, 0);
    setTimeout(() => {
      globe.pointOfView({ lat: -35, lng: -70, altitude: 0.8 }, 3000);
    }, 400);

    globeReadyRef.current = true;
  }, []);

  // Camera altitude tracking for distance-based fade-out (updated cheaply via rAF)
  const camAltRef = useRef(2.5);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pov = globeRef.current?.pointOfView?.();
      if (pov) camAltRef.current = pov.altitude;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Build ringsData with stable object references ──
  const ringsData = useMemo(() => {
    const pool = ringPool.current;
    const result: any[] = [];

    for (const q of live) {
      let obj = pool.get(q.id);
      if (!obj) {
        obj = {};
        pool.set(q.id, obj);
      }
      obj.lat = q.lat;
      obj.lng = q.lon;
      obj.maxR = Math.max(0.5, q.mag * 2);
      obj.propagationSpeed = settings.ringPropagationSpeed;
      obj.repeatPeriod = settings.ringRepeatPeriod;
      obj.color = getColor(q.mag);
      result.push(obj);
    }

    if (replayingId) {
      const replayed = archived.find((q) => q.id === replayingId);
      if (replayed && !result.find((r) => r === pool.get(replayed.id))) {
        let obj = pool.get(replayed.id);
        if (!obj) {
          obj = {};
          pool.set(replayed.id, obj);
        }
        obj.lat = replayed.lat;
        obj.lng = replayed.lon;
        obj.maxR = Math.max(0.5, replayed.mag * 2);
        obj.propagationSpeed = settings.ringPropagationSpeed;
        obj.repeatPeriod = settings.ringRepeatPeriod;
        obj.color = getColor(replayed.mag);
        result.push(obj);
      }
    }

    const currentIds = new Set(live.map((q) => q.id));
    if (replayingId) currentIds.add(replayingId);
    for (const id of pool.keys()) {
      if (!currentIds.has(id)) pool.delete(id);
    }

    return result;
  }, [live, archived, replayingId, settings]);

  // ── Build pointsData (quakes only) with stable object references ──
  const pointsData = useMemo(() => {
    const pool = pointPool.current;
    const sourceQuakes = showArchived ? [...live, ...archived] : [...live];
    const result: any[] = [];

    for (const q of sourceQuakes) {
      let obj = pool.get(q.id);
      if (!obj) {
        obj = {};
        pool.set(q.id, obj);
      }
      obj.lat = q.lat;
      obj.lng = q.lon;
      obj.size = Math.max(0.2, q.mag * settings.quakePointSizeBase);
      obj.color = getColor(q.mag);
      result.push(obj);
    }

    const currentIds = new Set(sourceQuakes.map((q) => q.id));
    for (const id of pool.keys()) {
      if (!currentIds.has(id)) pool.delete(id);
    }

    return result;
  }, [live, archived, showArchived, settings]);

  // ── Build htmlElementsData for markers & labels ──
  const htmlElements = useMemo(() => {
    const pool = htmlLabelPool.current;
    const result: any[] = [];

    if (showStations) {
      for (const s of stations) {
        const key = `station-${s.id}`;
        let obj = pool.get(key);
        if (!obj) {
          obj = {};
          pool.set(key, obj);
        }
        obj.lat = s.lat;
        obj.lng = s.lon;
        obj.altitude = 0.001; // flush with surface so triangle tip touches ground
        obj.name = s.name;
        obj.type = "station";
        obj.color = s.active ? settings.stationColorActive : settings.stationColorInactive;
        result.push(obj);
      }
    }

    for (const loc of CHILE_LOCATIONS) {
      const key = `loc-${loc.name}`;
      let obj = pool.get(key);
      if (!obj) {
        obj = {};
        pool.set(key, obj);
      }
      obj.lat = loc.lat;
      obj.lng = loc.lng;
      obj.altitude = settings.labelAltitude;
      obj.name = loc.name;
      obj.type = loc.type;
      result.push(obj);
    }

    const currentIds = new Set([
      ...(showStations ? stations.map((s) => `station-${s.id}`) : []),
      ...CHILE_LOCATIONS.map((l) => `loc-${l.name}`),
    ]);
    for (const id of pool.keys()) {
      if (!currentIds.has(id)) pool.delete(id);
    }

    return result;
  }, [stations, showStations, settings]);

  const htmlElement = useCallback((d: any) => {
    const el = document.createElement("div");
    el.dataset.type = d.type;
    el.style.pointerEvents = "none";
    el.style.userSelect = "none";
    el.style.transition = "opacity 250ms ease";
    el.style.lineHeight = "1";

    // Zero-size anchor container so CSS2DRenderer centers on the exact 3D point
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
      // Anchor point = triangle tip (top of wrapper). The triangle is pulled up
      // with a negative margin so its apex sits exactly at the 3D coordinate.
      wrapper.style.top = "0";

      const triangle = document.createElement("div");
      triangle.style.width = "0";
      triangle.style.height = "0";
      triangle.style.borderLeft = "4px solid transparent";
      triangle.style.borderRight = "4px solid transparent";
      triangle.style.borderBottom = `7px solid ${d.color}`;
      triangle.style.marginTop = "-7px"; // apex now at wrapper top = anchor point
      wrapper.appendChild(triangle);

      const name = document.createElement("div");
      name.textContent = d.name;
      name.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      name.style.fontSize = "9px";
      name.style.fontWeight = "500";
      name.style.color = d.color;
      name.style.textShadow = "0 1px 3px rgba(0,0,0,0.9)";
      name.style.whiteSpace = "nowrap";
      name.style.letterSpacing = "0.01em";
      name.style.marginTop = "2px";
      wrapper.appendChild(name);
    } else if (d.type === "region") {
      // Region text centred vertically on the anchor point
      wrapper.style.top = "50%";
      wrapper.style.transform = "translateX(-50%) translateY(-50%)";

      const text = document.createElement("div");
      text.textContent = d.name;
      text.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      text.style.fontSize = "11px";
      text.style.fontWeight = "700";
      text.style.textTransform = "uppercase";
      text.style.letterSpacing = "0.08em";
      text.style.color = "rgba(210, 195, 170, 0.9)";
      text.style.textShadow = "0 1px 4px rgba(0,0,0,0.95)";
      text.style.whiteSpace = "nowrap";
      wrapper.appendChild(text);
    } else {
      // city text centred vertically on the anchor point
      wrapper.style.top = "50%";
      wrapper.style.transform = "translateX(-50%) translateY(-50%)";

      const text = document.createElement("div");
      text.textContent = d.name;
      text.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      text.style.fontSize = "10px";
      text.style.fontWeight = "500";
      text.style.color = "rgba(225, 225, 225, 0.85)";
      text.style.textShadow = "0 1px 3px rgba(0,0,0,0.9)";
      text.style.whiteSpace = "nowrap";
      text.style.letterSpacing = "0.02em";
      wrapper.appendChild(text);
    }

    el.appendChild(wrapper);
    return el;
  }, []);

  const htmlElementVisibilityModifier = useCallback((el: HTMLElement, isVisible: boolean) => {
    // Prevent HTML labels from appearing at the canvas centre before the globe is ready
    if (!globeReadyRef.current) {
      el.style.opacity = "0";
      return;
    }

    const alt = camAltRef.current;
    let opacity = isVisible ? 1 : 0;

    // Distance-based fade-out (zoom-out culling)
    if (el.dataset.type === "station") {
      if (alt > 1.5) opacity = 0;
      else if (alt > 1.2) opacity = 1 - (alt - 1.2) / 0.3;
    } else if (el.dataset.type === "city") {
      if (alt > 2.0) opacity = 0;
      else if (alt > 1.6) opacity = 1 - (alt - 1.6) / 0.4;
    } else if (el.dataset.type === "region") {
      if (alt > 2.5) opacity = 0;
      else if (alt > 2.0) opacity = 1 - (alt - 2.0) / 0.5;
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
        pathsData={[]}
        pathPoints={pathPoints}
        pathPointLat={pathPointLat}
        pathPointLng={pathPointLng}
        pathColor={constPathColor}
        pathStroke={constPathStroke}
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
        htmlElementsData={htmlElements}
        htmlElement={htmlElement}
        htmlElementVisibilityModifier={htmlElementVisibilityModifier}
        htmlAltitude="altitude"
      />
    </div>
  );
}

export default memo(GlobeView);
