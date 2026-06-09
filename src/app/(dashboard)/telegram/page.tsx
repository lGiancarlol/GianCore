import Topbar from "@/components/layout/Topbar";
import EmptyState from "@/components/ui/EmptyState";
import { Send, Plus } from "lucide-react";

export default function TelegramPage() {
  return (
    <>
      <Topbar
        title="Telegram Manager"
        subtitle="Gestión del bot de Telegram y notificaciones"
        actions={
          <button className="btn-primary">
            <Plus className="w-4 h-4" /> Configurar bot
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
            <p className="text-xs text-muted-foreground mb-1">Cuentas vinculadas</p>
            <p className="text-sm text-foreground">0</p>
          </div>
        </div>
        <div className="card">
          <EmptyState
            icon={Send}
            title="Bot no configurado"
            description="Configura tu bot de Telegram para gestionar notificaciones y comandos."
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
