"use client";

import { Bell } from "lucide-react";

interface TopbarProps {
  title:    string;
  subtitle?: string;
  actions?:  React.ReactNode;
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm
      flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button className="icon-btn">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
