import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { calcularDesgasteIrregular } from "@/lib/tires";
import { InfoCard } from "@/components/InfoCard";
import { InsightsByFilial, type FilialInsights, type Insight } from "@/components/InsightsBlock";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtNum } from "@/lib/format";
import { AlertTriangle, AlertOctagon, Wrench, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/desgaste")({ component: Page,
  head: () => ({ meta: [{ title: "Desgaste Irregular · Análise de Pneus - Grupo Mateus" }, { name: "description", content: "Análise de desgaste irregular dos pneus dianteiros." }]}) });

function Page() {
  const { filtered } = useFilters();
  const list = useMemo(() => calcularDesgasteIrregular(filtered), [filtered]);
  const sevAlta = list.filter(d=>d.severidade==="alta").length;
  const sevMed = list.filter(d=>d.severidade==="média").length;

  const sevColor = (s: string) => s==="alta" ? "var(--destructive)" : s==="média" ? "var(--warning)" : "var(--info)";

  const groups = useMemo<FilialInsights[]>(() => {
    type Acc = { alta: number; med: number; baixa: number; total: number; maxDiff: number };
    const m = new Map<string, Acc>();
    for (const d of list) {
      const e = m.get(d.fi) || { alta: 0, med: 0, baixa: 0, total: 0, maxDiff: 0 };
      e.total += 1;
      if (d.severidade === "alta") e.alta += 1;
      else if (d.severidade === "média") e.med += 1;
      else e.baixa += 1;
      if (d.diff > e.maxDiff) e.maxDiff = d.diff;
      m.set(d.fi, e);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total).map(([fi, e]) => {
      const insights: Insight[] = [];
      insights.push({
        icon: AlertTriangle,
        severity: e.alta > 0 ? "destructive" : e.med > 0 ? "warning" : "info",
        title: "Ocorrências detectadas",
        desc: `${fmtNum(e.total)} pares dianteiros com Δ ≥ 1,6mm — maior diferença: ${e.maxDiff.toFixed(2)}mm.`,
      });
      if (e.alta > 0) insights.push({ icon: AlertOctagon, severity: "destructive", title: "Casos críticos (Δ ≥ 3mm)", desc: `${fmtNum(e.alta)} pares — risco de blow-out e perda prematura. Alinhamento imediato.` });
      const acao = e.alta + e.med;
      if (acao > 0) insights.push({ icon: Wrench, severity: "info", title: "Plano de ação", desc: `${fmtNum(acao)} veículos requerem alinhamento; ${fmtNum(e.baixa)} apenas rodízio.` });
      else insights.push({ icon: Target, severity: "success", title: "Sem severidade alta/média", desc: "Apenas casos leves — rodízio resolve." });
      return { filial: fi, metric: `${fmtNum(e.total)} pares · alta ${e.alta} · média ${e.med} · baixa ${e.baixa}`, insights };
    });
  }, [list]);

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
