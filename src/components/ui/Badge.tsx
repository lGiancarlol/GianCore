import { cn } from "@/lib/utils";

type Variant = "green" | "red" | "amber" | "blue" | "purple" | "muted";

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const MAP: Record<Variant, string> = {
  green:  "badge-green",
  red:    "badge-red",
  amber:  "badge-amber",
  blue:   "badge-blue",
  purple: "badge-purple",
  muted:  "badge-muted",
};

export default function Badge({ variant = "muted", children, className }: BadgeProps) {
  return (
    <span className={cn(MAP[variant], className)}>
      {children}
    </span>
  );
}
