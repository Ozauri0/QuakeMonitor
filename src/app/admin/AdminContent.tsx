"use client";

import AdminShell, {
  StickyApplyBar,
  MagnitudeRangesEditor,
  VisualSettingsSections,
  SimulatePanel,
} from "./AdminShell";

export default function AdminContent() {
  return (
    <AdminShell>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración visual</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personaliza el globo y los colores. Los cambios se previsualizan en tiempo real;
          pulsa <span className="text-gray-300">Aplicar cambios</span> para guardarlos.
        </p>
      </header>

      <SimulatePanel />

      <section>
        <h2 className="text-sm font-medium text-gray-400 mb-6">Colores por magnitud</h2>
        <MagnitudeRangesEditor />
      </section>

      <VisualSettingsSections />

      <StickyApplyBar />
    </AdminShell>
  );
}
