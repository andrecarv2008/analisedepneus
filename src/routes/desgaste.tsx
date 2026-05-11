import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { calcularDesgasteIrregular } from "@/lib/tires";
import { InfoCard } from "@/components/InfoCard";
import { InsightsBlock, type Insight } from "@/components/InsightsBlock";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtNum } from "@/lib/format";
import { AlertTriangle, AlertOctagon, Wrench, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/desgaste")({ component: Page,
  head: () => ({ meta: [{ title: "Desgaste Irregular · Análise de Pneus - Grupo Mateus" }, { name: "description", content: "Análise de desgaste irregular dos pneus dianteiros." }]}) });

function Page() {
  const { filtered, filters } = useFilters();
  const list = useMemo(() => calcularDesgasteIrregular(filtered), [filtered]);
  const sevAlta = list.filter((d) => d.severidade === "alta").length;
  const sevMed = list.filter((d) => d.severidade === "média").length;
  const sevBaixa = list.filter((d) => d.severidade === "baixa").length;

  const sevColor = (s: string) => (s === "alta" ? "var(--destructive)" : s === "média" ? "var(--warning)" : "var(--info)");

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];
    if (!list.length) {
      out.push({ icon: Target, severity: "success", title: "Sem desgaste irregular", desc: "Nenhum par dianteiro com Δ ≥ 1,6 mm no escopo filtrado." });
      return out;
    }
    const maxDiff = list.reduce((m, d) => Math.max(m, d.diff), 0);
    out.push({
      icon: AlertTriangle,
      severity: sevAlta > 0 ? "destructive" : sevMed > 0 ? "warning" : "info",
      title: "Ocorrências detectadas",
      desc: `${fmtNum(list.length)} pares dianteiros — maior Δ ${maxDiff.toFixed(2)} mm.`,
    });
    if (sevAlta > 0) out.push({ icon: AlertOctagon, severity: "destructive", title: "Casos críticos (Δ ≥ 3 mm)", desc: `${fmtNum(sevAlta)} pares — alinhamento imediato.` });
    if (sevMed > 0) out.push({ icon: Wrench, severity: "warning", title: "Severidade média", desc: `${fmtNum(sevMed)} pares com Δ entre 2,2 e 3 mm — revisão programada.` });
    if (sevBaixa > 0) out.push({ icon: Wrench, severity: "info", title: "Casos leves", desc: `${fmtNum(sevBaixa)} pares — apenas rodízio.` });

    if (filters.filial === "all") {
      const porFil = new Map<string, number>();
      for (const d of list) porFil.set(d.fi, (porFil.get(d.fi) || 0) + 1);
      const ranked = [...porFil.entries()].sort((a, b) => b[1] - a[1]);
      if (ranked.length > 1) {
        out.push({ icon: Target, severity: "primary", title: "Filiais mais afetadas", desc: `${ranked.slice(0, 3).map(([fi, n]) => `${fi} (${fmtNum(n)})`).join(" · ")}.` });
      }
    }
    return out;
  }, [list, filters.filial, sevAlta, sevMed, sevBaixa]);

  const scope = filters.filial !== "all" ? { label: filters.filial, metric: `${fmtNum(list.length)} pares · alta ${sevAlta} · média ${sevMed}` } : undefined;

  return (
    <>
      <PageHeader title="Desgaste Irregular" subtitle="Comparação automática entre dianteiro direito (1DD) e esquerdo (1DE) — alerta a partir de 1,6mm." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <InfoCard label="Total detectados" value={fmtNum(list.length)} tone="var(--warning)"
          formula="Pares dianteiros (1DD/1DE) na mesma placa com |mmD − mmE| ≥ 1,6 mm." />
        <InfoCard label="Severidade alta" value={fmtNum(sevAlta)} tone="var(--destructive)" sub="Δ ≥ 3,0 mm"
          formula="Pares com diferença de sulco ≥ 3,0 mm entre lados." />
        <InfoCard label="Severidade média" value={fmtNum(sevMed)} tone="var(--warning)" sub="Δ 2,2 – 3,0 mm"
          formula="Pares com diferença entre 2,2 e 2,99 mm." />
        <InfoCard label="Necessidade de alinhamento" value={fmtNum(sevAlta + sevMed)} tone="var(--info)"
          formula="Soma de severidades alta + média (Δ ≥ 2,2 mm)." />
      </div>

      <ChartCard title="Pneus com Desgaste Irregular Detectado" subtitle={`${list.length} ocorrências — ordenadas por severidade`}>
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card/95 backdrop-blur z-10 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="text-left py-2 px-2">Placa</th>
                <th className="text-left">Filial</th>
                <th className="text-right">MM Direito</th>
                <th className="text-right">MM Esquerdo</th>
                <th className="text-right">Diferença</th>
                <th className="text-center">Severidade</th>
                <th className="text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-secondary/30">
                  <td className="py-2 px-2 font-medium">{d.pl}</td>
                  <td className="text-muted-foreground">{d.fi}</td>
                  <td className="text-right">{d.mmD.toFixed(1)} mm</td>
                  <td className="text-right">{d.mmE.toFixed(1)} mm</td>
                  <td className="text-right font-bold" style={{ color: sevColor(d.severidade) }}>{d.diff.toFixed(2)} mm</td>
                  <td className="text-center">
                    <Badge variant="outline" style={{ color: sevColor(d.severidade), borderColor: sevColor(d.severidade) }}>
                      {d.severidade}
                    </Badge>
                  </td>
                  <td className="text-center text-xs text-muted-foreground">
                    {d.severidade === "alta" ? "Alinhar + Rodízio" : d.severidade === "média" ? "Alinhar" : "Rodízio"}
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Nenhum desgaste irregular detectado.</td></tr>}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <InsightsByFilial groups={groups} />
    </>
  );
}
