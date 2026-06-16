"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface GlobeSettings {
  quakePointColorLow: string;
  quakePointColorMid: string;
  quakePointColorHigh: string;
  quakeMagLowMax: number;
  quakeMagMidMax: number;
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

export const defaultSettings: GlobeSettings = {
  quakePointColorLow: "rgba(0, 255, 0, 0.6)",
  quakePointColorMid: "rgba(255, 255, 0, 0.6)",
  quakePointColorHigh: "rgba(255, 0, 0, 0.6)",
  quakeMagLowMax: 3,
  quakeMagMidMax: 5,
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

function loadSettings(): GlobeSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSettings;
    const parsed = JSON.parse(stored);
    // Merge with defaults so new fields are always present
    return { ...defaultSettings, ...parsed };
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
  updateSettings: (partial: Partial<GlobeSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobeSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  // Persist to localStorage on every change (skip initial render before load)
  useEffect(() => {
    if (loaded) saveSettings(settings);
  }, [settings, loaded]);

  const updateSettings = useCallback((partial: Partial<GlobeSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}
