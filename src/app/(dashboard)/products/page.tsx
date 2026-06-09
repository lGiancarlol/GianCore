"use client";

import { useState, useMemo } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import SearchBar from "@/components/ui/SearchBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { useProducts } from "@/hooks/useProducts";
import { Package, Plus, Pencil, Power, Trash2, RefreshCw, Coins } from "lucide-react";
import type { Product } from "@/types";

// ── Product Form Modal ─────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { value: "software",    label: "Software" },
  { value: "service",     label: "Servicio" },
  { value: "integration", label: "Integración" },
  { value: "other",       label: "Otro" },
];

const DURATION_OPTIONS = [
  { value: "",    label: "Sin expiración" },
  { value: "1",   label: "1 día" },
  { value: "7",   label: "7 días" },
  { value: "30",  label: "30 días" },
  { value: "90",  label: "90 días" },
  { value: "180", label: "180 días" },
  { value: "365", label: "1 año" },
];

interface ProductForm {
  name:         string;
  slug:         string;
  description:  string;
  price:        string;
  type:         string;
  durationDays: string;
  creditsRequired: string;
  active:       boolean;
}

const DEFAULT_FORM: ProductForm = {
  name: "", slug: "", description: "", price: "0",
  type: "software", durationDays: "", creditsRequired: "0", active: true,
};

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function ProductFormModal({ open, onClose, product }: {
  open: boolean; onClose: () => void; product?: Product;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState<ProductForm>(
    product
      ? {
          name:           product.name,
          slug:           product.slug,
          description:    product.description ?? "",
          price:          String(product.price ?? 0),
          type:           (product.metadata?.type as string) ?? "software",
          durationDays:   String((product.metadata?.durationDays as number) ?? ""),
          creditsRequired: String((product.metadata?.creditsRequired as number) ?? 0),
          active:         product.active,
        }
      : DEFAULT_FORM
  );
  const [loading, setLoading] = useState(false);

  const set = (k: keyof ProductForm) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleNameChange = (v: string) => {
    setForm((f) => ({ ...f, name: v, slug: isEdit ? f.slug : slugify(v) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: product!.id } : {}),
          name:        form.name,
          slug:        form.slug,
          description: form.description || undefined,
          price:       parseFloat(form.price) || 0,
          active:      form.active,
          metadata: {
            type:            form.type,
            durationDays:    form.durationDays ? parseInt(form.durationDays) : null,
            creditsRequired: parseInt(form.creditsRequired) || 0,
          },
        }),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar producto" : "Nuevo producto"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Nombre *</label>
            <input
              required
              className="input-base"
              placeholder="Mi producto"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Slug *</label>
            <input
              required
              className="input-base font-mono"
              placeholder="mi-producto"
              value={form.slug}
              onChange={(e) => set("slug")(slugify(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Descripción</label>
          <textarea
            className="input-base resize-none"
            rows={2}
            placeholder="Descripción del producto..."
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Tipo</label>
            <select
              className="input-base"
              value={form.type}
              onChange={(e) => set("type")(e.target.value)}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Duración</label>
            <select
              className="input-base"
              value={form.durationDays}
              onChange={(e) => set("durationDays")(e.target.value)}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Precio (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-base"
              value={form.price}
              onChange={(e) => set("price")(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Créditos requeridos</label>
            <input
              type="number"
              min="0"
              className="input-base"
              value={form.creditsRequired}
              onChange={(e) => set("creditsRequired")(e.target.value)}
            />
          </div>
          <div className="flex items-end pb-0.5">
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
                {form.active ? "Activo" : "Inactivo"}
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading || !form.name || !form.slug}>
            {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Product Card ───────────────────────────────────────────────────────────────

function ProductCard({ product, onEdit, onToggle, onDelete }: {
  product: Product;
  onEdit:   (p: Product) => void;
  onToggle: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const meta = product.metadata as Record<string, unknown> | undefined;
  const type         = (meta?.type as string)           ?? "software";
  const duration     = meta?.durationDays ? `${meta.durationDays}d` : "Sin expiración";
  const credits      = (meta?.creditsRequired as number) ?? 0;

  const TYPE_LABELS: Record<string, string> = {
    software: "Software", service: "Servicio",
    integration: "Integración", other: "Otro",
  };

  return (
    <div className="card card-p flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
            <Badge variant={product.active ? "green" : "muted"}>
              {product.active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <code className="text-[11px] text-muted-foreground font-mono">{product.slug}</code>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button className="icon-btn" title="Editar" onClick={() => onEdit(product)}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            className="icon-btn"
            title={product.active ? "Desactivar" : "Activar"}
            onClick={() => onToggle(product)}
          >
            <Power className={`w-3.5 h-3.5 ${product.active ? "text-amber-400" : "text-green-400"}`} />
          </button>
          <button className="icon-btn-danger" title="Eliminar" onClick={() => onDelete(product)}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {product.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
        <div>
          <p className="text-[10px] text-muted-foreground">Tipo</p>
          <p className="text-xs text-foreground">{TYPE_LABELS[type] ?? type}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Duración</p>
          <p className="text-xs text-foreground">{duration}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Precio</p>
          <p className="text-xs text-foreground">${product.price?.toFixed(2) ?? "0.00"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Créditos</p>
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-amber-400" />
            <p className="text-xs text-foreground">{credits}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { data: products, loading, error } = useProducts();
  const [search,      setSearch]      = useState("");
  const [showCreate,  setShowCreate]  = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q
      ? products
      : products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q) ||
            (p.description ?? "").toLowerCase().includes(q)
        );
  }, [products, search]);

  const handleToggle = async (p: Product) => {
    await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Topbar
        title="Productos"
        subtitle={`${filtered.length} producto${filtered.length !== 1 ? "s" : ""}`}
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Nuevo producto
          </button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 page-enter">
        <div className="flex flex-wrap gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar producto..."
            className="w-full sm:w-72"
          />
          {search && (
            <button className="btn-secondary gap-1.5" onClick={() => setSearch("")}>
              <RefreshCw className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-44 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="card card-p text-center text-sm text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Package}
              title="No hay productos"
              description="Crea tu primer producto para comenzar a generar licencias."
              action={
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" /> Nuevo producto
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={setEditProduct}
                onToggle={handleToggle}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      <ProductFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {editProduct && (
        <ProductFormModal
          open
          onClose={() => setEditProduct(null)}
          product={editProduct}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Eliminar producto"
        description={`¿Eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </>
  );
}
