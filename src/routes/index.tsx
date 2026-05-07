import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filters-context";
import { cpkAcumulado, calcularDesgasteIrregular, fabricante, isRecap, statusNorm } from "@/lib/tires";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/layout/FilterBar";
import { InfoCard } from "@/components/InfoCard";
import { InsightsBlock, type Insight } from "@/components/InsightsBlock";
import { fmtCpk, fmtMoneyK, fmtNum, fmtPct } from "@/lib/format";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { ChevronDown, AlertTriangle, Target, Zap, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Visão Geral · TireOps" },
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
    let custoEnc = 0, kmEnc = 0, kmProjEnc = 0, pneusComEnc = 0;
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
      const closed = Math.max(0, v - 1);
      let c = 0, k = 0, kp = 0;
      for (let i = 0; i < closed; i++) {
        const ci = t.cv[i] || 0, ki = t.km[i] || 0, kpi = t.kpv[i] || 0;
        if (ci > 0 && ki > 0) { c += ci; k += ki; }
        kp += kpi;
      }
      agg.custo += c; agg.km += k; agg.kmProj += kp;
      if (closed > 0 && k > 0) { custoEnc += c; kmEnc += k; kmProjEnc += kp; pneusComEnc += 1; }
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

    return { total, custoEnc, kmEnc, kmProjEnc, pneusComEnc, cpkGlobal, perfGlobal, vidas, filiais: filiais.size,
      ativos, recap, desg, criticos, fabData, filData };
  }, [filtered]);

  const sel = data.vidas.find((v) => v.v === selVida) ?? data.vidas[0];

  // Insights da página (Visão Geral)
  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    const filMap = new Map<string, { c: number; k: number }>();
    for (const t of filtered) {
      const a = cpkAcumulado(t);
      const e = filMap.get(t.fi) || { c: 0, k: 0 };
      e.c += a.custo; e.k += a.km; filMap.set(t.fi, e);
    }
    const fil = [...filMap.entries()].map(([fi, e]) => ({ fi, cpk: e.k > 0 ? e.c / e.k : 0 })).filter((f) => f.cpk > 0).sort((a, b) => a.cpk - b.cpk);
    const melhor = fil[0], pior = fil[fil.length - 1];
    if (melhor) list.push({ icon: Target, severity: "success", title: "Melhor filial em CPK", desc: `${melhor.fi} opera com CPK de ${fmtCpk(melhor.cpk)} — referência da operação.` });
    if (pior && pior !== melhor) list.push({ icon: AlertTriangle, severity: "destructive", title: "Filial crítica em CPK", desc: `${pior.fi} apresenta CPK de ${fmtCpk(pior.cpk)} — ${fmtPct(((pior.cpk - (melhor?.cpk || 0)) / (melhor?.cpk || 1)) * 100)} acima da melhor filial.` });
    if (data.recap > 0) list.push({ icon: Zap, severity: "success", title: "Oportunidade de recapagem", desc: `${data.recap} pneus aptos. Economia potencial estimada: ${fmtMoneyK(data.recap * 1600)} (recap ~R$800 vs novo ~R$2.400).` });
    if (data.perfGlobal >= 100) list.push({ icon: TrendingUp, severity: "success", title: "Performance acima do projetado", desc: `Frota atingiu ${fmtPct(data.perfGlobal)} dos km projetados nos ciclos encerrados.` });
    else if (data.perfGlobal > 0) list.push({ icon: TrendingDown, severity: "warning", title: "Performance abaixo do projetado", desc: `Frota está em ${fmtPct(data.perfGlobal)} — gap de ${fmtNum(data.kmProjEnc - data.kmEnc)} km vs projeção.` });
    if (data.desg > 0) list.push({ icon: AlertTriangle, severity: "warning", title: "Desgaste irregular detectado", desc: `${data.desg} pares dianteiros com Δ ≥ 1,6mm — revisar alinhamento e calibragem.` });
    list.push({ icon: Lightbulb, severity: "info", title: "Projeção financeira", desc: `Com CPK global de ${fmtCpk(data.cpkGlobal)}, a frota tende a gastar ${fmtMoneyK(data.cpkGlobal * data.kmProjEnc * 0.3)} no próximo trimestre operacional.` });
    return list;
  }, [filtered, data]);

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
            label="Performance global"
            value={fmtPct(data.perfGlobal)}
            tone={colorByPerf(data.perfGlobal)}
            sub={`${fmtMoneyK(data.kmEnc - data.kmProjEnc).replace("R$ ", "")} km vs projetado`}
            formula="(KM real encerrado ÷ KM projetado encerrado) × 100.\nMede o cumprimento da projeção apenas em ciclos fechados."
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

      {/* Detalhe da vida selecionada */}
      {sel && (
        <FlatCard className="mb-6">
          <div className="font-display text-lg font-bold mb-5">
            {sel.v}ª Vida — {fmtNum(sel.pneus)} pneus{sel.v > 1 ? " com ciclos encerrados" : ""}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard label="CPK acumulado" value={sel.cpk > 0 ? fmtCpk(sel.cpk) : "—"} tone={colorByCpk(sel.cpk)}
              formula={`Σ custo das vidas 1..${sel.v - 1} ÷ Σ km das vidas 1..${sel.v - 1}.\nApenas pneus que estão na ${sel.v}ª vida atual.`} />
            <InfoCard label="Custo enc." value={fmtMoneyK(sel.custo)} formula={`Soma de cv[0..${sel.v - 2}] dos pneus na ${sel.v}ª vida.`} />
            <InfoCard label="KM real enc." value={fmtMoneyK(sel.km).replace("R$ ", "")} tone="var(--info)"
              formula={`Soma de km[0..${sel.v - 2}] dos pneus na ${sel.v}ª vida.`} />
            <InfoCard label="KM projetado" value={fmtMoneyK(sel.kmProj).replace("R$ ", "")}
              formula={`Soma de kpv[0..${sel.v - 2}] dos pneus na ${sel.v}ª vida.`} />
          </div>

          <div className="my-5 flex items-center justify-center">
            <div className="size-9 rounded-full border flex items-center justify-center" style={{ borderColor: "oklch(1 0 0 / 0.1)" }}>
              <ChevronDown className="size-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard label="Performance" value={sel.kmProj > 0 ? fmtPct((sel.km / sel.kmProj) * 100) : "—"}
              tone={colorByPerf(sel.kmProj > 0 ? (sel.km / sel.kmProj) * 100 : 0)}
              formula="(KM real enc. ÷ KM projetado) × 100." />
            <InfoCard label="Diferença KM" value={`${fmtMoneyK(sel.km - sel.kmProj).replace("R$ ", "")} km`}
              tone={sel.km - sel.kmProj >= 0 ? "var(--success)" : "var(--destructive)"}
              formula="KM real encerrado − KM projetado encerrado." />
            <InfoCard label="Total pneus" value={fmtNum(sel.pneus)} formula={`Pneus cuja vida atual = ${sel.v}.`} />
            <InfoCard label="Ciclo atual" value={`${sel.v}º ciclo`} formula="Vida em que o pneu se encontra hoje." />
          </div>
        </FlatCard>
      )}

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

      <InsightsBlock insights={insights} />
    </>
  );
}
