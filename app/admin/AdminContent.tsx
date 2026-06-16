"use client";

import { useState } from "react";
import { useSettings, defaultSettings } from "@/app/context/SettingsContext";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  Palette,
  SlidersHorizontal,
  Globe,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function AdminContent() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    quakeColors: true,
    stationColors: true,
    rendering: true,
    atmosphere: false,
    polygons: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSimulate = async () => {
    setSimulating(true);
    setSimMessage("");
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: Date.now(), isUpdate: false }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimMessage(`Sismo simulado: M ${data.quake.mag} en ${data.quake.locationName}`);
      } else {
        setSimMessage(`Error: ${data.error}`);
      }
    } catch {
      setSimMessage("Error de red al simular");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-red-500" />
            <h1 className="text-xl font-bold">QuakeMonitor 3D — Administración</h1>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm font-semibold border border-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Simulation Card */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold">Simular Sismo</h2>
          </div>
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="px-6 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            {simulating ? "Enviando..." : "Simular Sismo Aleatorio"}
          </button>
          {simMessage && <p className="mt-3 text-sm text-gray-300">{simMessage}</p>}
        </section>

        {/* Visual Settings Card */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold">Configuración Visual del Globo</h2>
            </div>
            <button
              onClick={resetSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors"
              title="Restaurar valores por defecto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Defaults
            </button>
          </div>

          <div className="space-y-4">
            {/* Quake Colors */}
            <CollapsibleSection
              title="Colores de Sismos"
              icon={<Palette className="w-4 h-4 text-green-400" />}
              open={openSections.quakeColors}
              onToggle={() => toggleSection("quakeColors")}
            >
              <div className="space-y-4">
                <MagnitudeRange
                  label="Bajo"
                  rangeLabel={`0 – ${settings.quakeMagLowMax}`}
                  color={settings.quakePointColorLow}
                  magValue={settings.quakeMagLowMax}
                  magMin={0}
                  magMax={settings.quakeMagMidMax - 0.1}
                  onColorChange={(v) => updateSettings({ quakePointColorLow: v })}
                  onMagChange={(v) => updateSettings({ quakeMagLowMax: v })}
                />
                <MagnitudeRange
                  label="Medio"
                  rangeLabel={`${settings.quakeMagLowMax} – ${settings.quakeMagMidMax}`}
                  color={settings.quakePointColorMid}
                  magValue={settings.quakeMagMidMax}
                  magMin={settings.quakeMagLowMax + 0.1}
                  magMax={10}
                  onColorChange={(v) => updateSettings({ quakePointColorMid: v })}
                  onMagChange={(v) => updateSettings({ quakeMagMidMax: v })}
                />
                <MagnitudeRange
                  label="Alto"
                  rangeLabel={`${settings.quakeMagMidMax}+`}
                  color={settings.quakePointColorHigh}
                  magValue={null}
                  onColorChange={(v) => updateSettings({ quakePointColorHigh: v })}
                />
              </div>
            </CollapsibleSection>

            {/* Station Colors */}
            <CollapsibleSection
              title="Colores de Estaciones"
              icon={<Palette className="w-4 h-4 text-cyan-400" />}
              open={openSections.stationColors}
              onToggle={() => toggleSection("stationColors")}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ColorPicker
                  label="Estación Activa"
                  value={settings.stationColorActive}
                  onChange={(v) => updateSettings({ stationColorActive: v })}
                />
                <ColorPicker
                  label="Estación Inactiva"
                  value={settings.stationColorInactive}
                  onChange={(v) => updateSettings({ stationColorInactive: v })}
                />
              </div>
            </CollapsibleSection>

            {/* Rendering Parameters */}
            <CollapsibleSection
              title="Parámetros de Renderizado"
              icon={<SlidersHorizontal className="w-4 h-4 text-purple-400" />}
              open={openSections.rendering}
              onToggle={() => toggleSection("rendering")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderControl
                  label="Altitud Anillos"
                  value={settings.ringAltitude}
                  min={0}
                  max={0.1}
                  step={0.001}
                  onChange={(v) => updateSettings({ ringAltitude: v })}
                />
                <SliderControl
                  label="Altitud Puntos"
                  value={settings.pointAltitude}
                  min={0}
                  max={0.1}
                  step={0.001}
                  onChange={(v) => updateSettings({ pointAltitude: v })}
                />
                <SliderControl
                  label="Velocidad Propagación Anillo"
                  value={settings.ringPropagationSpeed}
                  min={0.5}
                  max={10}
                  step={0.5}
                  onChange={(v) => updateSettings({ ringPropagationSpeed: v })}
                />
                <SliderControl
                  label="Periodo Repetición Anillo (ms)"
                  value={settings.ringRepeatPeriod}
                  min={500}
                  max={5000}
                  step={100}
                  onChange={(v) => updateSettings({ ringRepeatPeriod: v })}
                />
                <SliderControl
                  label="Tamaño Base Puntos Sismo"
                  value={settings.quakePointSizeBase}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  onChange={(v) => updateSettings({ quakePointSizeBase: v })}
                />
                <SliderControl
                  label="Tamaño Puntos Estación"
                  value={settings.stationPointSize}
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  onChange={(v) => updateSettings({ stationPointSize: v })}
                />
                <SliderControl
                  label="Altitud Etiquetas"
                  value={settings.labelAltitude}
                  min={0}
                  max={0.05}
                  step={0.001}
                  onChange={(v) => updateSettings({ labelAltitude: v })}
                />
              </div>
            </CollapsibleSection>

            {/* Atmosphere */}
            <CollapsibleSection
              title="Atmósfera del Globo"
              icon={<Globe className="w-4 h-4 text-blue-400" />}
              open={openSections.atmosphere}
              onToggle={() => toggleSection("atmosphere")}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ColorPicker
                  label="Color Atmósfera"
                  value={settings.atmosphereColor}
                  onChange={(v) => updateSettings({ atmosphereColor: v })}
                />
                <SliderControl
                  label="Altitud Atmósfera"
                  value={settings.atmosphereAltitude}
                  min={0}
                  max={0.5}
                  step={0.01}
                  onChange={(v) => updateSettings({ atmosphereAltitude: v })}
                />
              </div>
            </CollapsibleSection>

            {/* Polygons */}
            <CollapsibleSection
              title="Bordes de Países"
              icon={<Globe className="w-4 h-4 text-gray-400" />}
              open={openSections.polygons}
              onToggle={() => toggleSection("polygons")}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorPicker
                  label="Borde"
                  value={settings.polygonStrokeColor}
                  onChange={(v) => updateSettings({ polygonStrokeColor: v })}
                />
                <ColorPicker
                  label="Lateral"
                  value={settings.polygonSideColor}
                  onChange={(v) => updateSettings({ polygonSideColor: v })}
                />
                <ColorPicker
                  label="Relleno"
                  value={settings.polygonCapColor}
                  onChange={(v) => updateSettings({ polygonCapColor: v })}
                />
              </div>
            </CollapsibleSection>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function CollapsibleSection({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-800/40 hover:bg-gray-800/60 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        {icon}
        <span className="text-sm font-semibold text-gray-300">{title}</span>
      </button>
      {open && <div className="px-4 py-4">{children}</div>}
    </div>
  );
}

function MagnitudeRange({
  label,
  rangeLabel,
  color,
  magValue,
  magMin,
  magMax,
  onColorChange,
  onMagChange,
}: {
  label: string;
  rangeLabel: string;
  color: string;
  magValue: number | null;
  magMin?: number;
  magMax?: number;
  onColorChange: (rgba: string) => void;
  onMagChange?: (val: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-300 min-w-0">
        <span className="font-medium text-gray-400 whitespace-nowrap">{label}:</span>
        <span className="text-gray-500 text-xs">{rangeLabel}</span>
        {magValue !== null && magMin !== undefined && magMax !== undefined && onMagChange && (
          <input
            type="number"
            step="0.1"
            min={magMin}
            max={magMax}
            value={magValue}
            onChange={(e) => onMagChange(Math.max(magMin, Math.min(parseFloat(e.target.value) || 0, magMax)))}
            className="w-14 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-center text-sm text-white focus:outline-none focus:border-purple-500"
          />
        )}
      </div>
      <ColorPickerInline value={color} onChange={onColorChange} />
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (rgba: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <ColorPickerInline value={value} onChange={onChange} />
    </div>
  );
}

function ColorPickerInline({
  value,
  onChange,
}: {
  value: string;
  onChange: (rgba: string) => void;
}) {
  const { hex, alpha } = parseRgba(value);
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={alpha}
        onChange={(e) => onChange(setAlpha(value, parseFloat(e.target.value)))}
        className="w-16 h-1.5 bg-gray-700 rounded appearance-none cursor-pointer accent-purple-500"
        title={`Opacidad: ${alpha.toFixed(2)}`}
      />
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(rgbaFromHex(e.target.value, alpha))}
        className="w-9 h-7 rounded cursor-pointer border border-gray-600"
      />
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}) {
  return (
    <div>
      <label className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
      />
    </div>
  );
}

/* ─── Color utilities ─── */

function parseRgba(rgba: string): { hex: string; alpha: number } {
  try {
    const nums = rgba
      .replace("rgba", "")
      .replace(/[()]/g, "")
      .split(",")
      .map((v) => parseFloat(v.trim()));
    const toHex = (n: number) =>
      Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, "0");
    return {
      hex: `#${toHex(nums[0] || 0)}${toHex(nums[1] || 0)}${toHex(nums[2] || 0)}`,
      alpha: nums[3] ?? 1,
    };
  } catch {
    return { hex: "#888888", alpha: 0.5 };
  }
}

function rgbaFromHex(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setAlpha(rgba: string, alpha: number): string {
  const { hex } = parseRgba(rgba);
  return rgbaFromHex(hex, alpha);
}
