"use client";

import { useState, useMemo } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import SearchBar from "@/components/ui/SearchBar";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { useLicenses } from "@/hooks/useLicenses";
import { useProducts } from "@/hooks/useProducts";
import { Key, Plus, Copy, CheckCheck, Power, Ban, RefreshCw } from "lucide-react";
import type { License, LicenseStatus } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "",         label: "Todos los estados" },
  { value: "active",   label: "Activas" },
  { value: "inactive", label: "Inactivas" },
  { value: "expired",  label: "Expiradas" },
  { value: "banned",   label: "Baneadas" },
];

const STATUS_VARIANT: Record<LicenseStatus, "green" | "muted" | "amber" | "red"> = {
  active:   "green",
  inactive: "muted",
  expired:  "amber",
  banned:   "red",
};

const STATUS_LABEL: Record<LicenseStatus, string> = {
  active:   "Activa",
  inactive: "Inactiva",
  expired:  "Expirada",
  banned:   "Baneada",
};

function useClipboard(ms = 1500) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), ms);
    });
  };
  return { copied, copy };
}

// ── Create Modal ───────────────────────────────────────────────────────────────

function CreateLicenseModal({ open, onClose, productOptions }: {
  open: boolean; onClose: () => void;
  productOptions: { value: string; label: string }[];
}) {
  const [form, setForm] = useState({ productId: "", key: "", expiresAt: "" });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        }),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva licencia">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Producto</label>
          <Select
            value={form.productId}
            onChange={set("productId")}
            options={[{ value: "", label: "Seleccionar producto..." }, ...productOptions]}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Key <span className="text-muted-foreground">(dejar vacío para generar automáticamente)</span>
          </label>
          <input
            className="input-base font-mono"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={form.key}
            onChange={(e) => set("key")(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Fecha de expiración (opcional)</label>
          <input
            type="datetime-local"
            className="input-base"
            value={form.expiresAt}
            onChange={(e) => set("expiresAt")(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading || !form.productId}>
            {loading ? "Creando..." : "Crear licencia"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── License Row Actions ────────────────────────────────────────────────────────

function RowActions({ license, onAction }: {
  license: License;
  onAction: (id: string, action: "activate" | "deactivate" | "ban") => void;
}) {
  return (
    <div className="flex items-center gap-0.5 justify-end">
      {license.status !== "active" && (
        <button
          className="icon-btn"
          title="Activar"
          onClick={() => onAction(license.id, "activate")}
        >
          <Power className="w-3.5 h-3.5 text-green-400" />
        </button>
      )}
      {license.status === "active" && (
        <button
          className="icon-btn"
          title="Desactivar"
          onClick={() => onAction(license.id, "deactivate")}
        >
          <Power className="w-3.5 h-3.5 text-amber-400" />
        </button>
      )}
      {license.status !== "banned" && (
        <button
          className="icon-btn-danger"
          title="Banear"
          onClick={() => onAction(license.id, "ban")}
        >
          <Ban className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function LicensesPage() {
  const { data: licenses, loading, error } = useLicenses();
  const { data: products } = useProducts();

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    id: string; action: "activate" | "deactivate" | "ban";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { copied, copy } = useClipboard();

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));
  const productFilterOptions = [
    { value: "", label: "Todos los productos" },
    ...productOptions,
  ];

  const filtered = useMemo(() => {
    return licenses.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.key.toLowerCase().includes(q) ||
        (l.user?.username ?? "").toLowerCase().includes(q) ||
        (l.user?.email    ?? "").toLowerCase().includes(q);
      const matchStatus  = !statusFilter  || l.status    === statusFilter;
      const matchProduct = !productFilter || l.productId === productFilter;
      return matchSearch && matchStatus && matchProduct;
    });
  }, [licenses, search, statusFilter, productFilter]);

  const handleAction = (id: string, action: "activate" | "deactivate" | "ban") => {
    setConfirmAction({ id, action });
  };

  const confirmActionLabels = {
    activate:   { title: "Activar licencia",   text: "¿Activar esta licencia?",          confirm: "Activar"    },
    deactivate: { title: "Desactivar licencia", text: "¿Desactivar esta licencia?",       confirm: "Desactivar" },
    ban:        { title: "Banear licencia",     text: "Esta acción baneará la licencia. ¿Continuar?", confirm: "Banear" },
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    const statusMap = { activate: "active", deactivate: "inactive", ban: "banned" };
    try {
      await fetch(`/api/licenses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: confirmAction.id, status: statusMap[confirmAction.action] }),
      });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <Topbar
        title="Licencias"
        subtitle={`${filtered.length} licencia${filtered.length !== 1 ? "s" : ""} encontrada${filtered.length !== 1 ? "s" : ""}`}
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Nueva licencia
          </button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 page-enter">

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por key, usuario..."
            className="w-full sm:w-72"
          />
          <Select value={statusFilter}  onChange={setStatusFilter}  options={STATUS_OPTIONS}        className="w-full sm:w-44" />
          <Select value={productFilter} onChange={setProductFilter} options={productFilterOptions}  className="w-full sm:w-48" />
          {(search || statusFilter || productFilter) && (
            <button
              className="btn-secondary gap-1.5"
              onClick={() => { setSearch(""); setStatusFilter(""); setProductFilter(""); }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Key}
              title="No hay licencias"
              description="No se encontraron licencias con los filtros actuales."
              action={
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" /> Nueva licencia
                </button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr className="border-b border-border text-left bg-secondary/20">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Key</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Producto</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Usuario</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Expira</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Creada</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((l) => (
                    <tr key={l.id} className="table-row-hover">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-foreground">
                            {l.key.slice(0, 20)}…
                          </code>
                          <button
                            className="icon-btn p-1 min-h-0 min-w-0"
                            onClick={() => copy(l.key, l.id)}
                            title="Copiar key"
                          >
                            {copied === l.id
                              ? <CheckCheck className="w-3 h-3 text-green-400" />
                              : <Copy       className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {l.product?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {l.user?.username ?? <span className="italic">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[l.status as LicenseStatus] ?? "muted"}>
                          {STATUS_LABEL[l.status as LicenseStatus] ?? l.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {l.expiresAt
                          ? new Date(l.expiresAt).toLocaleDateString("es-AR")
                          : <span className="italic">Sin expiración</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-3">
                        <RowActions license={l} onAction={handleAction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CreateLicenseModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        productOptions={productOptions}
      />

      {confirmAction && (
        <ConfirmDialog
          open
          onClose={() => setConfirmAction(null)}
          onConfirm={executeAction}
          loading={actionLoading}
          title={confirmActionLabels[confirmAction.action].title}
          description={confirmActionLabels[confirmAction.action].text}
          confirmText={confirmActionLabels[confirmAction.action].confirm}
        />
      )}
    </>
  );
}
