import Topbar from "@/components/layout/Topbar";
import EmptyState from "@/components/ui/EmptyState";
import { ScrollText } from "lucide-react";

export default function LogsPage() {
  return (
    <>
      <Topbar
        title="Logs"
        subtitle="Auditoría completa de todas las acciones"
      />
      <div className="flex-1 p-4 sm:p-6 page-enter">
        <div className="card">
          <EmptyState
            icon={ScrollText}
            title="No hay registros aún"
            description="Las acciones del sistema se registrarán aquí automáticamente."
          />
        </div>
      </div>
    </>
  );
}
