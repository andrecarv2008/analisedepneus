import { Lightbulb } from "lucide-react";
import type { ComponentType } from "react";

export type Insight = {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  severity?: "info" | "success" | "warning" | "destructive" | "primary";
};

const colorMap: Record<string, string> = {
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  primary: "var(--primary)",
};

export function InsightsBlock({ insights, title = "Insights desta página" }: { insights: Insight[]; title?: string }) {
  if (!insights.length) return null;
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="size-4 text-muted-foreground" />
        <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/80 font-medium">
          {title}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((it, i) => {
          const Icon = it.icon ?? Lightbulb;
          const c = colorMap[it.severity ?? "info"];
          return (
            <div
              key={i}
              className="rounded-xl p-4 border flex gap-3 animate-fade-up"
              style={{
                background: "oklch(0.21 0.02 255 / 0.6)",
                borderColor: "oklch(1 0 0 / 0.06)",
              }}
            >
              <div
                className="size-9 shrink-0 rounded-lg flex items-center justify-center"
                style={{ background: `color-mix(in oklab, ${c} 15%, transparent)`, color: c }}
              >
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm mb-0.5" style={{ color: c }}>{it.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{it.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
