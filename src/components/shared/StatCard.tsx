import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label:  string;
  value:  string | number;
  icon:   LucideIcon;
  trend?: { value: number; label: string };
  color?: "red" | "green" | "blue" | "amber" | "purple";
  className?: string;
}

const COLOR_MAP = {
  red:    { bg: "rgba(192,57,43,0.10)",  border: "rgba(192,57,43,0.20)",  text: "#e74c3c" },
  green:  { bg: "rgba(39,174,96,0.10)",  border: "rgba(39,174,96,0.20)",  text: "#27ae60" },
  blue:   { bg: "rgba(52,152,219,0.10)", border: "rgba(52,152,219,0.20)", text: "#3498db" },
  amber:  { bg: "rgba(230,126,34,0.10)", border: "rgba(230,126,34,0.20)", text: "#e67e22" },
  purple: { bg: "rgba(155,89,182,0.10)", border: "rgba(155,89,182,0.20)", text: "#9b59b6" },
};

export default function StatCard({
  label, value, icon: Icon, trend, color = "red", className,
}: StatCardProps) {
  const c = COLOR_MAP[color];

  return (
    <div className={cn("card card-p card-hover", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs mt-1",
              trend.value >= 0 ? "text-green-400" : "text-red-400",
            )}>
              {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon className="w-5 h-5" style={{ color: c.text }} />
        </div>
      </div>
    </div>
  );
}
