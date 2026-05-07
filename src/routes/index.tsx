import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { cpkAcumulado, cpkProjetado, calcularDesgasteIrregular, isRecap, statusNorm } from "@/lib/tires";
import { Kpi } from "@/components/Kpi";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtMoneyK, fmtNum, fmtPct } from "@/lib/format";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Activity, AlertTriangle, DollarSign, Gauge, Package, RotateCw, TrendingUp, Truck, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({ meta: [
    { title: "Visão Geral · TireOps" },
    { name: "description", content: "Visão executiva da operação de pneus." },
  ]}),
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "oklch(0.6 0.18 280)", "oklch(0.7 0.15 100)"];

function Dashboard() {
  const { filtered } = useFilters();

  const stats = useMemo(() => {
    const total = filtered.length;
    const ativos = filtered.filter((t) => statusNorm(t) === "ativo").length;
    const recap = filtered.filter((t) => statusNorm(t) === "recapagem").length;
    const sucata = filtered.filter((t) => statusNorm(t) === "sucata").length;
    const custoTotal = filtered.reduce((s, t) => s + (t.ct || 0), 0);
    const kmTotal = filtered.reduce((s, t) => s + (t.kt || 0), 0);
    const kmProj = filtered.reduce((s, t) => s + (t.kp || 0), 0);

    let custoFechado = 0, kmFechado = 0;
    for (const t of filtered) {
      const a = cpkAcumulado(t);
      custoFechado += a.custo; kmFechado += a.km;
    }
    const cpkReal = kmFechado > 0 ? custoFechado / kmFechado : 0;
    const cpkProj = kmProj > 0 ? custoTotal / kmProj : 0;
    const perf = kmProj > 0 ? (kmTotal / kmProj) * 100 : 0;

    const aptosRecap = filtered.filter(isRecap).length;
    const desg = calcularDesgasteIrregular(filtered);

    const porVida: Record<number, number> = {};
    for (let i = 1; i <= 7; i++) porVida[i] = 0;
    for (const t of filtered) if (t.v) porVida[t.v] = (porVida[t.v] || 0) + 1;

    // por filial
    const filialMap = new Map<string, { custo: number; km: number; n: number; kmProj: number }>();
    for (const t of filtered) {
      const e = filialMap.get(t.fi) || { custo: 0, km: 0, n: 0, kmProj: 0 };
      const a = cpkAcumulado(t);
      e.custo += a.custo; e.km += a.km; e.n += 1; e.kmProj += t.kp;
      filialMap.set(t.fi, e);
    }
    const filiais = [...filialMap.entries()].map(([fi, e]) => ({
      fi, custo: e.custo, km: e.km, n: e.n,
      cpk: e.km > 0 ? e.custo / e.km : 0,
      perf: e.kmProj > 0 ? (e.km / e.kmProj) * 100 : 0,
    }));
    const ranked = [...filiais].filter((f) => f.cpk > 0).sort((a, b) => a.cpk - b.cpk);
    const melhor = ranked[0];
    const pior = ranked[ranked.length - 1];

    const desgPorFilial = new Map<string, number>();
    for (const d of desg) desgPorFilial.set(d.fi, (desgPorFilial.get(d.fi) || 0) + 1);

    return { total, ativos, recap, sucata, custoTotal, kmTotal, kmProj, cpkReal, cpkProj, perf,
      aptosRecap, desgN: desg.length, porVida, filiais, melhor, pior,
      desgFilialArr: [...desgPorFilial.entries()].map(([fi, n]) => ({ fi, n })).sort((a,b)=>b.n-a.n).slice(0,8) };
  }, [filtered]);

  const vidaData = Object.entries(stats.porVida).map(([k, v]) => ({ name: `${k}ª`, value: v }));
  const statusData = [
    { name: "Ativos", value: stats.ativos },
    { name: "Recapagem", value: stats.recap },
    { name: "Sucata", value: stats.sucata },
  ];
  const filialBars = stats.filiais.slice(0, 10).sort((a,b)=>b.custo-a.custo).map((f) => ({
    name: f.fi.length > 14 ? f.fi.slice(0, 14) + "…" : f.fi, custo: f.custo, cpk: f.cpk,
  }));
  const evolCpk = [1,2,3,4,5,6,7].map((v) => {
    const arr = filtered.filter((t) => t.v === v);
    let c = 0, k = 0;
    for (const t of arr) { const a = cpkAcumulado(t); c += a.custo; k += a.km; }
    return { vida: `${v}ª`, cpk: k > 0 ? c / k : 0 };
  });

  return (
    <>
      <PageHeader title="Visão Geral" subtitle="Inteligência executiva da frota — performance, custo e operação em tempo real." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total de Pneus" value={fmtNum(stats.total)} icon={<Package className="size-4" />} accent="primary" />
        <Kpi label="Ativos" value={fmtNum(stats.ativos)} hint={`${fmtPct((stats.ativos/Math.max(stats.total,1))*100)}`} icon={<Activity className="size-4" />} accent="success" />
        <Kpi label="Em Recapagem" value={fmtNum(stats.recap)} icon={<RotateCw className="size-4" />} accent="info" />
        <Kpi label="Sucateados" value={fmtNum(stats.sucata)} icon={<AlertTriangle className="size-4" />} accent="destructive" />
        <Kpi label="Custo Total Frota" value={fmtMoneyK(stats.custoTotal)} icon={<DollarSign className="size-4" />} accent="accent" />
        <Kpi label="KM Total Rodado" value={fmtNum(stats.kmTotal)} hint="km" icon={<Truck className="size-4" />} accent="primary" />
        <Kpi label="CPK Real (encerrado)" value={fmtCpk(stats.cpkReal)} icon={<Gauge className="size-4" />} accent="success" />
        <Kpi label="CPK Projetado" value={fmtCpk(stats.cpkProj)} hint={`Δ ${fmtPct(((stats.cpkReal-stats.cpkProj)/Math.max(stats.cpkProj,0.0001))*100)}`} icon={<TrendingUp className="size-4" />} accent="warning" />
        <Kpi label="Performance KM" value={fmtPct(stats.perf)} trend={stats.perf - 100} icon={<Trophy className="size-4" />} accent="info" />
        <Kpi label="Aptos p/ Recapagem" value={fmtNum(stats.aptosRecap)} hint="sulco ≤ 4mm" icon={<RotateCw className="size-4" />} accent="warning" />
        <Kpi label="Desgaste Irregular" value={fmtNum(stats.desgN)} hint="≥ 1,6mm de diferença" icon={<AlertTriangle className="size-4" />} accent="destructive" />
        <Kpi label="Melhor Filial (CPK)" value={stats.melhor?.fi.split(" ")[0] || "—"} hint={stats.melhor ? fmtCpk(stats.melhor.cpk) : ""} icon={<Trophy className="size-4" />} accent="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Distribuição por Vida" subtitle="Quantidade de pneus em cada ciclo">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vidaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status da Frota" subtitle="Composição por status operacional">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolução do CPK por Vida" subtitle="CPK acumulado em ciclos encerrados">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={evolCpk}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="vida" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => v.toFixed(2)} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v: number) => fmtCpk(v)} />
              <Line type="monotone" dataKey="cpk" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Custo Acumulado por Filial" subtitle="Top 10 filiais — ciclos encerrados">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={filialBars} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => fmtMoneyK(v)} />
              <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={100} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v: number) => fmtMoneyK(v)} />
              <Bar dataKey="custo" fill="var(--chart-2)" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Desgaste Irregular por Filial" subtitle="Pares dianteiros com Δ ≥ 1,6mm">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats.desgFilialArr.map(d => ({ name: d.fi.length>14?d.fi.slice(0,14)+"…":d.fi, n: d.n }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="n" fill="var(--chart-5)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Melhor Filial (CPK)</div>
          <div className="font-display text-xl font-bold">{stats.melhor?.fi || "—"}</div>
          <div className="text-success mt-1 text-sm" style={{ color: "var(--success)" }}>{stats.melhor ? fmtCpk(stats.melhor.cpk) : ""}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pior Filial (CPK)</div>
          <div className="font-display text-xl font-bold">{stats.pior?.fi || "—"}</div>
          <div className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{stats.pior ? fmtCpk(stats.pior.cpk) : ""}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Maior índice de Recapagem</div>
          <div className="font-display text-xl font-bold">
            {(() => {
              const m = new Map<string, number>();
              for (const t of filtered) if (isRecap(t)) m.set(t.fi, (m.get(t.fi) || 0) + 1);
              const top = [...m.entries()].sort((a,b)=>b[1]-a[1])[0];
              return top ? top[0] : "—";
            })()}
          </div>
        </div>
      </div>
    </>
  );
}
