"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface MagnitudeRange {
  id: string;
  label: string;
  minMagnitude: number;
  color: string;
}

export interface GlobeSettings {
  quakeColorRanges: MagnitudeRange[];
  stationColorActive: string;
  stationColorInactive: string;
  ringAltitude: number;
  pointAltitude: number;
  labelAltitude: number;
  ringPropagationSpeed: number;
  ringRepeatPeriod: number;
  stationPointSize: number;
  quakePointSizeBase: number;
  polygonStrokeColor: string;
  polygonSideColor: string;
  polygonCapColor: string;
  atmosphereColor: string;
  atmosphereAltitude: number;
  globeBackgroundColor: string;
}

const STORAGE_KEY = "quakemonitor-settings";

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_LOW_COLOR = "rgba(74, 222, 128, 0.7)";
const DEFAULT_MID_COLOR = "rgba(250, 204, 21, 0.7)";
const DEFAULT_HIGH_COLOR = "rgba(248, 113, 113, 0.7)";

export const defaultSettings: GlobeSettings = {
  quakeColorRanges: [
    { id: "default-low", label: "Bajo", minMagnitude: 0, color: DEFAULT_LOW_COLOR },
    { id: "default-mid", label: "Medio", minMagnitude: 3, color: DEFAULT_MID_COLOR },
    { id: "default-high", label: "Alto", minMagnitude: 5, color: DEFAULT_HIGH_COLOR },
  ],
  stationColorActive: "rgba(0, 200, 255, 0.7)",
  stationColorInactive: "rgba(100, 100, 100, 0.4)",
  ringAltitude: 0.03,
  pointAltitude: 0.03,
  labelAltitude: 0.008,
  ringPropagationSpeed: 2,
  ringRepeatPeriod: 1000,
  stationPointSize: 0.15,
  quakePointSizeBase: 0.4,
  polygonStrokeColor: "rgba(120, 120, 120, 0.4)",
  polygonSideColor: "rgba(100, 100, 100, 0.15)",
  polygonCapColor: "rgba(50, 50, 50, 0.05)",
  atmosphereColor: "rgba(60, 120, 200, 0.5)",
  atmosphereAltitude: 0.15,
  globeBackgroundColor: "rgba(0,0,0,0)",
};

interface LegacySettings {
  quakePointColorLow?: string;
  quakePointColorMid?: string;
  quakePointColorHigh?: string;
  quakeMagLowMax?: number;
  quakeMagMidMax?: number;
}

function migrateFromLegacy(stored: any): GlobeSettings {
  if (Array.isArray(stored?.quakeColorRanges) && stored.quakeColorRanges.length > 0) {
    return { ...defaultSettings, ...stored };
  }
  // Empty or missing ranges — use defaults
  const legacy: LegacySettings = stored ?? {};
  const ranges: MagnitudeRange[] = [
    { id: makeId(), label: "Bajo",  minMagnitude: 0, color: legacy.quakePointColorLow  ?? defaultSettings.quakeColorRanges[0].color },
    { id: makeId(), label: "Medio", minMagnitude: legacy.quakeMagLowMax ?? 3, color: legacy.quakePointColorMid  ?? defaultSettings.quakeColorRanges[1].color },
    { id: makeId(), label: "Alto",  minMagnitude: legacy.quakeMagMidMax ?? 5, color: legacy.quakePointColorHigh ?? defaultSettings.quakeColorRanges[2].color },
  ];
  return {
    ...defaultSettings,
    ...stored,
    quakeColorRanges: ranges,
  };
}

function loadSettings(): GlobeSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSettings;
    const parsed = JSON.parse(stored);
    return migrateFromLegacy(parsed);
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: GlobeSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage full or unavailable
  }
}

interface SettingsContextType {
  settings: GlobeSettings;
  pending: GlobeSettings;
  hasPending: boolean;
  updatePending: (partial: Partial<GlobeSettings>) => void;
  apply: () => void;
  discard: () => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

function diffCount(a: GlobeSettings, b: GlobeSettings): number {
  if (a === b) return 0;
  let count = 0;
  const keys: (keyof GlobeSettings)[] = [
    "stationColorActive", "stationColorInactive", "ringAltitude", "pointAltitude",
    "labelAltitude", "ringPropagationSpeed", "ringRepeatPeriod", "stationPointSize",
    "quakePointSizeBase", "polygonStrokeColor", "polygonSideColor", "polygonCapColor",
    "atmosphereColor", "atmosphereAltitude", "globeBackgroundColor",
  ];
  for (const k of keys) {
    if (a[k] !== b[k]) count++;
  }
  // Range array deep check
  const aR = a.quakeColorRanges;
  const bR = b.quakeColorRanges;
  if (aR.length !== bR.length) {
    count += Math.abs(aR.length - bR.length);
  } else {
    for (let i = 0; i < aR.length; i++) {
      if (aR[i].id !== bR[i].id) count++;
      if (aR[i].label !== bR[i].label) count++;
      if (aR[i].minMagnitude !== bR[i].minMagnitude) count++;
      if (aR[i].color !== bR[i].color) count++;
    }
  }
  return count;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobeSettings>(defaultSettings);
  const [pending, setPending] = useState<GlobeSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setPending(loaded);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveSettings(settings);
  }, [settings, loaded]);

  const updatePending = useCallback((partial: Partial<GlobeSettings>) => {
    setPending((prev) => ({ ...prev, ...partial }));
  }, []);

  const apply = useCallback(() => {
    setSettings(pending);
  }, [pending]);

  const discard = useCallback(() => {
    setPending(settings);
  }, [settings]);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    setPending(defaultSettings);
  }, []);

  const hasPending = diffCount(pending, settings) > 0;

  return (
    <SettingsContext.Provider value={{ settings, pending, hasPending, updatePending, apply, discard, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}

/**
 * Resolve the color for a quake of given magnitude using the current pending ranges.
 * (Used by GlobeView / Sidebar — they read from the same `useSettings().pending`.)
 */
export function getQuakeColor(magnitude: number, ranges: MagnitudeRange[]): string {
  if (!ranges || ranges.length === 0) {
    if (magnitude < 3) return DEFAULT_LOW_COLOR;
    if (magnitude < 5) return DEFAULT_MID_COLOR;
    return DEFAULT_HIGH_COLOR;
  }
  // Walk ranges in order; first range whose minMagnitude <= mag wins.
  // (The last range acts as the open-ended top tier.)
  const sorted = [...ranges].sort((a, b) => a.minMagnitude - b.minMagnitude);
  let chosen = sorted[sorted.length - 1].color;
  for (const r of sorted) {
    if (magnitude >= r.minMagnitude) {
      chosen = r.color;
    } else {
      break;
    }
  }
  return chosen;
}
