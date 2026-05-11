import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { isRecap, fabricante } from "@/lib/tires";
import { InfoCard } from "@/components/InfoCard";
import { InsightsBlock, type Insight } from "@/components/InsightsBlock";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtMoneyK, fmtNum } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Zap, AlertCircle, DollarSign, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PRECO_RECAP = 800;
const PRECO_NOVO = 2400;

export const Route = createFileRoute("/recapagem")({ component: Page,
  head: () => ({ meta: [{ title: "Recapagem · Análise de Pneus - Grupo Mateus" }, { name: "description", content: "Pneus aptos para recapagem." }]}) });

function Page() {
  const { filtered, filters } = useFilters();
  const aptos = useMemo(() => filtered.filter(isRecap), [filtered]);

  const porFilial = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of aptos) m.set(t.fi, (m.get(t.fi) || 0) + 1);
    return [...m.entries()].map(([fi, n]) => ({ fi: fi.length > 16 ? fi.slice(0, 16) + "…" : fi, fiFull: fi, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  }, [aptos]);

  const porFab = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of aptos) m.set(fabricante(t.md), (m.get(fabricante(t.md)) || 0) + 1);
    return [...m.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  }, [aptos]);

  const custoEst = aptos.length * PRECO_RECAP;
  const economia = aptos.length * (PRECO_NOVO - PRECO_RECAP);
  const criticos = aptos.filter((t) => (t.mm ?? 99) <= 2).length;

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    if (!aptos.length) {
      list.push({ icon: Target, severity: "info", title: "Sem pneus aptos", desc: "Nenhum pneu com sulco ≤ 4 mm no escopo filtrado." });
      return list;
    }
    list.push({ icon: Zap, severity: "success", title: "Economia da recapagem", desc: `${fmtNum(aptos.length)} pneus aptos — economia potencial de ${fmtMoneyK(economia)} vs comprar novo.` });
    list.push({ icon: DollarSign, severity: "info", title: "Investimento estimado", desc: `${fmtMoneyK(custoEst)} (${fmtNum(aptos.length)} × R$ ${PRECO_RECAP}).` });
    if (criticos > 0) list.push({ icon: AlertCircle, severity: "destructive", title: "Pneus críticos (≤2 mm)", desc: `${fmtNum(criticos)} pneus em risco — recapar ou retirar de uso imediatamente.` });
    if (filters.filial === "all" && porFilial.length > 1) {
      list.push({ icon: Target, severity: "primary", title: "Filiais com mais aptos", desc: `${porFilial.slice(0, 3).map((f) => `${f.fiFull} (${fmtNum(f.n)})`).join(" · ")}.` });
    }
    return list;
  }, [aptos, filters.filial, criticos, economia, custoEst, porFilial]);

  const scope = filters.filial !== "all" ? { label: filters.filial, metric: `${fmtNum(aptos.length)} aptos · ${fmtNum(criticos)} críticos · economia ${fmtMoneyK(economia)}` } : undefined;

  return (
    <>
      <PageHeader title="Recapagem" subtitle="Pneus com sulco ≤ 4 mm — aptos para próximo ciclo de recapagem." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <InfoCard label="Aptos para recapagem" value={fmtNum(aptos.length)} tone="var(--info)"
          formula="Pneus com sulco mm ≤ 4 (regra de elegibilidade para recapagem)." />
        <InfoCard label="Custo estimado" value={fmtMoneyK(custoEst)} tone="var(--warning)"
          sub={`R$ ${PRECO_RECAP}/un`}
          formula={`Quantidade de aptos × R$ ${PRECO_RECAP} (preço médio de uma recapagem).`} />
        <InfoCard label="Economia vs novo" value={fmtMoneyK(economia)} tone="var(--success)"
          formula={`Aptos × (R$ ${PRECO_NOVO} pneu novo − R$ ${PRECO_RECAP} recapagem).`} />
        <InfoCard label="Críticos (≤2mm)" value={fmtNum(criticos)} tone="var(--destructive)"
          formula="Pneus aptos com sulco mm ≤ 2 — prioridade máxima." />
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

      <InsightsBlock insights={insights} scope={scope} title="Insights gerais" />
    </>
  );
}
