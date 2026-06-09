import Topbar from "@/components/layout/Topbar";
import EmptyState from "@/components/ui/EmptyState";
import { Zap, Plus } from "lucide-react";

export default function AutomationPage() {
  return (
    <>
      <Topbar
        title="Automation Center"
        subtitle="Workflows, triggers y acciones automáticas"
        actions={
          <button className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo workflow
          </button>
        }
      />
      <div className="flex-1 p-4 sm:p-6 page-enter">
        <div className="card">
          <EmptyState
            icon={Zap}
            title="No hay workflows aún"
            description="Crea automatizaciones para conectar licencias, Discord, Telegram y más."
            action={
              <button className="btn-primary">
                <Plus className="w-4 h-4" /> Nuevo workflow
              </button>
            }
          />
        </div>
      </div>
    </>
  );
}
