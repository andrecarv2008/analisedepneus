import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
// state used below
import { useFilters } from "@/lib/filters-context";
import { cpkAcumulado, calcularDesgasteIrregular, encerradoStats, fabricante, isRecap, statusNorm } from "@/lib/tires";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/layout/FilterBar";
import { InfoCard } from "@/components/InfoCard";
import { InsightsByFilial, type FilialInsights, type Insight } from "@/components/InsightsBlock";
import { fmtCpk, fmtMoneyK, fmtNum, fmtPct } from "@/lib/format";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { ChevronDown, AlertTriangle, Target, Zap, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Visão Geral · Análise de Pneus - Grupo Mateus" },
      { name: "description", content: "Visão executiva — ciclos encerrados." },
    ],
  }),
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "oklch(0.7 0.18 280)", "oklch(0.7 0.16 100)"];

type VidaAgg = { v: number; pneus: number; custo: number; km: number; kmProj: number; cpk: number };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/80 mb-3 font-medium">{title}</div>
      {children}
    </div>
  );
}

function FlatCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-5 border ${className}`}
      style={{ background: "oklch(0.21 0.02 255 / 0.6)", borderColor: "oklch(1 0 0 / 0.06)" }}>
      {children}
    </div>
  );
}

const colorByCpk = (c: number) => (!c ? "var(--muted-foreground)" : c < 0.06 ? "var(--success)" : c < 0.07 ? "var(--warning)" : "var(--destructive)");
const colorByPerf = (p: number) => (!p ? "var(--muted-foreground)" : p >= 95 ? "var(--success)" : p >= 70 ? "var(--warning)" : "var(--destructive)");

function Dashboard() {
  const { filtered } = useFilters();
  const [selVida, setSelVida] = useState<number>(2);

  const data = useMemo(() => {
    const total = filtered.length;
    let custoEnc = 0, kmEnc = 0, kmProjEnc = 0, pneusComEnc = 0, ciclosEnc = 0;
    const filiais = new Set<string>();
    const porVida = new Map<number, VidaAgg>();
    const ensure = (v: number) => {
      let e = porVida.get(v);
      if (!e) { e = { v, pneus: 0, custo: 0, km: 0, kmProj: 0, cpk: 0 }; porVida.set(v, e); }
      return e;
    };
    for (const t of filtered) {
      filiais.add(t.fi);
      const v = t.v || 1;
      const agg = ensure(v);
      agg.pneus += 1;
      const s = encerradoStats(t);
      agg.custo += s.custo; agg.km += s.kmReal; agg.kmProj += s.kmProj;
      if (s.ciclos > 0) {
        custoEnc += s.custo; kmEnc += s.kmReal; kmProjEnc += s.kmProj;
        pneusComEnc += 1; ciclosEnc += s.ciclos;
      }
    }
    for (const a of porVida.values()) a.cpk = a.km > 0 ? a.custo / a.km : 0;
    const cpkGlobal = kmEnc > 0 ? custoEnc / kmEnc : 0;
    const perfGlobal = kmProjEnc > 0 ? (kmEnc / kmProjEnc) * 100 : 0;
    const vidas = [...porVida.values()].sort((a, b) => a.v - b.v).filter((v) => v.v >= 1 && v.v <= 7);

    // porcentagens
    const ativos = filtered.filter((t) => statusNorm(t) === "ativo").length;
    const recap = filtered.filter(isRecap).length;
    const desg = calcularDesgasteIrregular(filtered).length;
    const criticos = filtered.filter((t) => (t.mm ?? 99) <= 2).length;

    const fabMap = new Map<string, number>();
    for (const t of filtered) fabMap.set(fabricante(t.md), (fabMap.get(fabricante(t.md)) || 0) + 1);
    const fabData = [...fabMap.entries()].map(([name, value]) => ({ name, value, pct: (value / Math.max(total, 1)) * 100 }))
      .sort((a, b) => b.value - a.value).slice(0, 7);

    const filMap = new Map<string, number>();
    for (const t of filtered) filMap.set(t.fi, (filMap.get(t.fi) || 0) + 1);
    const filData = [...filMap.entries()].map(([k, v]) => ({ name: k.length > 14 ? k.slice(0, 14) + "…" : k, value: v, pct: (v / Math.max(total, 1)) * 100 }))
      .sort((a, b) => b.value - a.value).slice(0, 10);

    return { total, custoEnc, kmEnc, kmProjEnc, pneusComEnc, ciclosEnc, cpkGlobal, perfGlobal, vidas, filiais: filiais.size,
      ativos, recap, desg, criticos, fabData, filData };
  }, [filtered]);

  const sel = data.vidas.find((v) => v.v === selVida) ?? data.vidas[0];

  // Insights por filial — ciclos encerrados
  const groups = useMemo<FilialInsights[]>(() => {
    type Acc = { c: number; k: number; kp: number; pneus: number; recap: number; criticos: number; ciclos: number };
    const m = new Map<string, Acc>();
    for (const t of filtered) {
      const e = m.get(t.fi) || { c: 0, k: 0, kp: 0, pneus: 0, recap: 0, criticos: 0, ciclos: 0 };
      const s = encerradoStats(t);
      e.c += s.custo; e.k += s.kmReal; e.kp += s.kmProj; e.ciclos += s.ciclos;
      e.pneus += 1;
      if (isRecap(t)) e.recap += 1;
      if ((t.mm ?? 99) <= 2) e.criticos += 1;
      m.set(t.fi, e);
    }
    const arr = [...m.entries()].map(([fi, e]) => ({
      fi, ...e,
      cpk: e.k > 0 ? e.c / e.k : 0,
      perf: e.kp > 0 ? (e.k / e.kp) * 100 : 0,
    }));
    const validas = arr.filter((f) => f.ciclos > 0);
    const melhorCpk = validas.length ? validas.reduce((a, b) => (a.cpk < b.cpk ? a : b)) : null;
    const desgPorFil = new Map<string, number>();
    for (const d of calcularDesgasteIrregular(filtered)) desgPorFil.set(d.fi, (desgPorFil.get(d.fi) || 0) + 1);

    const out: FilialInsights[] = arr
      .sort((a, b) => b.pneus - a.pneus)
      .slice(0, 8)
      .map((f) => {
        const list: Insight[] = [];
        if (f.ciclos === 0) {
          list.push({ icon: Lightbulb, severity: "info", title: "Sem ciclos encerrados", desc: `${fmtNum(f.pneus)} pneus na filial, mas nenhum fechou vida ainda — sem base para CPK real.` });
        } else {
          if (melhorCpk && f.fi === melhorCpk.fi) {
            list.push({ icon: Target, severity: "success", title: "Referência em CPK", desc: `Melhor CPK da operação: ${fmtCpk(f.cpk)} sobre ${fmtNum(f.ciclos)} ciclos encerrados.` });
          } else if (melhorCpk) {
            const gap = ((f.cpk - melhorCpk.cpk) / melhorCpk.cpk) * 100;
            list.push({
              icon: gap > 20 ? AlertTriangle : Target,
              severity: gap > 20 ? "destructive" : gap > 8 ? "warning" : "info",
              title: "CPK vs melhor filial",
              desc: `${fmtCpk(f.cpk)} — ${gap >= 0 ? `${fmtPct(gap)} acima` : `${fmtPct(-gap)} abaixo`} de ${melhorCpk.fi} (${fmtCpk(melhorCpk.cpk)}).`,
            });
          }
          if (f.perf >= 100) list.push({ icon: TrendingUp, severity: "success", title: "Performance KM acima do projetado", desc: `${fmtPct(f.perf)} de cumprimento — superou a projeção em ${fmtNum(f.k - f.kp)} km.` });
          else list.push({ icon: TrendingDown, severity: f.perf >= 70 ? "warning" : "destructive", title: "Performance KM abaixo do projetado", desc: `${fmtPct(f.perf)} — gap de ${fmtNum(f.kp - f.k)} km vs projeção.` });
        }
        if (f.recap > 0) list.push({ icon: Zap, severity: "success", title: "Oportunidade de recapagem", desc: `${fmtNum(f.recap)} pneus aptos · economia potencial ${fmtMoneyK(f.recap * 1600)}.` });
        if (f.criticos > 0) list.push({ icon: AlertTriangle, severity: "destructive", title: "Pneus críticos (≤2mm)", desc: `${fmtNum(f.criticos)} pneus em estado crítico — risco operacional imediato.` });
        const desg = desgPorFil.get(f.fi) || 0;
        if (desg > 0) list.push({ icon: AlertTriangle, severity: "warning", title: "Desgaste irregular", desc: `${fmtNum(desg)} pares dianteiros com Δ ≥ 1,6mm — revisar alinhamento.` });

        return {
          filial: f.fi,
          metric: `${fmtNum(f.pneus)} pneus · CPK ${f.cpk > 0 ? fmtCpk(f.cpk) : "—"} · perf ${f.perf > 0 ? fmtPct(f.perf) : "—"}`,
          insights: list,
        };
      });
    return out;
  }, [filtered]);

  return (
    <>
      <PageHeader title="Visão Geral" subtitle="Inteligência executiva — ciclos encerrados, custos acumulados e performance real." />
      <FilterBar />

      {/* KPIs principais — único grupo */}
      <Section title="Visão geral da frota — ciclos encerrados">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <InfoCard
            label="CPK real global"
            value={fmtCpk(data.cpkGlobal)}
            tone="var(--success)"
            sub="por km · ciclos enc."
            formula="Σ custo de ciclos encerrados ÷ Σ km real de ciclos encerrados.\nCiclos encerrados = vidas anteriores à vida atual de cada pneu."
          />
          <InfoCard
            label="Custo total enc."
            value={fmtMoneyK(data.custoEnc)}
            sub={`${fmtNum(data.pneusComEnc)} pneus com enc.`}
            formula="Soma de cv[i] (custo da vida i) para todas as vidas i < vida atual de cada pneu."
          />
          <InfoCard
            label="KM real acumulado"
            value={fmtMoneyK(data.kmEnc).replace("R$ ", "")}
            tone="var(--info)"
            sub="km rodados encerrados"
            formula="Soma de km[i] das vidas i anteriores à atual (apenas ciclos já fechados)."
          />
          <InfoCard
            label="KM projetado enc."
            value={fmtMoneyK(data.kmProjEnc).replace("R$ ", "")}
            sub="projetado nas vidas enc."
            formula="Soma de kpv[i] (projeção por vida) para vidas i anteriores à atual."
          />
          <InfoCard
            label="Performance KM"
            value={fmtPct(data.perfGlobal)}
            tone={colorByPerf(data.perfGlobal)}
            sub={`${fmtMoneyK(data.kmEnc - data.kmProjEnc).replace("R$ ", "")} km vs projetado`}
            formula={{
              description: "Aproveitamento do KM projetado considerando APENAS ciclos encerrados (vidas anteriores à atual de cada pneu).",
              formula: "(Σ KM real enc. ÷ Σ KM projetado enc.) × 100",
              steps: [
                "Para cada pneu, percorremos as vidas i < vida atual (vidas já fechadas).",
                "Somamos km[i] (real) e kpv[i] (projetado) apenas quando AMBOS > 0 — campos vazios são ignorados.",
                "Não incluímos pneus ativos sem ciclo encerrado, vidas abertas nem projeções futuras.",
                "Dividimos o total real pelo total projetado e multiplicamos por 100.",
              ],
              note: "Mesma base de ciclos encerrados usada no CPK — garante consistência entre indicadores.",
            }}
          />
          <InfoCard
            label="Total pneus"
            value={fmtNum(data.total)}
            sub={`em ${data.filiais} filiais`}
            formula="Contagem de pneus após aplicação dos filtros ativos."
          />
        </div>
      </Section>

      {/* Distribuição por vida atual (clicável) */}
      <Section title="Distribuição por vida atual">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.vidas.slice(0, 5).map((v) => {
            const pct = (v.pneus / Math.max(data.total, 1)) * 100;
            const isSel = sel?.v === v.v;
            const cpkColor = colorByCpk(v.cpk);
            return (
              <button
                key={v.v}
                onClick={() => setSelVida(v.v)}
                className="text-left rounded-xl p-4 border transition-all hover:translate-y-[-1px]"
                style={{
                  background: isSel ? "oklch(0.24 0.04 255 / 0.7)" : "oklch(0.21 0.02 255 / 0.5)",
                  borderColor: isSel ? "var(--primary)" : "oklch(1 0 0 / 0.06)",
                  boxShadow: isSel ? "0 0 0 1px var(--primary), 0 8px 24px -12px var(--primary)" : undefined,
                }}
              >
                <div className="text-xs text-muted-foreground mb-2">{v.v}ª vida</div>
                <div className="font-display text-2xl font-bold">{fmtPct(pct)}</div>
                <div className="text-xs text-muted-foreground mt-1">{fmtNum(v.pneus)} pneus</div>
                <div className="mt-3 text-sm font-medium" style={{ color: cpkColor }}>{v.cpk > 0 ? fmtCpk(v.cpk) : "—"}</div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 2)}%`, background: cpkColor }} />
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Porcentagens (antes era aba separada) */}
      <Section title="Porcentagens da frota">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <InfoCard label="Ativos" value={fmtPct((data.ativos / Math.max(data.total, 1)) * 100)} tone="var(--success)"
            sub={`${fmtNum(data.ativos)} pneus`} formula="Pneus com status “Ativo” ÷ total filtrado." />
          <InfoCard label="Aptos recapagem" value={fmtPct((data.recap / Math.max(data.total, 1)) * 100)} tone="var(--info)"
            sub={`${fmtNum(data.recap)} pneus`} formula="Pneus com sulco mm ≤ 4 ÷ total filtrado." />
          <InfoCard label="Desgaste irregular" value={fmtPct((data.desg / Math.max(data.total, 1)) * 100)} tone="var(--warning)"
            sub={`${fmtNum(data.desg)} pares`} formula="Pares dianteiros (1DD/1DE) com |mmD − mmE| ≥ 1,6 ÷ total." />
          <InfoCard label="Críticos (≤2mm)" value={fmtPct((data.criticos / Math.max(data.total, 1)) * 100)} tone="var(--destructive)"
            sub={`${fmtNum(data.criticos)} pneus`} formula="Pneus com sulco mm ≤ 2 ÷ total filtrado." />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <FlatCard>
            <div className="text-sm font-display font-semibold mb-3">% por Fabricante</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.fabData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                  {data.fabData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v: number, _n, p) => `${v} (${(p.payload as any).pct.toFixed(1)}%)`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </FlatCard>

          <FlatCard>
            <div className="text-sm font-display font-semibold mb-3">% por Filial (Top 10)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.filData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} angle={-25} textAnchor="end" height={60} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v: number) => fmtPct(v)} />
                <Bar dataKey="pct" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </FlatCard>
        </div>
      </Section>

      <InsightsByFilial groups={groups} />
    </>
  );
}
