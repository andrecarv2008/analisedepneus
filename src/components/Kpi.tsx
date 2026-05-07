import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export function Kpi({ label, value, hint, trend, icon, accent }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: number;
  icon?: ReactNode;
  accent?: "primary" | "success" | "warning" | "destructive" | "info" | "accent";
}) {
  const a = accent ?? "primary";
  const colorMap: Record<string, string> = {
    primary: "var(--primary)", success: "var(--success)", warning: "var(--warning)",
    destructive: "var(--destructive)", info: "var(--info)", accent: "var(--accent)",
  };
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5 animate-fade-up group hover:translate-y-[-2px] transition-transform">
      <div className="absolute -right-8 -top-8 size-32 rounded-full opacity-10 blur-2xl"
        style={{ background: colorMap[a] }} />
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        {icon && <div className="size-8 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in oklab, ${colorMap[a]} 15%, transparent)`, color: colorMap[a] }}>{icon}</div>}
      </div>
      <div className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {trend !== undefined && (
          <span className={`flex items-center gap-1 ${trend >= 0 ? "text-success" : "text-destructive"}`}
            style={{ color: trend >= 0 ? "var(--success)" : "var(--destructive)" }}>
            {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
