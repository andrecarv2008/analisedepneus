import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { isRecap, fabricante } from "@/lib/tires";
import { Kpi } from "@/components/Kpi";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtMoneyK, fmtNum } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { RotateCw, AlertCircle, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PRECO_RECAP = 800;

export const Route = createFileRoute("/recapagem")({ component: Page,
  head: () => ({ meta: [{ title: "Recapagem · TireOps" }, { name: "description", content: "Pneus aptos para recapagem." }]}) });

function Page() {
  const { filtered } = useFilters();
  const aptos = useMemo(() => filtered.filter(isRecap), [filtered]);

  const porFilial = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of aptos) m.set(t.fi, (m.get(t.fi) || 0) + 1);
    return [...m.entries()].map(([fi, n]) => ({ fi: fi.length>16?fi.slice(0,16)+"…":fi, n })).sort((a,b)=>b.n-a.n).slice(0,10);
  }, [aptos]);

  const porFab = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of aptos) m.set(fabricante(t.md), (m.get(fabricante(t.md)) || 0) + 1);
    return [...m.entries()].map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v);
  }, [aptos]);

  const custoEst = aptos.length * PRECO_RECAP;

  return (
    <>
      <PageHeader title="Recapagem" subtitle="Pneus com sulco ≤ 4 mm — aptos para próximo ciclo de recapagem." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Aptos para Recapagem" value={fmtNum(aptos.length)} icon={<RotateCw className="size-4" />} accent="info" />
        <Kpi label="Custo Estimado" value={fmtMoneyK(custoEst)} hint={`R$ ${PRECO_RECAP}/un`} icon={<DollarSign className="size-4" />} accent="warning" />
        <Kpi label="Filiais Impactadas" value={fmtNum(porFilial.length)} accent="primary" />
        <Kpi label="Críticos (≤2mm)" value={fmtNum(aptos.filter(t=>(t.mm??99)<=2).length)} icon={<AlertCircle className="size-4" />} accent="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Aptos por Filial" subtitle="Top 10">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={porFilial}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="fi" stroke="var(--muted-foreground)" fontSize={10} angle={-25} textAnchor="end" height={70} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="n" fill="var(--chart-3)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Aptos por Fabricante">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={porFab}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="k" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="v" fill="var(--chart-2)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Lista de Pneus Aptos" subtitle={`${aptos.length} pneus`}>
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card/95 backdrop-blur text-xs text-muted-foreground uppercase">
              <tr>
                <th className="text-left py-2 px-2">Placa</th>
                <th className="text-left">Fogo</th>
                <th className="text-left">Filial</th>
                <th className="text-left">Medida</th>
                <th className="text-center">Vida</th>
                <th className="text-right">MM</th>
                <th className="text-center">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {aptos.sort((a,b)=>(a.mm??99)-(b.mm??99)).slice(0,300).map((t,i)=>{
                const mm = t.mm ?? 0;
                const prio = mm<=2 ? "Crítica" : mm<=3 ? "Alta" : "Média";
                const c = mm<=2 ? "var(--destructive)" : mm<=3 ? "var(--warning)" : "var(--info)";
                return (
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-2 px-2 font-medium">{t.pl}</td>
                    <td>{t.fg}</td>
                    <td className="text-muted-foreground text-xs">{t.fi}</td>
                    <td className="text-xs">{t.md}</td>
                    <td className="text-center">{t.v}ª</td>
                    <td className="text-right font-medium" style={{color:c}}>{mm.toFixed(1)} mm</td>
                    <td className="text-center"><Badge variant="outline" style={{color:c,borderColor:c}}>{prio}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  );
}
