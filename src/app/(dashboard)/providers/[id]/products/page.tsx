"use client";

import { use, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useProvider } from "@/hooks/useProviders";
import { useProducts } from "@/hooks/useProducts";
import { Package, Plus, Trash2, ChevronLeft } from "lucide-react";
import type { ProviderProduct } from "@/types";

function LinkProductModal({ open, onClose, providerId, onSaved }: {
  open: boolean; onClose: () => void; providerId: string; onSaved: () => void;
}) {
  const { data: products } = useProducts();
  const [productId,    setProductId]    = useState("");
  const [externalRef,  setExternalRef]  = useState("");
  const [loading,      setLoading]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/api/providers/${providerId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, externalRef }),
      });
      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Asignar producto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Producto GianCore *</label>
          <select required className="input-base" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Seleccionar...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Referencia externa *</label>
          <input required className="input-base font-mono" placeholder="ios_hour, trem_day..."
            value={externalRef} onChange={(e) => setExternalRef(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-1">Identificador que usa el proveedor (comando, product id, etc.)</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading || !productId || !externalRef}>
            {loading ? "Guardando..." : "Asignar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProviderProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: provider, loading, reload } = useProvider(id);
  const [showLink, setShowLink] = useState(false);

  const handleDelete = async (pp: ProviderProduct) => {
    await fetch(`/api/providers/${id}/products`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pp.id }),
    });
    reload();
  };

  const products = (provider?.products ?? []) as ProviderProduct[];

  return (
    <>
      <Topbar
        title="Productos del Provider"
        subtitle={provider?.name ?? ""}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/providers/${id}`} className="btn-secondary gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Volver
            </Link>
            <button className="btn-primary" onClick={() => setShowLink(true)}>
              <Plus className="w-4 h-4" /> Asignar producto
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 page-enter">
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : products.length === 0 ? (
          <div className="card">
            <EmptyState icon={Package} title="Sin productos asignados"
              description="Asigna un producto GianCore a este proveedor."
              action={<button className="btn-primary" onClick={() => setShowLink(true)}><Plus className="w-4 h-4" /> Asignar</button>} />
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Producto GianCore</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Referencia externa</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((pp) => (
                    <tr key={pp.id} className="table-row-hover">
                      <td className="px-4 py-2.5 text-xs text-foreground">
                        {(pp as ProviderProduct & { product?: { name: string } }).product?.name ?? pp.productId}
                      </td>
                      <td className="px-4 py-2.5">
                        <code className="text-xs font-mono text-muted-foreground">{pp.externalRef}</code>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={pp.active ? "green" : "muted"}>{pp.active ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button className="icon-btn-danger" onClick={() => handleDelete(pp)}>
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

      <LinkProductModal open={showLink} onClose={() => setShowLink(false)} providerId={id} onSaved={reload} />
    </>
  );
}
