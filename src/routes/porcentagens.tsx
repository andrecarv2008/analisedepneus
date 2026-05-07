import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { calcularDesgasteIrregular, fabricante, isRecap, statusNorm } from "@/lib/tires";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtPct } from "@/lib/format";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/porcentagens")({ component: Page,
  head: () => ({ meta: [{ title: "Porcentagens · TireOps" }, { name: "description", content: "Análises percentuais da operação." }]}) });

const COLORS = ["var(--chart-1)","var(--chart-2)","var(--chart-3)","var(--chart-4)","var(--chart-5)","oklch(0.7 0.18 280)","oklch(0.7 0.16 100)"];

function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 60, c = 2 * Math.PI * r;
  const off = c - (v / 100) * c;
  return (
    <div className="glass rounded-2xl p-5 flex flex-col items-center animate-fade-up">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 80 80)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        <text x="80" y="86" textAnchor="middle" fontSize="26" fontWeight="700" fill="currentColor" className="font-display">{v.toFixed(1)}%</text>
      </svg>
      <div className="text-sm text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

function Page() {
  const { filtered } = useFilters();
  const total = Math.max(filtered.length, 1);

  const byVida = useMemo(()=>{
    const m: Record<number,number>={};
    for(const t of filtered) m[t.v]=(m[t.v]||0)+1;
    return Object.entries(m).map(([k,v])=>({name:`${k}ª vida`,value:v,pct:v/total*100}));
  },[filtered,total]);

  const byFab = useMemo(()=>{
    const m = new Map<string,number>();
    for(const t of filtered) m.set(fabricante(t.md),(m.get(fabricante(t.md))||0)+1);
    return [...m.entries()].map(([k,v])=>({name:k,value:v,pct:v/total*100})).sort((a,b)=>b.value-a.value);
  },[filtered,total]);

  const byFilial = useMemo(()=>{
    const m = new Map<string,number>();
    for(const t of filtered) m.set(t.fi,(m.get(t.fi)||0)+1);
    return [...m.entries()].map(([k,v])=>({name:k.length>14?k.slice(0,14)+"…":k,value:v,pct:v/total*100})).sort((a,b)=>b.value-a.value).slice(0,10);
  },[filtered,total]);

  const recapPct = filtered.filter(isRecap).length/total*100;
  const desg = calcularDesgasteIrregular(filtered).length;
  const desgPct = desg/total*100;
  const ativos = filtered.filter(t=>statusNorm(t)==="ativo").length/total*100;
  const criticos = filtered.filter(t=>(t.mm??99)<=2).length/total*100;

  const kmTot = filtered.reduce((s,t)=>s+t.kt,0);
  const kmProj = filtered.reduce((s,t)=>s+t.kp,0);
  const perf = kmProj>0?(kmTot/kmProj)*100:0;

  return (
    <>
      <PageHeader title="Análises Percentuais" subtitle="Distribuições e indicadores percentuais da frota." />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Gauge value={ativos} label="Pneus Ativos" color="var(--success)" />
        <Gauge value={recapPct} label="Aptos Recapagem" color="var(--info)" />
        <Gauge value={desgPct} label="Desgaste Irregular" color="var(--warning)" />
        <Gauge value={criticos} label="Críticos (≤2mm)" color="var(--destructive)" />
        <Gauge value={Math.min(perf,100)} label="Performance KM" color="var(--primary)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="% por Vida">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={byVida} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={3}>
                {byVida.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v:number,_n,p)=>`${v} (${(p.payload as any).pct.toFixed(1)}%)`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="% por Fabricante">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={byFab} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={3}>
                {byFab.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v:number,_n,p)=>`${v} (${(p.payload as any).pct.toFixed(1)}%)`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="% por Filial (Top 10)">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={byFilial}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} angle={-25} textAnchor="end" height={70} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={v=>`${v.toFixed(0)}%`} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v:number)=>fmtPct(v)} />
            <Bar dataKey="pct" fill="var(--chart-1)" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}
