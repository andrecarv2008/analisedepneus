import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { calcularDesgasteIrregular } from "@/lib/tires";
import { Kpi } from "@/components/Kpi";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtNum } from "@/lib/format";
import { AlertTriangle, AlertOctagon, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/desgaste")({ component: Page,
  head: () => ({ meta: [{ title: "Desgaste Irregular · TireOps" }, { name: "description", content: "Análise de desgaste irregular dos pneus dianteiros." }]}) });

function Page() {
  const { filtered } = useFilters();
  const list = useMemo(() => calcularDesgasteIrregular(filtered), [filtered]);
  const sevAlta = list.filter(d=>d.severidade==="alta").length;
  const sevMed = list.filter(d=>d.severidade==="média").length;
  const sevBai = list.filter(d=>d.severidade==="baixa").length;

  const sevColor = (s: string) => s==="alta" ? "var(--destructive)" : s==="média" ? "var(--warning)" : "var(--info)";

  return (
    <>
      <PageHeader title="Desgaste Irregular" subtitle="Comparação automática entre dianteiro direito (1DD) e esquerdo (1DE) — alerta a partir de 1,6mm." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total Detectados" value={fmtNum(list.length)} icon={<AlertTriangle className="size-4" />} accent="warning" />
        <Kpi label="Severidade Alta" value={fmtNum(sevAlta)} hint="Δ ≥ 3,0 mm" icon={<AlertOctagon className="size-4" />} accent="destructive" />
        <Kpi label="Severidade Média" value={fmtNum(sevMed)} hint="Δ 2,2 – 3,0 mm" accent="warning" />
        <Kpi label="Necessidade de Alinhamento" value={fmtNum(sevAlta + sevMed)} icon={<Wrench className="size-4" />} accent="info" />
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
    </>
  );
}
