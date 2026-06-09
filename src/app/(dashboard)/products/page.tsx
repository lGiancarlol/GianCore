import Topbar from "@/components/layout/Topbar";
import EmptyState from "@/components/ui/EmptyState";
import { Package, Plus } from "lucide-react";

export default function ProductsPage() {
  return (
    <>
      <Topbar
        title="Productos"
        subtitle="Catálogo de productos disponibles"
        actions={
          <button className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo producto
          </button>
        }
      />
      <div className="flex-1 p-4 sm:p-6 page-enter">
        <div className="card">
          <EmptyState
            icon={Package}
            title="No hay productos aún"
            description="Agrega productos para poder asignarles licencias."
            action={
              <button className="btn-primary">
                <Plus className="w-4 h-4" /> Nuevo producto
              </button>
            }
          />
        </div>
      </div>
    </>
  );
}
