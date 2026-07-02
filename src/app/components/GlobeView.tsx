"use client";

import { useRef, useEffect, useState, useMemo, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { QuakeEvent } from "@/app/types/quake";
import { Station } from "@/app/types/station";
import { mesh } from "topojson-client";
import { useSettings, getQuakeColor } from "@/app/context/SettingsContext";
import { CHILE_LOCATIONS } from "@/lib/locationLabels";
import * as THREE from "three";

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

// -- Developer toggles --
const SHOW_COUNTRY_BORDERS = true;   // bordes de pa�ses (1 solo draw call)
const SHOW_ATMOSPHERE = false;        // glow alrededor del globo
const BORDER_ALTITUDE = 0.002;        // altura de las l�neas sobre el globo
// ------------------------

const accLat = (d: any) => d.lat;
const accLng = (d: any) => d.lng;
const accMaxR = (d: any) => d.maxR;
const accPropagation = (d: any) => d.propagationSpeed;
const accRepeat = (d: any) => d.repeatPeriod;
const accSize = (d: any) => d.size;
const accColor = (d: any) => d.color;
const RENDERER_CONFIG = { antialias: false, powerPreference: "high-performance" as const };

function GlobeView({ live, archived, archivedAll, focusedQuake, replayingId, autoTrack, stations, showStations, showArchived }: GlobeViewProps) {
  const { pending } = useSettings();
  const globeRef = useRef<any>(null);
  const globeReadyRef = useRef(false);
  const ringPool = useRef<Map<string, any>>(new Map());
  const pointPool = useRef<Map<string, any>>(new Map());
  const htmlLabelPool = useRef<Map<string, any>>(new Map());
  const lastAltRef = useRef(1);

  // Country borders rendered as a single THREE.LineSegments (1 draw call total)
  const [borderLine, setBorderLine] = useState<THREE.LineSegments | null>(null);

  function getColor(mag: number) {
    return getQuakeColor(mag, pending.quakeColorRanges);
  }

  // Step 1: Load country borders as a merged MultiLineString
  useEffect(() => {
    if (!SHOW_COUNTRY_BORDERS) return;
    fetch("//unpkg.com/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((world) => {
        // mesh() with always-true filter = ALL arcs (internal borders + coastlines)
        const m: any = mesh(world, world.objects.countries, () => true);
        return m?.coordinates as [number, number][][] | null;
      })
      .then((coords) => {
        if (!coords) return;
        // Store raw coords � will build geometry once globe is ready
        buildBorderLine(coords);
      })
      .catch((err) => console.error("Failed to load countries:", err));
  }, []);

  // Step 2: Build THREE.LineSegments from coordinates
  function buildBorderLine(coords: [number, number][][]) {
    const globe = globeRef.current;
    if (!globe) {
      // Globe not ready yet � retry
      setTimeout(() => buildBorderLine(coords), 200);
      return;
    }

    const positions: number[] = [];
    for (const line of coords) {
      for (let i = 0; i < line.length - 1; i++) {
        const [lng, lat] = line[i];
        const [lng2, lat2] = line[i + 1];
        const p1 = globe.getCoords(lat, lng, BORDER_ALTITUDE);
        const p2 = globe.getCoords(lat2, lng2, BORDER_ALTITUDE);
        positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
    }

    if (positions.length === 0) return;

    // Clean up previous
    if (borderLine) {
      borderLine.geometry.dispose();
      (borderLine.material as THREE.Material).dispose();
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.55,
      depthTest: true,
    });
    setBorderLine(new THREE.LineSegments(geom, mat));
  }

  // Cleanup border line on unmount
  useEffect(() => {
    return () => {
      if (borderLine) {
        borderLine.geometry.dispose();
        (borderLine.material as THREE.Material).dispose();
      }
    };
  }, [borderLine]);

  useEffect(() => {
    if (!globeRef.current) return;
    if (autoTrack && focusedQuake) {
      globeRef.current.pointOfView({ lat: focusedQuake.lat, lng: focusedQuake.lon, altitude: 0.5 }, 2000);
      lastAltRef.current = 0.5;
    }
  }, [autoTrack, focusedQuake]);

  useEffect(() => {
    if (!globeRef.current || !replayingId) return;
    const quake = archivedAll.find((q) => q.id === replayingId);
    if (quake) {
      globeRef.current.pointOfView({ lat: quake.lat, lng: quake.lon, altitude: 0.5 }, 2000);
      lastAltRef.current = 0.5;
    }
  }, [replayingId, archivedAll]);

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    try { globe.renderer()?.setPixelRatio?.(Math.min(window.devicePixelRatio, 1.5)); } catch {}
    globe.pointOfView({ lat: 25, lng: 10, altitude: 2.8 }, 0);
    lastAltRef.current = 2.8;
    setTimeout(() => {
      globe.pointOfView({ lat: -35, lng: -70, altitude: 0.8 }, 3000);
      lastAltRef.current = 0.8;
    }, 400);
    globeReadyRef.current = true;
  }, []);

  const ringsData = useMemo(() => {
    const pool = ringPool.current;
    const result: any[] = [];
    for (const q of live) {
      let obj = pool.get(q.id); if (!obj) { obj = {}; pool.set(q.id, obj); }
      Object.assign(obj, { lat: q.lat, lng: q.lon, maxR: Math.max(0.5, q.mag * 2), propagationSpeed: pending.ringPropagationSpeed, repeatPeriod: pending.ringRepeatPeriod, color: getColor(q.mag) });
      result.push(obj);
    }
    if (replayingId) {
      const r = archivedAll.find((q) => q.id === replayingId);
      if (r && !result.find((x) => x === pool.get(r.id))) {
        let obj = pool.get(r.id); if (!obj) { obj = {}; pool.set(r.id, obj); }
        Object.assign(obj, { lat: r.lat, lng: r.lon, maxR: Math.max(0.5, r.mag * 2), propagationSpeed: pending.ringPropagationSpeed, repeatPeriod: pending.ringRepeatPeriod, color: getColor(r.mag) });
        result.push(obj);
      }
    }
    const ids = new Set(live.map((q) => q.id)); if (replayingId) ids.add(replayingId);
    for (const id of pool.keys()) if (!ids.has(id)) pool.delete(id);
    return result;
  }, [live, archivedAll, replayingId, pending]);

  const pointsData = useMemo(() => {
    const pool = pointPool.current;
    const src = showArchived ? [...live, ...archived] : [...live];
    const result: any[] = [];
    for (const q of src) {
      let obj = pool.get(q.id); if (!obj) { obj = {}; pool.set(q.id, obj); }
      Object.assign(obj, { lat: q.lat, lng: q.lon, size: Math.max(0.2, q.mag * pending.quakePointSizeBase), color: getColor(q.mag) });
      result.push(obj);
    }
    if (replayingId) {
      const r = archivedAll.find((q) => q.id === replayingId);
      if (r && !result.find((x) => x === pool.get(r.id))) {
        let obj = pool.get(r.id); if (!obj) { obj = {}; pool.set(r.id, obj); }
        Object.assign(obj, { lat: r.lat, lng: r.lon, size: Math.max(0.2, r.mag * pending.quakePointSizeBase), color: getColor(r.mag) });
        result.push(obj);
      }
    }
    const ids = new Set(src.map((q) => q.id)); if (replayingId) ids.add(replayingId);
    for (const id of pool.keys()) if (!ids.has(id)) pool.delete(id);
    return result;
  }, [live, archived, archivedAll, showArchived, replayingId, pending]);

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
      Object.assign(obj, { lat: loc.lat, lng: loc.lng, altitude: pending.labelAltitude, name: loc.name, type: loc.type });
      result.push(obj);
    }
    const ids = new Set([...(showStations ? stations.map((s) => `st-${s.id}`) : []), ...CHILE_LOCATIONS.map((l) => `loc-${l.name}`)]);
    for (const id of pool.keys()) if (!ids.has(id)) pool.delete(id);
    return result;
  }, [stations, showStations, pending.labelAltitude]);

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
      const scale = pending.stationPointSize / 0.15;
      const halfBase = Math.round(4 * scale);
      const height = Math.round(7 * scale);
      const triangle = document.createElement("div");
      triangle.style.width = "0";
      triangle.style.height = "0";
      triangle.style.borderLeft = `${halfBase}px solid transparent`;
      triangle.style.borderRight = `${halfBase}px solid transparent`;
      triangle.style.borderBottom = `${height}px solid ${pending.stationColorActive}`;
      triangle.style.marginTop = `-${height}px`;
      wrapper.appendChild(triangle);
      const name = document.createElement("div");
      name.textContent = d.name;
      Object.assign(name.style, { fontFamily: "system-ui, sans-serif", fontSize: "9px", fontWeight: "500", color: pending.stationColorActive, textShadow: "0 1px 3px rgba(0,0,0,0.9)", whiteSpace: "nowrap", letterSpacing: "0.01em", marginTop: "1px" });
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
  }, [pending.stationColorActive, pending.stationPointSize]);

  const htmlElementVisibilityModifier = useCallback((el: HTMLElement, isVisible: boolean) => {
    if (!isVisible) {
      el.style.visibility = "hidden";
      return;
    }
    el.style.visibility = "visible";

    const type = el.dataset?.type || "";
    let alt = lastAltRef.current;

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

  // Custom layer: 1 data item ? 1 THREE.LineSegments with ALL borders
  const customLayerData = useMemo(() => {
    if (!borderLine) return [];
    return [{}];
  }, [borderLine]);

  const customThreeObject = useCallback(() => {
    return borderLine || new THREE.Object3D();
  }, [borderLine]);

  return (
    <div className="relative w-full h-full">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor={pending.atmosphereColor}
        atmosphereAltitude={pending.atmosphereAltitude}
        showAtmosphere={SHOW_ATMOSPHERE}
        rendererConfig={RENDERER_CONFIG}
        onGlobeReady={handleGlobeReady}
        onZoom={(pov) => { lastAltRef.current = pov.altitude; }}
        ringsData={ringsData}
        ringColor={accColor}
        ringMaxRadius={accMaxR}
        ringPropagationSpeed={accPropagation}
        ringRepeatPeriod={accRepeat}
        ringAltitude={pending.ringAltitude}
        pointsData={pointsData}
        pointAltitude={pending.pointAltitude}
        pointRadius={accSize}
        pointColor={accColor}
        htmlElementsData={htmlElementsData}
        htmlElement={htmlElement}
        htmlElementVisibilityModifier={htmlElementVisibilityModifier}
        htmlAltitude="altitude"
        customLayerData={customLayerData}
        customThreeObject={customThreeObject}
      />
    </div>
  );
}

export default memo(GlobeView);
