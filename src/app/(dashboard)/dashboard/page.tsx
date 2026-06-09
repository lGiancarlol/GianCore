import Topbar from "@/components/layout/Topbar";
import StatCard from "@/components/shared/StatCard";
import { Key, Package, Users, Activity, MessageCircle, Send, Zap, ScrollText } from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" subtitle="Vista general del sistema" />

      <div className="flex-1 p-4 sm:p-6 space-y-6 page-enter">

        {/* Stats */}
        <div className="grid-4">
          <StatCard label="Licencias activas" value="—"  icon={Key}     color="red"    />
          <StatCard label="Productos"          value="—"  icon={Package} color="blue"   />
          <StatCard label="Revendedores"       value="—"  icon={Users}   color="purple" />
          <StatCard label="Eventos hoy"        value="—"  icon={Activity} color="green" />
        </div>

        {/* Modules grid */}
        <div className="grid-3">
          <ModuleCard
            icon={MessageCircle}
            title="Discord Manager"
            description="Gestión de canales, roles y bots de Discord."
            href="/discord"
            color="blue"
          />
          <ModuleCard
            icon={Send}
            title="Telegram Manager"
            description="Bots, grupos y automatizaciones de Telegram."
            href="/telegram"
            color="blue"
          />
          <ModuleCard
            icon={Zap}
            title="Automation Center"
            description="Workflows, triggers y acciones automáticas."
            href="/automation"
            color="amber"
          />
          <ModuleCard
            icon={Key}
            title="Licencias"
            description="Generación, validación y control de licencias."
            href="/licenses"
            color="red"
          />
          <ModuleCard
            icon={Package}
            title="Productos"
            description="Catálogo de productos y configuración de precios."
            href="/products"
            color="purple"
          />
          <ModuleCard
            icon={ScrollText}
            title="Logs"
            description="Auditoría completa de todas las acciones del sistema."
            href="/logs"
            color="green"
          />
        </div>

      </div>
    </>
  );
}

// ── ModuleCard ─────────────────────────────────────────────────────────────────

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const MC_COLORS = {
  red:    { bg: "rgba(192,57,43,0.10)",  border: "rgba(192,57,43,0.20)",  text: "#e74c3c" },
  blue:   { bg: "rgba(52,152,219,0.10)", border: "rgba(52,152,219,0.20)", text: "#3498db" },
  green:  { bg: "rgba(39,174,96,0.10)",  border: "rgba(39,174,96,0.20)",  text: "#27ae60" },
  amber:  { bg: "rgba(230,126,34,0.10)", border: "rgba(230,126,34,0.20)", text: "#e67e22" },
  purple: { bg: "rgba(155,89,182,0.10)", border: "rgba(155,89,182,0.20)", text: "#9b59b6" },
};

function ModuleCard({ icon: Icon, title, description, href, color = "red" }: {
  icon: LucideIcon; title: string; description: string; href: string;
  color?: keyof typeof MC_COLORS;
}) {
  const c = MC_COLORS[color];
  return (
    <Link href={href} className="card card-p card-hover group block">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}>
        <Icon className="w-5 h-5" style={{ color: c.text }} />
      </div>
      <p className="font-semibold text-sm text-foreground group-hover:text-white transition-colors">
        {title}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </Link>
  );
}
