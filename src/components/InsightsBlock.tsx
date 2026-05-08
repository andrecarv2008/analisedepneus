import { Lightbulb, Building2 } from "lucide-react";
import type { ComponentType } from "react";

export type Insight = {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  severity?: "info" | "success" | "warning" | "destructive" | "primary";
};

export type FilialInsights = {
  filial: string;
  metric?: string; // ex: "CPK R$ 0,062"
  insights: Insight[];
};

const colorMap: Record<string, string> = {
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  primary: "var(--primary)",
};

function Card({ it }: { it: Insight }) {
  const Icon = it.icon ?? Lightbulb;
  const c = colorMap[it.severity ?? "info"];
  return (
    <div
      className="rounded-xl p-4 border flex gap-3 animate-fade-up"
      style={{ background: "oklch(0.21 0.02 255 / 0.6)", borderColor: "oklch(1 0 0 / 0.06)" }}
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
}

export function InsightsBlock({ insights, title = "Insights desta página" }: { insights: Insight[]; title?: string }) {
  if (!insights.length) return null;
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="size-4 text-muted-foreground" />
        <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/80 font-medium">{title}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((it, i) => <Card key={i} it={it} />)}
      </div>
    </div>
  );
}

export function InsightsByFilial({
  groups,
  title = "Insights por filial",
}: {
  groups: FilialInsights[];
  title?: string;
}) {
  const visible = groups.filter((g) => g.insights.length > 0);
  if (!visible.length) return null;
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="size-4 text-muted-foreground" />
        <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/80 font-medium">{title}</div>
      </div>
      <div className="space-y-5">
        {visible.map((g) => (
          <div key={g.filial}>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md flex items-center justify-center"
                  style={{ background: "color-mix(in oklab, var(--primary) 15%, transparent)", color: "var(--primary)" }}>
                  <Building2 className="size-3.5" />
                </div>
                <div className="font-display font-semibold text-sm">{g.filial}</div>
              </div>
              {g.metric && <div className="text-xs text-muted-foreground tabular-nums">{g.metric}</div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {g.insights.map((it, i) => <Card key={i} it={it} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
