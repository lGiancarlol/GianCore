"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useProviders } from "@/hooks/useProviders";
import { ServerCog, Plus, Pencil, Power, ChevronRight } from "lucide-react";
import type { Provider, ProviderType } from "@/types";

const TYPE_LABELS: Record<ProviderType, string> = {
  telegram_bot: "Telegram Bot",
  keyauth:      "KeyAuth",
  auth_panel:   "Auth Panel",
  rest_api:     "REST API",
};

const PROVIDER_TYPES: ProviderType[] = ["telegram_bot", "keyauth", "auth_panel", "rest_api"];

interface ProviderForm { name: string; type: ProviderType; active: boolean }
const DEFAULT: ProviderForm = { name: "", type: "telegram_bot", active: true };

function ProviderFormModal({ open, onClose, provider, onSaved }: {
  open: boolean; onClose: () => void; provider?: Provider; onSaved: () => void;
}) {
  const isEdit = !!provider;
  const [form, setForm] = useState<ProviderForm>(
    provider ? { name: provider.name, type: provider.type, active: provider.active } : DEFAULT
  );
  const [loading, setLoading] = useState(false);

  const set = (k: keyof ProviderForm) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await fetch(`/api/providers/${provider!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, active: form.active }),
        });
      } else {
        await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, type: form.type, config: {}, active: form.active }),
        });
      }
      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar provider" : "Nuevo provider"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Nombre *</label>
          <input required className="input-base" value={form.name}
            onChange={(e) => set("name")(e.target.value)} placeholder="PROXYIOS, KeyAuth..." />
        </div>
        {!isEdit && (
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Tipo *</label>
            <select className="input-base" value={form.type}
              onChange={(e) => set("type")(e.target.value as ProviderType)}>
              {PROVIDER_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => set("active")(!form.active)}>
          <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${form.active ? "bg-green-500/80" : "bg-secondary"}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.active ? "translate-x-5" : "translate-x-0"}`} />
          </div>
          <span className="text-xs text-muted-foreground">{form.active ? "Activo" : "Inactivo"}</span>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading || !form.name}>
            {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProviderCard({ provider, onEdit, onToggle }: {
  provider: Provider & { _count?: { products: number; accounts: number; requests: number } };
  onEdit:   (p: Provider) => void;
  onToggle: (p: Provider) => void;
}) {
  return (
    <div className="card card-p flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-foreground truncate">{provider.name}</p>
            <Badge variant={provider.active ? "green" : "muted"}>
              {provider.active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{TYPE_LABELS[provider.type]}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button className="icon-btn" title="Editar" onClick={() => onEdit(provider)}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button className="icon-btn" title={provider.active ? "Desactivar" : "Activar"}
            onClick={() => onToggle(provider)}>
            <Power className={`w-3.5 h-3.5 ${provider.active ? "text-amber-400" : "text-green-400"}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border text-center">
        {[
          { label: "Productos", val: provider._count?.products ?? 0 },
          { label: "Cuentas",   val: provider._count?.accounts ?? 0 },
          { label: "Requests",  val: provider._count?.requests ?? 0 },
        ].map(({ label, val }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-foreground">{val}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <Link href={`/providers/${provider.id}`}
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1 border-t border-border">
        Ver detalle <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

export default function ProvidersPage() {
  const { data: providers, loading, error, reload } = useProviders();
  const [showCreate,  setShowCreate]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<Provider | null>(null);

  const handleToggle = async (p: Provider) => {
    await fetch(`/api/providers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    reload();
  };

  return (
    <>
      <Topbar
        title="Providers"
        subtitle={`${providers.length} proveedor${providers.length !== 1 ? "es" : ""}`}
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Nuevo provider
          </button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 page-enter">
        {loading ? (
          <div className="grid-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-44 rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="card card-p text-center text-sm text-red-400">{error}</div>
        ) : providers.length === 0 ? (
          <div className="card">
            <EmptyState icon={ServerCog} title="Sin providers"
              description="Agrega tu primer proveedor de licencias."
              action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nuevo provider</button>} />
          </div>
        ) : (
          <div className="grid-3">
            {providers.map((p) => (
              <ProviderCard key={p.id} provider={p as Provider & { _count?: { products: number; accounts: number; requests: number } }}
                onEdit={setEditTarget} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>

      <ProviderFormModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={reload} />
      {editTarget && (
        <ProviderFormModal open onClose={() => setEditTarget(null)} provider={editTarget} onSaved={reload} />
      )}
    </>
  );
}
