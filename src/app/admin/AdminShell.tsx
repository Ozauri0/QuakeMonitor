"use client";

import { useSettings, MagnitudeRange, getQuakeColor } from "@/app/context/SettingsContext";
import {
  ArrowLeft,
  Globe,
  X,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 antialiased">
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <Globe className="w-5 h-5 text-red-500" />
            <span className="text-sm font-semibold tracking-tight">QuakeMonitor</span>
            <span className="text-gray-700">/</span>
            <span className="text-sm text-gray-400">Admin</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavPill href="/admin" label="Visual" active={pathname === "/admin"} />
            <NavPill
              href="/admin/providers"
              label="Estaciones"
              active={pathname?.startsWith("/admin/providers") ?? false}
            />
            <Link
              href="/"
              className="ml-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-8 py-12 space-y-16">{children}</main>
    </div>
  );
}

function NavPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
        active
          ? "text-white bg-gray-800/80"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export function StickyApplyBar() {
  const { hasPending, apply, discard } = useSettings();
  if (!hasPending) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-amber-700/50 bg-amber-950/95 backdrop-blur-md shadow-2xl">
      <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Cambios sin guardar
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={discard}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Descartar
          </button>
          <button
            onClick={apply}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 hover:bg-gray-200 transition-colors"
          >
            Aplicar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Ranges editor ─── */

const MAGNITUDE_MAX = 10;

function clampMag(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(MAGNITUDE_MAX, v));
}

