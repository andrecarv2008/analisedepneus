import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filters-context";
import { cpkAcumulado, isRecap, statusNorm } from "@/lib/tires";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown } from "lucide-react";

export const Route = createFileRoute("/tabela")({ component: Page,
  head: () => ({ meta: [{ title: "Tabela Geral · TireOps" }, { name: "description", content: "Tabela completa de pneus." }]}) });

type Sort = { key: string; dir: "asc" | "desc" };

function Page() {
  const { filtered } = useFilters();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "pl", dir: "asc" });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return filtered
      .filter(t => !term || t.pl?.toLowerCase().includes(term) || String(t.fg||"").toLowerCase().includes(term) || t.fi?.toLowerCase().includes(term) || t.md?.toLowerCase().includes(term))
      .map(t => {
        const a = cpkAcumulado(t);
        return {
          t,
          pl: t.pl, fg: t.fg, po: t.po, fi: t.fi, md: t.md, v: t.v,
          mm: t.mm ?? 0,
          custoVida: t.cv[t.v-1] || 0,
          cpkVida: t.cpk[t.v-1] || 0,
          kmVida: t.km[t.v-1] || 0,
          status: statusNorm(t), recap: isRecap(t),
          custoAc: a.custo, cpkAc: a.cpk,
          perf: t.kp>0 ? (t.kt/t.kp)*100 : 0,
        };
      });
  }, [filtered, q]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    const k = sort.key as keyof typeof rows[number];
    arr.sort((a:any,b:any)=>{
      const av=a[k], bv=b[k];
      if(typeof av==="number" && typeof bv==="number") return sort.dir==="asc"?av-bv:bv-av;
      return sort.dir==="asc"?String(av??"").localeCompare(String(bv??"")):String(bv??"").localeCompare(String(av??""));
    });
    return arr.slice(0,500);
  }, [rows, sort]);

  const Th = ({ label, k }: { label: string; k: string }) => (
    <th className="text-left py-2 px-2 cursor-pointer hover:text-foreground select-none" onClick={()=>setSort(s=>({key:k,dir:s.key===k&&s.dir==="asc"?"desc":"asc"}))}>
      <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className="size-3 opacity-50" /></span>
    </th>
  );

  const stColor = (s:string)=>s==="ativo"?"var(--success)":s==="recapagem"?"var(--info)":s==="sucata"?"var(--destructive)":"var(--muted-foreground)";

  return (
    <>
      <PageHeader title="Tabela Geral de Pneus" subtitle={`${fmtNum(rows.length)} pneus — exibindo até 500`} />
      <FilterBar />

      <ChartCard title="Pneus" subtitle="Clique nos cabeçalhos para ordenar"
        action={
          <div className="relative w-64">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar placa, fogo, filial…" className="pl-9 h-9 bg-secondary/40" />
          </div>
        }>
        <div className="overflow-auto max-h-[680px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card/95 backdrop-blur z-10 text-[10px] text-muted-foreground uppercase">
              <tr>
                <Th label="Placa" k="pl" />
                <Th label="Fogo" k="fg" />
                <Th label="Pos." k="po" />
                <Th label="Filial" k="fi" />
                <Th label="Medida" k="md" />
                <Th label="Vida" k="v" />
                <Th label="MM" k="mm" />
                <Th label="Custo Vida" k="custoVida" />
                <Th label="CPK Vida" k="cpkVida" />
                <Th label="KM Vida" k="kmVida" />
                <Th label="Custo Acum." k="custoAc" />
                <Th label="CPK Acum." k="cpkAc" />
                <Th label="Performance" k="perf" />
                <th className="text-center">Status</th>
                <th className="text-center">Recap</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r,i)=>(
                <tr key={i} className="border-t border-border/40 hover:bg-secondary/30">
                  <td className="py-2 px-2 font-medium">{r.pl}</td>
                  <td>{r.fg}</td>
                  <td>{r.po}</td>
                  <td className="text-muted-foreground">{r.fi}</td>
                  <td className="text-muted-foreground">{r.md}</td>
                  <td className="text-center">{r.v}ª</td>
                  <td className="text-right">{r.mm.toFixed(1)}</td>
                  <td className="text-right">{fmtMoney(r.custoVida)}</td>
                  <td className="text-right">{fmtCpk(r.cpkVida)}</td>
                  <td className="text-right">{fmtNum(r.kmVida)}</td>
                  <td className="text-right">{fmtMoney(r.custoAc)}</td>
                  <td className="text-right font-medium">{fmtCpk(r.cpkAc)}</td>
                  <td className="text-right" style={{color:r.perf>=100?"var(--success)":"var(--warning)"}}>{fmtPct(r.perf)}</td>
                  <td className="text-center"><Badge variant="outline" style={{color:stColor(r.status),borderColor:stColor(r.status)}}>{r.status}</Badge></td>
                  <td className="text-center">{r.recap ? <Badge style={{background:"var(--info)",color:"var(--primary-foreground)"}}>SIM</Badge> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  );
}
