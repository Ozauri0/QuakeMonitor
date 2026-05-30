"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface GlobeSettings {
  quakePointColorLow: string;
  quakePointColorMid: string;
  quakePointColorHigh: string;
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

const defaultSettings: GlobeSettings = {
  quakePointColorLow: "rgba(0, 255, 0, 0.6)",
  quakePointColorMid: "rgba(255, 255, 0, 0.6)",
  quakePointColorHigh: "rgba(255, 0, 0, 0.6)",
  stationColorActive: "rgba(0, 200, 255, 0.7)",
  stationColorInactive: "rgba(100, 100, 100, 0.4)",
  ringAltitude: 0.03,
  pointAltitude: 0.03,
  labelAltitude: 0.04,
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

interface SettingsContextType {
  settings: GlobeSettings;
  updateSettings: (partial: Partial<GlobeSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobeSettings>(defaultSettings);

  const updateSettings = (partial: Partial<GlobeSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}
