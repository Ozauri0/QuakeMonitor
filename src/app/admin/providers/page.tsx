import ProviderManager from "@/app/components/admin/ProviderManager";
import AdminShell, { StickyApplyBar } from "../AdminShell";
import Link from "next/link";

export default function ProvidersPage() {
  return (
    <AdminShell>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Estaciones</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Activa o desactiva las estaciones conectadas al GlobalQuake server.
          Los cambios se aplican en tiempo real al globo.
        </p>
      </header>

      <ProviderManager />

      <StickyApplyBar />
    </AdminShell>
  );
}
