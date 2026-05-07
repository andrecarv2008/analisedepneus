import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

export function InfoCard({
  label, value, sub, formula, tone, className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  formula?: string;
  tone?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl p-5 border ${className}`}
      style={{ background: "oklch(0.21 0.02 255 / 0.6)", borderColor: "oklch(1 0 0 / 0.06)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        {formula && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="size-5 -mr-1 -mt-0.5 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                  aria-label="Como é calculado"
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
                <div className="font-semibold mb-1">Como é calculado</div>
                <div className="text-muted-foreground whitespace-pre-line">{formula}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
