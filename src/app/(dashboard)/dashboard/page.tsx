"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import StatCard from "@/components/shared/StatCard";
import Badge from "@/components/ui/Badge";
import {
  Key, Package, Users, Activity, MessageCircle, Send,
  Zap, ScrollText, CheckCircle2, XCircle, Clock, Cpu,
} from "lucide-react";
import type { License, Product, AuditLog, Integration } from "@/types";
import type { LucideIcon } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Stats {
  licenses:  number;
  products:  number;
  resellers: number;
  eventsToday: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusVariant(s: string) {
  const m: Record<string, "green" | "red" | "amber" | "muted"> = {
    active: "green", inactive: "muted", expired: "amber", banned: "red",
  };
  return m[s] ?? "muted";
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    active: "Activa", inactive: "Inactiva", expired: "Expirada", banned: "Baneada",
  };
  return m[s] ?? s;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return "hace un momento";
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`;
  return `hace ${Math.floor(s / 86400)}d`;
}

// ── Module card ────────────────────────────────────────────────────────────────

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

// ── Dashboard ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [recentLic,    setRecentLic]    = useState<License[]>([]);
  const [products,     setProducts]     = useState<Product[]>([]);
  const [logs,         setLogs]         = useState<AuditLog[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/licenses").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/resellers").then((r) => r.json()),
      fetch("/api/logs?limit=10").then((r) => r.json()),
      fetch("/api/integrations").then((r) => r.json()),
    ]).then(([lic, prod, res, logs, ints]) => {
      const licenses   = lic.status  === "fulfilled" ? (lic.value.data  ?? []) : [];
      const prods      = prod.status === "fulfilled" ? (prod.value.data ?? []) : [];
      const resellers  = res.status  === "fulfilled" ? (res.value.data  ?? []) : [];
      const logsData   = logs.status === "fulfilled" ? (logs.value.data ?? []) : [];
      const intsData   = ints.status === "fulfilled" ? (ints.value.data ?? []) : [];

      const today = new Date().toDateString();
      const eventsToday = logsData.filter(
        (l: AuditLog) => new Date(l.createdAt).toDateString() === today
      ).length;

      setStats({
        licenses:    licenses.filter((l: License) => l.status === "active").length,
        products:    prods.length,
        resellers:   resellers.length,
        eventsToday,
      });
      setRecentLic(licenses.slice(0, 5));
      setProducts(prods.slice(0, 6));
      setLogs(logsData.slice(0, 8));
      setIntegrations(intsData);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar title="Dashboard" subtitle="Vista general del sistema" />

      <div className="flex-1 p-4 sm:p-6 space-y-6 page-enter">

        {/* KPIs */}
        <div className="grid-4">
          <StatCard
            label="Licencias activas"
            value={loading ? "—" : (stats?.licenses ?? 0)}
            icon={Key} color="red"
          />
          <StatCard
            label="Productos"
            value={loading ? "—" : (stats?.products ?? 0)}
            icon={Package} color="blue"
          />
          <StatCard
            label="Revendedores"
            value={loading ? "—" : (stats?.resellers ?? 0)}
            icon={Users} color="purple"
          />
          <StatCard
            label="Eventos hoy"
            value={loading ? "—" : (stats?.eventsToday ?? 0)}
            icon={Activity} color="green"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Recent licenses */}
          <div className="xl:col-span-2 card">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Licencias recientes</p>
              <Link href="/licenses" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Ver todas →
              </Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-10 rounded-lg" />
                ))}
              </div>
            ) : recentLic.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No hay licencias aún
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table-base">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Key</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Producto</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Estado</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentLic.map((l) => (
                      <tr key={l.id} className="table-row-hover">
                        <td className="px-4 py-2.5">
                          <code className="text-xs text-foreground font-mono">
                            {l.key.slice(0, 16)}…
                          </code>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {l.product?.name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={statusVariant(l.status)}>
                            {statusLabel(l.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {relativeTime(l.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Integrations status */}
            <div className="card card-p">
              <p className="text-sm font-semibold text-foreground mb-3">Integraciones</p>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton h-8 rounded-lg" />
                  ))}
                </div>
              ) : integrations.length === 0 ? (
                <>
                  {[
                    { name: "Discord Bot",  active: false, icon: MessageCircle },
                    { name: "Telegram Bot", active: false, icon: Send },
                    { name: "GianCore API", active: true,  icon: Cpu },
                  ].map((item) => (
                    <IntegrationRow key={item.name} {...item} />
                  ))}
                </>
              ) : (
                integrations.map((i) => (
                  <IntegrationRow key={i.id} name={i.name} active={i.active} icon={Zap} />
                ))
              )}
            </div>

            {/* Products quick list */}
            <div className="card card-p">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Productos</p>
                <Link href="/products" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Ver todos →
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton h-8 rounded-lg" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin productos</p>
              ) : (
                <ul className="space-y-1.5">
                  {products.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground truncate">{p.name}</span>
                      <Badge variant={p.active ? "green" : "muted"}>
                        {p.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Recent events */}
        <div className="card">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Eventos recientes</p>
            <Link href="/logs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-8 rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay eventos registrados
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Acción</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Entidad</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Usuario</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">IP</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Hace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="table-row-hover">
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-mono text-foreground">{log.action}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{log.entity}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {log.user?.username ?? "sistema"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                        {log.ip ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {relativeTime(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Module cards */}
        <div className="grid-3">
          <ModuleCard icon={MessageCircle} title="Discord Manager" description="Gestión de canales, roles y bots de Discord."  href="/discord"    color="blue"   />
          <ModuleCard icon={Send}          title="Telegram Manager" description="Bots, grupos y automatizaciones de Telegram." href="/telegram"   color="blue"   />
          <ModuleCard icon={Zap}           title="Automation Center" description="Workflows, triggers y acciones automáticas." href="/automation" color="amber"  />
          <ModuleCard icon={Key}           title="Licencias"         description="Generación, validación y control de licencias." href="/licenses" color="red"    />
          <ModuleCard icon={Package}       title="Productos"         description="Catálogo de productos y configuración de precios." href="/products" color="purple" />
          <ModuleCard icon={ScrollText}    title="Logs"              description="Auditoría completa de todas las acciones del sistema." href="/logs" color="green" />
        </div>

      </div>
    </>
  );
}

// ── IntegrationRow ─────────────────────────────────────────────────────────────

function IntegrationRow({ name, active, icon: Icon }: {
  name: string; active: boolean; icon: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {active
          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          : <XCircle      className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className={`text-xs ${active ? "text-green-400" : "text-muted-foreground"}`}>
          {active ? "Activo" : "Inactivo"}
        </span>
      </div>
    </div>
  );
}
