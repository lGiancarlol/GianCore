import Topbar from "@/components/layout/Topbar";
import EmptyState from "@/components/ui/EmptyState";
import { MessageCircle, Plus } from "lucide-react";

export default function DiscordPage() {
  return (
    <>
      <Topbar
        title="Discord Manager"
        subtitle="Gestión de canales, roles y configuración del bot"
        actions={
          <button className="btn-primary">
            <Plus className="w-4 h-4" /> Configurar servidor
          </button>
        }
      />
      <div className="flex-1 p-4 sm:p-6 page-enter">
        <div className="grid-2 mb-4">
          <div className="card card-p">
            <p className="text-xs text-muted-foreground mb-1">Estado del bot</p>
            <div className="flex items-center gap-2">
              <span className="status-dot bg-amber-400" />
              <span className="text-sm text-foreground">No conectado</span>
            </div>
          </div>
          <div className="card card-p">
            <p className="text-xs text-muted-foreground mb-1">Servidor</p>
            <p className="text-sm text-foreground">No configurado</p>
          </div>
        </div>
        <div className="card">
          <EmptyState
            icon={MessageCircle}
            title="Bot no configurado"
            description="Configura tu bot de Discord para gestionar canales y roles."
            action={
              <button className="btn-primary">
                <Plus className="w-4 h-4" /> Configurar bot
              </button>
            }
          />
        </div>
      </div>
    </>
  );
}
