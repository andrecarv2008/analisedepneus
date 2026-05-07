import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { cpkAcumulado, cpkProjetado } from "@/lib/tires";
import { InfoCard } from "@/components/InfoCard";
import { InsightsBlock, type Insight } from "@/components/InsightsBlock";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtNum, fmtPct } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { TrendingUp, Trophy, AlertTriangle, Target } from "lucide-react";

export const Route = createFileRoute("/cpk")({ component: Page,
  head: () => ({ meta: [{ title: "Análise CPK · TireOps" }, { name: "description", content: "Custo por KM com regra de ciclos encerrados." }]}) });

function Page() {
  const { filtered } = useFilters();
  const data = useMemo(() => {
    const rows = filtered.map((t) => {
      const a = cpkAcumulado(t);
      const proj = cpkProjetado(t);
      return { t, real: a.cpk, custo: a.custo, km: a.km, proj, diff: proj > 0 ? ((a.cpk - proj) / proj) * 100 : 0 };
    });
    const validos = rows.filter((r) => r.real > 0);
    const cpkMedio = validos.length ? validos.reduce((s,r)=>s+r.real,0)/validos.length : 0;
    const cpkProjMed = rows.filter(r=>r.proj>0).reduce((s,r,_,a)=>s+r.proj/a.length,0);

    const filialMap = new Map<string, { c: number; k: number }>();
    for (const r of rows) {
      const e = filialMap.get(r.t.fi) || { c: 0, k: 0 };
      e.c += r.custo; e.k += r.km;
      filialMap.set(r.t.fi, e);
    }
    const filiais = [...filialMap.entries()].map(([fi,e]) => ({ fi, cpk: e.k>0?e.c/e.k:0, custo: e.c })).filter(f=>f.cpk>0).sort((a,b)=>a.cpk-b.cpk);

    const piores = [...validos].sort((a,b)=>b.real-a.real).slice(0,10);
    const melhores = [...validos].sort((a,b)=>a.real-b.real).slice(0,10);

    const porVida = [1,2,3,4,5,6,7].map(v=>{
      const arr = rows.filter(r=>r.t.v===v);
      let c=0,k=0; for(const r of arr){c+=r.custo;k+=r.km;}
      return { vida: `${v}ª`, cpk: k>0?c/k:0, custo: c };
    });
    return { rows, cpkMedio, cpkProjMed, filiais, piores, melhores, porVida };
  }, [filtered]);

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];
    if (data.filiais[0]) out.push({ icon: Trophy, severity: "success", title: "Melhor filial em CPK", desc: `${data.filiais[0].fi} com CPK de ${fmtCpk(data.filiais[0].cpk)}.` });
    const pior = data.filiais[data.filiais.length - 1];
    if (pior && pior !== data.filiais[0]) out.push({ icon: AlertTriangle, severity: "destructive", title: "Filial crítica", desc: `${pior.fi} com CPK de ${fmtCpk(pior.cpk)} — ${fmtPct(((pior.cpk - data.filiais[0].cpk) / data.filiais[0].cpk) * 100)} acima da melhor.` });
    if (data.cpkMedio < data.cpkProjMed) out.push({ icon: Target, severity: "success", title: "CPK abaixo do projetado", desc: `Média real ${fmtCpk(data.cpkMedio)} vs projetado ${fmtCpk(data.cpkProjMed)} — operação eficiente.` });
    else out.push({ icon: TrendingUp, severity: "warning", title: "CPK acima do projetado", desc: `Média real ${fmtCpk(data.cpkMedio)} excede projetado ${fmtCpk(data.cpkProjMed)}.` });
    return out;
  }, [data]);

  return (
    <>
      <PageHeader title="Análise de CPK" subtitle="Custo por KM rodado — apenas ciclos encerrados (vidas anteriores à atual)." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <InfoCard label="CPK real médio" value={fmtCpk(data.cpkMedio)} tone="var(--success)"
          formula="Média aritmética do CPK acumulado (Σ custo enc. ÷ Σ km enc.) entre pneus com ciclos encerrados." />
        <InfoCard label="CPK projetado médio" value={fmtCpk(data.cpkProjMed)} tone="var(--warning)"
          formula="Média do CPK projetado por pneu = ct ÷ kp (custo total ÷ km projetado)." />
        <InfoCard label="Diferença" value={fmtPct(((data.cpkMedio-data.cpkProjMed)/Math.max(data.cpkProjMed,0.0001))*100)}
          tone={data.cpkMedio <= data.cpkProjMed ? "var(--success)" : "var(--destructive)"}
          formula="(CPK real − CPK projetado) ÷ CPK projetado × 100. Negativo = melhor que projetado." />
        <InfoCard label="Pneus c/ ciclo encerrado" value={fmtNum(data.rows.filter(r=>r.real>0).length)}
          formula="Pneus que estão na 2ª vida ou maior (já fecharam ao menos um ciclo)." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="CPK por Vida" subtitle="Evolução financeira por ciclo">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.porVida}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="vida" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v:number)=>fmtCpk(v)} />
              <Line type="monotone" dataKey="cpk" stroke="var(--chart-1)" strokeWidth={2.5} dot={{r:5}} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ranking de Filiais" subtitle="Melhor → pior CPK">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.filiais.slice(0,10).map(f=>({ name: f.fi.length>14?f.fi.slice(0,14)+"…":f.fi, cpk: f.cpk }))} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={100} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v:number)=>fmtCpk(v)} />
              <Bar dataKey="cpk" fill="var(--chart-4)" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Pneus mais caros (CPK)" subtitle="Top 10">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr><th className="text-left py-2">Placa</th><th className="text-left">Fogo</th><th className="text-left">Filial</th><th className="text-right">CPK</th></tr>
              </thead>
              <tbody>
                {data.piores.map((r,i)=>(
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-2">{r.t.pl}</td><td>{r.t.fg}</td>
                    <td className="text-muted-foreground">{r.t.fi}</td>
                    <td className="text-right font-medium" style={{color:"var(--destructive)"}}>{fmtCpk(r.real)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
        <ChartCard title="Pneus mais eficientes" subtitle="Top 10 — menor CPK">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr><th className="text-left py-2">Placa</th><th className="text-left">Fogo</th><th className="text-left">Filial</th><th className="text-right">CPK</th></tr>
              </thead>
              <tbody>
                {data.melhores.map((r,i)=>(
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-2">{r.t.pl}</td><td>{r.t.fg}</td>
                    <td className="text-muted-foreground">{r.t.fi}</td>
                    <td className="text-right font-medium" style={{color:"var(--success)"}}>{fmtCpk(r.real)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </>
  );
}
