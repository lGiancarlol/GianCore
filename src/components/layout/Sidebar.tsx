"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Key, Package, Users, MessageCircle,
  Send, Zap, ScrollText, Settings, ChevronLeft, ChevronRight,
  LogOut, Cpu,
} from "lucide-react";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",        icon: LayoutDashboard },
  { href: "/licenses",     label: "Licencias",         icon: Key },
  { href: "/products",     label: "Productos",         icon: Package },
  { href: "/resellers",    label: "Revendedores",       icon: Users },
  { href: "/discord",      label: "Discord Manager",   icon: MessageCircle },
  { href: "/telegram",     label: "Telegram Manager",  icon: Send },
  { href: "/automation",   label: "Automation Center", icon: Zap },
  { href: "/logs",         label: "Logs",              icon: ScrollText },
  { href: "/settings",     label: "Configuración",     icon: Settings },
];

function Tip({ label, show, children }: { label: string; show: boolean; children: React.ReactNode }) {
  if (!show) return <>{children}</>;
  return (
    <div className="relative group/tip">
      {children}
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
        opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
        <div className="bg-card border border-border text-foreground text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-md">
          {label}
        </div>
      </div>
    </div>
  );
}

function useSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("gc_sidebar");
    return saved !== null ? saved === "true" : window.innerWidth < 1280;
  });

  useEffect(() => {
    localStorage.setItem("gc_sidebar", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    if (mq.matches) setCollapsed(true);
    const h = (e: MediaQueryListEvent) => { if (e.matches) setCollapsed(true); };
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  return { collapsed, toggle };
}

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  return (
    <aside className={cn(
      "relative min-h-screen bg-card border-r border-border flex flex-col shrink-0",
      "transition-[width] duration-200 ease-in-out",
      collapsed ? "w-[52px] sm:w-[72px]" : "w-60",
    )}>

      {/* Toggle */}
      <button onClick={toggle}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-card border border-border
          flex items-center justify-center text-muted-foreground hover:text-foreground
          hover:bg-accent transition-colors shadow-sm">
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft  className="w-3 h-3" />}
      </button>

      {/* Header */}
      <div className={cn(
        "shrink-0 border-b border-border flex items-center",
        collapsed ? "justify-center px-0 py-5" : "px-5 py-5 gap-3",
      )}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--theme-soft)", border: "1px solid var(--theme-border)" }}>
          <Cpu className="w-4 h-4" style={{ color: "var(--theme-primary)" }} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-bold text-sm text-foreground">GianCore</span>
            <p className="text-[10px] text-muted-foreground">Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-4 space-y-0.5 min-h-0",
        collapsed ? "px-2" : "px-3",
      )}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Tip key={href} label={label} show={collapsed}>
              <Link href={href}
                className={cn(
                  "flex items-center rounded-md text-sm transition-colors",
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                  active
                    ? "font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
                )}
                style={active ? {
                  color:      "var(--theme-primary)",
                  background: "var(--theme-soft)",
                } : undefined}>
                <Icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")}
                  style={active ? { color: "var(--theme-primary)" } : undefined} />
                {!collapsed && (
                  <span style={active ? { color: "var(--theme-primary)" } : undefined}>
                    {label}
                  </span>
                )}
              </Link>
            </Tip>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "shrink-0 border-t border-border py-3",
        collapsed ? "px-2" : "px-3",
      )}>
        <Tip label="Cerrar sesión" show={collapsed}>
          <form action="/api/auth/signout" method="POST">
            <button type="submit"
              className={cn(
                "flex items-center rounded-md text-sm text-muted-foreground w-full",
                "hover:text-red-400 hover:bg-red-400/10 transition-colors",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
              )}>
              <LogOut className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && "Cerrar sesión"}
            </button>
          </form>
        </Tip>
      </div>

    </aside>
  );
}