export function MagnitudeRangesEditor() {
  const { pending, updatePending } = useSettings();
  const ranges = pending.quakeColorRanges;
  const sorted = [...ranges].sort((a, b) => a.minMagnitude - b.minMagnitude);

  function update(id: string, patch: Partial<MagnitudeRange>) {
    const next = ranges.map((r) => (r.id === id ? { ...r, ...patch } : r));
    updatePending({ quakeColorRanges: next });
  }

  function add(atMagnitude?: number) {
    const newMin = atMagnitude !== undefined
      ? clampMag(atMagnitude)
      : clampMag((sorted[sorted.length - 1]?.minMagnitude ?? -1) + 1);
    const id = Math.random().toString(36).slice(2, 10);
    const palette = [
      "rgba(120, 220, 120, 0.65)",
      "rgba(255, 230, 80, 0.7)",
      "rgba(255, 150, 50, 0.75)",
      "rgba(255, 70, 70, 0.8)",
      "rgba(180, 60, 255, 0.85)",
    ];
    const color = palette[sorted.length % palette.length];
    const next: MagnitudeRange[] = [
      ...ranges,
      { id, label: `Rango ${sorted.length + 1}`, minMagnitude: newMin, color },
    ];
    updatePending({ quakeColorRanges: next });
  }

  function remove(id: string) {
    updatePending({ quakeColorRanges: ranges.filter((r) => r.id !== id) });
  }

  if (sorted.length === 0) {
    return (
      <div className="border border-dashed border-gray-800 rounded-2xl p-16 text-center">
        <p className="text-gray-500 text-sm mb-6">
          No hay rangos definidos. Añade el primero para empezar a colorear sismos.
        </p>
        <button
          onClick={() => add()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-500 text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir primer rango
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <MagnitudeSpectrum ranges={sorted} onAddAt={add} />

      <div>
        <div className="flex items-baseline justify-between mb-6">
          <h3 className="text-sm font-medium text-gray-400">Rangos</h3>
          <button
            onClick={() => add()}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir rango
          </button>
        </div>

        <div className="divide-y divide-gray-800/60 border-t border-b border-gray-800/60">
          {sorted.map((r, i) => {
            const next = sorted[i + 1];
            const isLast = i === sorted.length - 1;
            return (
              <RangeRow
                key={r.id}
                range={r}
                isLast={isLast}
                nextMin={next?.minMagnitude ?? null}
                onUpdate={(patch) => update(r.id, patch)}
                onRemove={() => remove(r.id)}
                canRemove={sorted.length > 1}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MagnitudeSpectrum({
  ranges,
  onAddAt,
}: {
  ranges: MagnitudeRange[];
  onAddAt?: (magnitude: number) => void;
}) {
  const stops: string[] = [];
  for (let m = 0; m <= MAGNITUDE_MAX; m += 0.25) {
    const color = getQuakeColor(m, ranges);
    const pct = (m / MAGNITUDE_MAX) * 100;
    stops.push(`${color} ${pct.toFixed(2)}%`);
  }
  const gradient = `linear-gradient(to right, ${stops.join(", ")})`;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onAddAt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const mag = clampMag((x / rect.width) * MAGNITUDE_MAX);
    onAddAt(Math.round(mag * 10) / 10);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Espectro de magnitud</h3>
        <span className="text-xs text-gray-600">Click para añadir un rango</span>
      </div>
      <div
        className="relative cursor-crosshair group"
        onClick={handleClick}
      >
        <div
          className="h-8 rounded-full"
          style={{ backgroundImage: gradient }}
        />
        {ranges.map((r) => {
          const pct = Math.min(100, Math.max(0, (r.minMagnitude / MAGNITUDE_MAX) * 100));
          return (
            <div
              key={r.id}
              className="absolute top-0 h-8 flex items-center pointer-events-none"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
            >
              <div
                className="w-3 h-3 rounded-full border-2 border-gray-950 shadow-md"
                style={{ background: r.color }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[11px] text-gray-600 font-mono tabular-nums">
        {Array.from({ length: MAGNITUDE_MAX + 1 }, (_, i) => i).map((i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
    </div>
  );
}

function RangeRow({
  range,
  isLast,
  nextMin,
  onUpdate,
  onRemove,
  canRemove,
}: {
  range: MagnitudeRange;
  isLast: boolean;
  nextMin: number | null;
  onUpdate: (patch: Partial<MagnitudeRange>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { hex, alpha } = parseRgba(range.color);
  const rangeText = isLast
    ? `M ${range.minMagnitude.toFixed(1)}+`
    : `M ${range.minMagnitude.toFixed(1)} — ${(nextMin ?? 0).toFixed(1)}`;

  return (
    <div className="group flex items-center gap-4 py-4 transition-colors">
      {/* Color dot (clickable picker) */}
      <div className="relative w-5 h-5 flex-shrink-0">
        <div
          className="w-5 h-5 rounded-full ring-1 ring-gray-700 cursor-pointer hover:ring-2 hover:ring-white/40 transition-all"
          style={{ background: range.color }}
          onClick={() => {
            const input = document.getElementById(`cp-${range.id}`) as HTMLInputElement | null;
            input?.click();
          }}
          title="Click para cambiar color"
        />
        <input
          id={`cp-${range.id}`}
          type="color"
          value={hex}
          onChange={(e) => onUpdate({ color: rgbaFromHex(e.target.value, alpha) })}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>

      {/* Label + range text */}
      <div className="flex-1 min-w-0 flex items-baseline gap-3">
        <input
          type="text"
          value={range.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Etiqueta"
          className="w-32 bg-transparent text-sm font-medium text-white focus:outline-none placeholder:text-gray-700"
        />
        <span className="text-xs text-gray-500 font-mono tabular-nums">{rangeText}</span>
      </div>

      {/* Min input */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Mín</span>
        <input
          type="number"
          step="0.1"
          min={0}
          max={MAGNITUDE_MAX}
          value={range.minMagnitude}
          onChange={(e) => onUpdate({ minMagnitude: clampMag(parseFloat(e.target.value)) })}
          className="w-16 bg-gray-900 border border-gray-800 rounded text-center text-sm text-white font-mono tabular-nums focus:outline-none focus:border-gray-600 px-2 py-1"
        />
      </div>

      {/* Alpha slider */}
      <div className="flex items-center gap-2 w-32">
        <span className="text-xs text-gray-500">α</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={alpha}
          onChange={(e) => onUpdate({ color: setAlpha(range.color, parseFloat(e.target.value)) })}
          className="flex-1 h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-purple-500"
        />
        <span className="text-xs text-gray-500 font-mono tabular-nums w-7 text-right">
          {alpha.toFixed(2)}
        </span>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        disabled={!canRemove}
        title={canRemove ? "Eliminar rango" : "Al menos un rango es obligatorio"}
        className="p-1.5 rounded text-gray-600 hover:text-white hover:bg-gray-800 disabled:opacity-20 disabled:hover:text-gray-600 disabled:hover:bg-transparent transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
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
        className="w-14 h-1.5 bg-gray-700 rounded appearance-none cursor-pointer accent-cyan-500"
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
        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
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

/* ─── Simulate panel ─── */

export function SimulatePanel() {
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
    <section>
      <h2 className="text-sm font-medium text-gray-400 mb-4">Pruebas</h2>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSimulate}
          disabled={simulating}
          className="px-4 py-2 rounded-md text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {simulating ? "Enviando..." : "Simular sismo aleatorio"}
        </button>
        {simMessage && <span className="text-sm text-gray-400">{simMessage}</span>}
      </div>
    </section>
  );
}

/* ─── Reusable: simple visual settings section ─── */

export function VisualSettingsSections() {
  const { pending, updatePending, resetSettings } = useSettings();
  return (
    <section className="space-y-12">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-gray-400">Globo y estaciones</h2>
        <button
          onClick={resetSettings}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          Restaurar defaults
        </button>
      </div>

      <SubSection title="Colores de estaciones">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorRow
            label="Activa"
            value={pending.stationColorActive}
            onChange={(v) => updatePending({ stationColorActive: v })}
          />
          <ColorRow
            label="Inactiva"
            value={pending.stationColorInactive}
            onChange={(v) => updatePending({ stationColorInactive: v })}
          />
        </div>
      </SubSection>

      <SubSection title="Atmósfera">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorRow label="Color" value={pending.atmosphereColor}
            onChange={(v) => updatePending({ atmosphereColor: v })} />
          <SliderRow label="Altitud" value={pending.atmosphereAltitude} min={0} max={0.5} step={0.01}
            onChange={(v) => updatePending({ atmosphereAltitude: v })} />
        </div>
      </SubSection>

      <SubSection title="Bordes de países">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorRow label="Línea" value={pending.polygonStrokeColor}
            onChange={(v) => updatePending({ polygonStrokeColor: v })} />
          <ColorRow label="Lateral" value={pending.polygonSideColor}
            onChange={(v) => updatePending({ polygonSideColor: v })} />
          <ColorRow label="Relleno" value={pending.polygonCapColor}
            onChange={(v) => updatePending({ polygonCapColor: v })} />
        </div>
      </SubSection>

      <SubSection title="Renderizado">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <SliderRow label="Altitud anillos" value={pending.ringAltitude} min={0} max={0.1} step={0.001}
            onChange={(v) => updatePending({ ringAltitude: v })} />
          <SliderRow label="Altitud puntos" value={pending.pointAltitude} min={0} max={0.1} step={0.001}
            onChange={(v) => updatePending({ pointAltitude: v })} />
          <SliderRow label="Velocidad anillo" value={pending.ringPropagationSpeed} min={0.5} max={10} step={0.5}
            onChange={(v) => updatePending({ ringPropagationSpeed: v })} />
          <SliderRow label="Periodo anillo (ms)" value={pending.ringRepeatPeriod} min={500} max={5000} step={100}
            onChange={(v) => updatePending({ ringRepeatPeriod: v })} />
          <SliderRow label="Tamaño puntos sismo" value={pending.quakePointSizeBase} min={0.1} max={1.0} step={0.05}
            onChange={(v) => updatePending({ quakePointSizeBase: v })} />
          <SliderRow label="Tamaño puntos estación" value={pending.stationPointSize} min={0.05} max={0.5} step={0.01}
            onChange={(v) => updatePending({ stationPointSize: v })} />
          <SliderRow label="Altitud etiquetas" value={pending.labelAltitude} min={0} max={0.05} step={0.001}
            onChange={(v) => updatePending({ labelAltitude: v })} />
        </div>
      </SubSection>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-gray-600 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { hex, alpha } = parseRgba(value);
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-4 h-4 rounded-full ring-1 ring-gray-700 cursor-pointer"
        style={{ background: value }}
        onClick={() => {
          const id = `cp-${label}-${hex}`;
          const el = document.getElementById(id) as HTMLInputElement | null;
          el?.click();
        }}
      />
      <input
        id={`cp-${label}-${hex}`}
        type="color"
        value={hex}
        onChange={(e) => onChange(rgbaFromHex(e.target.value, alpha))}
        className="sr-only"
      />
      <span className="text-sm text-gray-300 w-20">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={alpha}
        onChange={(e) => onChange(setAlpha(value, parseFloat(e.target.value)))}
        className="flex-1 h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-purple-500"
        title={`Opacidad: ${alpha.toFixed(2)}`}
      />
      <span className="text-xs text-gray-500 font-mono w-7 text-right tabular-nums">
        {alpha.toFixed(2)}
      </span>
    </div>
  );
}

function SliderRow({
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
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300 w-32 flex-shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 bg-gray-800 rounded-full appearance-none cursor-pointer accent-purple-500"
      />
      <span className="text-xs text-gray-500 font-mono w-14 text-right tabular-nums">
        {value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0)}
      </span>
    </div>
  );
}
