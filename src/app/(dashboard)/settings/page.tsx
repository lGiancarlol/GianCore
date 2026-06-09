import Topbar from "@/components/layout/Topbar";
import { Settings, Shield, Bell, Database, Cpu } from "lucide-react";

const SECTIONS = [
  { icon: Cpu,      title: "General",        description: "Nombre de la plataforma, zona horaria y preferencias globales." },
  { icon: Shield,   title: "Seguridad",       description: "Sesiones, tokens de API y configuración de autenticación." },
  { icon: Bell,     title: "Notificaciones",  description: "Alertas por Discord, Telegram y correo electrónico." },
  { icon: Database, title: "Base de datos",   description: "Respaldos, mantenimiento y migración de datos." },
  { icon: Settings, title: "Integraciones",   description: "APIs externas, webhooks y servicios de terceros." },
];

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Configuración" subtitle="Ajustes generales de la plataforma" />
      <div className="flex-1 p-4 sm:p-6 page-enter">
        <div className="grid-2">
          {SECTIONS.map(({ icon: Icon, title, description }) => (
            <button key={title} className="card card-p card-hover text-left group">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--theme-soft)", border: "1px solid var(--theme-border)" }}>
                  <Icon className="w-4 h-4" style={{ color: "var(--theme-primary)" }} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
