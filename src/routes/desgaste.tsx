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
  const { filtered } = useFilters();
  const list = useMemo(() => calcularDesgasteIrregular(filtered), [filtered]);
  const sevAlta = list.filter(d=>d.severidade==="alta").length;
  const sevMed = list.filter(d=>d.severidade==="média").length;

  const sevColor = (s: string) => s==="alta" ? "var(--destructive)" : s==="média" ? "var(--warning)" : "var(--info)";

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];
    if (list.length === 0) {
      out.push({ icon: Target, severity: "success", title: "Sem desgaste irregular", desc: "Nenhum par dianteiro apresenta diferença ≥ 1,6 mm. Operação saudável." });
      return out;
    }
    const m = new Map<string, number>();
    for (const d of list) m.set(d.fi, (m.get(d.fi) || 0) + 1);
    const top = [...m.entries()].sort((a,b)=>b[1]-a[1])[0];
    out.push({ icon: AlertTriangle, severity: "warning", title: "Filial mais afetada", desc: `${top[0]} concentra ${top[1]} ocorrências de desgaste irregular.` });
    if (sevAlta > 0) out.push({ icon: AlertOctagon, severity: "destructive", title: "Casos críticos", desc: `${sevAlta} pares com Δ ≥ 3 mm — risco de blow-out e perda prematura. Alinhamento imediato.` });
    out.push({ icon: Wrench, severity: "info", title: "Plano de ação sugerido", desc: `${sevAlta + sevMed} veículos requerem alinhamento; demais demandam apenas rodízio.` });
    return out;
  }, [list, sevAlta, sevMed]);

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

      <InsightsBlock insights={insights} />
    </>
  );
}
