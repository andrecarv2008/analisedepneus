import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { encerradoStats, isRecap, statusNorm } from "@/lib/tires";
import { InfoCard } from "@/components/InfoCard";
import { InsightsBlock, type Insight } from "@/components/InsightsBlock";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtMoneyK, fmtNum, fmtPct } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Target } from "lucide-react";

export const Route = createFileRoute("/financeiro")({ component: Page,
  head: () => ({ meta: [{ title: "Financeiro · Análise de Pneus - Grupo Mateus" }, { name: "description", content: "Análise financeira da operação de pneus." }]}) });

function Page() {
  const { filtered, filters } = useFilters();

  const data = useMemo(() => {
    const custoTotal = filtered.reduce((s, t) => s + t.ct, 0);

    // BASE ÚNICA — ciclos encerrados (mesma do dashboard)
    let custoEnc = 0, kmEnc = 0, kmProjEnc = 0, ciclosEnc = 0;
    for (const t of filtered) {
      const s = encerradoStats(t);
      custoEnc += s.custo; kmEnc += s.kmReal; kmProjEnc += s.kmProj; ciclosEnc += s.ciclos;
    }
    const cpkReal = kmEnc > 0 ? custoEnc / kmEnc : 0;
    const cpkProj = kmProjEnc > 0 ? custoEnc / kmProjEnc : 0;
    const perf = kmProjEnc > 0 ? (kmEnc / kmProjEnc) * 100 : 0;

    const custoRecap = filtered.filter(isRecap).length * 800;
    const custoSucata = filtered.filter((t) => statusNorm(t) === "sucata").reduce((s, t) => s + t.ct, 0);

    // por vida — ciclos encerrados
    const porVida = [1, 2, 3, 4, 5, 6, 7].map((v) => {
      const arr = filtered.filter((t) => t.v === v);
      let c = 0, k = 0;
      for (const t of arr) {
        const a = encerradoStats(t);
        c += a.custo; k += a.kmReal;
      }
      return { vida: `${v}ª`, custo: c, cpk: k > 0 ? c / k : 0 };
    });

    // por filial — ciclos encerrados
    const m = new Map<string, { c: number; k: number; kp: number; custoTot: number; pneus: number }>();
    for (const t of filtered) {
      const e = m.get(t.fi) || { c: 0, k: 0, kp: 0, custoTot: 0, pneus: 0 };
      const a = encerradoStats(t);
      e.c += a.custo; e.k += a.kmReal; e.kp += a.kmProj; e.custoTot += t.ct; e.pneus += 1;
      m.set(t.fi, e);
    }
    const filiais = [...m.entries()]
      .map(([fi, e]) => ({
        fi: fi.length > 14 ? fi.slice(0, 14) + "…" : fi,
        fiFull: fi,
        custo: e.custoTot,
        cpk: e.k > 0 ? e.c / e.k : 0,
        cpkProj: e.kp > 0 ? e.c / e.kp : 0,
        perf: e.kp > 0 ? (e.k / e.kp) * 100 : 0,
        pneus: e.pneus,
      }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 12);

    const economia = cpkProj > cpkReal && kmEnc > 0 ? (cpkProj - cpkReal) * kmEnc : 0;
    const prejuizo = cpkReal > cpkProj && kmEnc > 0 ? (cpkReal - cpkProj) * kmEnc : 0;

    return { custoTotal, kmEnc, kmProjEnc, ciclosEnc, cpkReal, cpkProj, perf, custoRecap, custoSucata, porVida, filiais, economia, prejuizo, custoEnc };
  }, [filtered]);

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    if (!filtered.length) return list;

    list.push({
      icon: Wallet, severity: "info",
      title: "Custo total acumulado",
      desc: `${fmtMoneyK(data.custoTotal)} em ${fmtNum(filtered.length)} pneus · custo encerrado ${fmtMoneyK(data.custoEnc)}.`,
    });
    list.push({
      icon: data.perf >= 95 ? TrendingUp : TrendingDown,
      severity: data.perf >= 95 ? "success" : data.perf >= 70 ? "warning" : "destructive",
      title: "Performance KM (ciclos encerrados)",
      desc: `${fmtPct(data.perf)} — ${fmtNum(data.kmEnc)} km reais sobre ${fmtNum(data.kmProjEnc)} km projetados.`,
    });
    if (data.economia > 0) list.push({ icon: TrendingUp, severity: "success", title: "Economia operacional", desc: `CPK real ${fmtCpk(data.cpkReal)} abaixo do projetado ${fmtCpk(data.cpkProj)} — ${fmtMoneyK(data.economia)} economizados.` });
    if (data.prejuizo > 0) list.push({ icon: TrendingDown, severity: "destructive", title: "Prejuízo operacional", desc: `CPK real ${fmtCpk(data.cpkReal)} acima do projetado ${fmtCpk(data.cpkProj)} — perda de ${fmtMoneyK(data.prejuizo)}.` });
    if (data.custoSucata > 0) list.push({ icon: AlertTriangle, severity: "warning", title: "Perda em sucata", desc: `${fmtMoneyK(data.custoSucata)} perdidos em pneus sucateados.` });

    // Comparativos entre filiais
    if (filters.filial === "all" && data.filiais.length > 1) {
      const byCpk = data.filiais.filter((f) => f.cpk > 0);
      if (byCpk.length > 1) {
        const melhor = byCpk.reduce((a, b) => (a.cpk < b.cpk ? a : b));
        const pior = byCpk.reduce((a, b) => (a.cpk > b.cpk ? a : b));
        if (melhor.fiFull !== pior.fiFull) {
          list.push({ icon: Target, severity: "primary", title: "Comparativo entre filiais", desc: `Melhor CPK: ${melhor.fiFull} (${fmtCpk(melhor.cpk)}). Pior: ${pior.fiFull} (${fmtCpk(pior.cpk)}).` });
        }
      }
      const maior = data.filiais[0];
      if (maior) list.push({ icon: Wallet, severity: "info", title: "Maior custo absoluto", desc: `${maior.fiFull} concentra ${fmtMoneyK(maior.custo)} em ${fmtNum(maior.pneus)} pneus.` });
    }
    return list;
  }, [filtered, filters.filial, data]);

  const scope = filters.filial !== "all"
    ? { label: filters.filial, metric: `${fmtNum(filtered.length)} pneus · custo ${fmtMoneyK(data.custoTotal)} · perf ${data.perf > 0 ? fmtPct(data.perf) : "—"}` }
    : undefined;

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Performance financeira, real x projetado, e oportunidades de economia." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <InfoCard label="Custo total frota" value={fmtMoneyK(data.custoTotal)} tone="var(--primary)"
          formula="Soma de ct (custo total acumulado) de todos os pneus filtrados." />
        <InfoCard label="Custo encerrado" value={fmtMoneyK(data.custoEnc)} sub="ciclos finalizados"
          formula="Σ custo de vidas anteriores à atual de cada pneu (encerradoStats)." />
        <InfoCard label="CPK real" value={fmtCpk(data.cpkReal)} tone="var(--success)"
          formula="Σ custo encerrado ÷ Σ km real encerrado." />
        <InfoCard label="CPK projetado" value={fmtCpk(data.cpkProj)} tone="var(--info)"
          formula="Σ custo encerrado ÷ Σ km projetado encerrado (mesma base do CPK real)." />
        <InfoCard label="Performance KM" value={fmtPct(data.perf)}
          tone={data.perf >= 95 ? "var(--success)" : data.perf >= 70 ? "var(--warning)" : "var(--destructive)"}
          formula="(Σ KM real enc. ÷ Σ KM projetado enc.) × 100 — mesma base do Dashboard e CPK." />
        <InfoCard label="Custo estimado recapagem" value={fmtMoneyK(data.custoRecap)} tone="var(--warning)"
          formula="Pneus com mm ≤ 4 × R$ 800 (preço médio de recapagem)." />
        <InfoCard label="Economia potencial" value={fmtMoneyK(data.economia)} tone="var(--success)"
          formula="(CPK projetado − CPK real) × KM encerrado, quando real é menor que projetado." />
        <InfoCard label="Prejuízo operacional" value={fmtMoneyK(data.prejuizo)} tone="var(--destructive)"
          formula="(CPK real − CPK projetado) × KM encerrado, quando real é maior que projetado." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Custo Encerrado por Vida">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.porVida} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="finVida" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="vida" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoneyK(v)} />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-elegant)" }}
                formatter={(v: number) => fmtMoneyK(v)}
              />
              <Bar dataKey="custo" fill="url(#finVida)" radius={[10, 10, 0, 0]}>
                {data.porVida.map((_, i) => <Cell key={i} fill={`oklch(0.7 0.16 ${180 + i * 22})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Comparativo entre filiais" subtitle="Custo · CPK real · Performance">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.filiais} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="finFil" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="fi" stroke="var(--muted-foreground)" fontSize={10} angle={-25} textAnchor="end" height={70} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoneyK(v)} />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d: any = payload[0].payload;
                  return (
                    <div className="rounded-xl border bg-popover/95 backdrop-blur shadow-xl p-3 min-w-[220px]" style={{ borderColor: "var(--border)" }}>
                      <div className="font-display font-semibold text-sm mb-2">{d.fiFull}</div>
                      <dl className="space-y-1 text-xs">
                        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Custo total</dt><dd className="font-medium tabular-nums">{fmtMoneyK(d.custo)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">CPK real</dt><dd className="font-medium tabular-nums" style={{ color: "var(--success)" }}>{d.cpk > 0 ? fmtCpk(d.cpk) : "—"}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">CPK projetado</dt><dd className="font-medium tabular-nums">{d.cpkProj > 0 ? fmtCpk(d.cpkProj) : "—"}</dd></div>
                        <div className="flex justify-between gap-4 border-t pt-1 mt-1" style={{ borderColor: "var(--border)" }}><dt className="text-muted-foreground">Performance</dt><dd className="font-semibold tabular-nums" style={{ color: d.perf >= 95 ? "var(--success)" : d.perf >= 70 ? "var(--warning)" : "var(--destructive)" }}>{d.perf > 0 ? fmtPct(d.perf) : "—"}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Pneus</dt><dd className="font-medium tabular-nums">{fmtNum(d.pneus)}</dd></div>
                      </dl>
                    </div>
                  );
                }}
              />
              <Bar dataKey="custo" fill="url(#finFil)" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <InsightsBlock insights={insights} scope={scope} title="Insights gerais" />
    </>
  );
}
