import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { cpkAcumulado, isRecap, statusNorm } from "@/lib/tires";
import { InfoCard } from "@/components/InfoCard";
import { InsightsByFilial, type FilialInsights, type Insight } from "@/components/InsightsBlock";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtMoneyK, fmtPct } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/financeiro")({ component: Page,
  head: () => ({ meta: [{ title: "Financeiro · Análise de Pneus - Grupo Mateus" }, { name: "description", content: "Análise financeira da operação de pneus." }]}) });

function Page() {
  const { filtered } = useFilters();

  const data = useMemo(() => {
    const custoTotal = filtered.reduce((s,t)=>s+t.ct,0);
    const kmReal = filtered.reduce((s,t)=>s+t.kt,0);
    const kmProj = filtered.reduce((s,t)=>s+t.kp,0);

    let custoFech=0,kmFech=0;
    for(const t of filtered){const a=cpkAcumulado(t);custoFech+=a.custo;kmFech+=a.km;}
    const cpkReal = kmFech>0?custoFech/kmFech:0;
    const cpkProj = kmProj>0?custoTotal/kmProj:0;
    const perf = kmProj>0?(kmReal/kmProj)*100:0;

    const custoRecap = filtered.filter(isRecap).length * 800;
    const custoSucata = filtered.filter(t=>statusNorm(t)==="sucata").reduce((s,t)=>s+t.ct,0);

    // por vida
    const porVida = [1,2,3,4,5,6,7].map(v=>{
      const arr = filtered.filter(t=>t.v===v);
      let custoEnc=0,kmEnc=0;
      for(const t of arr){const a=cpkAcumulado(t);custoEnc+=a.custo;kmEnc+=a.km;}
      return { vida: `${v}ª`, custo: custoEnc, cpk: kmEnc>0?custoEnc/kmEnc:0 };
    });

    // por filial
    const m = new Map<string,{c:number;k:number;kp:number;custoTot:number}>();
    for(const t of filtered){
      const e = m.get(t.fi) || {c:0,k:0,kp:0,custoTot:0};
      const a = cpkAcumulado(t);
      e.c+=a.custo;e.k+=a.km;e.kp+=t.kp;e.custoTot+=t.ct;
      m.set(t.fi,e);
    }
    const filiais = [...m.entries()].map(([fi,e])=>({
      fi: fi.length>14?fi.slice(0,14)+"…":fi,
      custo:e.custoTot,
      cpk:e.k>0?e.c/e.k:0,
      perf:e.kp>0?(e.k/e.kp)*100:0,
    })).sort((a,b)=>b.custo-a.custo).slice(0,12);

    const economia = cpkProj>cpkReal && kmFech>0 ? (cpkProj-cpkReal)*kmFech : 0;
    const prejuizo = cpkReal>cpkProj && kmFech>0 ? (cpkReal-cpkProj)*kmFech : 0;

    return { custoTotal, kmReal, kmProj, cpkReal, cpkProj, perf, custoRecap, custoSucata, porVida, filiais, economia, prejuizo, custoFech };
  }, [filtered]);

  const groups = useMemo<FilialInsights[]>(() => {
    type Acc = { c: number; k: number; kp: number; custoTot: number; sucata: number; recap: number; pneus: number };
    const m = new Map<string, Acc>();
    for (const t of filtered) {
      const e = m.get(t.fi) || { c: 0, k: 0, kp: 0, custoTot: 0, sucata: 0, recap: 0, pneus: 0 };
      const a = cpkAcumulado(t);
      e.c += a.custo; e.k += a.km; e.kp += t.kp; e.custoTot += t.ct; e.pneus += 1;
      if (statusNorm(t) === "sucata") e.sucata += t.ct;
      if (isRecap(t)) e.recap += 1;
      m.set(t.fi, e);
    }
    return [...m.entries()].sort((a, b) => b[1].custoTot - a[1].custoTot).slice(0, 8).map(([fi, e]) => {
      const cpkR = e.k > 0 ? e.c / e.k : 0;
      const cpkP = e.kp > 0 ? e.custoTot / e.kp : 0;
      const economia = cpkP > cpkR && e.k > 0 ? (cpkP - cpkR) * e.k : 0;
      const prejuizo = cpkR > cpkP && e.k > 0 ? (cpkR - cpkP) * e.k : 0;
      const list: Insight[] = [];
      list.push({ icon: Wallet, severity: "info", title: "Custo total da filial", desc: `${fmtMoneyK(e.custoTot)} acumulados em ${fmtNum(e.pneus)} pneus.` });
      if (economia > 0) list.push({ icon: TrendingUp, severity: "success", title: "Economia operacional", desc: `CPK real ${fmtCpk(cpkR)} abaixo do projetado ${fmtCpk(cpkP)} — ${fmtMoneyK(economia)} economizados.` });
      if (prejuizo > 0) list.push({ icon: TrendingDown, severity: "destructive", title: "Prejuízo operacional", desc: `CPK real ${fmtCpk(cpkR)} acima do projetado ${fmtCpk(cpkP)} — perda de ${fmtMoneyK(prejuizo)}.` });
      if (e.sucata > 0) list.push({ icon: AlertTriangle, severity: "warning", title: "Perda em sucata", desc: `${fmtMoneyK(e.sucata)} perdidos em pneus sucateados.` });
      if (e.recap > 0) list.push({ icon: Wallet, severity: "info", title: "Investimento em recapagem", desc: `${fmtNum(e.recap)} pneus aptos · ${fmtMoneyK(e.recap * 800)} estimados.` });
      return { filial: fi, metric: `${fmtNum(e.pneus)} pneus · custo ${fmtMoneyK(e.custoTot)} · CPK ${cpkR > 0 ? fmtCpk(cpkR) : "—"}`, insights: list };
    });
  }, [filtered]);

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Performance financeira, real x projetado, e oportunidades de economia." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <InfoCard label="Custo total frota" value={fmtMoneyK(data.custoTotal)} tone="var(--primary)"
          formula="Soma de ct (custo total acumulado) de todos os pneus filtrados." />
        <InfoCard label="Custo encerrado" value={fmtMoneyK(data.custoFech)} sub="ciclos finalizados"
          formula="Σ custo de vidas anteriores à atual de cada pneu." />
        <InfoCard label="CPK real" value={fmtCpk(data.cpkReal)} tone="var(--success)"
          formula="Σ custo encerrado ÷ Σ km encerrado (apenas ciclos fechados)." />
        <InfoCard label="CPK projetado" value={fmtCpk(data.cpkProj)} tone="var(--info)"
          formula="Custo total da frota ÷ KM projetado total (kp)." />
        <InfoCard label="Performance KM" value={fmtPct(data.perf)}
          tone={data.perf >= 95 ? "var(--success)" : data.perf >= 70 ? "var(--warning)" : "var(--destructive)"}
          formula="(KM real total ÷ KM projetado total) × 100." />
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
            <BarChart data={data.porVida}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="vida" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={v=>fmtMoneyK(v)} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v:number)=>fmtMoneyK(v)} />
              <Bar dataKey="custo" radius={[6,6,0,0]}>
                {data.porVida.map((_,i)=><Cell key={i} fill={`oklch(0.7 0.18 ${180+i*20})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Custo Total por Filial" subtitle="Top 12">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.filiais}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="fi" stroke="var(--muted-foreground)" fontSize={10} angle={-25} textAnchor="end" height={70} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={v=>fmtMoneyK(v)} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v:number)=>fmtMoneyK(v)} />
              <Bar dataKey="custo" fill="var(--chart-2)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <InsightsByFilial groups={groups} />
    </>
  );
}
