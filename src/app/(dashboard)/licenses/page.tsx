import Topbar from "@/components/layout/Topbar";
import EmptyState from "@/components/ui/EmptyState";
import { Key, Plus } from "lucide-react";

export default function LicensesPage() {
  return (
    <>
      <Topbar
        title="Licencias"
        subtitle="Gestión de licencias del sistema"
        actions={
          <button className="btn-primary">
            <Plus className="w-4 h-4" /> Nueva licencia
          </button>
        }
      />
      <div className="flex-1 p-4 sm:p-6 page-enter">
        <div className="card">
          <EmptyState
            icon={Key}
            title="No hay licencias aún"
            description="Las licencias aparecerán aquí una vez que las crees."
            action={
              <button className="btn-primary">
                <Plus className="w-4 h-4" /> Nueva licencia
              </button>
            }
          />
        </div>
      </div>
    </>
  );
}
