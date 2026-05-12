import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filters-context";
import { encerradoStats, fabricante } from "@/lib/tires";
import { InfoCard } from "@/components/InfoCard";
import { InsightsBlock, type Insight } from "@/components/InsightsBlock";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtNum, fmtPct } from "@/lib/format";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Cell,
} from "recharts";
import { TrendingUp, Trophy, AlertTriangle, Target } from "lucide-react";

export const Route = createFileRoute("/cpk")({
  component: Page,
  head: () => ({ meta: [{ title: "Análise CPK · Análise de Pneus - Grupo Mateus" }, { name: "description", content: "Custo por KM com regra de ciclos encerrados." }] }),
});

const FAB_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Page() {
  const { filtered, filters } = useFilters();

  const data = useMemo(() => {
    const rows = filtered.map((t) => {
      const s = encerradoStats(t);
      const real = s.kmReal > 0 ? s.custo / s.kmReal : 0;
      const proj = s.kmProj > 0 ? s.custo / s.kmProj : 0;
      return { t, real, proj, custo: s.custo, km: s.kmReal, kmProj: s.kmProj, ciclos: s.ciclos };
    });
    const validos = rows.filter((r) => r.ciclos > 0 && r.km > 0);

    const sumCusto = validos.reduce((s, r) => s + r.custo, 0);
    const sumKmReal = validos.reduce((s, r) => s + r.km, 0);
    const sumKmProj = validos.reduce((s, r) => s + r.kmProj, 0);
    const totalCiclos = validos.reduce((s, r) => s + r.ciclos, 0);
    const cpkMedio = sumKmReal > 0 ? sumCusto / sumKmReal : 0;
    const cpkProjMed = sumKmProj > 0 ? sumCusto / sumKmProj : 0;
    const perfKm = sumKmProj > 0 ? (sumKmReal / sumKmProj) * 100 : 0;

    // por filial — comparativo
    const filialMap = new Map<string, { c: number; k: number; kp: number; pneus: number }>();
    for (const r of validos) {
      const e = filialMap.get(r.t.fi) || { c: 0, k: 0, kp: 0, pneus: 0 };
      e.c += r.custo; e.k += r.km; e.kp += r.kmProj; e.pneus += 1;
      filialMap.set(r.t.fi, e);
    }
    const filiais = [...filialMap.entries()]
      .map(([fi, e]) => ({
        fi,
        cpk: e.k > 0 ? e.c / e.k : 0,
        cpkProj: e.kp > 0 ? e.c / e.kp : 0,
        perf: e.kp > 0 ? (e.k / e.kp) * 100 : 0,
        pneus: e.pneus,
        custo: e.c,
      }))
      .filter((f) => f.cpk > 0)
      .sort((a, b) => a.cpk - b.cpk);

    const piores = [...validos].sort((a, b) => b.real - a.real).slice(0, 10);
    const melhores = [...validos].sort((a, b) => a.real - b.real).slice(0, 10);

    const porVida = [1, 2, 3, 4, 5, 6, 7].map((v) => {
      const arr = rows.filter((r) => r.t.v === v);
      let c = 0, k = 0;
      for (const r of arr) { c += r.custo; k += r.km; }
      return { vida: `${v}ª`, cpk: k > 0 ? c / k : 0, custo: c };
    });

    // RANKING marca × dimensão (medida)
    type MD = { fab: string; medida: string; c: number; k: number; pneus: number; ciclos: number };
    const mdMap = new Map<string, MD>();
    for (const r of validos) {
      const fab = fabricante(r.t.md);
      const medida = (r.t.md || "").replace(fab, "").trim() || "—";
      const key = `${fab}__${medida}`;
      const e = mdMap.get(key) || { fab, medida, c: 0, k: 0, pneus: 0, ciclos: 0 };
      e.c += r.custo; e.k += r.km; e.pneus += 1; e.ciclos += r.ciclos;
      mdMap.set(key, e);
    }
    const mdRows = [...mdMap.values()]
      .map((m) => ({ ...m, cpk: m.k > 0 ? m.c / m.k : 0 }))
      .filter((m) => m.cpk > 0 && m.pneus >= 2);

    // medidas com pelo menos 2 fabricantes para comparação
    const dims = [...new Set(mdRows.map((m) => m.medida))];
    const dimGroups = dims
      .map((dim) => {
        const items = mdRows
          .filter((m) => m.medida === dim)
          .sort((a, b) => a.cpk - b.cpk);
        return { dim, items, totalPneus: items.reduce((s, x) => s + x.pneus, 0) };
      })
      .filter((g) => g.items.length >= 2)
      .sort((a, b) => b.totalPneus - a.totalPneus)
      .slice(0, 6);

    const fabRanking = [...mdRows]
      .sort((a, b) => a.cpk - b.cpk)
      .slice(0, 12);

    return {
      rows, validos, cpkMedio, cpkProjMed, perfKm, sumCusto, sumKmReal, sumKmProj, totalCiclos,
      filiais, piores, melhores, porVida, dimGroups, fabRanking, mdRows,
    };
  }, [filtered]);

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    if (!data.validos.length) return list;
    list.push({
      icon: data.cpkMedio < 0.06 ? Trophy : data.cpkMedio < 0.07 ? Target : AlertTriangle,
      severity: data.cpkMedio < 0.06 ? "success" : data.cpkMedio < 0.07 ? "warning" : "destructive",
      title: "CPK real médio",
      desc: `${fmtCpk(data.cpkMedio)} sobre ${fmtNum(data.totalCiclos)} ciclos encerrados em ${fmtNum(data.validos.length)} pneus.`,
    });
    const diff = ((data.cpkMedio - data.cpkProjMed) / Math.max(data.cpkProjMed, 0.0001)) * 100;
    list.push({
      icon: data.cpkMedio <= data.cpkProjMed ? TrendingUp : AlertTriangle,
      severity: data.cpkMedio <= data.cpkProjMed ? "success" : "warning",
      title: "Real vs projetado",
      desc: `CPK real ${fmtCpk(data.cpkMedio)} × projetado ${fmtCpk(data.cpkProjMed)} (${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%) — performance ${fmtPct(data.perfKm)}.`,
    });
    if (filters.filial === "all" && data.filiais.length > 1) {
      const melhor = data.filiais[0];
      const pior = data.filiais[data.filiais.length - 1];
      const gap = ((pior.cpk - melhor.cpk) / melhor.cpk) * 100;
      list.push({
        icon: Target, severity: "primary",
        title: "Comparativo de filiais",
        desc: `Melhor: ${melhor.fi} (${fmtCpk(melhor.cpk)}). Pior: ${pior.fi} (${fmtCpk(pior.cpk)}) — ${fmtPct(gap)} acima.`,
      });
    }
    if (data.dimGroups.length > 0) {
      const g = data.dimGroups[0];
      const win = g.items[0];
      const lose = g.items[g.items.length - 1];
      list.push({
        icon: Trophy, severity: "info",
        title: `Marca líder na dimensão ${g.dim}`,
        desc: `${win.fab} entrega ${fmtCpk(win.cpk)} vs ${lose.fab} ${fmtCpk(lose.cpk)} — diferença de ${fmtPct(((lose.cpk - win.cpk) / win.cpk) * 100)}.`,
      });
    }
    return list;
  }, [data, filters.filial]);

  const scope = filters.filial !== "all"
    ? { label: filters.filial, metric: `${fmtNum(data.validos.length)} pneus · CPK ${data.cpkMedio > 0 ? fmtCpk(data.cpkMedio) : "—"} · perf ${fmtPct(data.perfKm)}` }
    : undefined;

  const [dimSel, setDimSel] = useState<string | null>(null);
  const dimAtual = dimSel ?? data.dimGroups[0]?.dim ?? null;
  const dimItems = dimAtual ? data.dimGroups.find((g) => g.dim === dimAtual)?.items ?? [] : [];

  return (
    <>
      <PageHeader title="Análise de CPK" subtitle="Custo por KM rodado — apenas ciclos encerrados (vidas anteriores à atual)." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <InfoCard label="CPK real médio" value={fmtCpk(data.cpkMedio)} tone="var(--success)"
          formula={{
            description: "Custo médio por quilômetro real considerando apenas ciclos encerrados.",
            formula: "Σ custo enc. ÷ Σ km real enc.",
          }} />
        <InfoCard label="CPK projetado médio" value={fmtCpk(data.cpkProjMed)} tone="var(--warning)"
          formula="Σ custo enc. ÷ Σ km projetado enc. (mesma base)." />
        <InfoCard label="Diferença real × projetado"
          value={fmtPct(((data.cpkMedio - data.cpkProjMed) / Math.max(data.cpkProjMed, 0.0001)) * 100)}
          tone={data.cpkMedio <= data.cpkProjMed ? "var(--success)" : "var(--destructive)"}
          formula="(CPK real − CPK projetado) ÷ CPK projetado × 100." />
        <InfoCard label="Performance KM" value={fmtPct(data.perfKm)}
          tone={data.perfKm >= 95 ? "var(--success)" : data.perfKm >= 70 ? "var(--warning)" : "var(--destructive)"}
          formula="(Σ KM real enc. ÷ Σ KM projetado enc.) × 100." />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <InfoCard label="Pneus na base" value={fmtNum(filtered.length)} tone="var(--info)"
          sub={`${fmtNum(data.validos.length)} com ciclos encerrados`}
          formula="Total de pneus no escopo filtrado." />
        <InfoCard label="KM médio por ciclo" value={fmtNum(data.totalCiclos > 0 ? data.sumKmReal / data.totalCiclos : 0)}
          sub={`${fmtNum(data.totalCiclos)} ciclos encerrados`}
          formula="Σ KM real encerrado ÷ Σ ciclos encerrados — durabilidade média de uma vida." />
        <InfoCard label="KM real utilizado" value={fmtNum(data.sumKmReal)} tone="var(--success)" formula="Σ km[i] das vidas encerradas válidas." />
        <InfoCard label="KM projetado utilizado" value={fmtNum(data.sumKmProj)} tone="var(--warning)" formula="Σ kpv[i] das mesmas vidas encerradas." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="CPK por Vida" subtitle="Evolução financeira por ciclo">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.porVida} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cpkLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="vida" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-elegant)" }} formatter={(v: number) => fmtCpk(v)} />
              <Line type="monotone" dataKey="cpk" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: "var(--card)" }} activeDot={{ r: 7 }} fill="url(#cpkLine)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ranking de Filiais" subtitle="Melhor → pior CPK">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.filiais.slice(0, 10).map((f) => ({ name: f.fi.length > 14 ? f.fi.slice(0, 14) + "…" : f.fi, fiFull: f.fi, cpk: f.cpk, perf: f.perf, pneus: f.pneus }))} layout="vertical" margin={{ left: 80, right: 16 }}>
              <defs>
                <linearGradient id="filRank" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={100} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d: any = payload[0].payload;
                  return (
                    <div className="rounded-xl border bg-popover/95 backdrop-blur shadow-xl p-3" style={{ borderColor: "var(--border)" }}>
                      <div className="font-display font-semibold text-sm mb-1.5">{d.fiFull}</div>
                      <dl className="space-y-1 text-xs">
                        <div className="flex justify-between gap-6"><dt className="text-muted-foreground">CPK</dt><dd className="font-semibold tabular-nums" style={{ color: "var(--chart-4)" }}>{fmtCpk(d.cpk)}</dd></div>
                        <div className="flex justify-between gap-6"><dt className="text-muted-foreground">Performance</dt><dd className="font-medium tabular-nums">{fmtPct(d.perf)}</dd></div>
                        <div className="flex justify-between gap-6"><dt className="text-muted-foreground">Pneus</dt><dd className="font-medium tabular-nums">{fmtNum(d.pneus)}</dd></div>
                      </dl>
                    </div>
                  );
                }}
              />
              <Bar dataKey="cpk" fill="url(#filRank)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* RANKING POR MARCA E DIMENSÃO */}
      {data.dimGroups.length > 0 && (
        <ChartCard
          title="Comparativo Marca × Dimensão"
          subtitle="CPK por fabricante dentro da mesma medida"
          className="mb-6"
          action={
            <div className="flex flex-wrap gap-1.5">
              {data.dimGroups.map((g) => (
                <button
                  key={g.dim}
                  onClick={() => setDimSel(g.dim)}
                  className="text-xs px-2.5 py-1 rounded-md border transition-all"
                  style={{
                    borderColor: dimAtual === g.dim ? "var(--primary)" : "var(--border)",
                    background: dimAtual === g.dim ? "color-mix(in oklab, var(--primary) 12%, transparent)" : "transparent",
                    color: dimAtual === g.dim ? "var(--primary)" : "var(--foreground)",
                    fontWeight: dimAtual === g.dim ? 600 : 400,
                  }}
                >
                  {g.dim} <span className="text-muted-foreground">({g.items.length})</span>
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dimItems.map((m) => ({ ...m }))} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="fab" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCpk(v)} />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d: any = payload[0].payload;
                  return (
                    <div className="rounded-xl border bg-popover/95 backdrop-blur shadow-xl p-3" style={{ borderColor: "var(--border)" }}>
                      <div className="font-display font-semibold text-sm mb-1.5">{d.fab} <span className="text-muted-foreground">· {d.medida}</span></div>
                      <dl className="space-y-1 text-xs">
                        <div className="flex justify-between gap-6"><dt className="text-muted-foreground">CPK</dt><dd className="font-semibold tabular-nums" style={{ color: "var(--chart-1)" }}>{fmtCpk(d.cpk)}</dd></div>
                        <div className="flex justify-between gap-6"><dt className="text-muted-foreground">Pneus</dt><dd className="font-medium tabular-nums">{fmtNum(d.pneus)}</dd></div>
                        <div className="flex justify-between gap-6"><dt className="text-muted-foreground">Ciclos enc.</dt><dd className="font-medium tabular-nums">{fmtNum(d.ciclos)}</dd></div>
                        <div className="flex justify-between gap-6"><dt className="text-muted-foreground">KM real</dt><dd className="font-medium tabular-nums">{fmtNum(d.k)}</dd></div>
                      </dl>
                    </div>
                  );
                }}
              />
              <Bar dataKey="cpk" radius={[10, 10, 0, 0]}>
                {dimItems.map((_, i) => <Cell key={i} fill={FAB_COLORS[i % FAB_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-2">#</th>
                  <th className="text-left">Fabricante</th>
                  <th className="text-left">Dimensão</th>
                  <th className="text-right">Pneus</th>
                  <th className="text-right">Ciclos</th>
                  <th className="text-right">CPK</th>
                  <th className="text-right">Δ vs líder</th>
                </tr>
              </thead>
              <tbody>
                {dimItems.map((m, i) => {
                  const lider = dimItems[0];
                  const delta = lider && i > 0 ? ((m.cpk - lider.cpk) / lider.cpk) * 100 : 0;
                  return (
                    <tr key={i} className="border-t border-border/50">
                      <td className="py-2 font-display font-semibold" style={{ color: i === 0 ? "var(--success)" : "var(--muted-foreground)" }}>{i + 1}º</td>
                      <td className="font-medium">{m.fab}</td>
                      <td className="text-muted-foreground">{m.medida}</td>
                      <td className="text-right tabular-nums">{fmtNum(m.pneus)}</td>
                      <td className="text-right tabular-nums">{fmtNum(m.ciclos)}</td>
                      <td className="text-right font-semibold tabular-nums" style={{ color: i === 0 ? "var(--success)" : "var(--foreground)" }}>{fmtCpk(m.cpk)}</td>
                      <td className="text-right tabular-nums" style={{ color: i === 0 ? "var(--muted-foreground)" : "var(--destructive)" }}>{i === 0 ? "—" : `+${delta.toFixed(1)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      <ChartCard title="Top 12 — Combinações Marca × Dimensão" subtitle="Menores CPKs da operação" className="mb-6">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data.fabRanking.map((m) => ({ name: `${m.fab} ${m.medida}`, cpk: m.cpk, pneus: m.pneus, fab: m.fab, medida: m.medida }))} layout="vertical" margin={{ left: 140, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCpk(v)} />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={160} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d: any = payload[0].payload;
                return (
                  <div className="rounded-xl border bg-popover/95 backdrop-blur shadow-xl p-3" style={{ borderColor: "var(--border)" }}>
                    <div className="font-display font-semibold text-sm mb-1.5">{d.fab} · {d.medida}</div>
                    <dl className="space-y-1 text-xs">
                      <div className="flex justify-between gap-6"><dt className="text-muted-foreground">CPK</dt><dd className="font-semibold tabular-nums" style={{ color: "var(--success)" }}>{fmtCpk(d.cpk)}</dd></div>
                      <div className="flex justify-between gap-6"><dt className="text-muted-foreground">Pneus</dt><dd className="font-medium tabular-nums">{fmtNum(d.pneus)}</dd></div>
                    </dl>
                  </div>
                );
              }}
            />
            <Bar dataKey="cpk" radius={[0, 8, 8, 0]}>
              {data.fabRanking.map((_, i) => <Cell key={i} fill={i < 3 ? "var(--success)" : i < 6 ? "var(--chart-1)" : "var(--chart-2)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Pneus mais caros (CPK)" subtitle="Top 10">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr><th className="text-left py-2">Placa</th><th className="text-left">Fogo</th><th className="text-left">Filial</th><th className="text-right">CPK</th></tr>
              </thead>
              <tbody>
                {data.piores.map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-2">{r.t.pl}</td><td>{r.t.fg}</td>
                    <td className="text-muted-foreground">{r.t.fi}</td>
                    <td className="text-right font-medium" style={{ color: "var(--destructive)" }}>{fmtCpk(r.real)}</td>
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
                {data.melhores.map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-2">{r.t.pl}</td><td>{r.t.fg}</td>
                    <td className="text-muted-foreground">{r.t.fi}</td>
                    <td className="text-right font-medium" style={{ color: "var(--success)" }}>{fmtCpk(r.real)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <InsightsBlock insights={insights} scope={scope} title="Insights gerais" />
    </>
  );
}
