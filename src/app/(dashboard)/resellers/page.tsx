import Topbar from "@/components/layout/Topbar";
import EmptyState from "@/components/ui/EmptyState";
import { Users, UserPlus } from "lucide-react";

export default function ResellersPage() {
  return (
    <>
      <Topbar
        title="Revendedores"
        subtitle="Gestión de revendedores y créditos"
        actions={
          <button className="btn-primary">
            <UserPlus className="w-4 h-4" /> Nuevo revendedor
          </button>
        }
      />
      <div className="flex-1 p-4 sm:p-6 page-enter">
        <div className="card">
          <EmptyState
            icon={Users}
            title="No hay revendedores aún"
            description="Los revendedores podrán gestionar sus propias licencias con créditos."
            action={
              <button className="btn-primary">
                <UserPlus className="w-4 h-4" /> Nuevo revendedor
              </button>
            }
          />
        </div>
      </div>
    </>
  );
}
