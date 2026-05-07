import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { cpkAcumulado, isRecap, statusNorm } from "@/lib/tires";
import { Kpi } from "@/components/Kpi";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtMoneyK, fmtNum, fmtPct } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

export const Route = createFileRoute("/financeiro")({ component: Page,
  head: () => ({ meta: [{ title: "Financeiro · TireOps" }, { name: "description", content: "Análise financeira da operação de pneus." }]}) });

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

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Performance financeira, real x projetado, e oportunidades de economia." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Custo Total Frota" value={fmtMoneyK(data.custoTotal)} icon={<Wallet className="size-4" />} accent="primary" />
        <Kpi label="Custo Encerrado" value={fmtMoneyK(data.custoFech)} hint="ciclos finalizados" icon={<DollarSign className="size-4" />} />
        <Kpi label="CPK Real x Projetado" value={`${fmtCpk(data.cpkReal)} / ${fmtCpk(data.cpkProj)}`} accent="info" />
        <Kpi label="Performance KM" value={fmtPct(data.perf)} trend={data.perf-100} accent={data.perf>=100?"success":"destructive"} />
        <Kpi label="Custo Estimado Recapagem" value={fmtMoneyK(data.custoRecap)} accent="warning" />
        <Kpi label="Perda em Sucata" value={fmtMoneyK(data.custoSucata)} accent="destructive" />
        <Kpi label="Economia Potencial" value={fmtMoneyK(data.economia)} icon={<TrendingUp className="size-4" />} accent="success" />
        <Kpi label="Prejuízo Operacional" value={fmtMoneyK(data.prejuizo)} icon={<TrendingDown className="size-4" />} accent="destructive" />
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
    </>
  );
}
