"use client";

import { useState } from "react";
import { useSettings } from "@/app/context/SettingsContext";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  Palette,
  SlidersHorizontal,
  Globe,
} from "lucide-react";

export default function AdminContent() {
  const { settings, updateSettings } = useSettings();
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState("");

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
        setSimMessage(`✅ Sismo simulado: M ${data.quake.mag} en ${data.quake.locationName}`);
      } else {
        setSimMessage(`❌ Error: ${data.error}`);
      }
    } catch (e) {
      setSimMessage("❌ Error de red al simular");
    } finally {
      setSimulating(false);
    }
  };

  const hexFromRgba = (rgba: string, fallback: string) => {
    try {
      const nums = rgba
        .replace("rgba", "")
        .replace(/[()]/g, "")
        .split(",")
        .map((v) => parseInt(v.trim()));
      const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
      return `#${toHex(nums[0] || 0)}${toHex(nums[1] || 0)}${toHex(nums[2] || 0)}`;
    } catch {
      return fallback;
    }
  };

  const updateRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
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

          {simMessage && (
            <p className="mt-3 text-sm text-gray-300">{simMessage}</p>
          )}
        </section>

        {/* Visual Settings Card */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold">Configuración Visual del Globo</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quake Colors */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Colores de Sismos
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-gray-300">
                    <span className="font-medium text-gray-400">Bajo:</span>
                    <span>0</span>
                    <span>–</span>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={settings.quakeMagMidMax - 0.1}
                      value={settings.quakeMagLowMax}
                      onChange={(e) =>
                        updateSettings({
                          quakeMagLowMax: Math.max(0, Math.min(parseFloat(e.target.value) || 0, settings.quakeMagMidMax - 0.1)),
                        })
                      }
                      className="w-14 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-center text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <input
                    type="color"
                    value={hexFromRgba(settings.quakePointColorLow, "#00ff00")}
                    onChange={(e) =>
                      updateSettings({
                        quakePointColorLow: updateRgba(e.target.value, 0.6),
                      })
                    }
                    className="w-10 h-8 rounded cursor-pointer border border-gray-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-gray-300">
                    <span className="font-medium text-gray-400">Medio:</span>
                    <span className="text-gray-500">{settings.quakeMagLowMax}</span>
                    <span>–</span>
                    <input
                      type="number"
                      step="0.1"
                      min={settings.quakeMagLowMax + 0.1}
                      max={10}
                      value={settings.quakeMagMidMax}
                      onChange={(e) =>
                        updateSettings({
                          quakeMagMidMax: Math.max(settings.quakeMagLowMax + 0.1, Math.min(parseFloat(e.target.value) || 0, 10)),
                        })
                      }
                      className="w-14 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-center text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <input
                    type="color"
                    value={hexFromRgba(settings.quakePointColorMid, "#ffff00")}
                    onChange={(e) =>
                      updateSettings({
                        quakePointColorMid: updateRgba(e.target.value, 0.6),
                      })
                    }
                    className="w-10 h-8 rounded cursor-pointer border border-gray-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-gray-300">
                    <span className="font-medium text-gray-400">Alto:</span>
                    <span className="text-gray-500">{settings.quakeMagMidMax}</span>
                    <span>+</span>
                  </div>
                  <input
                    type="color"
                    value={hexFromRgba(settings.quakePointColorHigh, "#ff0000")}
                    onChange={(e) =>
                      updateSettings({
                        quakePointColorHigh: updateRgba(e.target.value, 0.6),
                      })
                    }
                    className="w-10 h-8 rounded cursor-pointer border border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Station Colors */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Colores de Estaciones
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Estación Activa</span>
                  <input
                    type="color"
                    value={hexFromRgba(settings.stationColorActive, "#00c8ff")}
                    onChange={(e) =>
                      updateSettings({
                        stationColorActive: updateRgba(e.target.value, 0.7),
                      })
                    }
                    className="w-10 h-8 rounded cursor-pointer border border-gray-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Estación Inactiva</span>
                  <input
                    type="color"
                    value={hexFromRgba(settings.stationColorInactive, "#646464")}
                    onChange={(e) =>
                      updateSettings({
                        stationColorInactive: updateRgba(e.target.value, 0.4),
                      })
                    }
                    className="w-10 h-8 rounded cursor-pointer border border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Parámetros de Renderizado
              </h3>
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
              </div>
            </div>
          </div>
        </section>
      </main>
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
        <span>{value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0)}</span>
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
