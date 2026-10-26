import type { HealthResponse } from '@vision-max/shared';
import { useGetHealthQuery } from '../app/api';

// Página temporal en "/" hasta que exista el Home del catálogo: confirma que front, API y DB se ven.
export function StatusPage() {
  const { data, error, isLoading, refetch } = useGetHealthQuery();
  // Con la DB caída la API responde 503 con el mismo cuerpo.
  const health =
    data ?? (error && 'data' in error ? (error.data as HealthResponse | undefined) : undefined);

  return (
    <section className="mx-auto max-w-7xl space-y-4 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Estado del entorno</h1>
      <dl className="max-w-md divide-y divide-line rounded-lg border border-line bg-surface">
        <Row label="API" value={isLoading ? 'Consultando…' : health ? 'OK' : 'Sin respuesta'} ok={!!health} />
        <Row label="Base de datos" value={health ? (health.db === 'up' ? 'Conectada' : 'Sin conexión') : '—'} ok={health?.db === 'up'} />
      </dl>
      <button
        type="button"
        onClick={() => refetch()}
        className="rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:text-fg"
      >
        Volver a consultar
      </button>
    </section>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className={ok ? 'text-fg' : 'text-danger'}>{value}</dd>
    </div>
  );
}
