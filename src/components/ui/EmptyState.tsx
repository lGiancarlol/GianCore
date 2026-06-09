import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon:    LucideIcon;
  title:   string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: "var(--theme-soft)", border: "1px solid var(--theme-border)" }}>
        <Icon className="w-6 h-6" style={{ color: "var(--theme-primary)" }} />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
