import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ReactNode } from "react";

export type FormulaSpec =
  | string
  | {
      description?: string;
      formula?: string;
      steps?: string[];
      note?: string;
    };

export function InfoCard({
  label, value, sub, formula, tone, className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  formula?: FormulaSpec;
  tone?: string;
  className?: string;
}) {
  const spec: Exclude<FormulaSpec, string> | null =
    typeof formula === "string" ? { description: formula } : formula ?? null;

  return (
    <div
      className={`rounded-xl p-5 border bg-card/60 ${className}`}
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        {spec && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="size-5 -mr-1 -mt-0.5 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Como é calculado"
              >
                <Info className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start" className="w-80 p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/40">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Como é calculado
                </div>
                <div className="text-sm font-semibold text-foreground mt-0.5">{label}</div>
              </div>
              <div className="p-4 space-y-3 text-sm">
                {spec.description && (
                  <p className="text-foreground/90 leading-relaxed">{spec.description}</p>
                )}
                {spec.formula && (
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
                    {spec.formula}
                  </div>
                )}
                {spec.steps && spec.steps.length > 0 && (
                  <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside marker:text-primary">
                    {spec.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                )}
                {spec.note && (
                  <p className="text-[11px] text-muted-foreground italic border-l-2 border-primary/40 pl-2">
                    {spec.note}
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div
        className="font-display text-2xl md:text-[28px] font-bold tracking-tight leading-tight"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
