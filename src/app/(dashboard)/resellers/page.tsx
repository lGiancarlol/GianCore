"use client";

import { useState, useMemo } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import SearchBar from "@/components/ui/SearchBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { useResellers } from "@/hooks/useResellers";
import { useProducts }  from "@/hooks/useProducts";
import {
  Users, UserPlus, Coins, Power, Pencil, RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { User } from "@/types";

// ── Create / Edit Modal ────────────────────────────────────────────────────────

interface ResellerForm {
  username:     string;
  email:        string;
  credits:      string;
  genLimit:     string;
  allowedProducts: string[];
  active:       boolean;
}

const DEFAULT: ResellerForm = {
  username: "", email: "", credits: "0", genLimit: "100",
  allowedProducts: [], active: true,
};

function ResellerFormModal({ open, onClose, reseller, productOptions }: {
  open: boolean; onClose: () => void;
  reseller?: User;
  productOptions: { value: string; label: string }[];
}) {
  const isEdit = !!reseller;
  const [form, setForm] = useState<ResellerForm>(
    reseller
      ? {
          username:        reseller.username,
          email:           reseller.email ?? "",
          credits:         String(reseller.creditWallet?.balance ?? 0),
          genLimit:        "100",
          allowedProducts: [],
          active:          reseller.active,
        }
      : DEFAULT
  );
  const [loading, setLoading] = useState(false);

  const set = (k: keyof ResellerForm) => (v: string | boolean | string[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleProduct = (id: string) =>
    set("allowedProducts")(
      form.allowedProducts.includes(id)
        ? form.allowedProducts.filter((p) => p !== id)
        : [...form.allowedProducts, id]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/resellers", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: reseller!.id } : {}),
          username:        form.username,
          email:           form.email,
          credits:         parseFloat(form.credits) || 0,
          genLimit:        parseInt(form.genLimit) || 100,
          allowedProducts: form.allowedProducts,
          active:          form.active,
        }),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar revendedor" : "Nuevo revendedor"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Usuario *</label>
            <input required className="input-base" placeholder="username"
              value={form.username} onChange={(e) => set("username")(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Email *</label>
            <input required type="email" className="input-base" placeholder="email@ejemplo.com"
              value={form.email} onChange={(e) => set("email")(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Créditos iniciales</label>
            <input type="number" min="0" className="input-base"
              value={form.credits} onChange={(e) => set("credits")(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Límite de generación</label>
            <input type="number" min="1" className="input-base"
              value={form.genLimit} onChange={(e) => set("genLimit")(e.target.value)} />
          </div>
        </div>

        {/* Allowed products */}
        {productOptions.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Productos permitidos</label>
            <div className="flex flex-wrap gap-2">
              {productOptions.map((p) => {
                const selected = form.allowedProducts.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => toggleProduct(p.value)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                      selected
                        ? "border-[var(--theme-border)] bg-[var(--theme-soft)] text-foreground"
                        : "border-border bg-secondary text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => set("active")(!form.active)}
              className={`w-10 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5 cursor-pointer ${
                form.active ? "bg-green-500/80" : "bg-secondary"
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                form.active ? "translate-x-5" : "translate-x-0"
              }`} />
            </div>
            <span className="text-xs text-muted-foreground">
              {form.active ? "Cuenta activa" : "Cuenta inactiva"}
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary"
            disabled={loading || !form.username || !form.email}>
            {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear revendedor"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Credits Modal ──────────────────────────────────────────────────────────────

function CreditsModal({ open, onClose, reseller }: {
  open: boolean; onClose: () => void; reseller: User | null;
}) {
  const [amount,  setAmount]  = useState("");
  const [op,      setOp]      = useState<"add" | "set">("add");
  const [loading, setLoading] = useState(false);

  if (!reseller) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/resellers/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: reseller.id, amount: parseFloat(amount), op }),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Gestionar créditos" size="sm">
      <p className="text-xs text-muted-foreground mb-4">
        Revendedor: <span className="text-foreground font-medium">{reseller.username}</span>
        {" · "}Balance actual:{" "}
        <span className="text-amber-400 font-medium">
          {reseller.creditWallet?.balance ?? 0}
        </span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          {(["add", "set"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOp(o)}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-all duration-150 ${
                op === o
                  ? "border-[var(--theme-border)] bg-[var(--theme-soft)] text-foreground"
                  : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {o === "add" ? "Agregar" : "Establecer"}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            {op === "add" ? "Créditos a agregar" : "Nuevo balance"}
          </label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            className="input-base"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading || !amount}>
            {loading ? "..." : "Confirmar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Reseller Row ───────────────────────────────────────────────────────────────

function ResellerRow({ reseller, onEdit, onCredits, onToggle }: {
  reseller: User;
  onEdit:    (r: User) => void;
  onCredits: (r: User) => void;
  onToggle:  (r: User) => void;
}) {
  return (
    <tr className="table-row-hover">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-secondary border border-border
            flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
            {reseller.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{reseller.username}</p>
            <p className="text-[11px] text-muted-foreground truncate">{reseller.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {reseller.creditWallet?.balance ?? 0}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={reseller.active ? "green" : "muted"}>
          {reseller.active ? "Activo" : "Inactivo"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(reseller.createdAt).toLocaleDateString("es-AR")}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-0.5 justify-end">
          <button className="icon-btn" title="Editar" onClick={() => onEdit(reseller)}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button className="icon-btn" title="Gestionar créditos" onClick={() => onCredits(reseller)}>
            <Coins className="w-3.5 h-3.5 text-amber-400" />
          </button>
          <button
            className="icon-btn"
            title={reseller.active ? "Desactivar" : "Activar"}
            onClick={() => onToggle(reseller)}
          >
            <Power className={`w-3.5 h-3.5 ${reseller.active ? "text-amber-400" : "text-green-400"}`} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ResellersPage() {
  const { data: resellers, loading, error } = useResellers();
  const { data: products }                  = useProducts();

  const [search,       setSearch]       = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<User | null>(null);
  const [creditsTarget, setCreditsTarget] = useState<User | null>(null);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q
      ? resellers
      : resellers.filter(
          (r) =>
            r.username.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q)
        );
  }, [resellers, search]);

  const totalCredits = resellers.reduce(
    (sum, r) => sum + (r.creditWallet?.balance ?? 0), 0
  );

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setActionLoading(true);
    try {
      await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: toggleTarget.id, active: !toggleTarget.active }),
      });
    } finally {
      setActionLoading(false);
      setToggleTarget(null);
    }
  };

  return (
    <>
      <Topbar
        title="Revendedores"
        subtitle={`${filtered.length} revendedor${filtered.length !== 1 ? "es" : ""}`}
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <UserPlus className="w-4 h-4" /> Nuevo revendedor
          </button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 page-enter">

        {/* KPIs */}
        <div className="grid-3">
          <div className="card card-p flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(155,89,182,0.10)", border: "1px solid rgba(155,89,182,0.20)" }}>
              <Users className="w-4 h-4" style={{ color: "#9b59b6" }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-foreground">{resellers.length}</p>
            </div>
          </div>
          <div className="card card-p flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(39,174,96,0.10)", border: "1px solid rgba(39,174,96,0.20)" }}>
              <ShieldCheck className="w-4 h-4" style={{ color: "#27ae60" }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Activos</p>
              <p className="text-xl font-bold text-foreground">
                {resellers.filter((r) => r.active).length}
              </p>
            </div>
          </div>
          <div className="card card-p flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(230,126,34,0.10)", border: "1px solid rgba(230,126,34,0.20)" }}>
              <Coins className="w-4 h-4" style={{ color: "#e67e22" }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Créditos totales</p>
              <p className="text-xl font-bold text-foreground">{totalCredits}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar revendedor..."
            className="w-full sm:w-72"
          />
          {search && (
            <button className="btn-secondary gap-1.5" onClick={() => setSearch("")}>
              <RefreshCw className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No hay revendedores"
              description="Los revendedores podrán gestionar sus propias licencias con créditos."
              action={
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                  <UserPlus className="w-4 h-4" /> Nuevo revendedor
                </button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr className="border-b border-border text-left bg-secondary/20">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Revendedor</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Créditos</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Registrado</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r) => (
                    <ResellerRow
                      key={r.id}
                      reseller={r}
                      onEdit={setEditTarget}
                      onCredits={setCreditsTarget}
                      onToggle={(r) => setToggleTarget(r)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ResellerFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        productOptions={productOptions}
      />

      {editTarget && (
        <ResellerFormModal
          open
          onClose={() => setEditTarget(null)}
          reseller={editTarget}
          productOptions={productOptions}
        />
      )}

      <CreditsModal
        open={!!creditsTarget}
        onClose={() => setCreditsTarget(null)}
        reseller={creditsTarget}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        loading={actionLoading}
        title={toggleTarget?.active ? "Desactivar revendedor" : "Activar revendedor"}
        description={`¿${toggleTarget?.active ? "Desactivar" : "Activar"} la cuenta de "${toggleTarget?.username}"?`}
        confirmText={toggleTarget?.active ? "Desactivar" : "Activar"}
      />
    </>
  );
}
