"use client";

import { useState, useMemo, useCallback } from "react";
import Topbar from "@/components/layout/Topbar";
import SearchBar from "@/components/ui/SearchBar";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { ScrollText, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditLog } from "@/types";
import { useLogs } from "@/hooks/useLogs";

// ── Helpers ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ENTITY_OPTIONS = [
  { value: "",            label: "Todas las entidades" },
  { value: "license",     label: "Licencia" },
  { value: "product",     label: "Producto" },
  { value: "user",        label: "Usuario" },
  { value: "integration", label: "Integración" },
  { value: "discord",     label: "Discord" },
  { value: "telegram",    label: "Telegram" },
];

function actionColor(action: string) {
  if (action.includes("create") || action.includes("add"))    return "text-green-400";
  if (action.includes("delete") || action.includes("ban"))    return "text-red-400";
  if (action.includes("update") || action.includes("edit"))   return "text-blue-400";
  if (action.includes("deactivate") || action.includes("off")) return "text-amber-400";
  return "text-muted-foreground";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const { data: logs, loading, error } = useLogs(200);

  const [search,    setSearch]    = useState("");
  const [entity,    setEntity]    = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [page,      setPage]      = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((l) => {
      const matchSearch =
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q) ||
        (l.user?.username ?? "").toLowerCase().includes(q) ||
        (l.ip ?? "").includes(q);
      const matchEntity = !entity   || l.entity.toLowerCase() === entity;
      const logDate     = new Date(l.createdAt).getTime();
      const matchFrom   = !dateFrom || logDate >= new Date(dateFrom).getTime();
      const matchTo     = !dateTo   || logDate <= new Date(dateTo + "T23:59:59").getTime();
      return matchSearch && matchEntity && matchFrom && matchTo;
    });
  }, [logs, search, entity, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = useCallback(() => {
    setSearch(""); setEntity(""); setDateFrom(""); setDateTo(""); setPage(1);
  }, []);

  const hasFilters = search || entity || dateFrom || dateTo;

  return (
    <>
      <Topbar
        title="Logs"
        subtitle={`${filtered.length} evento${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 page-enter">

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-end">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Buscar acción, entidad, usuario, IP..."
            className="w-full sm:w-72"
          />
          <Select
            value={entity}
            onChange={(v) => { setEntity(v); setPage(1); }}
            options={ENTITY_OPTIONS}
            className="w-full sm:w-44"
          />
          <div className="flex items-center gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Desde</p>
              <input
                type="date"
                className="input-base text-xs"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Hasta</p>
              <input
                type="date"
                className="input-base text-xs"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          {hasFilters && (
            <button className="btn-secondary gap-1.5" onClick={resetFilters}>
              <RefreshCw className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="Sin registros"
              description={hasFilters
                ? "No se encontraron eventos con los filtros actuales."
                : "Las acciones del sistema se registrarán aquí automáticamente."
              }
              action={hasFilters ? (
                <button className="btn-secondary gap-1.5" onClick={resetFilters}>
                  <RefreshCw className="w-3.5 h-3.5" /> Limpiar filtros
                </button>
              ) : undefined}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table-base">
                  <thead>
                    <tr className="border-b border-border text-left bg-secondary/20">
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Acción</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Entidad</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">ID entidad</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Usuario</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">IP</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Página {page} de {totalPages} · {filtered.length} registros
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      className="icon-btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-7 h-7 text-xs rounded-md transition-all duration-150 ${
                            p === page
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          }`}
                          style={p === page ? {
                            background: "var(--theme-soft)",
                            border: "1px solid var(--theme-border)",
                            color: "var(--theme-primary)",
                          } : undefined}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      className="icon-btn"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── LogRow ─────────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: AuditLog }) {
  return (
    <tr className="table-row-hover">
      <td className="px-4 py-2.5">
        <code className={`text-xs font-mono ${actionColor(log.action)}`}>
          {log.action}
        </code>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs text-foreground capitalize">{log.entity}</span>
      </td>
      <td className="px-4 py-2.5">
        <code className="text-[11px] text-muted-foreground font-mono">
          {log.entityId ? log.entityId.slice(0, 8) + "…" : "—"}
        </code>
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {log.user?.username ?? <span className="italic">sistema</span>}
      </td>
      <td className="px-4 py-2.5">
        <code className="text-[11px] text-muted-foreground font-mono">
          {log.ip ?? "—"}
        </code>
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(log.createdAt)}
      </td>
    </tr>
  );
}
