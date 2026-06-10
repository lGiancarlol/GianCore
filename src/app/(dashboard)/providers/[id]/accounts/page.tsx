"use client";

import { use, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useProvider } from "@/hooks/useProviders";
import { KeyRound, Plus, Trash2, ChevronLeft } from "lucide-react";
import type { ProviderAccount } from "@/types";

// Credential fields shown in the form (never returned from API after creation)
const CRED_FIELDS = [
  { key: "botToken",  label: "Bot Token",  placeholder: "123456:ABC..." },
  { key: "apiKey",    label: "API Key",    placeholder: "sk-..." },
  { key: "username",  label: "Username",   placeholder: "@username" },
  { key: "password",  label: "Password",   placeholder: "••••••••", type: "password" },
];

function AccountFormModal({ open, onClose, providerId, onSaved }: {
  open: boolean; onClose: () => void; providerId: string; onSaved: () => void;
}) {
  const [label,   setLabel]   = useState("");
  const [creds,   setCreds]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setField = (k: string) => (v: string) => setCreds((c) => ({ ...c, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Only send non-empty credential fields
    const credentials = Object.fromEntries(
      Object.entries(creds).filter(([, v]) => v.trim() !== "")
    );
    try {
      await fetch(`/api/providers/${providerId}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, credentials }),
      });
      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva cuenta">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Label *</label>
          <input required className="input-base" placeholder="bot_principal, cuenta_1..."
            value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">Completa solo los campos que apliquen para este proveedor:</p>
        {CRED_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-xs text-muted-foreground mb-1.5 block">{f.label}</label>
            <input className="input-base" type={f.type ?? "text"} placeholder={f.placeholder}
              value={creds[f.key] ?? ""} onChange={(e) => setField(f.key)(e.target.value)} />
          </div>
        ))}
        <p className="text-[10px] text-amber-400/80">Las credenciales se almacenan cifradas en la base de datos.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading || !label}>
            {loading ? "Guardando..." : "Crear cuenta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProviderAccountsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: provider, loading, reload } = useProvider(id);
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = async (acc: ProviderAccount) => {
    await fetch(`/api/providers/${id}/accounts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: acc.id }),
    });
    reload();
  };

  const handleToggle = async (acc: ProviderAccount) => {
    await fetch(`/api/providers/${id}/accounts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: acc.id, active: !acc.active }),
    });
    reload();
  };

  const accounts = (provider?.accounts ?? []) as ProviderAccount[];

  return (
    <>
      <Topbar
        title="Cuentas del Provider"
        subtitle={provider?.name ?? ""}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/providers/${id}`} className="btn-secondary gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Volver
            </Link>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Nueva cuenta
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 page-enter">
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : accounts.length === 0 ? (
          <div className="card">
            <EmptyState icon={KeyRound} title="Sin cuentas"
              description="Agrega las credenciales de acceso al proveedor."
              action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nueva cuenta</button>} />
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Label</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Credenciales</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="table-row-hover">
                      <td className="px-4 py-2.5 text-xs text-foreground">{acc.label}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-muted-foreground font-mono">••••••••</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => handleToggle(acc)}>
                          <Badge variant={acc.active ? "green" : "muted"}>
                            {acc.active ? "Activa" : "Inactiva"}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button className="icon-btn-danger" onClick={() => handleDelete(acc)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AccountFormModal open={showCreate} onClose={() => setShowCreate(false)} providerId={id} onSaved={reload} />
    </>
  );
}
