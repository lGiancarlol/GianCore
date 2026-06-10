"use client";

import { use } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import { useProvider, useProviderStats } from "@/hooks/useProviders";
import {
  ServerCog, Package, KeyRound, Activity, AlertTriangle,
  ChevronLeft, CheckCircle2, XCircle, Clock, Key, Zap,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  telegram_bot: "Telegram Bot", keyauth: "KeyAuth",
  auth_panel:   "Auth Panel",   rest_api: "REST API",
};

function StatBox({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div className="card card-p text-center">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

function msToHuman(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: provider, loading }              = useProvider(id);
  const { data: stats,    loading: statsLoading } = useProviderStats(id, 15_000);

  const handleHealthCheck = async () => {
    const res  = await fetch(`/api/providers/${id}/health`, { method: "POST" });
    const json = await res.json();
    alert(json.ok ? `✅ Online (${json.latencyMs ?? "?"}ms)` : `❌ Error: ${json.error}`);
  };

  if (loading) return (
    <>
      <Topbar title="Provider" subtitle="Cargando..." />
      <div className="p-6 grid-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
    </>
  );

  if (!provider) return (
    <>
      <Topbar title="Provider" subtitle="No encontrado" />
      <div className="p-6 text-sm text-muted-foreground">Provider no encontrado.</div>
    </>
  );

  const lastKeyStr = stats?.lastKey
    ? String((stats.lastKey as Record<string, unknown>).key ?? "—")
    : "—";

  return (
    <>
      <Topbar
        title={provider.name}
        subtitle={TYPE_LABELS[provider.type] ?? provider.type}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/providers" className="btn-secondary gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Volver
            </Link>
            <button className="btn-secondary" onClick={handleHealthCheck}>
              <Activity className="w-4 h-4" /> Health Check
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-6 page-enter">

        {/* Status bar */}
        <div className="card card-p flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ServerCog className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{provider.name}</span>
          </div>
          <Badge variant={provider.active ? "green" : "muted"}>
            {provider.active ? "Activo" : "Inactivo"}
          </Badge>
          <span className="text-xs text-muted-foreground">{TYPE_LABELS[provider.type]}</span>
        </div>

        {/* Monitoring stats */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Monitoring</p>
          {statsLoading ? (
            <div className="grid-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          ) : (
            <div className="grid-4">
              <StatBox label="Total requests"  value={stats?.total     ?? 0} color="var(--theme-primary)" />
              <StatBox label="Completados"     value={stats?.completed ?? 0} color="#27ae60" />
              <StatBox label="Fallidos"        value={stats?.failed    ?? 0} color="#e74c3c" />
              <StatBox label="Pendientes"      value={stats?.pending   ?? 0} color="#e67e22" />
            </div>
          )}
        </div>

        {/* Telegram live panel */}
        {provider.type === "telegram_bot" && (
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Telegram Live</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Last key generated */}
              <div className="card card-p flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Key className="w-4 h-4" />
                  <span className="text-xs">Última key generada</span>
                </div>
                {statsLoading ? (
                  <div className="skeleton h-6 w-40 rounded" />
                ) : (
                  <>
                    <code className="text-sm font-mono text-foreground break-all">{lastKeyStr}</code>
                    <p className="text-[10px] text-muted-foreground">{relTime(stats?.lastKeyAt ?? null)}</p>
                  </>
                )}
              </div>

              {/* Avg response time */}
              <div className="card card-p flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Tiempo promedio</span>
                </div>
                {statsLoading ? (
                  <div className="skeleton h-6 w-20 rounded" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {msToHuman(stats?.avgResponseMs ?? null)}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">por request completado</p>
              </div>

              {/* Connection status */}
              <div className="card card-p flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs">Estado de conexión</span>
                </div>
                <button
                  className="btn-secondary text-xs self-start"
                  onClick={handleHealthCheck}
                >
                  <Activity className="w-3.5 h-3.5" /> Verificar ahora
                </button>
                <p className="text-[10px] text-muted-foreground">
                  Verifica que el bot token sea válido
                </p>
              </div>

            </div>

            {/* Last error */}
            {stats?.lastError && (
              <div className="mt-3 card card-p flex items-start gap-2 border-red-500/20 bg-red-500/5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-red-400">Último error</p>
                    <span className="text-[10px] text-muted-foreground">{relTime(stats.lastError.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">{stats.lastError.error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sections grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Products */}
          <div className="card">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Productos asociados</p>
              </div>
              <Link href={`/providers/${id}/products`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Gestionar →
              </Link>
            </div>
            {provider.products?.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Sin productos asignados</div>
            ) : (
              <ul className="divide-y divide-border">
                {provider.products?.map((pp) => (
                  <li key={pp.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                    <div>
                      <p className="text-xs text-foreground">{(pp as typeof pp & { product?: { name: string } }).product?.name ?? pp.productId}</p>
                      <code className="text-[10px] text-muted-foreground">{pp.externalRef}</code>
                    </div>
                    {pp.active
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      : <XCircle      className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Accounts */}
          <div className="card">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Cuentas</p>
              </div>
              <Link href={`/providers/${id}/accounts`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Gestionar →
              </Link>
            </div>
            {provider.accounts?.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Sin cuentas configuradas</div>
            ) : (
              <ul className="divide-y divide-border">
                {provider.accounts?.map((acc) => (
                  <li key={acc.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                    <p className="text-xs text-foreground">{acc.label}</p>
                    <Badge variant={acc.active ? "green" : "muted"}>
                      {acc.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
